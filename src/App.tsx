/**
 * Connect Pro - Application Core & UI Entry Point
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useRemoteSession } from './app-core/useRemoteSession';
import { Header } from './components/Header';
import { MyCodeCard } from './components/MyCodeCard';
import { ConnectCard } from './components/ConnectCard';
import { DeviceList } from './components/DeviceList';
import { SessionHistory } from './components/SessionHistory';
import { IncomingRequestModal } from './components/IncomingRequestModal';
import { HostActiveBanner } from './components/HostActiveBanner';
import { RemoteDesktopView } from './components/RemoteDesktopView';
import { FileTransferModal } from './components/FileTransferModal';
import { ChatDrawer } from './components/ChatDrawer';
import { WindowsGuideModal } from './components/WindowsGuideModal';
import { getSavedPairedDevices, removePairedDevice, savePairedDevice, getLocalSessionHistory } from './app-core/store';
import { DeviceInfo, SessionHistoryItem } from './types';
import { Monitor, Laptop, History, Shield, Info, Edit3, X, Check } from 'lucide-react';

export default function App() {
  const {
    deviceIdentity,
    pinInfo,
    socketStatus,
    incomingRequest,
    isRequestPending,
    pendingTargetName,
    errorMessage,
    setErrorMessage,
    activeSession,
    remoteStream,
    chatMessages,
    fileTransfers,
    hostVirtualCursor,
    lastHostKeyAction,
    inputController,
    actions,
  } = useRemoteSession();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'connect' | 'devices' | 'history'>('connect');

  // Modals state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [tempDeviceName, setTempDeviceName] = useState(deviceIdentity.name);
  const [presetPin, setPresetPin] = useState('');

  // Local device lists & sessions state
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);

  // Load devices and sessions
  useEffect(() => {
    setDevices(getSavedPairedDevices());
    setSessions(getLocalSessionHistory());
  }, [activeSession]);

  const handleDeviceNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempDeviceName.trim()) return;
    actions.updateDeviceName(tempDeviceName.trim());
    setIsRenameOpen(false);
  };

  const handleQuickSelfTest = () => {
    if (pinInfo?.pin) {
      setPresetPin(pinInfo.pin);
      setActiveTab('connect');
    }
  };

  const handleStartSimulation = async () => {
    // Starts an immediate local test session to experience remote desktop tools
    if (pinInfo?.pin) {
      actions.requestConnection(pinInfo.pin, 'full_control');
    }
  };

  const handleSelectDevice = (dev: DeviceInfo) => {
    setActiveTab('connect');
    setErrorMessage(`Pour vous connecter à ${dev.name}, demandez à son utilisateur de vous communiquer son code à 6 chiffres affiché sur son écran.`);
  };

  const handleDeleteDevice = (id: string) => {
    removePairedDevice(id);
    setDevices(getSavedPairedDevices());
  };

  const handleAddDevice = (name: string, os: 'windows' | 'macos' | 'linux') => {
    const newDev: DeviceInfo = {
      id: 'dev_' + Math.random().toString(36).substring(2, 9),
      name,
      os,
      isOnline: false,
      lastSeen: Date.now(),
    };
    savePairedDevice(newDev);
    setDevices(getSavedPairedDevices());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        deviceIdentity={deviceIdentity}
        socketStatus={socketStatus}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenDeviceSettings={() => {
          setTempDeviceName(deviceIdentity.name);
          setIsRenameOpen(true);
        }}
      />

      {/* Host Mode Active Alert (when this machine is being controlled) */}
      {activeSession && activeSession.isHost && (
        <HostActiveBanner
          session={activeSession}
          onEndSession={actions.endSession}
          onOpenChat={() => setIsChatOpen(true)}
          onOpenFileTransfer={() => setIsFileModalOpen(true)}
          unreadChatCount={chatMessages.filter(m => !m.isSelf).length}
          lastRemoteAction={lastHostKeyAction}
        />
      )}

      {/* Controller View: Full Remote Desktop Interface */}
      {activeSession && !activeSession.isHost ? (
        <RemoteDesktopView
          session={activeSession}
          remoteStream={remoteStream}
          inputController={inputController}
          onEndSession={actions.endSession}
          onOpenFileTransfer={() => setIsFileModalOpen(true)}
          onOpenChat={() => setIsChatOpen(true)}
          onSendShortcut={actions.sendShortcut}
          unreadChatCount={chatMessages.filter(m => !m.isSelf).length}
        />
      ) : (
        /* Normal Dashboard View */
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
          {/* Main Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('connect')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'connect'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Connexion</span>
              </button>

              <button
                onClick={() => setActiveTab('devices')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'devices'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>Mes appareils ({devices.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Sessions récentes</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Chiffrement de bout en bout P2P actif</span>
            </div>
          </div>

          {/* Tab 1: Connexion (Mon Code + Se Connecter) */}
          {activeTab === 'connect' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* 1. Mon Code */}
                <MyCodeCard
                  deviceIdentity={deviceIdentity}
                  pinInfo={pinInfo}
                  onRegeneratePin={actions.regeneratePin}
                  onQuickSelfTest={handleQuickSelfTest}
                />

                {/* 2. Se Connecter */}
                <ConnectCard
                  onConnect={actions.requestConnection}
                  isRequestPending={isRequestPending}
                  pendingTargetName={pendingTargetName}
                  errorMessage={errorMessage}
                  onClearError={() => setErrorMessage(null)}
                  onStartSimulation={handleStartSimulation}
                  presetPin={presetPin}
                />
              </div>

              {/* Informative Step-by-Step Card */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">Comment tester entre deux ordinateurs Windows ?</h4>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">
                      1. Lancez Connect Pro sur vos deux PC Windows • 2. Obtenez le code à 6 chiffres sur le PC A • 3. Saisissez ce code sur le PC B • 4. Acceptez la demande sur A.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold transition shrink-0 cursor-pointer"
                >
                  Voir le guide détaillé
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Mes appareils */}
          {activeTab === 'devices' && (
            <DeviceList
              devices={devices}
              onSelectDevice={handleSelectDevice}
              onDeleteDevice={handleDeleteDevice}
              onAddDevice={handleAddDevice}
            />
          )}

          {/* Tab 3: Sessions récentes */}
          {activeTab === 'history' && <SessionHistory sessions={sessions} />}
        </main>
      )}

      {/* Host Virtual Cursor Feedback (when host is viewing remote mouse movements) */}
      {hostVirtualCursor && activeSession?.isHost && (
        <div
          className="fixed pointer-events-none z-50 transition-all duration-75"
          style={{
            left: `${hostVirtualCursor.x * 100}%`,
            top: `${hostVirtualCursor.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-4 h-4 rounded-full bg-cyan-400/80 border-2 border-white shadow-lg animate-pulse" />
          <span className="text-[10px] font-bold bg-cyan-600 text-white px-1.5 py-0.5 rounded shadow ml-2">
            {activeSession.partnerDeviceName}
          </span>
        </div>
      )}

      {/* Security Modal: Incoming Connection Request (Mandatory Owner Approval) */}
      {incomingRequest && (
        <IncomingRequestModal
          request={incomingRequest}
          onAccept={actions.acceptRequest}
          onReject={actions.rejectRequest}
        />
      )}

      {/* File Transfer Modal */}
      <FileTransferModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        transfers={fileTransfers}
        onSendFile={actions.sendFile}
        onCancelTransfer={actions.cancelFileTransfer}
      />

      {/* Live Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={actions.sendChatMessage}
        partnerName={activeSession?.partnerDeviceName || 'Correspondant'}
      />

      {/* Windows & Electron Documentation Guide Modal */}
      <WindowsGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Rename Device Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">Renommer cet ordinateur</h3>
              </div>
              <button onClick={() => setIsRenameOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeviceNameSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nom d'affichage</label>
                <input
                  type="text"
                  value={tempDeviceName}
                  onChange={(e) => setTempDeviceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
