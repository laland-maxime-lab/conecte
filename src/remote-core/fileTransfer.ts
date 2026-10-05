import { FileChunkHeader, FileChunkData, FileTransferEnd, RemoteCoreDataMessage } from './types';
import { FileTransferItem } from '../types';

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk

export type SendMessageFunction = (message: RemoteCoreDataMessage) => void;
export type ProgressCallback = (item: FileTransferItem) => void;

export class FileTransferManager {
  private activeTransfers: Map<string, FileTransferItem> = new Map();
  private receivedBuffers: Map<string, { chunks: (ArrayBuffer | Uint8Array)[]; meta: FileChunkHeader }> = new Map();
  private sendFunction: SendMessageFunction | null = null;
  private onProgressUpdate: ProgressCallback | null = null;

  constructor(sendFn?: SendMessageFunction, onProgress?: ProgressCallback) {
    if (sendFn) this.sendFunction = sendFn;
    if (onProgress) this.onProgressUpdate = onProgress;
  }

  setSendFunction(fn: SendMessageFunction) {
    this.sendFunction = fn;
  }

  setProgressCallback(cb: ProgressCallback) {
    this.onProgressUpdate = cb;
  }

  /**
   * Start sending a file to the remote peer
   */
  async sendFile(file: File): Promise<string> {
    if (!this.sendFunction) {
      throw new Error('Canal de communication indisponible.');
    }

    const transferId = 'ft_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const transferItem: FileTransferItem = {
      id: transferId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      direction: 'upload',
      status: 'in_progress',
      progress: 0,
      bytesTransferred: 0,
      speedBps: 0,
    };

    this.activeTransfers.set(transferId, transferItem);
    this.notifyProgress(transferItem);

    // Send header
    const header: FileChunkHeader = {
      type: 'file-start',
      transferId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
      chunkSize: CHUNK_SIZE,
    };

    this.sendFunction({
      type: 'file',
      payload: header,
    });

    // Start streaming chunks with throttling to prevent buffer overflow
    const startTime = Date.now();
    let transferredBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
      const currentItem = this.activeTransfers.get(transferId);
      if (!currentItem || currentItem.status === 'cancelled') {
        break;
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const slice = file.slice(start, end);
      const arrayBuffer = await slice.arrayBuffer();

      // Convert array buffer to base64 for universal DataChannel & WebSocket serialization
      const base64Data = this.arrayBufferToBase64(arrayBuffer);

      const chunkData: FileChunkData = {
        type: 'file-chunk',
        transferId,
        chunkIndex: i,
        data: base64Data,
      };

      this.sendFunction({
        type: 'file',
        payload: chunkData,
      });

      transferredBytes += end - start;
      const elapsedSec = Math.max(0.01, (Date.now() - startTime) / 1000);
      const speedBps = Math.round(transferredBytes / elapsedSec);
      const progress = Math.min(100, Math.round((transferredBytes / file.size) * 100));

      const updated: FileTransferItem = {
        ...transferItem,
        bytesTransferred: transferredBytes,
        progress,
        speedBps,
      };

      this.activeTransfers.set(transferId, updated);
      this.notifyProgress(updated);

      // Micro-pause to allow WebRTC / WebSocket buffer flush
      if (i % 8 === 0) {
        await new Promise(r => setTimeout(r, 10));
      }
    }

    const finalItem: FileTransferItem = {
      ...transferItem,
      progress: 100,
      bytesTransferred: file.size,
      status: 'completed',
    };
    this.activeTransfers.set(transferId, finalItem);
    this.notifyProgress(finalItem);

    const endMsg: FileTransferEnd = {
      type: 'file-end',
      transferId,
      success: true,
    };
    this.sendFunction({
      type: 'file',
      payload: endMsg,
    });

    return transferId;
  }

  /**
   * Handle incoming file message from peer
   */
  handleIncomingFilePayload(payload: any) {
    if (!payload || !payload.type) return;

    switch (payload.type) {
      case 'file-start': {
        const header = payload as FileChunkHeader;
        const item: FileTransferItem = {
          id: header.transferId,
          name: header.fileName,
          size: header.fileSize,
          type: header.mimeType,
          direction: 'download',
          status: 'in_progress',
          progress: 0,
          bytesTransferred: 0,
          speedBps: 0,
        };
        this.activeTransfers.set(header.transferId, item);
        this.receivedBuffers.set(header.transferId, {
          chunks: new Array(header.totalChunks),
          meta: header,
        });
        this.notifyProgress(item);
        break;
      }

      case 'file-chunk': {
        const chunk = payload as FileChunkData;
        const entry = this.receivedBuffers.get(chunk.transferId);
        const item = this.activeTransfers.get(chunk.transferId);
        if (!entry || !item) return;

        const buffer = this.base64ToArrayBuffer(chunk.data);
        entry.chunks[chunk.chunkIndex] = buffer;

        const currentBytes = (item.bytesTransferred || 0) + buffer.byteLength;
        const progress = Math.min(99, Math.round((currentBytes / entry.meta.fileSize) * 100));

        const updated: FileTransferItem = {
          ...item,
          bytesTransferred: currentBytes,
          progress,
        };

        this.activeTransfers.set(chunk.transferId, updated);
        this.notifyProgress(updated);
        break;
      }

      case 'file-end': {
        const endMsg = payload as FileTransferEnd;
        const entry = this.receivedBuffers.get(endMsg.transferId);
        const item = this.activeTransfers.get(endMsg.transferId);
        if (!entry || !item) return;

        if (endMsg.success) {
          // Reassemble full file Blob
          const blob = new Blob(entry.chunks as BlobPart[], { type: entry.meta.mimeType });
          const blobUrl = URL.createObjectURL(blob);

          const completed: FileTransferItem = {
            ...item,
            status: 'completed',
            progress: 100,
            bytesTransferred: entry.meta.fileSize,
            blobUrl,
          };
          this.activeTransfers.set(endMsg.transferId, completed);
          this.notifyProgress(completed);

          // Clean memory buffer
          this.receivedBuffers.delete(endMsg.transferId);

          // Auto-prompt download or save
          this.triggerDownload(blobUrl, entry.meta.fileName);
        } else {
          const failed: FileTransferItem = {
            ...item,
            status: 'error',
            error: 'Transfert interrompu',
          };
          this.activeTransfers.set(endMsg.transferId, failed);
          this.notifyProgress(failed);
        }
        break;
      }
    }
  }

  cancelTransfer(transferId: string) {
    const item = this.activeTransfers.get(transferId);
    if (item) {
      item.status = 'cancelled';
      this.notifyProgress(item);
    }
  }

  private triggerDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private notifyProgress(item: FileTransferItem) {
    if (this.onProgressUpdate) {
      this.onProgressUpdate({ ...item });
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
