// Real-time Peer-to-Peer WebRTC Multiplayer for 1v1 Flag Guesser
class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.roomCode = null;
    this.isHost = false;
    this.callbacks = {
      onRoomCreated: null,
      onOpponentJoined: null,
      onData: null,
      onError: null,
      onDisconnect: null
    };
  }

  generate4DigitCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  createRoom(onCreated, onJoined, onData, onError, onDisconnect) {
    this.close();
    this.isHost = true;
    this.callbacks = { onRoomCreated: onCreated, onOpponentJoined: onJoined, onData, onError, onDisconnect };
    this.roomCode = this.generate4DigitCode();

    const peerId = `flagguesser-${this.roomCode}`;
    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        }
      });

      this.peer.on("open", (id) => {
        if (this.callbacks.onRoomCreated) {
          this.callbacks.onRoomCreated(this.roomCode);
        }
      });

      this.peer.on("connection", (conn) => {
        this.conn = conn;
        this.setupConnectionHandlers();
        if (this.callbacks.onOpponentJoined) {
          this.callbacks.onOpponentJoined();
        }
      });

      this.peer.on("error", (err) => {
        console.warn("PeerJS Host Error:", err);
        if (err.type === "unavailable-id") {
          // Retry with new 4-digit code if collided
          this.createRoom(onCreated, onJoined, onData, onError, onDisconnect);
        } else if (this.callbacks.onError) {
          this.callbacks.onError(err.message || "Connection error");
        }
      });
    } catch (e) {
      if (this.callbacks.onError) this.callbacks.onError(e.message);
    }
  }

  joinRoom(code, onConnected, onData, onError, onDisconnect) {
    this.close();
    this.isHost = false;
    this.roomCode = code.trim();
    this.callbacks = { onOpponentJoined: onConnected, onData, onError, onDisconnect };

    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        }
      });

      this.peer.on("open", () => {
        const targetId = `flagguesser-${this.roomCode}`;
        this.conn = this.peer.connect(targetId, { reliable: true });
        this.setupConnectionHandlers();
      });

      this.peer.on("error", (err) => {
        console.warn("PeerJS Client Error:", err);
        if (this.callbacks.onError) {
          this.callbacks.onError("Could not find room with code " + this.roomCode);
        }
      });
    } catch (e) {
      if (this.callbacks.onError) this.callbacks.onError(e.message);
    }
  }

  setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on("open", () => {
      if (!this.isHost && this.callbacks.onOpponentJoined) {
        this.callbacks.onOpponentJoined();
      }
    });

    this.conn.on("data", (data) => {
      if (this.callbacks.onData) {
        this.callbacks.onData(data);
      }
    });

    this.conn.on("close", () => {
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    });

    this.conn.on("error", (err) => {
      if (this.callbacks.onError) {
        this.callbacks.onError("Peer connection error");
      }
    });
  }

  send(payload) {
    if (this.conn && this.conn.open) {
      this.conn.send(payload);
    }
  }

  close() {
    if (this.conn) {
      try { this.conn.close(); } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.roomCode = null;
  }
}

const mpManager = new MultiplayerManager();
