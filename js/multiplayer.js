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
        if (this.callbacks.onRoomCreated) {
          this.callbacks.onRoomCreated(this.roomCode);
        }
      });

      this.peer.on("connection", (conn) => {
        this.conn = conn;
        this.setupConnectionHandlers();
      });

      this.peer.on("error", (err) => {
        console.warn("PeerJS Host Error:", err);
        if (err.type === "unavailable-id") {
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
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" }
          ]
        }
      });

      this.peer.on("open", () => {
        const targetId = `fg1v1-${this.roomCode}`;
        this.conn = this.peer.connect(targetId, { reliable: true });
        this.setupConnectionHandlers();

        // 9-second timeout if room doesn't respond
        clearTimeout(this.connectTimeout);
        this.connectTimeout = setTimeout(() => {
          if (!this.conn || !this.conn.open) {
            if (this.callbacks.onError) {
              this.callbacks.onError("Room not found or opponent did not respond. Check the 4-digit code.");
            }
            this.close();
          }
        }, 9000);
      });

      this.peer.on("error", (err) => {
        console.warn("PeerJS Client Error:", err);
        clearTimeout(this.connectTimeout);
        if (this.callbacks.onError) {
          this.callbacks.onError("Could not connect to room " + this.roomCode);
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
      console.log("DataChannel connected:", this.isHost ? "Host" : "Client");

      if (this.isHost) {
        if (this.callbacks.onOpponentJoined) {
          this.callbacks.onOpponentJoined();
        }
      } else {
        // Client notifies host it is ready
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
      // Queue until open
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
