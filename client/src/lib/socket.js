import { io } from 'socket.io-client';
import { getToken } from '../api/client';

let socket = null;

export function connectSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL, {
      // A function, so a reconnect always sends the current token.
      auth: (cb) => cb({ token: getToken() }),
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}