import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const CODE_RE = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;
// Accepts a bare code or a whole pasted invite link.
const extractCode = (value) => value.trim().toLowerCase().split('/').filter(Boolean).pop() || '';

export default function Lobby() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinValue, setJoinValue] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

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
    if (!CODE_RE.test(code)) return setError('That does not look like a room code. Example: abc-defg-hij');
    navigate(`/room/${code}`);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-display text-sm text-muted">Collab Meet</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{user.name}</span>
          <Button variant="ghost" onClick={logout} className="!px-3 !py-1.5 text-sm">Log out</Button>
        </div>
      </header>

      <div className="animate-rise grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-display text-xl font-semibold">Start a meeting</h2>
          <p className="mb-6 mt-1 text-muted">Create a room and invite others with a link.</p>
          <Button onClick={createRoom} loading={creating} className="flex w-full items-center justify-center gap-2">
            <Video size={18} /> New meeting
          </Button>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-display text-xl font-semibold">Join a meeting</h2>
          <p className="mb-4 mt-1 text-muted">Paste a code or an invite link.</p>
          <form onSubmit={joinRoom} className="space-y-3">
            <Input label="Room code or link" name="code" value={joinValue} onChange={(e) => setJoinValue(e.target.value)} placeholder="abc-defg-hij" />
            <Button type="submit" variant="ghost" className="w-full">Join</Button>
          </form>
        </section>
      </div>

      {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
    </main>
  );
}