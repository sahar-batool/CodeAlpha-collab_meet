import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

function RoundButton({ label, active = true, danger = false, onClick, children }) {
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
      title={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition active:scale-90 ${tone}`}
    >
      {children}
    </button>
  );
}

export default function Controls({ micOn, camOn, onToggleMic, onToggleCam, onLeave }) {
  return (
    <footer className="flex justify-center gap-3 border-t border-line p-4">
      <RoundButton label={micOn ? 'Mute microphone' : 'Unmute microphone'} active={micOn} onClick={onToggleMic}>
        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
      </RoundButton>
      <RoundButton label={camOn ? 'Turn camera off' : 'Turn camera on'} active={camOn} onClick={onToggleCam}>
        {camOn ? <Video size={20} /> : <VideoOff size={20} />}
      </RoundButton>
      <RoundButton label="Leave meeting" danger onClick={onLeave}>
        <PhoneOff size={20} />
      </RoundButton>
    </footer>
  );
}