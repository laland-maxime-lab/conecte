import fs from 'fs';
import path from 'path';
import type { DeviceInfo, SessionHistoryItem } from '../types/index.ts';

interface StoreData {
  devices: DeviceInfo[];
  sessions: SessionHistoryItem[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'connect_pro_store.json');

export class PersistentStore {
  private data: StoreData = {
    devices: [],
    sessions: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        // Seed initial friendly test device history
        this.data = {
          devices: [
            {
              id: 'dev_win11_bureau',
              name: 'PC Bureau (Windows 11)',
              os: 'windows',
              isOnline: false,
              lastSeen: Date.now() - 3600000,
            },
            {
              id: 'dev_laptop_hp',
              name: 'Laptop HP Envy (Portable)',
              os: 'windows',
              isOnline: false,
              lastSeen: Date.now() - 86400000,
            },
          ],
          sessions: [
            {
              id: 'sess_hist_1',
              date: Date.now() - 7200000,
              deviceName: 'PC Bureau (Windows 11)',
              deviceOs: 'windows',
              role: 'controller',
              durationSeconds: 840,
              filesTransferredCount: 2,
              totalBytesTransferred: 48500000,
              status: 'completed',
            },
          ],
        };
        this.save();
      }
    } catch (e) {
      console.warn('[PersistentStore] Could not load store file, using in-memory state:', e);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[PersistentStore] Failed to write store file:', e);
    }
  }

  getDevices(): DeviceInfo[] {
    return this.data.devices;
  }

  saveDevice(device: DeviceInfo) {
    const idx = this.data.devices.findIndex(d => d.id === device.id);
    if (idx >= 0) {
      this.data.devices[idx] = { ...this.data.devices[idx], ...device };
    } else {
      this.data.devices.push(device);
    }
    this.save();
  }

  deleteDevice(id: string) {
    this.data.devices = this.data.devices.filter(d => d.id !== id);
    this.save();
  }

  getSessions(): SessionHistoryItem[] {
    return this.data.sessions.sort((a, b) => b.date - a.date);
  }

  addSession(session: SessionHistoryItem) {
    this.data.sessions.unshift(session);
    if (this.data.sessions.length > 50) {
      this.data.sessions.pop();
    }
    this.save();
  }
}

export const store = new PersistentStore();
