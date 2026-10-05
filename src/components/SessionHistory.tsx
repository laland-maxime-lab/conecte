import React from 'react';
import { History, Clock, FileText, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { SessionHistoryItem } from '../types';

interface SessionHistoryProps {
  sessions: SessionHistoryItem[];
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ sessions }) => {
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    if (mins === 0) return `${s}s`;
    return `${mins}m ${s}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Mo';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${Math.round(bytes / 1024)} Ko`;
    return `${mb.toFixed(1)} Mo`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">Sessions récentes</h2>
          <p className="text-xs text-slate-400">Journal de vos contrôles à distance et transferts</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          Aucun historique de session disponible.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    sess.role === 'controller'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                  title={sess.role === 'controller' ? 'Vous avez pris la main' : 'Prise en main reçue'}
                >
                  {sess.role === 'controller' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span>{sess.deviceName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {sess.role === 'controller' ? 'Contrôleur' : 'Hôte'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{formatDate(sess.date)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(sess.durationSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-400">
                {sess.filesTransferredCount > 0 ? (
                  <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md text-[11px] text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {sess.filesTransferredCount} fichier{sess.filesTransferredCount > 1 ? 's' : ''} ({formatFileSize(sess.totalBytesTransferred)})
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">Aucun fichier</span>
                )}

                <div className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terminée</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
