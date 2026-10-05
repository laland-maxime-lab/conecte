import { io, Socket } from 'socket.io-client';
import { PinCodeInfo, SessionRequestPayload, AccessPermissions, SessionMode } from '../types';

export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface SocketClientCallbacks {
  onStatusChange?: (status: SocketStatus) => void;
  onRegistered?: (pinInfo: PinCodeInfo) => void;
  onPinUpdated?: (pinInfo: PinCodeInfo) => void;
  onIncomingRequest?: (request: SessionRequestPayload) => void;
  onRequestPending?: (info: { requestId: string; targetDeviceName: string }) => void;
  onRequestRejected?: (reason: string) => void;
  onRequestError?: (error: string) => void;
  onSessionStarted?: (sessionData: {
    sessionId: string;
    isHost: boolean;
    partnerDeviceId: string;
    partnerDeviceName: string;
    partnerDeviceOs: 'windows' | 'macos' | 'linux' | 'browser';
    mode: SessionMode;
    permissions: AccessPermissions;
    startTime: number;
  }) => void;
  onSessionEnded?: (sessionId: string) => void;
  onWebRTCSignal?: (signal: any) => void;
  onRelayData?: (data: any) => void;
}

export class SocketClient {
  private socket: Socket | null = null;
  private callbacks: SocketClientCallbacks = {};
  private currentDeviceId = '';
  private currentDeviceName = '';
  private currentDeviceOs: 'windows' | 'macos' | 'linux' | 'browser' = 'windows';

  constructor(callbacks: SocketClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: SocketClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  connect(identity: { id: string; name: string; os: 'windows' | 'macos' | 'linux' | 'browser' }) {
    this.currentDeviceId = identity.id;
    this.currentDeviceName = identity.name;
    this.currentDeviceOs = identity.os;

    if (this.socket && this.socket.connected) {
      return;
    }

    this.callbacks.onStatusChange?.('connecting');

    // Connect to origin with robust settings and explicit connection step
    this.socket = io(window.location.origin, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 15000,
      withCredentials: false,
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('[Connect Pro] Socket.IO connection error:', {
        message: err?.message,
        name: err?.name,
        description: err?.description,
        context: err?.context,
      });

      this.callbacks.onStatusChange?.('error');
    });

    this.socket.on('connect', () => {
      console.log('[Connect Pro] Socket connected:', this.socket?.id);

      this.callbacks.onStatusChange?.('connected');

      this.socket?.emit('register-device', {
        deviceId: this.currentDeviceId,
        name: this.currentDeviceName,
        os: this.currentDeviceOs,
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Connect Pro] Socket disconnected:', reason);
      this.callbacks.onStatusChange?.('disconnected');
    });

    this.socket.on('registered', (data: any) => {
      this.callbacks.onRegistered?.({
        pin: data.pin,
        expiresAt: data.expiresAt,
        ttlSecondsRemaining: data.ttlSecondsRemaining,
      });
    });

    this.socket.on('pin-updated', (data: any) => {
      this.callbacks.onPinUpdated?.({
        pin: data.pin,
        expiresAt: data.expiresAt,
        ttlSecondsRemaining: data.ttlSecondsRemaining,
      });
    });

    this.socket.on('incoming-connection-request', (data: SessionRequestPayload) => {
      this.callbacks.onIncomingRequest?.(data);
    });

    this.socket.on('connection-request-pending', (data: any) => {
      this.callbacks.onRequestPending?.(data);
    });

    this.socket.on('connection-rejected', (data: any) => {
      this.callbacks.onRequestRejected?.(data.reason);
    });

    this.socket.on('connection-error', (data: any) => {
      this.callbacks.onRequestError?.(data.message);
    });

    this.socket.on('session-started', (data: any) => {
      this.callbacks.onSessionStarted?.(data);
    });

    this.socket.on('session-ended', (data: any) => {
      this.callbacks.onSessionEnded?.(data.sessionId);
    });

    this.socket.on('webrtc-signal', (data: any) => {
      this.callbacks.onWebRTCSignal?.(data);
    });

    this.socket.on('relay-data', (data: any) => {
      this.callbacks.onRelayData?.(data.data);
    });

    // Explicitly initiate connection after all event listeners are ready
    this.socket.connect();
  }

  regeneratePin() {
    this.socket?.emit('regenerate-pin');
  }

  updateDeviceName(newName: string) {
    this.currentDeviceName = newName;
    this.socket?.emit('register-device', {
      deviceId: this.currentDeviceId,
      name: newName,
      os: this.currentDeviceOs,
    });
  }

  requestConnection(toPin: string, mode: SessionMode = 'full_control') {
    this.socket?.emit('request-connection', { toPin, mode });
  }

  respondToRequest(requestId: string, accept: boolean, permissions?: AccessPermissions, reason?: string) {
    this.socket?.emit('respond-connection-request', {
      requestId,
      accept,
      permissions,
      reason,
    });
  }

  sendWebRTCSignal(signal: any) {
    this.socket?.emit('webrtc-signal', signal);
  }

  sendRelayData(targetDeviceId: string, sessionId: string, data: any) {
    this.socket?.emit('relay-data', {
      targetDeviceId,
      sessionId,
      data,
    });
  }

  endSession(sessionId: string) {
    this.socket?.emit('end-session', { sessionId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
