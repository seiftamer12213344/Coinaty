import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

const userSockets = new Map<string, Set<WebSocket>>();

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let userId: string | null = null;

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "auth" && msg.userId) {
          userId = msg.userId;
          if (!userSockets.has(userId)) userSockets.set(userId, new Set());
          userSockets.get(userId)!.add(ws);
        }
      } catch {}
    });

    ws.on("close", () => {
      if (userId) {
        userSockets.get(userId)?.delete(ws);
        if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
      }
    });

    ws.on("error", () => {});
  });

  return wss;
}

export function sendToUser(userId: string, event: object) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const data = JSON.stringify(event);
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

export function broadcast(event: object) {
  const data = JSON.stringify(event);
  userSockets.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
  });
}
