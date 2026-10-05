import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname, 'dist')));

// Protection globale anti-crash
process.on('uncaughtException', (err) => {
  console.error('[Connect Pro] Uncaught Exception safely handled:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Connect Pro] Unhandled Rejection safely handled:', reason);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    onlineDevices: activeDevices.size,
    time: Date.now(),
  });
});

// Route de téléchargement de l'archive ZIP
app.get(['/download', '/api/download', '/api/download-zip'], (req, res) => {
  const publicZip = path.resolve(__dirname, 'public', 'connect-pro.zip');
  const distZip = path.resolve(__dirname, 'dist', 'connect-pro.zip');
  const target = fs.existsSync(publicZip) ? publicZip : distZip;
  if (fs.existsSync(target)) {
    res.download(target, 'connect-pro-desktop.zip');
  } else {
    res.status(404).json({ error: 'Archive non trouvée' });
  }
});

// Socket.io configuration optimisée
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e8,
});

interface ConnectedDev {
  socketId: string;
  deviceId: string;
  name: string;
  os: 'windows' | 'macos' | 'linux' | 'browser';
  pin: string;
}

const activeDevices = new Map<string, ConnectedDev>(); // socketId -> dev
const pinIndex = new Map<string, string>(); // PIN -> socketId
const pendingRequests = new Map<string, {
  requestId: string;
  fromSocketId: string;
  toSocketId: string;
  fromDev: ConnectedDev;
  toDev: ConnectedDev;
  mode: string;
}>();

