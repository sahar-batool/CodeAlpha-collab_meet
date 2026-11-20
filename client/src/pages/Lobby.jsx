import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';

const CODE_RE = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;
// Accepts a bare code or a whole pasted invite link.
const extractCode = (value) => value.trim().toLowerCase().split('/').filter(Boolean).pop() || '';

const KEYS = [['M', 'mutes'], ['V', 'turns your camera on or off'], ['S', 'shares your screen'], ['W', 'opens the whiteboard'], ['C', 'opens chat']];

export default function Lobby() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinValue, setJoinValue] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const firstName = user.name.trim().split(' ')[0];

  const createRoom = async () => {
    setError('');
    setCreating(true);
    try {
      const { room } = await api('/api/rooms', { method: 'POST', body: {} });
      navigate(`/room/${room.code}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const joinRoom = (e) => {
    e.preventDefault();
    const code = extractCode(joinValue);
    if (!CODE_RE.test(code)) return setError('That does not look like a meeting code. Example: abc-defg-hij');
    navigate(`/room/${code}`);
  };

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="paper min-h-full">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" aria-label="Collab Meet home"><Logo /></Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>Log out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:pt-12">
        <div className="animate-rise">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Hi, {firstName}.</h1>
          <p className="mt-2 text-muted">Start a meeting, or join one with a code.</p>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            <section className="night relative overflow-hidden rounded-3xl p-7 sm:p-9 md:col-span-3">
              <svg className="pointer-events-none absolute -bottom-10 -right-8 opacity-90" width="190" height="190" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="11" cy="12" r="8" fill="#5cc8ff" />
                <circle cx="21" cy="12" r="8" fill="#ff8fd0" fillOpacity="0.85" />
                <circle cx="16" cy="21" r="8" fill="#ffd23f" fillOpacity="0.85" />
              </svg>
              <h2 className="font-display text-3xl font-bold tracking-tight">New meeting</h2>
              <p className="mt-2 max-w-xs text-muted">
                You get an invite link to send. Up to six people can be in the room at once.
              </p>
              <Button onClick={createRoom} loading={creating} size="lg" className="mt-8">
                <Video size={18} /> Start a meeting
              </Button>
            </section>

            <section className="rounded-3xl border border-line bg-panel p-7 sm:p-9 md:col-span-2">
              <h2 className="font-display text-3xl font-bold tracking-tight">Join</h2>
              <p className="mb-5 mt-2 text-muted">Paste a code or an invite link.</p>
              <form onSubmit={joinRoom} className="space-y-3">
                <Input
                  label="Meeting code or link"
                  name="code"
                  value={joinValue}
                  onChange={(e) => setJoinValue(e.target.value)}
                  placeholder="abc-defg-hij"
                />
                <Button type="submit" variant="ghost" className="w-full">Join meeting</Button>
              </form>
            </section>
          </div>

          {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}

          <p className="mt-12 text-sm text-muted">In a meeting:</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {KEYS.map(([k, text]) => (
              <li key={k} className="flex items-center gap-2">
                <kbd className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel font-display font-bold shadow-[0_2px_0_0_var(--color-line)]">{k}</kbd>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}