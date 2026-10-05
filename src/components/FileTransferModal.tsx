import React, { useRef, useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { FileTransferItem } from '../types';

interface FileTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfers: FileTransferItem[];
  onSendFile: (file: File) => Promise<string>;
  onCancelTransfer: (id: string) => void;
}

export const FileTransferModal: React.FC<FileTransferModalProps> = ({
  isOpen,
  onClose,
  transfers,
  onSendFile,
  onCancelTransfer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sendingError, setSendingError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setSendingError(null);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        await onSendFile(file);
      }
    } catch (e: any) {
      setSendingError(e.message || 'Erreur lors de l’envoi du fichier');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 o';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} Mo`;
    const kb = bytes / 1024;
    return `${Math.round(kb)} Ko`;
  };

  const formatSpeed = (bps: number) => {
    if (!bps || bps <= 0) return '';
    const kbps = bps / 1024;
    if (kbps >= 1024) {
      return `${(kbps / 1024).toFixed(1)} Mo/s`;
    }
    return `${Math.round(kbps)} Ko/s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Gestionnaire de transfert de fichiers</h3>
              <p className="text-xs text-slate-400">Échange direct P2P haute vitesse chiffré</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelected(e.target.files)}
              className="hidden"
              multiple
            />
            <div className="p-3 rounded-full bg-blue-600/10 text-blue-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Glissez-déposez des fichiers ici ou <span className="text-cyan-400 underline">parcourir</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Aucune limite de taille • Découpage automatique en blocs de 64 Ko
              </p>
            </div>
          </div>

          {sendingError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sendingError}</span>
            </div>
          )}

          {/* Transfers List */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Transferts en cours et récents ({transfers.length})
            </div>

            {transfers.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/30 rounded-xl border border-slate-800/60">
                Aucun fichier envoyé ou reçu dans cette session.
              </div>
            ) : (
              transfers.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          item.direction === 'upload'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {item.direction === 'upload' ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatSize(item.bytesTransferred)} / {formatSize(item.size)}
                          {item.speedBps > 0 && ` • ${formatSpeed(item.speedBps)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'completed' ? (
                        item.direction === 'download' && item.blobUrl ? (
                          <a
                            href={item.blobUrl}
                            download={item.name}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]"
                          >
                            <Download className="w-3 h-3" /> Télécharger
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terminé
                          </span>
                        )
                      ) : item.status === 'in_progress' ? (
                        <button
                          onClick={() => onCancelTransfer(item.id)}
                          className="px-2 py-1 rounded text-rose-400 hover:bg-rose-500/10 text-[11px] font-semibold"
                        >
                          Annuler
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">{item.status}</span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        item.status === 'completed'
                          ? 'bg-emerald-500'
                          : item.status === 'error' || item.status === 'cancelled'
                          ? 'bg-rose-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
