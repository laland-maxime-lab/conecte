import React, { useState } from 'react';
import { Laptop, Monitor, Trash2, ArrowUpRight, Plus, Wifi, WifiOff } from 'lucide-react';
import { DeviceInfo } from '../types';

interface DeviceListProps {
  devices: DeviceInfo[];
  onSelectDevice: (device: DeviceInfo) => void;
  onDeleteDevice: (id: string) => void;
  onAddDevice: (name: string, os: 'windows' | 'macos' | 'linux') => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  onSelectDevice,
  onDeleteDevice,
  onAddDevice,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOs, setNewOs] = useState<'windows' | 'macos' | 'linux'>('windows');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddDevice(newName.trim(), newOs);
    setNewName('');
    setIsAdding(false);
  };

  const getOsIcon = (os: string) => {
    switch (os) {
      case 'windows':
        return <span title="Windows">🪟</span>;
      case 'macos':
        return <span title="macOS">🍎</span>;
      case 'linux':
        return <span title="Linux">🐧</span>;
      default:
        return <Monitor className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'À l’instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} j`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Mes appareils enregistrés</h2>
            <p className="text-xs text-slate-400">Vos ordinateurs personnels pour un accès rapide</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter un PC</span>
        </button>
      </div>

      {/* Add Device Form Drawer */}
      {isAdding && (
        <form onSubmit={handleCreate} className="mb-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 animate-in fade-in">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Enregistrer un nouvel appareil
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom (ex : PC Tour Windows 11)"
              className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              autoFocus
            />
            <select
              value={newOs}
              onChange={(e) => setNewOs(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="windows">Windows</option>
              <option value="linux">Linux</option>
              <option value="macos">macOS</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {devices.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          Aucun appareil enregistré pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="p-4 rounded-xl bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="text-xl p-2 rounded-lg bg-slate-800/70">
                  {getOsIcon(device.os)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">{device.name}</span>
                    {device.isOnline ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <Wifi className="w-2.5 h-2.5" /> En ligne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                        <WifiOff className="w-2.5 h-2.5" /> Hors ligne
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Activité : {formatLastSeen(device.lastSeen)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                <button
                  onClick={() => onSelectDevice(device)}
                  title="Demander la connexion"
                  className="p-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 transition cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteDevice(device.id)}
                  title="Supprimer cet appareil"
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
