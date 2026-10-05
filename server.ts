import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { store } from './src/server/store.ts';
import type { DeviceInfo, AccessPermissions, SessionMode } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3000) : 3000;

app.use(express.json({ limit: '50mb' }));

// Route to download project ZIP
app.get(['/download', '/api/download', '/api/download-zip'], (req, res) => {
  const publicZip = path.resolve(__dirname, 'public', 'connect-pro.zip');
  const distZip = path.resolve(__dirname, 'dist', 'connect-pro.zip');
  const target = fs.existsSync(publicZip) ? publicZip : distZip;
  if (fs.existsSync(target)) {
    res.download(target, 'connect-pro-desktop.zip');
  } else {
    res.status(404).json({ error: 'Fichier zip non trouvé' });
  }
});

// Socket.IO Server configuration
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e8, // 100MB for relay chunk transfers
});

interface ConnectedDevice {
  socketId: string;
  deviceId: string;
  deviceName: string;
  os: 'windows' | 'macos' | 'linux' | 'browser';
  pin: string;
  pinExpiresAt: number;
  currentSessionId?: string;
  ip: string;
}

// In-memory mapping
const activeDevicesBySocket = new Map<string, ConnectedDevice>();
const activeDevicesById = new Map<string, ConnectedDevice>();
const pinIndex = new Map<string, string>(); // PIN -> deviceId
const rateLimitByIp = new Map<string, { count: number; resetAt: number }>();
const pendingRequests = new Map<string, {
  requestId: string;
  fromSocketId: string;
  fromDeviceId: string;
  toDeviceId: string;
  mode: SessionMode;
  timer: NodeJS.Timeout;
}>();

// Helper: Generate unique 6-digit PIN (100 000 - 999 999)
function generateUniquePin(): string {
  let pin = '';
  let attempts = 0;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
  } while (pinIndex.has(pin) && attempts < 100);
  return pin;
}

const PIN_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// Rate limit helper: 60 attempts per minute per IP (relaxed for multi-device testing on shared Wi-Fi)
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitByIp.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitByIp.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 60) {
    return false; // Rate limited
  }
  entry.count++;
  return true;
}

// REST APIs
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    onlineDevicesCount: activeDevicesById.size,
    timestamp: Date.now(),
  });
});

app.get('/api/devices', (req, res) => {
  const devices = store.getDevices();
  const enriched = devices.map(d => ({
    ...d,
    isOnline: activeDevicesById.has(d.id),
  }));
  res.json(enriched);
});

app.post('/api/devices', (req, res) => {
  const dev = req.body as DeviceInfo;
  if (!dev || !dev.id || !dev.name) {
    return res.status(400).json({ error: 'Données de périphérique invalides' });
  }
  store.saveDevice(dev);
  res.json({ success: true, device: dev });
});

app.delete('/api/devices/:id', (req, res) => {
  store.deleteDevice(req.params.id);
  res.json({ success: true });
});

app.get('/api/sessions', (req, res) => {
  res.json(store.getSessions());
});

app.post('/api/sessions', (req, res) => {
  const session = req.body;
  if (!session || !session.id) {
    return res.status(400).json({ error: 'Données de session invalides' });
  }
  store.addSession(session);
  res.json({ success: true });
});

