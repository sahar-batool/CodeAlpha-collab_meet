import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSpeaking } from '../hooks/useSpeaking';
import Button from './Button';

async function getPreview() {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch {
    // Camera missing or busy: fall back to audio only.
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

function RoundToggle({ label, on, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={!on}
      title={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition active:scale-90 disabled:opacity-40 disabled:active:scale-100 ${
        on ? 'bg-raised text-fg hover:bg-line' : 'bg-fg text-ink hover:brightness-95'
      }`}
    >
      {children}
    </button>
  );
}

export default function PreJoin({ code, onJoin }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [retry, setRetry] = useState(0);
  const videoRef = useRef(null);
  const speaking = useSpeaking(stream, micOn);

  useEffect(() => {
    let cancelled = false;
    let current = null;
    getPreview()
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop()); // we left before the camera answered
          return;
        }
        current = s;
        setError('');
        setStream(s);
        setMicOn(s.getAudioTracks().length > 0);
        setCamOn(s.getVideoTracks().length > 0);
      })
      .catch(() =>
        !cancelled &&
        setError('Camera and microphone access is needed. Allow it in your browser, then try again.')
      );
    return () => {
      cancelled = true;
      current?.getTracks().forEach((t) => t.stop()); // turns the camera light off
      setStream(null);
    };
  }, [retry]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const hasAudio = !!stream && stream.getAudioTracks().length > 0;
  const hasVideo = !!stream && stream.getVideoTracks().length > 0;

  const toggle = (kind) => {
    const track = (kind === 'mic' ? stream?.getAudioTracks() : stream?.getVideoTracks())?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    (kind === 'mic' ? setMicOn : setCamOn)(track.enabled);
  };

  const join = () => {
    // Release the camera first; the call asks for it again a moment later.
    stream?.getTracks().forEach((t) => t.stop());
    onJoin({ micOn: hasAudio && micOn, camOn: hasVideo && camOn });
  };

  return (
    <main className="grid min-h-full place-items-center p-6">
      <div className="animate-rise w-full max-w-lg rounded-2xl border border-line bg-panel p-6">
        <h1 className="font-display text-xl font-semibold">Ready to join?</h1>
        <p className="mt-1 text-sm text-muted">Meeting code: {code}</p>

        <div
          className={`relative mt-5 aspect-video overflow-hidden rounded-xl border bg-ink transition-shadow duration-200 ${
            speaking ? 'border-accent ring-2 ring-accent' : 'border-line'
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${hasVideo && camOn ? '' : 'invisible'}`}
          />
          {!(hasVideo && camOn) && (
            <div className="absolute inset-0 grid place-items-center">
              {error ? (
                <p role="alert" className="max-w-xs px-4 text-center text-sm text-danger">{error}</p>
              ) : stream ? (
                <div className="grid h-16 w-16 place-items-center rounded-full bg-raised font-display text-2xl">
                  {user.name.trim().slice(0, 1).toUpperCase()}
                </div>
              ) : (
                <p className="text-sm text-muted">Starting your camera…</p>
              )}
            </div>
          )}
        </div>

        {stream && !hasVideo && (
          <p className="mt-3 text-center text-sm text-muted">
            No camera found. You will join with audio only.
          </p>
        )}

        <div className="mt-5 flex justify-center gap-3">
          <RoundToggle label={micOn ? 'Mute microphone' : 'Unmute microphone'} on={micOn} disabled={!hasAudio} onClick={() => toggle('mic')}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </RoundToggle>
          <RoundToggle label={camOn ? 'Turn camera off' : 'Turn camera on'} on={camOn} disabled={!hasVideo} onClick={() => toggle('cam')}>
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
          </RoundToggle>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/')} className="flex-1">Back</Button>
          {error ? (
            <Button onClick={() => setRetry((n) => n + 1)} className="flex-1">Try again</Button>
          ) : (
            <Button onClick={join} disabled={!stream} className="flex-1">Join now</Button>
          )}
        </div>
      </div>
    </main>
  );
}