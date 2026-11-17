import crypto from 'crypto';
import { Room } from '../models/Room.js';
import { File } from '../models/File.js';

const MAX_PARTICIPANTS = 6; // peer-to-peer mesh gets heavy beyond this
const CODE_RE = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;

// Who is in each room right now: code -> Map(socketId -> member)
const rooms = new Map();

// Recent chat per room, kept only while someone is in the room.
const history = new Map();
const MAX_HISTORY = 100;
const MAX_CHAT_LENGTH = 1000;

// Used by the file routes to confirm someone is really in a meeting.
export function isUserInRoom(code, userId) {
  const members = rooms.get(code);
  if (!members) return false;
  for (const m of members.values()) if (m.userId === userId) return true;
  return false;
}

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
      if (members.size === 0) {
        rooms.delete(code);
        history.delete(code);
      }
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

      const [room, fileDocs] = await Promise.all([
        Room.findOne({ code }).select('name'),
        File.find({ room: code }).sort({ createdAt: -1 }).limit(50),
      ]);
      if (!room) return reply({ error: 'Room not found' });
      if (mySeq !== seq || socket.disconnected) return reply({ error: 'Join cancelled' });

      let members = rooms.get(code);
      if (!members) {
        members = new Map();
        rooms.set(code, members);
      }
      if (members.size >= MAX_PARTICIPANTS) return reply({ error: 'This room is full' });

      const mic = payload?.micOn !== false;
      const cam = payload?.camOn !== false;
      const peers = [...members.values()].map(({ id, name, micOn, camOn, screenId }) => ({
        id,
        name,
        micOn,
        camOn,
        screenId,
      }));
      members.set(socket.id, {
        id: socket.id,
        userId: socket.user.id,
        name: socket.user.name,
        micOn: mic,
        camOn: cam,
        screenId: null,
      });
      socket.join(code);
      socket.data.roomCode = code;

      socket.to(code).emit('room:peer-joined', { id: socket.id, name: socket.user.name, micOn: mic, camOn: cam });
      reply({
        ok: true,
        room: { code, name: room.name },
        selfId: socket.id,
        peers,
        chat: history.get(code) || [],
        files: fileDocs.map((f) => f.toPublic()),
      });
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

  // Tells the room when someone mutes or turns their camera on or off.
  socket.on('room:media', (payload) => {
    const code = socket.data.roomCode;
    const member = code && rooms.get(code)?.get(socket.id);
    if (!member || typeof payload !== 'object' || payload === null) return;
    if (typeof payload.micOn === 'boolean') member.micOn = payload.micOn;
    if (typeof payload.camOn === 'boolean') member.camOn = payload.camOn;
    socket.to(code).emit('room:peer-media', {
      id: socket.id,
      micOn: member.micOn,
      camOn: member.camOn,
    });
  });

  // Only one person may share their screen at a time.
  socket.on('room:screen-start', (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const code = socket.data.roomCode;
    const members = code && rooms.get(code);
    const me = members && members.get(socket.id);
    if (!me) return reply({ error: 'You are not in a meeting' });

    const streamId = typeof payload?.streamId === 'string' ? payload.streamId.slice(0, 100) : '';
    if (!streamId) return reply({ error: 'Invalid request' });

    for (const m of members.values()) {
      if (m.screenId && m.id !== socket.id) {
        return reply({ error: `${m.name} is already sharing their screen` });
      }
    }
    me.screenId = streamId;
    socket.to(code).emit('room:peer-screen', { id: socket.id, screenId: streamId });
    reply({ ok: true });
  });

  socket.on('room:screen-stop', () => {
    const code = socket.data.roomCode;
    const me = code && rooms.get(code)?.get(socket.id);
    if (!me || !me.screenId) return;
    me.screenId = null;
    socket.to(code).emit('room:peer-screen', { id: socket.id, screenId: null });
  });

  socket.on('chat:message', (payload) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.get(code)?.has(socket.id)) return;
    const text = typeof payload?.text === 'string' ? payload.text.trim().slice(0, MAX_CHAT_LENGTH) : '';
    if (!text) return;

    // The name comes from the verified login, never from the client.
    const message = { id: crypto.randomUUID(), from: socket.id, name: socket.user.name, text, at: Date.now() };
    const list = history.get(code) || [];
    list.push(message);
    if (list.length > MAX_HISTORY) list.shift();
    history.set(code, list);
    io.to(code).emit('chat:message', message);
  });

  socket.on('room:leave', leave);
  socket.on('disconnect', leave);
}