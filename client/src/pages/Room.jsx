import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../hooks/useRoom';
import PreJoin from '../components/PreJoin';
import VideoTile from '../components/VideoTile';
import ScreenStage from '../components/ScreenStage';
import Whiteboard from '../components/Whiteboard';
import SidePanel from '../components/SidePanel';
import Controls from '../components/Controls';
import Toasts from '../components/Toasts';
import Button from '../components/Button';

const gridFor = (count) =>
  count <= 1
    ? 'max-w-3xl grid-cols-1'
    : count <= 4
      ? 'max-w-5xl grid-cols-1 sm:grid-cols-2'
      : 'max-w-6xl grid-cols-2 lg:grid-cols-3';

function Call({ code, initial }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    status, error, roomName, localStream, peers, micOn, camOn, toggleMic, toggleCam,
    screenStream, shareError, startShare, stopShare,
    selfId, messages, files, sendMessage,
  } = useRoom(code, initial);
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notices, setNotices] = useState([]);
  const lastCount = useRef(null);
  const knownPeers = useRef(null);

  const canShare = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  const sharing = !!screenStream;
  const peerList = Object.entries(peers);
  const remoteSharer = peerList.find(([, p]) => p.screenId);
  const screenActive = sharing || !!remoteSharer;
  const focus = boardOpen || screenActive; // a big main area with the cameras in a strip

  // Count new chat messages and files that arrive while the panel is closed.
  useEffect(() => {
    if (status !== 'joined') {
      lastCount.current = null;
      return;
    }
    const total = messages.length + files.length;
    if (lastCount.current !== null && !panelOpen && total > lastCount.current) {
      setUnread((n) => n + total - lastCount.current);
    }
    lastCount.current = total;
  }, [status, messages.length, files.length, panelOpen]);

  // "Sam joined" / "Sam left" notices, found by comparing the people list with the last one.
  useEffect(() => {
    if (status !== 'joined') {
      knownPeers.current = null;
      return;
    }
    const now = {};
    for (const [id, p] of Object.entries(peers)) now[id] = p.name;
    const before = knownPeers.current;
    knownPeers.current = now;
    if (!before) return; // first look after joining: everyone here was already here

    const fresh = [];
    for (const id of Object.keys(now)) if (!(id in before)) fresh.push({ kind: 'join', text: `${now[id]} joined` });
    for (const id of Object.keys(before)) if (!(id in now)) fresh.push({ kind: 'leave', text: `${before[id]} left` });
    if (!fresh.length) return;

    const stamped = fresh.map((n) => ({ ...n, id: crypto.randomUUID?.() ?? String(Math.random()) }));
    setNotices((list) => [...list, ...stamped].slice(-3));
    stamped.forEach((n) =>
      setTimeout(() => setNotices((list) => list.filter((x) => x.id !== n.id)), 4000)
    );
  }, [peers, status]);

  const togglePanel = () => {
    if (!panelOpen) setUnread(0);
    setPanelOpen(!panelOpen);
  };

  // Keyboard shortcuts: M mic, V camera, S share screen, W whiteboard, C chat.
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; // leave Ctrl+W, Cmd+C etc. alone
      const el = e.target;
      const typing =
        el instanceof HTMLElement &&
        (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
      if (typing) return; // never steal letters while someone is typing a message

      switch (e.key.toLowerCase()) {
        case 'm': toggleMic(); break;
        case 'v': toggleCam(); break;
        case 's': if (canShare) (sharing ? stopShare : startShare)(); break;
        case 'w': setBoardOpen((open) => !open); break;
        case 'c':
          if (!panelOpen) setUnread(0);
          setPanelOpen(!panelOpen);
          break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleMic, toggleCam, canShare, sharing, startShare, stopShare, panelOpen]);

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

  const tiles = (
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
  );

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

      {status === 'reconnecting' && (
        <div role="status" className="border-b border-line bg-raised px-5 py-2 text-center text-sm text-muted">
          Connection lost. Reconnecting…
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {focus ? (
            <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
              <section className="min-h-0 min-w-0 flex-1">
                {boardOpen ? (
                  <Whiteboard
                    onClose={() => setBoardOpen(false)}
                    screenShareActive={screenActive}
                    onViewScreen={() => setBoardOpen(false)}
                  />
                ) : (
                  <ScreenStage
                    isLocal={sharing}
                    stream={remoteSharer?.[1].screenStream}
                    name={remoteSharer?.[1].name}
                    onStop={stopShare}
                  />
                )}
              </section>
              <div className="grid shrink-0 grid-cols-3 gap-3 lg:w-60 lg:grid-cols-1 lg:content-start lg:overflow-y-auto">
                {tiles}
              </div>
            </main>
          ) : (
            <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4">
              <div className={`grid w-full gap-4 ${gridFor(peerList.length + 1)}`}>{tiles}</div>
              {status === 'joined' && peerList.length === 0 && (
                <p className="text-muted">Waiting for others. Share the invite link to bring people in.</p>
              )}
            </main>
          )}
        </div>

        <AnimatePresence>
          {panelOpen && (
            <SidePanel
              key="panel"
              code={code}
              selfId={selfId}
              messages={messages}
              files={files}
              onSend={sendMessage}
              onClose={togglePanel}
            />
          )}
        </AnimatePresence>
      </div>

      <Toasts items={notices} />

      {shareError && (
        <div role="alert" className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
          <p className="rounded-xl border border-line bg-raised px-4 py-2 text-sm text-danger shadow-lg">{shareError}</p>
        </div>
      )}

      <Controls
        micOn={micOn}
        camOn={camOn}
        sharing={sharing}
        canShare={canShare}
        panelOpen={panelOpen}
        unread={unread}
        boardOpen={boardOpen}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleShare={sharing ? stopShare : startShare}
        onTogglePanel={togglePanel}
        onToggleBoard={() => setBoardOpen((open) => !open)}
        onLeave={leave}
      />
    </div>
  );
}

// The page people land on: a preview screen first, then the call itself.
export default function Room() {
  const { code } = useParams();
  const [prefs, setPrefs] = useState(null);

  if (!prefs || prefs.code !== code) {
    return <PreJoin key={code} code={code} onJoin={(p) => setPrefs({ ...p, code })} />;
  }
  return <Call key={code} code={code} initial={prefs} />;
}