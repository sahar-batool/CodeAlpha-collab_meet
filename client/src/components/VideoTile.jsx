import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function VideoTile({ stream, name, muted = false, mirrored = false, camOff = false }) {
  const videoRef = useRef(null);

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
      className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-panel"
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
          <div className="grid h-16 w-16 place-items-center rounded-full bg-raised font-display text-2xl">
            {initials}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 max-w-[80%] truncate rounded-lg bg-ink/70 px-2.5 py-1 text-sm backdrop-blur">
        {name}
      </div>
    </motion.div>
  );
}