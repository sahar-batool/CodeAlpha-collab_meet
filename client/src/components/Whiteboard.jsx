import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Eraser, Undo2, Trash2, Download, X, MonitorUp } from 'lucide-react';
import { connectSocket } from '../lib/socket';

// Logical canvas size. Points are stored as 0 to 1, so any screen size draws the same picture.
const W = 1600;
const H = 900;
const BG = '#171b34';
const COLORS = [
  ['White', '#ffffff'],
  ['Mint', '#4fe0c0'],
  ['Yellow', '#ffd166'],
  ['Coral', '#ff6b6b'],
  ['Blue', '#6cb6ff'],
  ['Violet', '#b392f0'],
];
const SIZES = [
  ['Thin', 3],
  ['Medium', 6],
  ['Thick', 12],
];
const MAX_POINTS = 4000; // matches the server limit per stroke
const MIN_DIST = 0.0008; // skip points closer than this, to save bandwidth
const BATCH = 150;
const FLUSH_MS = 40;

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const newId = () =>
  String(crypto.randomUUID?.() ?? `${Date.now()}${Math.random().toString(36).slice(2)}`)
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 36);

// Draws a stroke, starting from point index `from` (so new segments can be added cheaply).
function paint(ctx, stroke, from = 0) {
  const pts = stroke.points;
  if (!pts.length) return;
  const erasing = stroke.tool === 'eraser';
  const color = erasing ? BG : stroke.color;
  const width = erasing ? stroke.size * 3 : stroke.size;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0] * W, pts[0][1] * H, width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const start = Math.max(from - 1, 0);
  ctx.beginPath();
  ctx.moveTo(pts[start][0] * W, pts[start][1] * H);
  for (let i = start + 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * W, pts[i][1] * H);
  ctx.stroke();
}

