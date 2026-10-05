import React, { useState } from 'react';
import { ArrowRight, Monitor, FolderSync, Eye, Shield, Loader2, Play } from 'lucide-react';
import { SessionMode } from '../types';

interface ConnectCardProps {
  onConnect: (pin: string, mode: SessionMode) => void;
  isRequestPending: boolean;
  pendingTargetName: string;
  errorMessage: string | null;
  onClearError: () => void;
  onStartSimulation: () => void;
  presetPin?: string;
}

export const ConnectCard: React.FC<ConnectCardProps> = ({
  onConnect,
  isRequestPending,
  pendingTargetName,
  errorMessage,
  onClearError,
  onStartSimulation,
  presetPin,
}) => {
  const [pinInput, setPinInput] = useState(presetPin || '');
  const [mode, setMode] = useState<SessionMode>('full_control');

  // Keep input synced if presetPin changes
  React.useEffect(() => {
    if (presetPin) {
      setPinInput(presetPin);
    }
  }, [presetPin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearError();
    // Allow only digits and spaces, max 6 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length > 3) {
      setPinInput(`${cleaned.slice(0, 3)} ${cleaned.slice(3)}`);
    } else {
      setPinInput(cleaned);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawPin = pinInput.replace(/\s+/g, '');
    if (rawPin.length !== 6) return;
    onConnect(rawPin, mode);
  };

  const rawDigits = pinInput.replace(/\s+/g, '');
  const isReady = rawDigits.length === 6;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Contrôler un appareil distant</h2>
            <p className="text-xs text-slate-400">Entrez le code à 6 chiffres de l'ordinateur cible</p>
          </div>
        </div>

        {/* Connection Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Code du partenaire
            </label>
            <div className="relative">
              <input
                type="text"
                value={pinInput}
                onChange={handleInputChange}
                placeholder="Ex : 492 810"
                disabled={isRequestPending}
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-4 py-3 font-mono text-xl sm:text-2xl text-white placeholder-slate-600 tracking-wider text-center outline-none transition disabled:opacity-50"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                {rawDigits.length}/6
              </span>
            </div>
          </div>

          {/* Session Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Type de session
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('full_control')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  mode === 'full_control'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4 mb-1" />
                <span>Contrôle total</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('view_only')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  mode === 'view_only'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-4 h-4 mb-1" />
                <span>Vue seule</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('file_transfer_only')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  mode === 'file_transfer_only'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderSync className="w-4 h-4 mb-1" />
                <span>Fichiers</span>
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <Shield className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pending state */}
          {isRequestPending && (
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <div>
                <p className="font-semibold">Demande envoyée à {pendingTargetName || 'l’ordinateur'}</p>
                <p className="text-[11px] text-cyan-300/80">En attente de l’acceptation par le propriétaire...</p>
              </div>
            </div>
          )}

          {/* Submit Connect Button */}
          <button
            type="submit"
            disabled={!isReady || isRequestPending}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              isReady && !isRequestPending
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-600/30 active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {isRequestPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Demande en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter à distance</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Simulator Shortcut for easy testing without two computers */}
      <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Pas de second PC sous la main ?</span>
        <button
          onClick={onStartSimulation}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Lancer un bureau de test</span>
        </button>
      </div>
    </div>
  );
};
