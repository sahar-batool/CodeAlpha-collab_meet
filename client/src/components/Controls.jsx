import {
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff, MessageSquare, PenTool,
} from 'lucide-react';

function RoundButton({ label, keys, active = true, danger = false, badge = 0, onClick, children }) {
  const tone = danger
    ? 'bg-danger text-ink hover:brightness-110'
    : active
      ? 'bg-raised text-fg hover:bg-line'
      : 'bg-fg text-ink hover:brightness-95';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-keyshortcuts={keys}
      title={keys ? `${label} (${keys})` : label}
      className={`relative grid h-12 w-12 place-items-center rounded-full transition active:scale-90 ${tone}`}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-ink">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

export default function Controls({
  micOn, camOn, sharing, canShare, panelOpen, unread, boardOpen,
  onToggleMic, onToggleCam, onToggleShare, onTogglePanel, onToggleBoard, onLeave,
}) {
  return (
    <footer className="flex flex-wrap justify-center gap-3 border-t border-line p-4">
      <RoundButton label={micOn ? 'Mute microphone' : 'Unmute microphone'} keys="M" active={micOn} onClick={onToggleMic}>
        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
      </RoundButton>
      <RoundButton label={camOn ? 'Turn camera off' : 'Turn camera on'} keys="V" active={camOn} onClick={onToggleCam}>
        {camOn ? <Video size={20} /> : <VideoOff size={20} />}
      </RoundButton>
      {canShare && (
        <RoundButton label={sharing ? 'Stop sharing screen' : 'Share your screen'} keys="S" active={!sharing} onClick={onToggleShare}>
          {sharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
        </RoundButton>
      )}
      <RoundButton label={boardOpen ? 'Close whiteboard' : 'Open whiteboard'} keys="W" active={!boardOpen} onClick={onToggleBoard}>
        <PenTool size={20} />
      </RoundButton>
      <RoundButton label={panelOpen ? 'Close chat and files' : 'Open chat and files'} keys="C" active={!panelOpen} badge={unread} onClick={onTogglePanel}>
        <MessageSquare size={20} />
      </RoundButton>
      <RoundButton label="Leave meeting" danger onClick={onLeave}>
        <PhoneOff size={20} />
      </RoundButton>
    </footer>
  );
}