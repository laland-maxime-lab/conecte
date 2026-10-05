import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DeviceInfo,
  PinCodeInfo,
  SessionRequestPayload,
  ActiveSession,
  ChatMessage,
  FileTransferItem,
  SessionMode,
  AccessPermissions,
} from '../types';
import { getOrCreateDeviceIdentity, updateLocalDeviceName, addSessionToLocalHistory, savePairedDevice } from './store';
import { SocketClient, SocketStatus } from './socketClient';
import { ScreenCaptureManager } from '../remote-core/screenCapture';
import { WebRTCPeer } from '../remote-core/webrtcPeer';
import { RemoteInputController, RemoteInputReceiver } from '../remote-core/inputControl';
import { FileTransferManager } from '../remote-core/fileTransfer';
import { InputEvent, RemoteCoreDataMessage } from '../remote-core/types';

export function useRemoteSession() {
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceInfo>(() => {
    const id = getOrCreateDeviceIdentity();
    return { ...id, isOnline: false, lastSeen: Date.now() };
  });

  const [pinInfo, setPinInfo] = useState<PinCodeInfo | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const [incomingRequest, setIncomingRequest] = useState<SessionRequestPayload | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [pendingTargetName, setPendingTargetName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Session State
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSimulatedStream, setIsSimulatedStream] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [fileTransfers, setFileTransfers] = useState<FileTransferItem[]>([]);
  const [hostVirtualCursor, setHostVirtualCursor] = useState<{ x: number; y: number } | null>(null);
  const [lastHostKeyAction, setLastHostKeyAction] = useState<string | null>(null);

  // Class Instances Refs
  const socketClientRef = useRef<SocketClient | null>(null);
  const screenCaptureRef = useRef<ScreenCaptureManager>(new ScreenCaptureManager());
  const webrtcPeerRef = useRef<WebRTCPeer | null>(null);
  const inputControllerRef = useRef<RemoteInputController>(new RemoteInputController());
  const inputReceiverRef = useRef<RemoteInputReceiver | null>(null);
  const fileTransferRef = useRef<FileTransferManager>(new FileTransferManager());

  // Keep ref to current active session for callbacks
  const activeSessionRef = useRef<ActiveSession | null>(null);
  activeSessionRef.current = activeSession;

  // Initialize Socket.io on mount
  useEffect(() => {
    const socketClient = new SocketClient({
      onStatusChange: (status) => {
        setSocketStatus(status);
        setDeviceIdentity(prev => ({ ...prev, isOnline: status === 'connected' }));
      },
      onRegistered: (info) => {
        setPinInfo(info);
      },
      onPinUpdated: (info) => {
        setPinInfo(info);
      },
      onIncomingRequest: (request) => {
        setIncomingRequest(request);
      },
      onRequestPending: (info) => {
        setIsRequestPending(true);
        setPendingTargetName(info.targetDeviceName);
      },
      onRequestRejected: (reason) => {
        setIsRequestPending(false);
        setErrorMessage(reason || 'Connexion refusée par le correspondant.');
      },
      onRequestError: (err) => {
        setIsRequestPending(false);
        setErrorMessage(err);
      },
      onSessionStarted: async (data) => {
        setIsRequestPending(false);
        setIncomingRequest(null);
        setErrorMessage(null);

        const session: ActiveSession = {
          id: data.sessionId,
          partnerDeviceId: data.partnerDeviceId,
          partnerDeviceName: data.partnerDeviceName,
          partnerDeviceOs: data.partnerDeviceOs,
          isHost: data.isHost,
          mode: data.mode,
          startTime: data.startTime,
          permissions: data.permissions,
          connectionType: 'p2p',
          latencyMs: 15,
        };

        setActiveSession(session);
        setChatMessages([]);
        setFileTransfers([]);

        // Save to paired devices list
        savePairedDevice({
          id: data.partnerDeviceId,
          name: data.partnerDeviceName,
          os: data.partnerDeviceOs,
          isOnline: true,
          lastSeen: Date.now(),
        });

        // Initialize WebRTC & Media
        await setupSessionConnection(session);
      },
      onSessionEnded: () => {
        handleTerminateSession(false);
      },
      onWebRTCSignal: (signal) => {
        webrtcPeerRef.current?.handleSignaling(signal);
      },
      onRelayData: (data) => {
        webrtcPeerRef.current?.handleRelayData(data);
      },
    });

    socketClientRef.current = socketClient;
    socketClient.connect(deviceIdentity);

    // Setup File Transfer send function
    fileTransferRef.current.setSendFunction((msg) => {
      webrtcPeerRef.current?.sendData(msg);
    });

    fileTransferRef.current.setProgressCallback((item) => {
      setFileTransfers(prev => {
        const idx = prev.findIndex(t => t.id === item.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = item;
          return updated;
        }
        return [item, ...prev];
      });
    });

    // Setup Input Controller send callback
    inputControllerRef.current.setSendCallback((event: InputEvent) => {
      const current = activeSessionRef.current;
      if (!current || current.isHost || !current.permissions.allowControl) return;

      webrtcPeerRef.current?.sendData({
        type: 'input',
        payload: event,
      });
    });

    // Setup Input Receiver for Host
    inputReceiverRef.current = new RemoteInputReceiver({
      onVirtualCursorMove: (x, y) => {
        setHostVirtualCursor({ x, y });
        // Also feed into simulated canvas if simulation is active
        screenCaptureRef.current.applySimulatedInput('mouse', { x, y });
      },
      onKeyActivity: (keyDesc) => {
        setLastHostKeyAction(keyDesc);
        screenCaptureRef.current.applySimulatedInput('key', { key: keyDesc });
        setTimeout(() => setLastHostKeyAction(null), 1800);
      },
    });

    return () => {
      socketClient.disconnect();
      screenCaptureRef.current.stopCapture();
      webrtcPeerRef.current?.close();
    };
  }, []);

  // Setup Peer connection and streams for an active session
  const setupSessionConnection = async (session: ActiveSession) => {
    let localStream: MediaStream | null = null;

    if (session.isHost) {
      // Host side: Start screen capture (real getDisplayMedia or fallback interactive simulator)
      const captureResult = await screenCaptureRef.current.startCapture({
        resolution: '1080p',
        fps: 60,
      });
      localStream = captureResult.stream;
      setIsSimulatedStream(captureResult.isSimulated);
    }

    const peer = new WebRTCPeer({
      isInitiator: !session.isHost, // Controller initiates offer
      sessionId: session.id,
      myDeviceId: deviceIdentity.id,
      partnerDeviceId: session.partnerDeviceId,
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onConnectionStateChange: (state) => {
        setActiveSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            connectionType: state === 'relay' ? 'relay' : 'p2p',
          };
        });
      },
      onLatencyUpdate: (ms) => {
        setActiveSession(prev => (prev ? { ...prev, latencyMs: ms } : null));
      },
      sendSignaling: (payload) => {
        socketClientRef.current?.sendWebRTCSignal(payload);
      },
      sendRelayData: (targetDeviceId, data) => {
        socketClientRef.current?.sendRelayData(targetDeviceId, session.id, data);
      },
      onDataMessage: (msg: RemoteCoreDataMessage) => {
        handleIncomingDataMessage(msg);
      },
    });

    webrtcPeerRef.current = peer;
    await peer.initialize(localStream);
  };

  // Handle incoming data message from WebRTC or WebSocket Relay
  const handleIncomingDataMessage = (msg: RemoteCoreDataMessage) => {
    switch (msg.type) {
      case 'input':
        inputReceiverRef.current?.handleRemoteEvent(msg.payload);
        break;

      case 'chat':
        setChatMessages(prev => [
          ...prev,
          {
            id: msg.payload.id,
            senderId: 'remote',
            senderName: msg.payload.senderName,
            text: msg.payload.text,
            timestamp: msg.payload.timestamp,
            isSelf: false,
          },
        ]);
        break;

      case 'file':
        fileTransferRef.current.handleIncomingFilePayload(msg.payload);
        break;
    }
  };

  // Terminate active session
  const handleTerminateSession = useCallback((notifyRemote = true) => {
    const session = activeSessionRef.current;
    if (session) {
      if (notifyRemote) {
        socketClientRef.current?.endSession(session.id);
      }

      // Record in local history
      const durationSeconds = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
      addSessionToLocalHistory({
        id: session.id,
        date: session.startTime,
        deviceName: session.partnerDeviceName,
        deviceOs: session.partnerDeviceOs,
        role: session.isHost ? 'host' : 'controller',
        durationSeconds,
        filesTransferredCount: fileTransfers.filter(t => t.status === 'completed').length,
        totalBytesTransferred: fileTransfers.reduce((acc, t) => acc + (t.bytesTransferred || 0), 0),
        status: 'completed',
      });
    }

    screenCaptureRef.current.stopCapture();
    webrtcPeerRef.current?.close();
    webrtcPeerRef.current = null;
    setActiveSession(null);
    setRemoteStream(null);
    setHostVirtualCursor(null);
  }, [fileTransfers]);

  // Public Actions
  const handleRegeneratePin = () => {
    socketClientRef.current?.regeneratePin();
  };

  const handleUpdateDeviceName = (name: string) => {
    updateLocalDeviceName(name);
    setDeviceIdentity(prev => ({ ...prev, name }));
    socketClientRef.current?.updateDeviceName(name);
  };

  const handleRequestConnection = (toPin: string, mode: SessionMode = 'full_control') => {
    setErrorMessage(null);
    socketClientRef.current?.requestConnection(toPin, mode);
  };

  const handleAcceptRequest = (requestId: string, permissions: AccessPermissions) => {
    socketClientRef.current?.respondToRequest(requestId, true, permissions);
  };

  const handleRejectRequest = (requestId: string, reason?: string) => {
    socketClientRef.current?.respondToRequest(requestId, false, undefined, reason);
    setIncomingRequest(null);
  };

  const handleSendChatMessage = (text: string) => {
    if (!text.trim() || !activeSession) return;
    const msgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const newMsg: ChatMessage = {
      id: msgId,
      senderId: deviceIdentity.id,
      senderName: deviceIdentity.name,
      text: text.trim(),
      timestamp: Date.now(),
      isSelf: true,
    };

    setChatMessages(prev => [...prev, newMsg]);

    webrtcPeerRef.current?.sendData({
      type: 'chat',
      payload: {
        id: msgId,
        senderName: deviceIdentity.name,
        text: text.trim(),
        timestamp: Date.now(),
      },
    });
  };

  const handleSendFile = async (file: File) => {
    return fileTransferRef.current.sendFile(file);
  };

  const handleCancelFileTransfer = (id: string) => {
    fileTransferRef.current.cancelTransfer(id);
  };

  const handleSendShortcut = (action: 'ctrl-alt-del' | 'win-d' | 'alt-tab' | 'esc' | 'enter') => {
    inputControllerRef.current.sendShortcut(action);
  };

  const handleStartDemoSession = async () => {
    setErrorMessage(null);
    setIsRequestPending(false);

    // Setup input controller to feed directly to screenCapture simulator
    inputControllerRef.current.setSendCallback((event) => {
      if (event.type === 'mousemove') {
        screenCaptureRef.current.applySimulatedInput('mouse', { x: event.x, y: event.y });
      } else if (event.type === 'mousedown' || event.type === 'click') {
        screenCaptureRef.current.applySimulatedInput('mouse', { x: event.x, y: event.y });
      } else if (event.type === 'keydown') {
        screenCaptureRef.current.applySimulatedInput('key', { key: event.key });
      }
    });

    const captureResult = await screenCaptureRef.current.startCapture({ resolution: '1080p', fps: 60 });
    setRemoteStream(captureResult.stream);
    setIsSimulatedStream(true);

    const demoSession: ActiveSession = {
      id: 'demo_' + Date.now().toString(36),
      partnerDeviceId: 'dev_demo_pc_simulated',
      partnerDeviceName: 'PC Windows 11 (Bureau Interactif de Test)',
      partnerDeviceOs: 'windows',
      isHost: false,
      mode: 'full_control',
      startTime: Date.now(),
      permissions: { allowControl: true, allowFileTransfer: true, allowClipboard: true, allowAudio: true },
      connectionType: 'p2p',
      latencyMs: 5,
    };

    setActiveSession(demoSession);
    setChatMessages([
      {
        id: 'msg_welcome',
        senderId: 'remote',
        senderName: 'PC Windows 11 (Test)',
        text: 'Bienvenue dans la session de test Connect Pro ! Vous pouvez déplacer la souris, taper du texte au clavier, envoyer un fichier ou ouvrir le chat.',
        timestamp: Date.now(),
        isSelf: false,
      }
    ]);
  };

  return {
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
    isSimulatedStream,
    chatMessages,
    fileTransfers,
    hostVirtualCursor,
    lastHostKeyAction,
    inputController: inputControllerRef.current,
    actions: {
      regeneratePin: handleRegeneratePin,
      updateDeviceName: handleUpdateDeviceName,
      requestConnection: handleRequestConnection,
      acceptRequest: handleAcceptRequest,
      rejectRequest: handleRejectRequest,
      endSession: () => handleTerminateSession(true),
      sendChatMessage: handleSendChatMessage,
      sendFile: handleSendFile,
      cancelFileTransfer: handleCancelFileTransfer,
      sendShortcut: handleSendShortcut,
      startDemoSession: handleStartDemoSession,
    },
  };
}
