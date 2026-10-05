import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, KeyRound, ShieldAlert, Clock, ArrowRight } from 'lucide-react';
import { DeviceInfo, PinCodeInfo } from '../types';

interface MyCodeCardProps {
  deviceIdentity: DeviceInfo;
  pinInfo: PinCodeInfo | null;
  onRegeneratePin: () => void;
  onQuickSelfTest: () => void;
}

export const MyCodeCard: React.FC<MyCodeCardProps> = ({
  deviceIdentity,
  pinInfo,
  onRegeneratePin,
  onQuickSelfTest,
}) => {
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isRotating, setIsRotating] = useState(false);

  // Compute and tick expiration countdown
  useEffect(() => {
    if (!pinInfo) return;

    const updateTimer = () => {
      const diffMs = pinInfo.expiresAt - Date.now();
      setSecondsRemaining(Math.max(0, Math.floor(diffMs / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pinInfo]);

  const handleCopy = () => {
    if (!pinInfo?.pin) return;
    navigator.clipboard.writeText(pinInfo.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setIsRotating(true);
    onRegeneratePin();
    setTimeout(() => setIsRotating(false), 600);
  };

  // Format 6 digits with a space in the middle: "849 201"
  const formattedPin = pinInfo?.pin
    ? `${pinInfo.pin.slice(0, 3)} ${pinInfo.pin.slice(3)}`
    : '--- ---';

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Autoriser le contrôle</h2>
              <p className="text-xs text-slate-400">Donnez ce code pour être contrôlé à distance</p>
            </div>
          </div>

          <button
            onClick={handleRegenerate}
            title="Générer un nouveau code de sécurité"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRotating ? 'animate-spin' : ''}`} />
            <span>Nouveau code</span>
          </button>
        </div>

        {/* 6-Digit PIN Display Box */}
        <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-5 mb-5 relative group shadow-inner">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Votre code à 6 chiffres</span>
            {secondsRemaining > 0 && (
              <span className="flex items-center gap-1 text-slate-400 text-[11px] font-normal">
                <Clock className="w-3 h-3 text-amber-400" />
                Expire dans <span className="font-mono font-medium text-amber-400">{formatCountdown(secondsRemaining)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 select-all">
              {formattedPin}
            </div>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 mb-4 text-xs text-slate-300 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-200">Sécurité stricte :</span> Personne ne peut accéder à votre écran sans votre validation manuelle. Un dialogue d’autorisation apparaîtra dès la saisie du code.
          </div>
        </div>
      </div>

      {/* Quick single-machine self-test shortcut */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Tester sur cette même machine ?</span>
        <button
          onClick={onQuickSelfTest}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
        >
          <span>Auto-remplir pour tester</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
