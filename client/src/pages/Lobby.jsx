import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../lib/socket';
import Button from '../components/Button';

export default function Lobby() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState('Not tested yet');

  const testConnection = () => {
    setStatus('Connecting…');
    const socket = connectSocket();
    const timer = setTimeout(() => setStatus('No response (timeout)'), 5000);
    const ping = () =>
      socket.emit('ping:check', (res) => {
        clearTimeout(timer);
        setStatus(`Connected as ${res.user.name}`);
      });
    socket.once('connect_error', (e) => {
      clearTimeout(timer);
      setStatus(`Connection failed: ${e.message}`);
    });
    if (socket.connected) ping();
    else socket.once('connect', ping);
  };

  const burstTest = () => {
    const socket = connectSocket();
    let acks = 0;
    for (let i = 0; i < 40; i++) socket.emit('ping:check', () => acks++);
    setTimeout(() => setStatus(`Burst: ${acks} of 40 acknowledged (limit is 30 per second)`), 1500);
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="animate-rise rounded-2xl border border-line bg-panel p-8">
        <h1 className="font-display text-2xl font-semibold">Hi, {user.name}</h1>
        <p className="mt-1 text-muted">{user.email}</p>

        <div className="mt-6 rounded-xl border border-line bg-raised p-4">
          <p className="text-sm text-muted">Socket status</p>
          <p className="mt-1 font-medium">{status}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={testConnection}>Test socket</Button>
          <Button variant="ghost" onClick={burstTest}>Test rate limit</Button>
          <Button variant="ghost" onClick={logout}>Log out</Button>
        </div>
      </div>
    </main>
  );
}