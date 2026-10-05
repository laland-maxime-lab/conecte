import { RemoteCoreDataMessage, WebRTCSignalingPayload } from './types';

export interface WebRTCPeerOptions {
  isInitiator: boolean;
  sessionId: string;
  myDeviceId: string;
  partnerDeviceId: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onDataMessage?: (msg: RemoteCoreDataMessage) => void;
  onConnectionStateChange?: (state: 'connecting' | 'connected' | 'failed' | 'disconnected' | 'relay') => void;
  onLatencyUpdate?: (latencyMs: number) => void;
  sendSignaling: (payload: WebRTCSignalingPayload) => void;
  sendRelayData: (targetDeviceId: string, data: RemoteCoreDataMessage) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCPeer {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private options: WebRTCPeerOptions;
  private isConnected = false;
  private useRelay = false;
  private pingInterval: number | null = null;
  private iceTimeout: number | null = null;

  constructor(options: WebRTCPeerOptions) {
    this.options = options;
  }

  /**
   * Initializes RTCPeerConnection and sets up tracks / channels
   */
  async initialize(localStream?: MediaStream | null) {
    this.close();

    try {
      this.pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      // 1. If local stream exists (Host mode), add tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          if (this.pc && localStream) {
            this.pc.addTrack(track, localStream);
          }
        });
      }

      // 2. Handle remote tracks (Viewer mode)
      this.pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.options.onRemoteStream?.(event.streams[0]);
        }
      };

      // 3. Setup Data Channel
      if (this.options.isInitiator) {
        this.dataChannel = this.pc.createDataChannel('connect-pro-channel', {
          ordered: true,
        });
        this.setupDataChannelEvents(this.dataChannel);
      } else {
        this.pc.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannelEvents(this.dataChannel);
        };
      }

      // 4. ICE candidate handler
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.options.sendSignaling({
            targetDeviceId: this.options.partnerDeviceId,
            fromDeviceId: this.options.myDeviceId,
            sessionId: this.options.sessionId,
            type: 'ice-candidate',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // 5. Connection state monitoring
      this.pc.onconnectionstatechange = () => {
        if (!this.pc) return;
        const state = this.pc.connectionState;

        if (state === 'connected') {
          if (this.iceTimeout) clearTimeout(this.iceTimeout);
          this.isConnected = true;
          this.useRelay = false;
          this.options.onConnectionStateChange?.('connected');
          this.startLatencyPing();
        } else if (state === 'failed' || state === 'disconnected') {
          this.fallbackToRelay();
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        if (!this.pc) return;
        if (this.pc.iceConnectionState === 'failed') {
          this.fallbackToRelay();
        }
      };

      // Set fallback timeout if P2P takes more than 7 seconds (NAT traversal barrier)
      this.iceTimeout = window.setTimeout(() => {
        if (!this.isConnected && !this.useRelay) {
          console.warn('[WebRTCPeer] P2P ICE timeout reached. Falling back to WebSocket Relay.');
          this.fallbackToRelay();
        }
      }, 7000);

      // If initiator, create Offer
      if (this.options.isInitiator) {
        const offer = await this.pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });
        await this.pc.setLocalDescription(offer);

        this.options.sendSignaling({
          targetDeviceId: this.options.partnerDeviceId,
          fromDeviceId: this.options.myDeviceId,
          sessionId: this.options.sessionId,
          type: 'offer',
          sdp: offer,
        });
      }
    } catch (err) {
      console.error('[WebRTCPeer] Error initializing peer connection:', err);
      this.fallbackToRelay();
    }
  }

  /**
   * Handle incoming signaling messages from Socket.IO server
   */
  async handleSignaling(payload: WebRTCSignalingPayload) {
    if (!this.pc) return;

    try {
      if (payload.type === 'offer' && payload.sdp) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        this.options.sendSignaling({
          targetDeviceId: this.options.partnerDeviceId,
          fromDeviceId: this.options.myDeviceId,
          sessionId: this.options.sessionId,
          type: 'answer',
          sdp: answer,
        });
      } else if (payload.type === 'answer' && payload.sdp) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload.type === 'ice-candidate' && payload.candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch (err) {
      console.error('[WebRTCPeer] Signaling error:', err);
    }
  }

  /**
   * Send data message across WebRTC DataChannel if open, or through WebSocket relay
   */
  sendData(message: RemoteCoreDataMessage) {
    if (this.dataChannel && this.dataChannel.readyState === 'open' && !this.useRelay) {
      try {
        this.dataChannel.send(JSON.stringify(message));
        return;
      } catch (e) {
        console.warn('[WebRTCPeer] Failed to send via DataChannel, switching to relay', e);
      }
    }

    // Fallback: Send through WebSocket relay
    this.options.sendRelayData(this.options.partnerDeviceId, message);
  }

  /**
   * Called when WebSocket Relay receives data directly
   */
  handleRelayData(data: RemoteCoreDataMessage) {
    this.processDataMessage(data);
  }

  private setupDataChannelEvents(channel: RTCDataChannel) {
    channel.onopen = () => {
      this.isConnected = true;
      this.options.onConnectionStateChange?.('connected');
      this.startLatencyPing();
    };

    channel.onmessage = (event) => {
      try {
        const msg: RemoteCoreDataMessage = JSON.parse(event.data);
        this.processDataMessage(msg);
      } catch (err) {
        console.error('[WebRTCPeer] Error parsing data channel message:', err);
      }
    };

    channel.onclose = () => {
      if (!this.useRelay) {
        this.fallbackToRelay();
      }
    };
  }

  private processDataMessage(msg: RemoteCoreDataMessage) {
    if (msg.type === 'ping') {
      this.sendData({ type: 'pong', timestamp: Date.now(), echo: msg.timestamp });
    } else if (msg.type === 'pong') {
      const rtt = Date.now() - msg.echo;
      this.options.onLatencyUpdate?.(Math.max(5, Math.round(rtt)));
    } else {
      this.options.onDataMessage?.(msg);
    }
  }

  private startLatencyPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      this.sendData({ type: 'ping', timestamp: Date.now() });
    }, 2000);
  }

  private fallbackToRelay() {
    if (this.useRelay) return;
    this.useRelay = true;
    this.isConnected = true;
    this.options.onConnectionStateChange?.('relay');
    this.startLatencyPing();
  }

  close() {
    if (this.iceTimeout) {
      clearTimeout(this.iceTimeout);
      this.iceTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.isConnected = false;
    this.useRelay = false;
  }
}
