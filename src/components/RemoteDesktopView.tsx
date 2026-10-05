import React, { useRef, useEffect, useState } from 'react';
import {
  Power,
  Maximize2,
  Minimize2,
  MousePointer,
  MessageSquare,
  FolderSync,
  Sliders,
  Keyboard,
  Shield,
  Wifi,
  ChevronDown,
  Monitor,
} from 'lucide-react';
import { ActiveSession } from '../types';
import { RemoteInputController } from '../remote-core/inputControl';

interface RemoteDesktopViewProps {
  session: ActiveSession;
  remoteStream: MediaStream | null;
  inputController: RemoteInputController;
  onEndSession: () => void;
  onOpenFileTransfer: () => void;
  onOpenChat: () => void;
  onSendShortcut: (action: 'ctrl-alt-del' | 'win-d' | 'alt-tab' | 'esc' | 'enter') => void;
  unreadChatCount?: number;
}

export const RemoteDesktopView: React.FC<RemoteDesktopViewProps> = ({
  session,
  remoteStream,
  inputController,
  onEndSession,
  onOpenFileTransfer,
  onOpenChat,
  onSendShortcut,
  unreadChatCount = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlActive, setIsControlActive] = useState(session.permissions.allowControl);
  const [showShortcutsMenu, setShowShortcutsMenu] = useState(false);
  const [quality, setQuality] = useState<'1080p' | '720p' | 'balanced'>('1080p');
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);

  // Bind video stream
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(e => {
        console.warn('[RemoteDesktopView] Video autoplay prevented:', e);
      });
    }
  }, [remoteStream]);

  // Attach input controller to video container
  useEffect(() => {
    if (containerRef.current && isControlActive) {
      inputController.setEnabled(true);
      inputController.attachToElement(containerRef.current);
    } else {
      inputController.setEnabled(false);
      inputController.detach();
    }

    return () => {
      inputController.detach();
    };
  }, [inputController, isControlActive]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const handleShortcutClick = (action: 'ctrl-alt-del' | 'win-d' | 'alt-tab' | 'esc' | 'enter') => {
    onSendShortcut(action);
    setShowShortcutsMenu(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-64px)] bg-slate-950 flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* TeamViewer-Style Floating Top Toolbar */}
      <div
        onMouseEnter={() => setIsToolbarHovered(true)}
        onMouseLeave={() => setIsToolbarHovered(false)}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 group"
      >
        <div className="bg-slate-900/95 hover:bg-slate-900 border border-slate-700/80 rounded-b-2xl shadow-2xl backdrop-blur-md px-4 py-2 flex items-center gap-3 text-xs text-white">
          {/* Partner & Connection Info */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <span className="font-bold text-slate-200">{session.partnerDeviceName}</span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <Wifi className="w-3 h-3" />
              <span>{session.latencyMs || 15}ms</span>
              <span className="text-[10px] uppercase text-slate-500 font-sans ml-1">
                ({session.connectionType})
              </span>
            </div>
          </div>

          {/* Toggle Control / View-Only */}
          <button
            onClick={() => setIsControlActive(!isControlActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
              isControlActive
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Activer ou désactiver le contrôle souris/clavier"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>{isControlActive ? 'Contrôle actif' : 'Vue seule'}</span>
          </button>

          {/* Windows Special Shortcuts Menu */}
          <div className="relative">
            <button
              onClick={() => setShowShortcutsMenu(!showShortcutsMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
              <span>Raccourcis Win</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showShortcutsMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in">
                <button
                  onClick={() => handleShortcutClick('ctrl-alt-del')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 font-medium flex items-center justify-between"
                >
                  <span>Ctrl + Alt + Suppr</span>
                  <span className="text-[10px] text-slate-500">Sécurité</span>
                </button>
                <button
                  onClick={() => handleShortcutClick('win-d')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 font-medium flex items-center justify-between"
                >
                  <span>Win + D</span>
                  <span className="text-[10px] text-slate-500">Bureau</span>
                </button>
                <button
                  onClick={() => handleShortcutClick('alt-tab')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 font-medium flex items-center justify-between"
                >
                  <span>Alt + Tab</span>
                  <span className="text-[10px] text-slate-500">Fenêtres</span>
                </button>
                <button
                  onClick={() => handleShortcutClick('esc')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 font-medium"
                >
                  Échap (ESC)
                </button>
              </div>
            )}
          </div>

          {/* File Transfer */}
          <button
            onClick={onOpenFileTransfer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Transférer des fichiers vers l'ordinateur distant"
          >
            <FolderSync className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fichiers</span>
          </button>

          {/* Live Chat */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition relative cursor-pointer"
            title="Ouvrir le chat textuel"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Chat</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-[10px] font-bold">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Red Disconnect Button */}
          <button
            onClick={onEndSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-md shadow-rose-600/30 cursor-pointer ml-1"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Terminer</span>
          </button>
        </div>
      </div>

      {/* Main Remote Display Area */}
      <div className="relative w-full h-full flex items-center justify-center p-2">
        {remoteStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-800 cursor-crosshair"
          />
        ) : (
          <div className="text-center space-y-4 p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto animate-pulse">
              <Monitor className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-base">Connexion au flux vidéo distant...</h3>
              <p className="text-xs text-slate-400 mt-1">
                Négociation WebRTC P2P en cours avec STUN/Relay...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control Hint Footer */}
      {isControlActive && (
        <div className="absolute bottom-2 left-4 text-[11px] text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 pointer-events-none">
          Souris et clavier actifs • Clic droit transmis
        </div>
      )}
    </div>
  );
};
