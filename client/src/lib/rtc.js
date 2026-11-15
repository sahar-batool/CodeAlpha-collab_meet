const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// To add a TURN server later, set VITE_ICE_SERVERS to a JSON array in .env.
export function getIceServers() {
  try {
    const raw = import.meta.env.VITE_ICE_SERVERS;
    if (raw) return JSON.parse(raw);
  } catch {
    console.warn('VITE_ICE_SERVERS is not valid JSON, using defaults.');
  }
  return DEFAULT_ICE_SERVERS;
}