// Socket.io Real-Time Protocol
io.on('connection', (socket: Socket) => {
  const clientIp = (socket.handshake.headers['x-forwarded-for'] as string) || socket.handshake.address || '127.0.0.1';

  // 1. Register device & assign 6-digit pin
  socket.on('register-device', (payload: { deviceId: string; name: string; os?: 'windows' | 'macos' | 'linux' | 'browser' }) => {
    const { deviceId, name, os = 'windows' } = payload;
    if (!deviceId) return;

    // Check if device already has a valid PIN
    let pin = '';
    const existing = activeDevicesById.get(deviceId);
    if (existing && existing.pinExpiresAt > Date.now()) {
      pin = existing.pin;
    } else {
      if (existing) pinIndex.delete(existing.pin);
      pin = generateUniquePin();
    }

    const expiresAt = Date.now() + PIN_TTL_MS;
    pinIndex.set(pin, deviceId);

    const devInfo: ConnectedDevice = {
      socketId: socket.id,
      deviceId,
      deviceName: name || 'PC Windows Connect Pro',
      os,
      pin,
      pinExpiresAt: expiresAt,
      ip: clientIp,
    };

    activeDevicesBySocket.set(socket.id, devInfo);
    activeDevicesById.set(deviceId, devInfo);

    // Save device to store
    store.saveDevice({
      id: deviceId,
      name: devInfo.deviceName,
      os: devInfo.os,
      isOnline: true,
      lastSeen: Date.now(),
    });

    socket.emit('registered', {
      deviceId,
      pin,
      expiresAt,
      ttlSecondsRemaining: Math.round((expiresAt - Date.now()) / 1000),
    });

    // Broadcast online presence to any listening client
    io.emit('device-status-change', { deviceId, isOnline: true });
  });

  // 2. Regenerate 6-digit PIN manually
  socket.on('regenerate-pin', () => {
    const dev = activeDevicesBySocket.get(socket.id);
    if (!dev) return;

    pinIndex.delete(dev.pin);
    const newPin = generateUniquePin();
    dev.pin = newPin;
    dev.pinExpiresAt = Date.now() + PIN_TTL_MS;
    pinIndex.set(newPin, dev.deviceId);

    socket.emit('pin-updated', {
      pin: newPin,
      expiresAt: dev.pinExpiresAt,
      ttlSecondsRemaining: Math.round((dev.pinExpiresAt - Date.now()) / 1000),
    });
  });

  // 3. Initiate Connection Request via 6-digit PIN
  socket.on('request-connection', (payload: { toPin: string; mode?: SessionMode }) => {
    const caller = activeDevicesBySocket.get(socket.id);
    if (!caller) {
      return socket.emit('connection-error', { message: 'Votre appareil n’est pas encore enregistré.' });
    }

    // Rate-limiting check
    if (!checkRateLimit(clientIp)) {
      return socket.emit('connection-error', {
        message: 'Sécurité : Trop de tentatives répétées. Veuillez patienter 1 minute.',
      });
    }

    const cleanPin = (payload.toPin || '').replace(/\s+/g, '');
    const targetDeviceId = pinIndex.get(cleanPin);

    if (!targetDeviceId) {
      return socket.emit('connection-error', { message: 'Code de connexion à 6 chiffres incorrect ou inexistant.' });
    }

    const targetDev = activeDevicesById.get(targetDeviceId);
    if (!targetDev || !activeDevicesBySocket.has(targetDev.socketId)) {
      pinIndex.delete(cleanPin);
      return socket.emit('connection-error', { message: 'L’ordinateur distant est actuellement hors-ligne.' });
    }

    if (targetDev.pinExpiresAt <= Date.now()) {
      pinIndex.delete(cleanPin);
      return socket.emit('connection-error', { message: 'Ce code à 6 chiffres a expiré. Demandez un nouveau code.' });
    }

    if (targetDev.deviceId === caller.deviceId) {
      return socket.emit('connection-error', { message: 'Impossible de vous connecter à votre propre appareil.' });
    }

    const requestId = 'req_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

    // 30 seconds auto-rejection timer for security
    const timer = setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        socket.emit('connection-error', { message: 'Délai d’attente dépassé : Aucune réponse du propriétaire distant.' });
        io.to(targetDev.socketId).emit('request-timed-out', { requestId });
      }
    }, 30000);

    pendingRequests.set(requestId, {
      requestId,
      fromSocketId: socket.id,
      fromDeviceId: caller.deviceId,
      toDeviceId: targetDeviceId,
      mode: payload.mode || 'full_control',
      timer,
    });

    // Notify target device with security dialog
    io.to(targetDev.socketId).emit('incoming-connection-request', {
      requestId,
      fromDeviceId: caller.deviceId,
      fromDeviceName: caller.deviceName,
      fromDeviceOs: caller.os,
      mode: payload.mode || 'full_control',
      timestamp: Date.now(),
    });

    socket.emit('connection-request-pending', {
      requestId,
      targetDeviceName: targetDev.deviceName,
    });
  });

  // 4. Owner responds to connection request (Accept or Reject)
  socket.on('respond-connection-request', (payload: {
    requestId: string;
    accept: boolean;
    permissions?: AccessPermissions;
    reason?: string;
  }) => {
    const req = pendingRequests.get(payload.requestId);
    if (!req) return;

    clearTimeout(req.timer);
    pendingRequests.delete(payload.requestId);

    const callerSocket = io.sockets.sockets.get(req.fromSocketId);
    const hostDev = activeDevicesBySocket.get(socket.id);

    if (!payload.accept) {
      if (callerSocket) {
        callerSocket.emit('connection-rejected', {
          reason: payload.reason || 'Demande de connexion refusée par le propriétaire.',
        });
      }
      return;
    }

    if (!hostDev || !callerSocket) {
      return;
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
    const permissions: AccessPermissions = payload.permissions || {
      allowControl: true,
      allowFileTransfer: true,
      allowClipboard: true,
      allowAudio: true,
    };

    // Join both sockets into session room
    socket.join(`session_${sessionId}`);
    callerSocket.join(`session_${sessionId}`);

    hostDev.currentSessionId = sessionId;
    const callerDev = activeDevicesBySocket.get(callerSocket.id);
    if (callerDev) callerDev.currentSessionId = sessionId;

    // Notify Host (Device A)
    socket.emit('session-started', {
      sessionId,
      isHost: true,
      partnerDeviceId: req.fromDeviceId,
      partnerDeviceName: callerDev?.deviceName || 'Ordinateur Distant',
      partnerDeviceOs: callerDev?.os || 'windows',
      mode: req.mode,
      permissions,
      startTime: Date.now(),
    });

    // Notify Controller (Device B)
    callerSocket.emit('session-started', {
      sessionId,
      isHost: false,
      partnerDeviceId: hostDev.deviceId,
      partnerDeviceName: hostDev.deviceName,
      partnerDeviceOs: hostDev.os,
      mode: req.mode,
      permissions,
      startTime: Date.now(),
    });
  });

  // 5. WebRTC Signaling Relay
  socket.on('webrtc-signal', (payload: any) => {
    const targetDev = activeDevicesById.get(payload.targetDeviceId);
    if (targetDev) {
      io.to(targetDev.socketId).emit('webrtc-signal', payload);
    }
  });

  // 6. WebSocket Data Relay (Fallback when direct P2P is blocked)
  socket.on('relay-data', (payload: { targetDeviceId: string; sessionId: string; data: any }) => {
    const targetDev = activeDevicesById.get(payload.targetDeviceId);
    if (targetDev) {
      io.to(targetDev.socketId).emit('relay-data', {
        fromDeviceId: payload.targetDeviceId,
        sessionId: payload.sessionId,
        data: payload.data,
      });
    }
  });

  // 7. End Active Session
  socket.on('end-session', (payload: { sessionId: string }) => {
    io.to(`session_${payload.sessionId}`).emit('session-ended', {
      sessionId: payload.sessionId,
      endedBySocketId: socket.id,
    });
  });

  // 8. Disconnect Cleanup
  socket.on('disconnect', () => {
    const dev = activeDevicesBySocket.get(socket.id);
    if (dev) {
      pinIndex.delete(dev.pin);
      activeDevicesBySocket.delete(socket.id);
      activeDevicesById.delete(dev.deviceId);

      // Clean up any pending requests
      pendingRequests.forEach((req, key) => {
        if (req.fromSocketId === socket.id || req.toDeviceId === dev.deviceId) {
          clearTimeout(req.timer);
          pendingRequests.delete(key);
        }
      });

      // Update store
      store.saveDevice({
        id: dev.deviceId,
        name: dev.deviceName,
        os: dev.os,
        isOnline: false,
        lastSeen: Date.now(),
      });

      io.emit('device-status-change', { deviceId: dev.deviceId, isOnline: false });
    }
  });
});

// Prevent server crashes from uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[Connect Pro] Uncaught Exception safely handled:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Connect Pro] Unhandled Rejection safely handled:', reason);
});

// Configure Vite or Static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'public')));
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });

    // Anti-sleep self-ping for free cloud hosts (Render / Railway)
    // Pings /api/health every 9 minutes to prevent Render 15-minute inactivity spin down!
    const hostUrl = process.env.RENDER_EXTERNAL_URL || 'https://conecte.onrender.com';
    setInterval(async () => {
      try {
        const https = await import('https');
        https.get(`${hostUrl}/api/health`, (res) => {
          // Keep-alive successful
        }).on('error', () => {
          // Silently ignore network fluctuations
        });
      } catch (e) {
        // Ignore
      }
    }, 9 * 60 * 1000);
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Connect Pro] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Connect Pro] Failed to start server:', err);
  process.exit(1);
});
