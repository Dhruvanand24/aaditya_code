const { WebSocketServer } = require("ws");
const logger = require("../utils/logger");

class WebsocketService {
  constructor() {
    this.wss = null;
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (socket) => {
      logger.info("WebSocket client connected");

      socket.on("close", () => {
        logger.info("WebSocket client disconnected");
      });
    });
  }

  broadcastStatusChange(payload) {
    this.broadcast("status-change", payload);
  }

  broadcastCheckCompleted(payload) {
    this.broadcast("check-completed", payload);
  }

  broadcast(event, payload) {
    if (!this.wss) {
      return;
    }

    const serialized = JSON.stringify({ event, data: payload });
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(serialized);
      }
    });
  }
}

module.exports = new WebsocketService();
