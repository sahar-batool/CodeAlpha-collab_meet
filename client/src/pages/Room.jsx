import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import VideoTile from '../components/VideoTile';
import Controls from '../components/Controls';
import Button from '../components/Button';

const gridFor = (count) =>
  count <= 1
    ? 'max-w-3xl grid-cols-1'
    : count <= 4
      ? 'max-w-5xl grid-cols-1 sm:grid-cols-2'
      : 'max-w-6xl grid-cols-2 lg:grid-cols-3';

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, error, roomName, localStream, peers, micOn, camOn, toggleMic, toggleCam } = useRoom(code);
  const [copied, setCopied] = useState(false);

  const leave = () => navigate('/');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked; ignore */
    }
  };

  if (status === 'error') {
    return (
      <main className="grid h-full place-items-center p-6">
        <div className="animate-rise max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Can't join this meeting</h1>
          <p className="mt-2 text-muted">{error}</p>
          <Button className="mt-6" onClick={leave}>Back to lobby</Button>
        </div>
      </main>
    );
  }

  const peerList = Object.entries(peers);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-display font-semibold">{roomName || 'Joining…'}</h1>
                    <p className="text-sm text-muted">{code} · {peerList.length + 1} in call</p>
        </div>
        <Button variant="ghost" onClick={copyLink} className="flex items-center gap-2 text-sm">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy invite link'}
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4">
        <div className={`grid w-full gap-4 ${gridFor(peerList.length + 1)}`}>
          <AnimatePresence>
           
              <VideoTile key="me" stream={localStream} name={`${user.name} (You)`} muted mirrored camOff={!camOn} micOn={micOn} />
            {peerList.map(([id, p]) => (
              <VideoTile
                key={id}
                stream={p.stream}
                name={p.name}
                camOff={!p.camOn}
                micOn={p.micOn}
                connection={p.connection}
              />
            ))}
          </AnimatePresence>
        </div>
        {status === 'joined' && peerList.length === 0 && (
          <p className="text-muted">Waiting for others. Share the invite link to bring people in.</p>
        )}
      </main>

      <Controls micOn={micOn} camOn={camOn} onToggleMic={toggleMic} onToggleCam={toggleCam} onLeave={leave} />
    </div>
  );
}