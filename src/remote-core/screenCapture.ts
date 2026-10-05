/**
 * Screen capture module for Connect Pro Remote Core.
 * Handles native display media capture (Windows desktop, windows, monitors)
 * with a high-fidelity synthetic fallback generator for testing inside sandboxes.
 */

export interface ScreenCaptureOptions {
  fps?: number; // 15, 30, 60
  resolution?: '1080p' | '720p' | '480p';
  captureAudio?: boolean;
}

export class ScreenCaptureManager {
  private mediaStream: MediaStream | null = null;
  private canvasFallback: HTMLCanvasElement | null = null;
  private canvasInterval: number | null = null;
  private isSimulation = false;
  private simulatedWindowsState = {
    notepadText: 'Connect Pro - Session active.\nContrôle à distance sécurisé opérationnel.\nTestez la souris et le clavier !',
    windowX: 180,
    windowY: 120,
    cursorX: 400,
    cursorY: 300,
  };

  /**
   * Start capturing the desktop screen using WebRTC getDisplayMedia API.
   * If denied or blocked by iframe permissions, gracefully offers simulation.
   */
  async startCapture(options: ScreenCaptureOptions = {}): Promise<{ stream: MediaStream; isSimulated: boolean }> {
    this.stopCapture();

    const frameRate = options.fps || 60;
    const height = options.resolution === '480p' ? 480 : options.resolution === '720p' ? 720 : 1080;
    const width = options.resolution === '480p' ? 854 : options.resolution === '720p' ? 1280 : 1920;

    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            frameRate: { ideal: frameRate, max: 60 },
            width: { ideal: width },
            height: { ideal: height },
          } as MediaTrackConstraints,
          audio: options.captureAudio ?? true,
        });

        this.mediaStream = stream;
        this.isSimulation = false;

        // Auto-stop when user clicks "Stop sharing" in browser native bar
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          this.stopCapture();
        });

        return { stream, isSimulated: false };
      }
    } catch (err) {
      console.warn('[ScreenCapture] Native getDisplayMedia unavailable or rejected, starting realistic simulator:', err);
    }

    // Fallback: Start simulated Windows Desktop canvas stream
    const simStream = this.startSimulationStream(width, height, frameRate);
    this.isSimulation = true;
    return { stream: simStream, isSimulated: true };
  }

  /**
   * Creates a live 60fps canvas stream representing a realistic Windows 11 Desktop
   * Responsive to simulated mouse and keyboard input for instant testing.
   */
  private startSimulationStream(width: number, height: number, fps: number): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    this.canvasFallback = canvas;

    let frameCount = 0;

    this.canvasInterval = window.setInterval(() => {
      if (!ctx) return;
      frameCount++;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fr-FR');
      const dateStr = now.toLocaleDateString('fr-FR');

      // 1. Desktop Wallpaper (Windows Dark Blue Glow)
      const gradient = ctx.createRadialGradient(width * 0.5, height * 0.45, 100, width * 0.5, height * 0.5, width * 0.8);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(0.5, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle geometric backdrop circles
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.4, 280, 0, Math.PI * 2);
      ctx.stroke();

      // Desktop Icons
      const icons = [
        { label: 'Ce PC', icon: '💻', x: 40, y: 40 },
        { label: 'Réseau', icon: '🌐', x: 40, y: 130 },
        { label: 'Connect Pro', icon: '🛡️', x: 40, y: 220 },
        { label: 'Fichiers', icon: '📁', x: 40, y: 310 },
        { label: 'Corbeille', icon: '🗑️', x: 40, y: 400 },
      ];

      icons.forEach(ic => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(ic.x - 10, ic.y - 10, 72, 72, 8);
        ctx.fill();

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ic.icon, ic.x + 26, ic.y + 26);

        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(ic.label, ic.x + 26, ic.y + 54);
      });

      // 2. Active Window: "Bloc-notes - ConnectPro.txt"
      const winW = 560;
      const winH = 340;
      const winX = this.simulatedWindowsState.windowX;
      const winY = this.simulatedWindowsState.windowY;

      // Window shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(winX + 8, winY + 8, winW, winH, 10);
      ctx.fill();

      // Window body
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, winH, 8);
      ctx.fill();
      ctx.strokeStyle = '#383838';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Title bar
      ctx.fillStyle = '#2d2d2d';
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, 36, [8, 8, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📝 Bloc-notes - ConnectPro_Session.txt', winX + 16, winY + 23);

      // Window buttons
      ctx.fillStyle = '#71717a';
      ctx.fillText('—  □  ✕', winX + winW - 65, winY + 23);

      // Window content
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      const lines = this.simulatedWindowsState.notepadText.split('\n');
      lines.forEach((l, idx) => {
        ctx.fillText(l, winX + 20, winY + 70 + idx * 24);
      });

      // Cursor blinking inside notepad
      if (Math.floor(frameCount / 30) % 2 === 0) {
        ctx.fillStyle = '#38bdf8';
        const lastLine = lines[lines.length - 1] || '';
        const cursorW = ctx.measureText(lastLine).width;
        ctx.fillRect(winX + 22 + cursorW, winY + 70 + (lines.length - 1) * 24 - 13, 2, 16);
      }

      // 3. Windows 11 Taskbar
      const barH = 50;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, height - barH, width, barH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, height - barH);
      ctx.lineTo(width, height - barH);
      ctx.stroke();

      // Centered Windows 11 taskbar icons
      const centerIcons = ['🪟', '🔍', '📁', '🌐', '🛡️', '⚙️'];
      const startX = width / 2 - (centerIcons.length * 38) / 2;
      centerIcons.forEach((icon, i) => {
        const ix = startX + i * 40;
        ctx.fillStyle = icon === '🛡️' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(ix, height - barH + 6, 36, 36, 6);
        ctx.fill();
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(icon, ix + 18, height - barH + 30);
      });

      // System tray (right)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(timeStr, width - 20, height - barH + 20);
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(dateStr, width - 20, height - barH + 38);
      ctx.fillText('🔊 📶 🔋', width - 110, height - barH + 30);

      // 4. Remote cursor position indicator
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(this.simulatedWindowsState.cursorX, this.simulatedWindowsState.cursorY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }, 1000 / fps);

    const stream = canvas.captureStream(fps);
    this.mediaStream = stream;
    return stream;
  }

  /**
   * Allows simulated interaction when testing without actual OS control permissions
   */
  applySimulatedInput(type: 'mouse' | 'key', data: any) {
    if (!this.isSimulation) return;
    if (type === 'mouse' && this.canvasFallback) {
      if (data.x !== undefined && data.y !== undefined) {
        this.simulatedWindowsState.cursorX = data.x * this.canvasFallback.width;
        this.simulatedWindowsState.cursorY = data.y * this.canvasFallback.height;
      }
    } else if (type === 'key' && data.key) {
      if (data.key === 'Backspace') {
        this.simulatedWindowsState.notepadText = this.simulatedWindowsState.notepadText.slice(0, -1);
      } else if (data.key === 'Enter') {
        this.simulatedWindowsState.notepadText += '\n';
      } else if (data.key.length === 1) {
        this.simulatedWindowsState.notepadText += data.key;
      }
    }
  }

  stopCapture() {
    if (this.canvasInterval) {
      clearInterval(this.canvasInterval);
      this.canvasInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.canvasFallback = null;
    this.isSimulation = false;
  }

  getStream(): MediaStream | null {
    return this.mediaStream;
  }

  isSimulatedStream(): boolean {
    return this.isSimulation;
  }
}
