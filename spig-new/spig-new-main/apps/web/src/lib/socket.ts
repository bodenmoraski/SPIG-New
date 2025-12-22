import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let sectionsSocket: Socket | null = null;
let scoresSocket: Socket | null = null;

/**
 * Get or create sections namespace socket
 */
export function getSectionsSocket(token?: string): Socket {
  if (!sectionsSocket) {
    sectionsSocket = io(`${API_BASE}/sections`, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }

  if (token && !sectionsSocket.connected) {
    sectionsSocket.auth = { token };
  }

  return sectionsSocket;
}

/**
 * Get or create scores namespace socket
 */
export function getScoresSocket(token?: string): Socket {
  if (!scoresSocket) {
    scoresSocket = io(`${API_BASE}/scores`, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }

  if (token && !scoresSocket.connected) {
    scoresSocket.auth = { token };
  }

  return scoresSocket;
}

/**
 * Connect all sockets
 */
export function connectSockets(token: string) {
  const sections = getSectionsSocket(token);
  const scores = getScoresSocket(token);

  if (!sections.connected) {
    sections.connect();
  }

  if (!scores.connected) {
    scores.connect();
  }
}

/**
 * Disconnect all sockets
 */
export function disconnectSockets() {
  sectionsSocket?.disconnect();
  scoresSocket?.disconnect();
  sectionsSocket = null;
  scoresSocket = null;
}
