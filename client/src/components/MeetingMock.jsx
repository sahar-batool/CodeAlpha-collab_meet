import { motion, useReducedMotion } from 'framer-motion';
import { Mic, MicOff, Video, ScreenShare, PenTool, MessageSquare, PhoneOff } from 'lucide-react';

const SKY = '#5cc8ff';
const ORANGE = '#ff9f43';
const MINT = '#4fe0c0';
const PINK = '#ff8fd0';
const LILAC = '#a78bfa';

// Hand-wobbled shapes for the sketch on the board.
const BOX = 'M10 12 Q10 4 20 4 L96 3 Q106 3 106 13 L107 52 Q107 62 97 62 L20 63 Q9 63 9 53 Z';
const ARROW = 'M146 92 Q165 86 190 93 M181 85 L190 93 L180 101';
const LOOP = 'M330 92 C330 50 380 42 440 48 C470 54 472 112 446 128 C410 144 345 140 332 108 C329 100 330 96 332 90';
const WAVE = 'M40 192 Q70 176 100 192 T160 192 T220 192 T280 192 T340 192 T400 192';

// A stroke that draws itself. Opacity starts at 0 so a zero-length round cap never shows as a dot.
function Stroke({ d, color, delay, dur = 0.7, reduce, transform }) {
  return (
    <motion.path
      d={d}
      transform={transform}
      fill="none"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduce ? false : { pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration: dur, delay, ease: 'easeInOut' },
        opacity: { duration: 0.01, delay },
      }}
    />
  );
}

function Label({ x, y, delay, reduce, children }) {
  return (
    <motion.text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize="15"
      fontWeight="600"
      fill="#f1f2fb"
      fontFamily="inherit"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay + 0.5, duration: 0.3 }}
    >
      {children}
    </motion.text>
  );
}

function Cursor({ x, y, color, name, delay, reduce }) {
  return (
    <motion.g
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <path d={`M${x} ${y} l0 14 l4 -3.5 l3 7 l3 -1.4 l-3 -6.8 l5.5 -0.4 Z`} fill={color} />
      <rect x={x + 12} y={y + 12} rx="7" width={name.length * 7 + 14} height="18" fill={color} />
      <text x={x + 19} y={y + 25} fontSize="11" fontWeight="600" fill="#12162e" fontFamily="inherit">
        {name}
      </text>
    </motion.g>
  );
}

function Tile({ name, color, ring, muted, delay, reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative aspect-video overflow-hidden rounded-xl border border-line bg-panel"
      style={ring ? { borderColor: color, boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="grid h-9 w-9 place-items-center rounded-full font-display text-sm font-bold"
          style={{ backgroundColor: color, color: '#12162e' }}
        >
          {name[0]}
        </div>
      </div>
      <div className="absolute bottom-1 left-1 hidden items-center gap-1 rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] md:flex">
        {muted && <MicOff size={10} className="text-danger" />}
        {name}
      </div>
    </motion.div>
  );
}

function RoundBtn({ active, danger, children }) {
  const tone = danger ? 'bg-danger text-ink' : active ? 'bg-fg text-ink' : 'bg-raised text-fg';
  return <span className={`grid h-9 w-9 place-items-center rounded-full ${tone}`}>{children}</span>;
}

export default function MeetingMock() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="night rounded-2xl border border-line p-3 shadow-[7px_7px_0_0_#ffd23f] sm:p-4 sm:shadow-[12px_12px_0_0_#ffd23f]"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
        </div>
        <span className="text-xs text-muted">Design review</span>
        <span className="text-xs text-muted">3 in call</span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_8.5rem]">
        <div className="flex items-center rounded-xl border border-line bg-panel p-2">
          <svg viewBox="0 0 480 215" className="block h-auto w-full">
            <Stroke d={BOX} color={SKY} delay={0.5} reduce={reduce} transform="translate(36 60)" />
            <Stroke d={ARROW} color={MINT} delay={1.0} dur={0.5} reduce={reduce} />
            <Stroke d={BOX} color={ORANGE} delay={1.3} reduce={reduce} transform="translate(186 60)" />
            <Stroke d={ARROW} color={MINT} delay={1.9} dur={0.5} reduce={reduce} transform="translate(150 0)" />
            <Stroke d={BOX} color={SKY} delay={2.2} reduce={reduce} transform="translate(336 60)" />
            <Stroke d={LOOP} color={PINK} delay={2.9} dur={0.9} reduce={reduce} />
            <Stroke d={WAVE} color={LILAC} delay={3.4} dur={0.9} reduce={reduce} />
            <Label x={94} y={98} delay={0.5} reduce={reduce}>Sign up</Label>
            <Label x={244} y={98} delay={1.3} reduce={reduce}>Start</Label>
            <Label x={394} y={98} delay={2.2} reduce={reduce}>Share link</Label>
            <Cursor x={392} y={140} color={PINK} name="Maya" delay={3.7} reduce={reduce} />
            <Cursor x={396} y={180} color={LILAC} name="Dev" delay={4.2} reduce={reduce} />
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-1 md:content-start">
          <Tile name="Maya" color={PINK} ring delay={0.1} reduce={reduce} />
          <Tile name="Dev" color={LILAC} muted delay={0.25} reduce={reduce} />
          <Tile name="Priya" color={ORANGE} delay={0.4} reduce={reduce} />
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <RoundBtn><Mic size={16} /></RoundBtn>
        <RoundBtn><Video size={16} /></RoundBtn>
        <RoundBtn><ScreenShare size={16} /></RoundBtn>
        <RoundBtn active><PenTool size={16} /></RoundBtn>
        <RoundBtn><MessageSquare size={16} /></RoundBtn>
        <RoundBtn danger><PhoneOff size={16} /></RoundBtn>
      </div>
    </div>
  );
}