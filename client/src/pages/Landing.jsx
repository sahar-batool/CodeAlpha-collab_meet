import { Link } from 'react-router-dom';
import { Mic, Video, ScreenShare, PenTool, MessageSquare, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import Button from '../components/Button';
import MeetingMock from '../components/MeetingMock';

const NAVY = '#12162e';

function Avatar({ letter, color, ring }) {
  return (
    <div
      className="relative grid aspect-video place-items-center rounded-lg border border-line bg-panel"
      style={ring ? { borderColor: color, boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold"
        style={{ backgroundColor: color, color: NAVY }}
      >
        {letter}
      </span>
    </div>
  );
}

function Card({ className = '', style, children }) {
  return (
    <div className={`rounded-3xl p-6 sm:p-7 ${className}`} style={style}>
      {children}
    </div>
  );
}

const Title = ({ children }) => (
  <h3 className="font-display text-2xl font-bold tracking-tight">{children}</h3>
);
const Text = ({ children }) => (
  <p className="mt-2 max-w-sm text-[0.95rem] leading-relaxed opacity-80">{children}</p>
);

const STEPS = [
  ['1', '#5cc8ff', 'Create an account', 'A name, an email and a password. That is all we ask for.'],
  ['2', '#ff9f43', 'Start a meeting', 'Check your camera on the preview screen, then join.'],
  ['3', '#4fe0c0', 'Send the link', 'Copy the invite link from the meeting header. Anyone with an account can join from it.'],
];

const FACTS = [
  ['Video and audio', 'Encrypted in transit between participants, using the standard WebRTC protections.'],
  ['Accounts', 'Passwords are hashed with bcrypt, and repeated failed logins are slowed down.'],
  ['Chat and whiteboard', 'Kept in memory while the meeting is live, then discarded when everyone leaves.'],
  ['Files', 'Up to 10 MB each, and deleted automatically after 7 days.'],
];

export default function Landing() {
  const { user, loading } = useAuth();
  const startTo = user ? '/lobby' : '/register';
  const startLabel = user ? 'Open your meetings' : 'Start a meeting';

  return (
    <div className="paper min-h-full">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" aria-label="Collab Meet home">
            <span className="sm:hidden"><Logo text={false} /></span>
            <span className="hidden sm:inline"><Logo /></span>
          </Link>
          <nav className="hidden gap-8 text-sm md:flex" aria-label="Page sections">
            <a href="#features" className="text-muted transition hover:text-fg">Features</a>
            <a href="#how" className="text-muted transition hover:text-fg">How it works</a>
            <a href="#security" className="text-muted transition hover:text-fg">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            {!user && !loading && (
              <span className="hidden sm:inline-flex">
                <Button to="/login" variant="ghost" size="sm" className="border-transparent">Log in</Button>
              </span>
            )}
            <Button to={startTo} size="sm">{startLabel}</Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section
          className="border-b border-line"
          style={{
            backgroundImage: 'radial-gradient(var(--color-line) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        >
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_1.08fr] lg:py-28">
            <div>
              <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl">
                Talk it through. Draw it out.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
                Video meetings for up to six people, with a whiteboard everyone can draw on, screen
                sharing, chat and file sharing. It all runs in your browser, so there is nothing to install.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button to={startTo} size="lg">{startLabel}</Button>
                {!user && <Button to="/login" variant="ghost" size="lg">Log in</Button>}
              </div>
              <p className="mt-5 max-w-md text-sm text-muted">
                Joining someone else&rsquo;s meeting? Open the link they sent you.
              </p>
            </div>
            <MeetingMock />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:py-24">
          <h2 className="max-w-xl font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
            Everything a meeting needs, in one room.
          </h2>

          <div className="mt-12 grid gap-4 lg:grid-cols-6">
            <Card className="night lg:col-span-4">
              <div className="grid items-center gap-6 sm:grid-cols-2">
                <div>
                  <Title>Video that stays readable</Title>
                  <Text>
                    Up to six people on one call. Mute and camera controls, and a ring in their own color
                    around whoever is speaking.
                  </Text>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Avatar letter="M" color="#5cc8ff" ring />
                  <Avatar letter="D" color="#ff9f43" />
                  <Avatar letter="P" color="#ff8fd0" />
                  <Avatar letter="A" color="#b8f35c" />
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-2" style={{ backgroundColor: '#ffd23f', color: NAVY }}>
              <Title>Draw together</Title>
              <Text>Everyone&rsquo;s strokes appear live. Undo only removes your own, and you can save the board as an image.</Text>
              <svg viewBox="0 0 200 54" className="mt-5 h-auto w-full" aria-hidden="true">
                <path d="M6 38 Q30 8 54 30 T104 28 T154 26" fill="none" stroke={NAVY} strokeWidth="4" strokeLinecap="round" />
                <path d="M110 46 Q140 36 190 44" fill="none" stroke="#ff5c39" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </Card>

            <Card className="border border-line bg-panel lg:col-span-2">
              <Title>Share your screen</Title>
              <Text>Pick a window or a tab. Everyone&rsquo;s cameras tuck into a strip beside it.</Text>
              <div className="mt-5 flex gap-2" aria-hidden="true">
                <div className="h-20 flex-1 space-y-1.5 rounded-lg border border-line bg-raised p-2.5">
                  <div className="h-2 w-3/4 rounded bg-line" />
                  <div className="h-2 w-1/2 rounded bg-line" />
                  <div className="h-2 w-2/3 rounded bg-line" />
                </div>
                <div className="flex w-9 flex-col gap-1.5">
                  {['#5cc8ff', '#ff9f43', '#ff8fd0'].map((c) => (
                    <span key={c} className="h-[1.5rem] rounded-md" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-2" style={{ backgroundColor: '#d6f0ff', color: NAVY }}>
              <Title>Chat and share files</Title>
              <Text>Messages and files up to 10 MB, kept for everyone who joins while the meeting is live.</Text>
              <div className="mt-5 space-y-2 text-sm" aria-hidden="true">
                <p className="w-fit rounded-2xl rounded-bl-md bg-white px-3.5 py-2">Can you drop the sketch in?</p>
                <p className="ml-auto flex w-fit items-center gap-2 rounded-2xl rounded-br-md px-3.5 py-2 text-white" style={{ backgroundColor: NAVY }}>
                  <FileText size={14} /> sketch.pdf
                </p>
              </div>
            </Card>

            <Card className="border border-line bg-raised lg:col-span-2">
              <Title>Quick keys</Title>
              <Text>Keep your hands on the keyboard while you talk.</Text>
              <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
                {[['M', Mic], ['V', Video], ['S', ScreenShare], ['W', PenTool], ['C', MessageSquare]].map(([k, Icon]) => (
                  <span key={k} className="flex flex-col items-center gap-1">
                    <kbd className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-panel font-display text-base font-bold shadow-[0_2px_0_0_var(--color-line)]">
                      {k}
                    </kbd>
                    <Icon size={13} className="text-muted" />
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-line bg-panel">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <h2 className="max-w-lg font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
              From sign-up to a live meeting in three steps.
            </h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map(([n, color, title, body]) => (
                <li key={n}>
                  <span
                    className="-ml-2 inline-block px-2 font-display text-6xl font-bold leading-none"
                    style={{ backgroundImage: `linear-gradient(transparent 48%, ${color} 48%, ${color} 90%, transparent 90%)` }}
                  >
                    {n}
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-xs leading-relaxed text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <h2 className="font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
                What happens to your meeting.
              </h2>
              <p className="mt-5 max-w-sm leading-relaxed text-muted">
                Chat and files pass through our server over HTTPS, so they are not end-to-end encrypted.
              </p>
            </div>
            <dl>
              {FACTS.map(([term, text]) => (
                <div key={term} className="grid gap-1 border-t border-line py-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                  <dt className="font-display text-lg font-bold tracking-tight">{term}</dt>
                  <dd className="max-w-md leading-relaxed text-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:pb-24">
          <div className="night rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-20">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-5xl">
              Your next meeting is one link away.
            </h2>
            <div className="mt-9">
              <Button to={startTo} size="lg">{startLabel}</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <Logo size={24} />
          <p className="text-sm text-muted">Built with React, Node, Socket.IO and WebRTC.</p>
        </div>
      </footer>
    </div>
  );
}