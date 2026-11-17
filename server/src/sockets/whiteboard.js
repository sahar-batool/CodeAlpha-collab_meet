// Shared whiteboard. A board lives in memory while a meeting has people in it.
const MAX_STROKES = 1500;
const MAX_POINTS_PER_STROKE = 4000;
const MAX_POINTS_PER_BATCH = 150;
const MAX_POINTS_TOTAL = 100000;
const TOOLS = new Set(['pen', 'eraser']);
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const ID_RE = /^[A-Za-z0-9_-]{6,40}$/;

const boards = new Map(); // room code -> { strokes: [], byId: Map, points: number }
let sweeper = null;

function getBoard(code) {
  let board = boards.get(code);
  if (!board) {
    board = { strokes: [], byId: new Map(), points: 0 };
    boards.set(code, board);
  }
  return board;
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const round4 = (n) => Math.round(n * 10000) / 10000;

// Points are [x, y] pairs between 0 and 1, so every screen size draws the same picture.
function cleanPoints(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_POINTS_PER_BATCH) return null;
  const out = [];
  for (const p of raw) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const [x, y] = p;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    out.push([round4(clamp01(x)), round4(clamp01(y))]);
  }
  return out;
}

const publicStroke = ({ id, tool, color, size, points }) => ({ id, tool, color, size, points });

export function registerWhiteboardHandlers(io, socket) {
  // One cleanup timer for the whole server: drop boards whose room is empty.
  if (!sweeper) {
    sweeper = setInterval(() => {
      for (const code of boards.keys()) {
        if (!io.sockets.adapter.rooms.get(code)?.size) boards.delete(code);
      }
    }, 30000);
    sweeper.unref();
  }

  // Only someone who is really inside the meeting may touch its board.
  const roomCode = () => {
    const code = socket.data.roomCode;
    return code && socket.rooms.has(code) ? code : null;
  };

  // Sent when the board opens, so late joiners see what is already drawn.
  socket.on('whiteboard:sync', (ack) => {
    if (typeof ack !== 'function') return;
    const code = roomCode();
    if (!code) return ack({ strokes: [] });
    ack({ strokes: (boards.get(code)?.strokes || []).map(publicStroke) });
  });

  // Drawing arrives in small batches of points that extend one stroke.
  socket.on('whiteboard:draw', (payload) => {
    const code = roomCode();
    if (!code || !payload || typeof payload !== 'object') return;
    const { id } = payload;
    if (typeof id !== 'string' || !ID_RE.test(id)) return;
    const points = cleanPoints(payload.points);
    if (!points) return;

    const board = getBoard(code);
    let stroke = board.byId.get(id);

    if (!stroke) {
      if (!TOOLS.has(payload.tool)) return;
      if (typeof payload.color !== 'string' || !COLOR_RE.test(payload.color)) return;
      if (board.strokes.length >= MAX_STROKES || board.points >= MAX_POINTS_TOTAL) {
        socket.emit('whiteboard:error', { message: 'The board is full. Clear it to keep drawing.' });
        return;
      }
      const size = Math.min(40, Math.max(1, Number(payload.size) || 4));
      stroke = { id, owner: socket.id, tool: payload.tool, color: payload.color.toLowerCase(), size, points: [] };
      board.strokes.push(stroke);
      board.byId.set(id, stroke);
    } else if (stroke.owner !== socket.id) {
      return; // nobody can add to someone else's stroke
    }

    const room = MAX_POINTS_PER_STROKE - stroke.points.length;
    const accepted = points.slice(0, Math.max(0, room));
    if (!accepted.length) return;
    stroke.points.push(...accepted);
    board.points += accepted.length;

    socket.to(code).emit('whiteboard:draw', {
      id,
      tool: stroke.tool,
      color: stroke.color,
      size: stroke.size,
      points: accepted,
    });
  });

  // Removes this person's most recent stroke.
  socket.on('whiteboard:undo', () => {
    const code = roomCode();
    const board = code && boards.get(code);
    if (!board) return;
    for (let i = board.strokes.length - 1; i >= 0; i--) {
      if (board.strokes[i].owner === socket.id) {
        const [removed] = board.strokes.splice(i, 1);
        board.byId.delete(removed.id);
        board.points -= removed.points.length;
        io.to(code).emit('whiteboard:remove', { id: removed.id });
        return;
      }
    }
  });

  socket.on('whiteboard:clear', () => {
    const code = roomCode();
    if (!code) return;
    boards.delete(code);
    io.to(code).emit('whiteboard:cleared');
  });
}