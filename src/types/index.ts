export type SessionMode = 'full_control' | 'view_only' | 'file_transfer_only';

export interface DeviceInfo {
  id: string; // Persistent UUID or device fingerprint
  name: string; // e.g. "Windows 11 - Bureau"
  os: 'windows' | 'macos' | 'linux' | 'browser';
  ip?: string;
  isOnline: boolean;
  lastSeen: number;
}

export interface AccessPermissions {
  allowControl: boolean; // Mouse & Keyboard
  allowFileTransfer: boolean;
  allowClipboard: boolean;
  allowAudio: boolean;
}

export interface SessionRequestPayload {
  requestId: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromDeviceOs: 'windows' | 'macos' | 'linux' | 'browser';
  toPin: string;
  mode: SessionMode;
  timestamp: number;
}

export interface SessionAcceptPayload {
  requestId: string;
  sessionId: string;
  hostDeviceId: string;
  controllerDeviceId: string;
  permissions: AccessPermissions;
}

export interface SessionRejectPayload {
  requestId: string;
  reason: string;
}

export interface ActiveSession {
  id: string;
  partnerDeviceId: string;
  partnerDeviceName: string;
  partnerDeviceOs: 'windows' | 'macos' | 'linux' | 'browser';
  isHost: boolean; // true if this machine is being controlled, false if controlling
  mode: SessionMode;
  startTime: number;
  permissions: AccessPermissions;
  connectionType: 'p2p' | 'relay';
  latencyMs: number;
}

export interface SessionHistoryItem {
  id: string;
  date: number;
  deviceName: string;
  deviceOs: 'windows' | 'macos' | 'linux' | 'browser';
  role: 'host' | 'controller';
  durationSeconds: number;
  filesTransferredCount: number;
  totalBytesTransferred: number;
  status: 'completed' | 'interrupted' | 'rejected';
}

export interface PinCodeInfo {
  pin: string; // 6 digits
  expiresAt: number; // Unix timestamp in ms
  ttlSecondsRemaining: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}

export interface FileTransferItem {
  id: string;
  name: string;
  size: number;
  type: string;
  direction: 'upload' | 'download';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'error';
  progress: number; // 0 to 100
  bytesTransferred: number;
  speedBps: number;
  error?: string;
  blobUrl?: string;
}
