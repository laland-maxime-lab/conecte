import React from 'react';
import { ShieldAlert, Power, MessageSquare, FolderSync, MousePointer } from 'lucide-react';
import { ActiveSession } from '../types';

interface HostActiveBannerProps {
  session: ActiveSession;
  onEndSession: () => void;
  onOpenChat: () => void;
  onOpenFileTransfer: () => void;
  unreadChatCount?: number;
  lastRemoteAction?: string | null;
}

export const HostActiveBanner: React.FC<HostActiveBannerProps> = ({
  session,
  onEndSession,
  onOpenChat,
  onOpenFileTransfer,
  unreadChatCount = 0,
  lastRemoteAction,
}) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[95%] bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md px-5 py-3 text-white flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top">
      {/* Left indicator */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 relative">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-100">Prise en main en cours</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase tracking-wider">
              Hôte Actif
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Contrôlé par : <strong className="text-slate-200">{session.partnerDeviceName}</strong>
          </p>
        </div>
      </div>

      {/* Center feedback if keystroke/mouse action */}
      {lastRemoteAction && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 animate-in fade-in">
          <MousePointer className="w-3.5 h-3.5" />
          <span>{lastRemoteAction}</span>
        </div>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenChat}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition relative cursor-pointer"
          title="Ouvrir le chat avec le contrôleur"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-[10px] font-bold flex items-center justify-center">
              {unreadChatCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenFileTransfer}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
          title="Partage de fichiers"
        >
          <FolderSync className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={onEndSession}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95"
          title="Couper la connexion immédiatement"
        >
          <Power className="w-3.5 h-3.5" />
          <span>Couper l'accès</span>
        </button>
      </div>
    </div>
  );
};
