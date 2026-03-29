type EventHandler = (data: any) => void;

const listeners = new Map<string, Set<EventHandler>>();
let socket: WebSocket | null = null;
let currentUserId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function connectWS(userId: string) {
  currentUserId = userId;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(getWsUrl());

  socket.onopen = () => {
    socket!.send(JSON.stringify({ type: "auth", userId }));
  };

  socket.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      const handlers = listeners.get(msg.type);
      if (handlers) handlers.forEach((h) => h(msg));
    } catch {}
  };

  socket.onclose = () => {
    socket = null;
    if (currentUserId) {
      reconnectTimer = setTimeout(() => connectWS(currentUserId!), 3000);
    }
  };

  socket.onerror = () => {};
}

export function disconnectWS() {
  currentUserId = null;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (socket) { socket.close(); socket = null; }
}

export function onWS(type: string, handler: EventHandler): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(handler);
  return () => listeners.get(type)?.delete(handler);
}
