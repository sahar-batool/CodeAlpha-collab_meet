import { Room } from '../models/Room.js';

const MAX_PARTICIPANTS = 6; // peer-to-peer mesh gets heavy beyond this
const CODE_RE = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;

// Who is in each room right now: code -> Map(socketId -> { id, userId, name })
const rooms = new Map();

export function registerRoomHandlers(io, socket) {
  let seq = 0; // detects a leave that happened while a join was still in progress

  const leave = () => {
    seq += 1;
    const code = socket.data.roomCode;
    if (!code) return;
    socket.leave(code);
    const members = rooms.get(code);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) rooms.delete(code);
    }
    socket.data.roomCode = null;
    socket.to(code).emit('room:peer-left', { id: socket.id });
  };

  socket.on('room:join', async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      const code = typeof payload?.code === 'string' ? payload.code.trim().toLowerCase() : '';
      if (!CODE_RE.test(code)) return reply({ error: 'Invalid room code' });
      if (socket.data.roomCode === code) return reply({ error: 'You are already in this room' });

      leave(); // moving from another room
      const mySeq = seq;

      const room = await Room.findOne({ code }).select('name');
      if (!room) return reply({ error: 'Room not found' });
      if (mySeq !== seq || socket.disconnected) return reply({ error: 'Join cancelled' });

      let members = rooms.get(code);
      if (!members) {
        members = new Map();
        rooms.set(code, members);
      }
      if (members.size >= MAX_PARTICIPANTS) return reply({ error: 'This room is full' });

      const peers = [...members.values()].map(({ id, name }) => ({ id, name }));
      members.set(socket.id, { id: socket.id, userId: socket.user.id, name: socket.user.name });
      socket.join(code);
      socket.data.roomCode = code;

      socket.to(code).emit('room:peer-joined', { id: socket.id, name: socket.user.name });
      reply({ ok: true, room: { code, name: room.name }, selfId: socket.id, peers });
    } catch (err) {
      console.error(err);
      reply({ error: 'Could not join the room' });
    }
  });

  // Relays WebRTC offers, answers and ICE candidates to one specific peer.
  socket.on('signal', (payload) => {
    const code = socket.data.roomCode;
    if (!code || typeof payload?.to !== 'string') return;
    if (typeof payload.data !== 'object' || payload.data === null) return;
    // Both sides must be in the same room, so nobody can signal a stranger.
    if (!rooms.get(code)?.has(payload.to)) return;
    io.to(payload.to).emit('signal', { from: socket.id, data: payload.data });
  });

  socket.on('room:leave', leave);
  socket.on('disconnect', leave);
}