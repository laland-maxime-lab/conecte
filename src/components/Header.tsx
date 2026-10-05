import React, { useState } from 'react';
import { Monitor, ShieldCheck, Wifi, WifiOff, RefreshCw, HelpCircle, Laptop, Share2, Check } from 'lucide-react';
import { DeviceInfo } from '../types';
import { SocketStatus } from '../app-core/socketClient';

interface HeaderProps {
  deviceIdentity: DeviceInfo;
  socketStatus: SocketStatus;
  onOpenGuide: () => void;
  onOpenDeviceSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  deviceIdentity,
  socketStatus,
  onOpenGuide,
  onOpenDeviceSettings,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 select-none shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-lg text-slate-100">Connect<span className="text-blue-500">Pro</span></span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              MVP Test P2P
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Contrôle à distance sécurisé & chiffré
          </p>
        </div>
      </div>

      {/* Center/Right: Device Presence & Network Status */}
      <div className="flex items-center gap-3">
        {/* Device pill */}
        <button
          onClick={onOpenDeviceSettings}
          title="Modifier le nom de cet appareil"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs transition cursor-pointer text-slate-300 hover:text-white"
        >
          <Laptop className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium max-w-[180px] truncate">{deviceIdentity.name}</span>
          <span className="text-[10px] text-slate-500 hover:text-blue-400">Modifier</span>
        </button>

        {/* Network Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-medium">
          {socketStatus === 'connected' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Prêt à connecter</span>
            </>
          ) : socketStatus === 'connecting' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-amber-400">Connexion réseau...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400">Déconnecté</span>
            </>
          )}
        </div>

        {/* Share Live Link for 2nd PC */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2500);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            linkCopied
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 hover:text-cyan-300 border-cyan-500/30'
          }`}
          title="Copier le lien en ligne pour l'ouvrir sur le second ordinateur"
        >
          {linkCopied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Lien copié !</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Lien pour 2ème PC</span>
            </>
          )}
        </button>

        {/* Download Project ZIP */}
        <a
          href="/download"
          download="connect-pro-desktop.zip"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer shadow-sm"
          title="Télécharger l'intégralité du code source en fichier ZIP"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Télécharger ZIP</span>
        </a>

        {/* Windows & Electron packaging guide button */}
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-semibold transition cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Guide Déploiement</span>
        </button>
      </div>
    </header>
  );
};