function ToolButton({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-lg transition active:scale-90 ${
        active ? 'bg-accent text-accent-ink' : 'bg-raised text-fg hover:bg-line'
      }`}
    >
      {children}
    </button>
  );
}

export default function Whiteboard({ onClose, screenShareActive, onViewScreen }) {
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(COLORS[0][1]);
  const [size, setSize] = useState(6);
  const [notice, setNotice] = useState('');
  const [clearArmed, setClearArmed] = useState(false);

  const canvasRef = useRef(null);
  const strokesRef = useRef([]); // every stroke on the board
  const drawingRef = useRef(null); // the stroke being drawn right now
  const sendRef = useRef(null); // points of that stroke not yet sent
  const timerRef = useRef(null);

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    strokesRef.current.forEach((s) => paint(ctx, s, 0));
  }, []);

  const showNotice = useCallback((msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  }, []);

  const sendBatches = useCallback((all) => {
    const d = sendRef.current;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!d) return;
    while (d.pending.length) {
      const points = d.pending.splice(0, BATCH);
      connectSocket().emit('whiteboard:draw', { id: d.id, tool: d.tool, color: d.color, size: d.size, points });
      if (!all) break;
    }
    if (d.pending.length) timerRef.current = setTimeout(() => sendBatches(false), FLUSH_MS);
  }, []);

  // Listen for other people's drawing and load the current board.
  useEffect(() => {
    const socket = connectSocket();
    redraw();

    const onDraw = ({ id, tool: t, color: c, size: s, points }) => {
      let stroke = strokesRef.current.find((x) => x.id === id);
      const from = stroke ? stroke.points.length : 0;
      if (!stroke) {
        stroke = { id, tool: t, color: c, size: s, points: [] };
        strokesRef.current.push(stroke);
      }
      stroke.points.push(...points);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) paint(ctx, stroke, from);
    };
    const onRemove = ({ id }) => {
      strokesRef.current = strokesRef.current.filter((s) => s.id !== id);
      redraw();
    };
    const onCleared = () => {
      strokesRef.current = [];
      redraw();
    };
    const onError = ({ message }) => showNotice(message);

    socket.on('whiteboard:draw', onDraw);
    socket.on('whiteboard:remove', onRemove);
    socket.on('whiteboard:cleared', onCleared);
    socket.on('whiteboard:error', onError);

    socket.timeout(5000).emit('whiteboard:sync', (err, res) => {
      if (err || !res?.strokes) return showNotice('Could not load the board.');
      strokesRef.current = res.strokes;
      redraw();
    });

    return () => {
      sendBatches(true); // don't lose a stroke if the board closes mid-drawing
      socket.off('whiteboard:draw', onDraw);
      socket.off('whiteboard:remove', onRemove);
      socket.off('whiteboard:cleared', onCleared);
      socket.off('whiteboard:error', onError);
    };
  }, [redraw, sendBatches, showNotice]);

  const toPoint = (clientX, clientY) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [clamp01((clientX - r.left) / r.width), clamp01((clientY - r.top) / r.height)];
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPoint(e.clientX, e.clientY);
    const stroke = { id: newId(), tool, color, size, points: [p] };
    strokesRef.current.push(stroke);
    drawingRef.current = stroke;
    sendRef.current = { id: stroke.id, tool, color, size, pending: [p] };
    paint(canvasRef.current.getContext('2d'), stroke, 0);
    if (!timerRef.current) timerRef.current = setTimeout(() => sendBatches(false), FLUSH_MS);
  };

  const onPointerMove = (e) => {
    const stroke = drawingRef.current;
    if (!stroke) return;
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
    const from = stroke.points.length;
    for (const ev of events) {
      if (stroke.points.length >= MAX_POINTS) break;
      const p = toPoint(ev.clientX, ev.clientY);
      const last = stroke.points[stroke.points.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_DIST) continue;
      stroke.points.push(p);
      sendRef.current.pending.push(p);
    }
    if (stroke.points.length > from) {
      paint(canvasRef.current.getContext('2d'), stroke, from);
      if (!timerRef.current) timerRef.current = setTimeout(() => sendBatches(false), FLUSH_MS);
    }
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    sendBatches(true);
    drawingRef.current = null;
    sendRef.current = null;
  };

  const undo = () => connectSocket().emit('whiteboard:undo');

  const clear = () => {
    if (!clearArmed) {
      setClearArmed(true);
      setTimeout(() => setClearArmed(false), 3000);
      return;
    }
    setClearArmed(false);
    connectSocket().emit('whiteboard:clear');
  };

  const save = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whiteboard.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full min-h-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-panel px-3 py-2">
        <div className="flex items-center gap-1.5">
          <ToolButton label="Pen" active={tool === 'pen'} onClick={() => setTool('pen')}>
            <Pencil size={16} />
          </ToolButton>
          <ToolButton label="Eraser" active={tool === 'eraser'} onClick={() => setTool('eraser')}>
            <Eraser size={16} />
          </ToolButton>
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Colors">
          {COLORS.map(([name, value]) => (
            <button
              key={value}
              type="button"
              aria-label={name}
              aria-pressed={color === value && tool === 'pen'}
              onClick={() => {
                setColor(value);
                setTool('pen');
              }}
              style={{ backgroundColor: value }}
              className={`h-6 w-6 rounded-full border-2 transition active:scale-90 ${
                color === value && tool === 'pen' ? 'border-fg' : 'border-transparent'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Brush size">
          {SIZES.map(([name, value]) => (
            <button
              key={value}
              type="button"
              aria-label={name}
              aria-pressed={size === value}
              title={name}
              onClick={() => setSize(value)}
              className={`grid h-9 w-9 place-items-center rounded-lg transition active:scale-90 ${
                size === value ? 'bg-raised ring-1 ring-accent' : 'hover:bg-raised'
              }`}
            >
              <span className="rounded-full bg-fg" style={{ width: value + 4, height: value + 4 }} />
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {screenShareActive && (
            <button
              type="button"
              onClick={onViewScreen}
              className="flex items-center gap-1.5 rounded-lg bg-raised px-3 py-2 text-xs text-accent transition hover:bg-line"
            >
              <MonitorUp size={14} /> View shared screen
            </button>
          )}
          <ToolButton label="Undo my last stroke" onClick={undo}>
            <Undo2 size={16} />
          </ToolButton>
          <button
            type="button"
            onClick={clear}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition active:scale-95 ${
              clearArmed ? 'bg-danger text-ink' : 'bg-raised text-fg hover:bg-line'
            }`}
          >
            <Trash2 size={16} /> {clearArmed ? 'Clear for everyone?' : 'Clear'}
          </button>
          <ToolButton label="Save as image" onClick={save}>
            <Download size={16} />
          </ToolButton>
          <ToolButton label="Close whiteboard" onClick={onClose}>
            <X size={16} />
          </ToolButton>
        </div>
      </div>

      {/* The container query keeps the 16:9 board as large as it can be without overflowing. */}
      <div className="grid min-h-0 flex-1 place-items-center" style={{ containerType: 'size' }}>
        <div style={{ width: 'min(100cqw, 177.78cqh)', aspectRatio: '16 / 9' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            className="block h-full w-full touch-none cursor-crosshair rounded-xl border border-line"
            aria-label="Shared whiteboard"
          />
        </div>
      </div>

      {notice && (
        <p role="alert" className="text-center text-sm text-danger">
          {notice}
        </p>
      )}
    </motion.div>
  );
}