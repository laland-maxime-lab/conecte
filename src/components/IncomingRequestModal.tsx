import React, { useState, useEffect } from 'react';
import { ShieldCheck, Laptop, Clock, X, Check, MousePointer, FolderSync, Clipboard, Volume2 } from 'lucide-react';
import { SessionRequestPayload, AccessPermissions } from '../types';

interface IncomingRequestModalProps {
  request: SessionRequestPayload;
  onAccept: (requestId: string, permissions: AccessPermissions) => void;
  onReject: (requestId: string, reason?: string) => void;
}

export const IncomingRequestModal: React.FC<IncomingRequestModalProps> = ({
  request,
  onAccept,
  onReject,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [permissions, setPermissions] = useState<AccessPermissions>({
    allowControl: request.mode !== 'view_only',
    allowFileTransfer: true,
    allowClipboard: true,
    allowAudio: true,
  });

  // Countdown timer: 30 seconds auto-rejection
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject(request.requestId, 'Délai d’acceptation écoulé (30s).');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request.requestId, onReject]);

  const togglePermission = (key: keyof AccessPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border-2 border-blue-500 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative">
        {/* Header alert */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Demande de connexion</h3>
              <p className="text-xs text-blue-100">Autorisation requise pour partager l'écran</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 text-amber-300 font-mono text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>{secondsLeft}s</span>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5">
          {/* Requester device info box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Appareil demandeur :</div>
              <div className="font-bold text-slate-100 text-sm">{request.fromDeviceName}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                OS : <span className="capitalize">{request.fromDeviceOs}</span> • ID : {request.fromDeviceId.slice(-6)}
              </div>
            </div>
          </div>

          {/* Requested mode explanation */}
          <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
            {request.mode === 'full_control' ? (
              <p>Cet appareil demande le <strong className="text-blue-300">contrôle complet</strong> de votre souris, de votre clavier et la vue de votre écran.</p>
            ) : request.mode === 'view_only' ? (
              <p>Cet appareil demande uniquement la <strong className="text-blue-300">visualisation</strong> de votre écran sans contrôle direct.</p>
            ) : (
              <p>Cet appareil demande une session de <strong className="text-blue-300">transfert de fichiers</strong>.</p>
            )}
          </div>

          {/* Permissions toggles */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Permissions accordées à l'invité :
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 hover:bg-slate-950/90 border border-slate-800 text-xs text-slate-300 cursor-pointer">
              <span className="flex items-center gap-2">
                <MousePointer className="w-3.5 h-3.5 text-blue-400" />
                <span>Contrôle souris & clavier</span>
              </span>
              <input
                type="checkbox"
                checked={permissions.allowControl}
                onChange={() => togglePermission('allowControl')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 hover:bg-slate-950/90 border border-slate-800 text-xs text-slate-300 cursor-pointer">
              <span className="flex items-center gap-2">
                <FolderSync className="w-3.5 h-3.5 text-cyan-400" />
                <span>Transfert de fichiers</span>
              </span>
              <input
                type="checkbox"
                checked={permissions.allowFileTransfer}
                onChange={() => togglePermission('allowFileTransfer')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 hover:bg-slate-950/90 border border-slate-800 text-xs text-slate-300 cursor-pointer">
              <span className="flex items-center gap-2">
                <Clipboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>Presse-papier synchronisé</span>
              </span>
              <input
                type="checkbox"
                checked={permissions.allowClipboard}
                onChange={() => togglePermission('allowClipboard')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={() => onReject(request.requestId, 'Refusé manuellement par le propriétaire.')}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Refuser</span>
          </button>

          <button
            onClick={() => onAccept(request.requestId, permissions)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Autoriser la connexion</span>
          </button>
        </div>
      </div>
    </div>
  );
};
