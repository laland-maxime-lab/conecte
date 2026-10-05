import { DeviceInfo, SessionHistoryItem } from '../types';

const STORAGE_KEY_DEVICE = 'connect_pro_device_identity';
const STORAGE_KEY_SAVED_DEVICES = 'connect_pro_saved_devices';
const STORAGE_KEY_SESSIONS = 'connect_pro_session_history';

export function getOrCreateDeviceIdentity(): { id: string; name: string; os: 'windows' | 'macos' | 'linux' | 'browser' } {
  // Check sessionStorage first so two tabs on the same computer can test simultaneously
  try {
    const sessionSaved = sessionStorage.getItem(STORAGE_KEY_DEVICE);
    if (sessionSaved) {
      return JSON.parse(sessionSaved);
    }
  } catch (e) {
    // Ignore
  }

  // Detect OS
  const ua = navigator.userAgent.toLowerCase();
  let os: 'windows' | 'macos' | 'linux' | 'browser' = 'windows';
  if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (!ua.includes('win')) os = 'browser';

  const defaultNames: Record<string, string> = {
    windows: 'PC Windows 11',
    macos: 'MacBook Pro',
    linux: 'Station Linux Ubuntu',
    browser: 'Poste Navigateur',
  };

  const id = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36).slice(-4);
  const name = defaultNames[os] + ' (' + id.slice(-4).toUpperCase() + ')';

  const identity = { id, name, os };
  try {
    sessionStorage.setItem(STORAGE_KEY_DEVICE, JSON.stringify(identity));
  } catch (e) {
    // Ignore
  }

  return identity;
}

export function updateLocalDeviceName(name: string) {
  const current = getOrCreateDeviceIdentity();
  current.name = name;
  try {
    sessionStorage.setItem(STORAGE_KEY_DEVICE, JSON.stringify(current));
    localStorage.setItem(STORAGE_KEY_DEVICE, JSON.stringify(current));
  } catch (e) {
    // Ignore
  }
}

export function getSavedPairedDevices(): DeviceInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_DEVICES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore
  }
  return [
    {
      id: 'dev_bureau_demo',
      name: 'PC Fixe Bureau (Windows 11)',
      os: 'windows',
      isOnline: false,
      lastSeen: Date.now() - 3600000 * 2,
    },
    {
      id: 'dev_laptop_demo',
      name: 'PC Portable Travail (Win 10)',
      os: 'windows',
      isOnline: false,
      lastSeen: Date.now() - 86400000,
    },
  ];
}

export function savePairedDevice(device: DeviceInfo) {
  const list = getSavedPairedDevices();
  const index = list.findIndex(d => d.id === device.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...device };
  } else {
    list.unshift(device);
  }
  localStorage.setItem(STORAGE_KEY_SAVED_DEVICES, JSON.stringify(list));
}

export function removePairedDevice(id: string) {
  const list = getSavedPairedDevices().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY_SAVED_DEVICES, JSON.stringify(list));
}

export function getLocalSessionHistory(): SessionHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore
  }
  return [
    {
      id: 'sess_prev_1',
      date: Date.now() - 1000 * 60 * 45,
      deviceName: 'PC Fixe Bureau (Windows 11)',
      deviceOs: 'windows',
      role: 'controller',
      durationSeconds: 742,
      filesTransferredCount: 1,
      totalBytesTransferred: 14200000,
      status: 'completed',
    },
  ];
}

export function addSessionToLocalHistory(item: SessionHistoryItem) {
  const list = getLocalSessionHistory();
  list.unshift(item);
  if (list.length > 30) list.pop();
  localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(list));
}
