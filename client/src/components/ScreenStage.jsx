import { useEffect, useRef } from 'react';
import { MonitorUp } from 'lucide-react';
import Button from './Button';

export default function ScreenStage({ stream, name, isLocal, onStop }) {
  const videoRef = useRef(null);

  useEffect(() => {
    // Never play our own screen back to ourselves; it would show a tunnel of screens.
    if (videoRef.current) videoRef.current.srcObject = isLocal ? null : stream || null;
  }, [stream, isLocal]);

  if (isLocal) {
    return (
      <div className="grid h-full min-h-48 place-items-center rounded-2xl border border-accent/40 bg-panel p-6 text-center">
        <div>
          <MonitorUp size={36} className="mx-auto text-accent" />
          <h2 className="mt-3 font-display text-lg font-semibold">You are sharing your screen</h2>
          <p className="mt-1 text-sm text-muted">Everyone in the meeting can see it.</p>
          <Button onClick={onStop} className="mt-5">Stop sharing</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-48 overflow-hidden rounded-2xl border border-line bg-black">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
      {!stream && (
        <div className="absolute inset-0 grid place-items-center text-muted">Starting screen share…</div>
      )}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-ink/70 px-3 py-1.5 text-sm backdrop-blur">
        <MonitorUp size={14} className="text-accent" />
        {name} is sharing their screen
      </div>
    </div>
  );
}