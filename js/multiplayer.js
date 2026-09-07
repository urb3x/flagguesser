// Real-time Peer-to-Peer WebRTC Multiplayer for 1v1 Flag Guesser
class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.roomCode = null;
    this.isHost = false;
    this.connectTimeout = null;
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

    setTimeout(() => {
      this._initHostPeer();
    }, 150);
  }

  _initHostPeer() {
    const peerId = `fg1v1-${this.roomCode}`;
    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" }
          ]
        }
      });

      this.peer.on("open", () => {
        console.log("Host room created with ID:", peerId);
        if (this.callbacks.onRoomCreated) {
          this.callbacks.onRoomCreated(this.roomCode);
        }
      });

      this.peer.on("connection", (conn) => {
        console.log("Opponent connected to host!");
        this.conn = conn;
        this.setupConnectionHandlers();
      });

      this.peer.on("error", (err) => {
        console.warn("PeerJS Host Error:", err);
        if (err.type === "unavailable-id") {
          // Retry with fresh code on collision
          this.roomCode = this.generate4DigitCode();
          this._initHostPeer();
        } else if (this.callbacks.onError) {
          this.callbacks.onError("Host connection error: " + (err.message || err.type));
        }
      });
    } catch (e) {
      if (this.callbacks.onError) this.callbacks.onError(e.message);
    }
  }

  joinRoom(code, onConnected, onData, onError, onDisconnect) {
    const cleanCode = String(code).replace(/\D/g, "").slice(0, 4);
    this.close();
    this.isHost = false;
    this.roomCode = cleanCode;
    this.callbacks = { onOpponentJoined: onConnected, onData, onError, onDisconnect };

    setTimeout(() => {
      this._initClientPeer(cleanCode);
    }, 150);
  }

  _initClientPeer(cleanCode) {
    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" }
          ]
        }
      });

      this.peer.on("open", (id) => {
        const targetId = `fg1v1-${cleanCode}`;
        console.log(`Client ${id} connecting to host: ${targetId}`);
        this.conn = this.peer.connect(targetId, { reliable: true });
        this.setupConnectionHandlers();

        clearTimeout(this.connectTimeout);
        this.connectTimeout = setTimeout(() => {
          if (!this.conn || !this.conn.open) {
            if (this.callbacks.onError) {
              this.callbacks.onError(`Room ${cleanCode} not found! Make sure the host has the room open.`);
            }
            this.close();
          }
        }, 12000);
      });

      this.peer.on("error", (err) => {
        console.warn("PeerJS Client Error:", err);
        clearTimeout(this.connectTimeout);
        if (err.type === "peer-unavailable") {
          if (this.callbacks.onError) {
            this.callbacks.onError(`Room ${cleanCode} not found! Make sure the host has the room open.`);
          }
        } else if (err.type !== "disconnected") {
          if (this.callbacks.onError) {
            this.callbacks.onError("Connection error: " + (err.message || err.type));
          }
        }
      });
    } catch (e) {
      clearTimeout(this.connectTimeout);
      if (this.callbacks.onError) this.callbacks.onError(e.message);
    }
  }

  setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on("open", () => {
      clearTimeout(this.connectTimeout);
      console.log("DataChannel open on", this.isHost ? "Host" : "Client");

      if (this.isHost) {
        if (this.callbacks.onOpponentJoined) {
          this.callbacks.onOpponentJoined();
        }
      } else {
        // Client notifies host
        this.send({ type: "CLIENT_READY" });
        if (this.callbacks.onOpponentJoined) {
          this.callbacks.onOpponentJoined();
        }
      }
    });

    this.conn.on("data", (data) => {
      if (this.isHost && data && data.type === "CLIENT_READY") {
        if (this.callbacks.onOpponentJoined) {
          this.callbacks.onOpponentJoined();
        }
      }
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
      console.warn("Connection error:", err);
      clearTimeout(this.connectTimeout);
      if (this.callbacks.onError) {
        this.callbacks.onError("Connection error with opponent.");
      }
    });
  }

  send(payload) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(payload);
      } catch (e) {
        console.warn("Send error:", e);
      }
    } else if (this.conn) {
      this.conn.once("open", () => {
        try {
          this.conn.send(payload);
        } catch (e) {}
      });
    }
  }

  close() {
    clearTimeout(this.connectTimeout);
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