io.on('connection', (socket) => {
  console.log('[Connect] New client connected:', socket.id);

  // 1. Enregistrement d'un appareil & attribution du PIN
  socket.on('register-device', (data: any) => {
    const { deviceId, name = 'PC Windows Connect Pro', os = 'windows' } = data || {};
    if (!deviceId) return;

    // Supprime l'ancien PIN associé à cet appareil s'il existait
    for (const [p, sId] of pinIndex.entries()) {
      const dev = activeDevices.get(sId);
      if (dev && dev.deviceId === deviceId) {
        pinIndex.delete(p);
      }
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    pinIndex.set(pin, socket.id);
    activeDevices.set(socket.id, { socketId: socket.id, deviceId, name, os, pin });

    socket.emit('registered', {
      deviceId,
      pin,
      expiresAt: Date.now() + 900000,
      ttlSecondsRemaining: 900,
    });
    console.log(`[Connect] ${name} (${deviceId}) enregistré avec le PIN ${pin}`);
  });

  // 2. Régénération manuelle du PIN
  socket.on('regenerate-pin', () => {
    const dev = activeDevices.get(socket.id);
    if (!dev) return;

    pinIndex.delete(dev.pin);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    dev.pin = newPin;
    pinIndex.set(newPin, socket.id);

    socket.emit('pin-updated', {
      pin: newPin,
      expiresAt: Date.now() + 900000,
      ttlSecondsRemaining: 900,
    });
    console.log(`[Connect] Nouveau PIN pour ${dev.name} : ${newPin}`);
  });

  // 3. Demande de connexion via PIN
  socket.on('request-connection', ({ toPin, mode = 'full_control' }) => {
    const cleanPin = (toPin || '').replace(/\s+/g, '');
    const targetSocketId = pinIndex.get(cleanPin);

    if (!targetSocketId) {
      socket.emit('connection-error', { message: 'Code PIN à 6 chiffres invalide ou expiré' });
      return;
    }

    const targetDev = activeDevices.get(targetSocketId);
    const callerDev = activeDevices.get(socket.id);

    if (!targetDev) {
      pinIndex.delete(cleanPin);
      socket.emit('connection-error', { message: 'L’appareil distant est hors-ligne' });
      return;
    }

    if (!callerDev) {
      socket.emit('connection-error', { message: 'Votre appareil n’est pas encore enregistré' });
      return;
    }

    if (callerDev.deviceId === targetDev.deviceId && socket.id === targetSocketId) {
      socket.emit('connection-error', { message: 'Impossible de vous connecter à votre propre appareil' });
      return;
    }

    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    pendingRequests.set(requestId, {
      requestId,
      fromSocketId: socket.id,
      toSocketId: targetSocketId,
      fromDev: callerDev,
      toDev: targetDev,
      mode,
    });

    // Notifie l'hôte de la demande entrante
    io.to(targetSocketId).emit('incoming-connection-request', {
      requestId,
      fromDeviceId: callerDev.deviceId,
      fromDeviceName: callerDev.name,
      fromDeviceOs: callerDev.os,
      toPin: cleanPin,
      mode,
      timestamp: Date.now(),
    });

    socket.emit('connection-request-pending', {
      requestId,
      targetDeviceName: targetDev.name,
    });

    console.log(`[Connect] Demande envoyée de ${callerDev.name} vers ${targetDev.name} (PIN: ${cleanPin})`);
  });

  // 4. Réponse à la demande de connexion (Accepter / Refuser)
  socket.on('respond-connection-request', (data: any) => {
    const { requestId, accept, permissions, reason } = data || {};
    const req = pendingRequests.get(requestId);
    if (!req) return;

    pendingRequests.delete(requestId);

    if (!accept) {
      io.to(req.fromSocketId).emit('connection-rejected', {
        reason: reason || 'Connexion refusée par le correspondant.',
      });
      return;
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
    const defaultPerms = permissions || {
      allowControl: true,
      allowFileTransfer: true,
      allowClipboard: true,
      allowAudio: true,
    };

    // Démarre la session pour le Contrôleur
    io.to(req.fromSocketId).emit('session-started', {
      sessionId,
      isHost: false,
      partnerDeviceId: req.toDev.deviceId,
      partnerDeviceName: req.toDev.name,
      partnerDeviceOs: req.toDev.os,
      mode: req.mode,
      permissions: defaultPerms,
      startTime: Date.now(),
    });

    // Démarre la session pour l'Hôte
    io.to(req.toSocketId).emit('session-started', {
      sessionId,
      isHost: true,
      partnerDeviceId: req.fromDev.deviceId,
      partnerDeviceName: req.fromDev.name,
      partnerDeviceOs: req.fromDev.os,
      mode: req.mode,
      permissions: defaultPerms,
      startTime: Date.now(),
    });

    console.log(`[Connect] Session ${sessionId} établie entre ${req.fromDev.name} et ${req.toDev.name}`);
  });

  // 5. Signalisation WebRTC P2P
  socket.on('webrtc-signal', (signalData: any) => {
    // Route le signal vers le partenaire
    for (const [sId, dev] of activeDevices.entries()) {
      if (sId !== socket.id && dev.deviceId === signalData.targetDeviceId) {
        io.to(sId).emit('webrtc-signal', signalData);
        return;
      }
    }
  });

  // 6. Relais de secours de données / chat / input si WebRTC P2P est bloqué
  socket.on('relay-data', (relayData: any) => {
    const { targetDeviceId, data } = relayData || {};
    for (const [sId, dev] of activeDevices.entries()) {
      if (sId !== socket.id && dev.deviceId === targetDeviceId) {
        io.to(sId).emit('relay-data', { data });
        return;
      }
    }
  });

  // 7. Fin de session
  socket.on('end-session', ({ sessionId }: any) => {
    socket.broadcast.emit('session-ended', { sessionId });
  });

  // 8. Nettoyage lors de la déconnexion
  socket.on('disconnect', () => {
    const dev = activeDevices.get(socket.id);
    if (dev) {
      pinIndex.delete(dev.pin);
      console.log(`[Connect] ${dev.name} déconnecté, PIN ${dev.pin} libéré`);
    }
    activeDevices.delete(socket.id);
  });
});

// Support SPA React (Vite)
app.get('*', (req, res) => {
  const indexPath = path.resolve(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connect Pro</title></head>
        <body style="font-family:sans-serif;padding:20px;background:#0f172a;color:#fff;">
          <h2>Connect Pro est en cours d'initialisation...</h2>
          <p>Le serveur est prêt. Veuillez recharger dans quelques instants.</p>
        </body>
      </html>
    `);
  }
});

// Anti-sleep Keep-Alive pour Render (ping toutes les 9 min)
if (process.env.NODE_ENV === 'production') {
  const hostUrl = process.env.RENDER_EXTERNAL_URL || 'https://conecte.onrender.com';
  setInterval(async () => {
    try {
      const https = await import('https');
      https.get(`${hostUrl}/api/health`, () => {});
    } catch (e) {
      // Ignorer
    }
  }, 9 * 60 * 1000);
}

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[Connect Pro] Server listening on http://0.0.0.0:${PORT}`);
});
