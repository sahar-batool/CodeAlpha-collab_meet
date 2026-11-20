import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MicOff } from 'lucide-react';
import { useSpeaking } from '../hooks/useSpeaking';
import { colorFor } from '../lib/people';

const LABELS = {
  connecting: 'Connecting…',
  disconnected: 'Reconnecting…',
  failed: 'Connection failed',
};

export default function VideoTile({
  stream,
  name,
  muted = false,
  mirrored = false,
  camOff = false,
  micOn = true,
  connection = 'connected',
}) {
  const videoRef = useRef(null);
  const speaking = useSpeaking(stream, micOn);
  // Strip the "(You)" suffix so you get the same color on your screen and on everyone else's.
  const color = colorFor(name.replace(/ \(You\)$/, ''));

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  const hasVideo = !!stream && stream.getVideoTracks().length > 0 && !camOff;
  const initials = name.trim().slice(0, 1).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-panel transition-shadow duration-200"
      style={speaking ? { borderColor: color, boxShadow: `0 0 0 3px ${color}` } : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''} ${hasVideo ? '' : 'invisible'}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="grid h-16 w-16 place-items-center rounded-full font-display text-2xl font-bold"
            style={{ backgroundColor: color, color: '#12162e' }}
          >
            {initials}
          </div>
        </div>
      )}

      {connection !== 'connected' && (
        <div
          className={`absolute right-2 top-2 rounded-lg bg-ink/70 px-2.5 py-1 text-xs backdrop-blur ${
            connection === 'failed' ? 'text-danger' : 'text-muted'
          }`}
        >
          {LABELS[connection]}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[85%] items-center gap-1.5 rounded-lg bg-ink/70 px-2.5 py-1 text-sm backdrop-blur">
        {!micOn && <MicOff size={14} className="shrink-0 text-danger" aria-label="Muted" />}
        <span className="truncate">{name}</span>
      </div>
    </motion.div>
  );
}