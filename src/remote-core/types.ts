// Remote Core Protocol Types

export type InputEvent =
  | {
      type: 'mouse-move';
      x: number; // Normalized 0.0 to 1.0 relative to host screen
      y: number; // Normalized 0.0 to 1.0 relative to host screen
    }
  | {
      type: 'mouse-down';
      button: 'left' | 'middle' | 'right';
      x: number;
      y: number;
    }
  | {
      type: 'mouse-up';
      button: 'left' | 'middle' | 'right';
      x: number;
      y: number;
    }
  | {
      type: 'mouse-click';
      button: 'left' | 'middle' | 'right';
      clickCount: number;
      x: number;
      y: number;
    }
  | {
      type: 'mouse-wheel';
      deltaX: number;
      deltaY: number;
      x: number;
      y: number;
    }
  | {
      type: 'key-down';
      key: string;
      code: string;
      altKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
      metaKey: boolean;
    }
  | {
      type: 'key-up';
      key: string;
      code: string;
      altKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
      metaKey: boolean;
    }
  | {
      type: 'special-shortcut';
      action: 'ctrl-alt-del' | 'win-d' | 'alt-tab' | 'esc' | 'enter';
    };

export interface FileChunkHeader {
  type: 'file-start';
  transferId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
}

export interface FileChunkData {
  type: 'file-chunk';
  transferId: string;
  chunkIndex: number;
  data: string; // Base64 chunk string
}

export interface FileChunkAck {
  type: 'file-ack';
  transferId: string;
  chunkIndex: number;
  receivedBytes: number;
}

export interface FileTransferEnd {
  type: 'file-end';
  transferId: string;
  success: boolean;
}

export type RemoteCoreDataMessage =
  | { type: 'input'; payload: InputEvent }
  | { type: 'chat'; payload: { id: string; text: string; senderName: string; timestamp: number } }
  | { type: 'file'; payload: FileChunkHeader | FileChunkData | FileChunkAck | FileTransferEnd }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number; echo: number }
  | { type: 'quality-adjust'; fps: number; resolution: '1080p' | '720p' | '480p' };

export interface WebRTCSignalingPayload {
  targetDeviceId: string;
  fromDeviceId: string;
  sessionId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}
