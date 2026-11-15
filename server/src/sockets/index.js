import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { applySocketRateLimit } from './throttle.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins },
    maxHttpBufferSize: 1e6, // 1 MB per message; files go through HTTP upload
  });

  // Only authenticated users can open a socket connection.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const { sub } = verifyToken(token);
      const user = await User.findById(sub).select('name email');
      if (!user) return next(new Error('unauthorized'));
      socket.user = { id: user.id, name: user.name };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    applySocketRateLimit(socket);

    // Simple round-trip check used to test the connection from the client.
    socket.on('ping:check', (ack) => {
      if (typeof ack === 'function') ack({ ok: true, user: socket.user });
    });

    // Room, signaling, chat and whiteboard events are added in later phases.
  });

  return io;
}