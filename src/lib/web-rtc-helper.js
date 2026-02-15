export class WebRTCManager {
  constructor(signalingUrl = "/api") {
    this.signalingUrl = signalingUrl;
    this.peerConnection = null;
    this.dataChannel = null;
    this.onMove = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.onGameControl = null; // Callback for game control messages (resign, draw offer, etc.)
    this.gameId = null;
    this.username = null;
    this.pollingInterval = null;
    this.isInitiator = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2s, exponential backoff
    this.isReconnecting = false;
    this.onReconnecting = null; // Callback for UI updates
    this.onReconnected = null; // Callback when reconnection succeeds
    this.onReconnectFailed = null; // Callback when max attempts reached
  }

  // Initialize connection
  init(gameId, username, isInitiator) {
    this.gameId = gameId;
    this.username = username;
    this.isInitiator = isInitiator;

    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // In a full implementation we send candidates incrementally.
        // For simplicity (trickle ICE off), we wait for null candidate or just send SDP which (in some implementations) contains candidates if gathered.
        // However, standard WebRTC requires sending candidates.
        // We will stick to a simple "wait for ICE gathering complete" approach if possible, or just trickle them via a "candidate" field in SDP storage (mocking/appending).
        // Let's assume we rely on the SDP containing the candidates for this simple single-shot exchange
        // (which happens if we wait for onicegatheringstatechange to complete before getting localDescription).
      }
    };

    // If we are the one receiving the connection, handle data channel
    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection.connectionState === "connected") {
        this.reconnectAttempts = 0; // Reset on successful connection
        if (this.onConnect) this.onConnect();
      } else if (
        this.peerConnection.connectionState === "disconnected" ||
        this.peerConnection.connectionState === "failed"
      ) {
        if (!this.isReconnecting) {
          this.attemptReconnect();
        }
        if (this.onDisconnect) this.onDisconnect();
      }
    };

    if (isInitiator) {
      // Create Data Channel
      const dc = this.peerConnection.createDataChannel("chess-moves");
      this.setupDataChannel(dc);

      this.createOffer();
    } else {
      // Wait for offer via polling
      this.startPollingForOffer();
    }
  }

  setupDataChannel(channel) {
    this.dataChannel = channel;
    this.dataChannel.onopen = () => {
      console.log("Data Channel Open");
      if (this.isReconnecting) {
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        if (this.onReconnected) this.onReconnected();
      }
      if (this.onConnect) this.onConnect();
    };
    this.dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "move" && this.onMove) {
        this.onMove(data.payload);
      } else if (data.type === "game_control" && this.onGameControl) {
        this.onGameControl(data);
      }
    };
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnect attempts reached");
      this.isReconnecting = false;
      if (this.onReconnectFailed) this.onReconnectFailed();
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    if (this.onReconnecting)
      this.onReconnecting(this.reconnectAttempts, this.maxReconnectAttempts);

    await new Promise((r) => setTimeout(r, delay));

    // Clean up old connection
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Re-initialize
    try {
      this.init(this.gameId, this.username, this.isInitiator);
    } catch (err) {
      console.error("Reconnect attempt failed:", err);
      // Will trigger another attempt via onconnectionstatechange
    }
  }

  isConnected() {
    return (
      this.peerConnection?.connectionState === "connected" &&
      this.dataChannel?.readyState === "open"
    );
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Wait for ICE gathering to complete (simple trick for single-shot SDP)
      await new Promise((resolve) => {
        if (this.peerConnection.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (this.peerConnection.iceGatheringState === "complete") {
              this.peerConnection.removeEventListener(
                "icegatheringstatechange",
                checkState,
              );
              resolve();
            }
          };
          this.peerConnection.addEventListener(
            "icegatheringstatechange",
            checkState,
          );
          // Fallback timeout in case it takes too long
          setTimeout(resolve, 2000);
        }
      });

      // Send Offer to Signaling Server
      await this.sendSdp(this.peerConnection.localDescription);

      // Poll for answer
      this.startPollingForAnswer();
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  }

  async createAnswer(remoteSdp) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(remoteSdp),
      );
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Wait for ICE gathering
      await new Promise((resolve) => {
        if (this.peerConnection.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (this.peerConnection.iceGatheringState === "complete") {
              this.peerConnection.removeEventListener(
                "icegatheringstatechange",
                checkState,
              );
              resolve();
            }
          };
          this.peerConnection.addEventListener(
            "icegatheringstatechange",
            checkState,
          );
          setTimeout(resolve, 2000);
        }
      });

      // Send Answer
      await this.sendSdp(this.peerConnection.localDescription);
    } catch (err) {
      console.error("Error creating answer:", err);
    }
  }

  // --- Signaling ---

  async sendSdp(sdp) {
    await fetch(`${this.signalingUrl}/send-sdp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: this.gameId,
        username: this.username,
        sdp: sdp,
      }),
    });
  }

  startPollingForOffer() {
    this.pollingInterval = setInterval(async () => {
      const sdp = await this.getRemoteSdp();
      if (sdp && sdp.type === "offer") {
        clearInterval(this.pollingInterval);
        console.log("Received Offer");
        this.createAnswer(sdp);
      }
    }, 1500);
  }

  startPollingForAnswer() {
    this.pollingInterval = setInterval(async () => {
      const sdp = await this.getRemoteSdp();
      if (sdp && sdp.type === "answer") {
        clearInterval(this.pollingInterval);
        console.log("Received Answer");
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(sdp),
        );
      }
    }, 1500);
  }

  async getRemoteSdp() {
    try {
      const res = await fetch(
        `${this.signalingUrl}/get-sdp?gameId=${this.gameId}&username=${this.username}`,
      );
      if (res.ok) {
        const data = await res.json();
        return data.sdp; // found opponent sdp
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // --- Game Interface ---

  sendMove(move) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify({ type: "move", payload: move }));
    } else {
      console.warn("Data channel not open");
    }
  }

  sendGameControl(action) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify({ type: "game_control", action }));
    } else {
      console.warn("Data channel not open");
    }
  }

  cleanup() {
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (this.dataChannel) this.dataChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    this.dataChannel = null;
    this.peerConnection = null;
  }

  // Force reconnection - used when page is refreshed and game state is restored
  forceReconnect() {
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.attemptReconnect();
  }
}
