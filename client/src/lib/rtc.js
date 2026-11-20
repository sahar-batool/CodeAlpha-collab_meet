import { api } from '../api/client';

const FALLBACK = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let servers = FALLBACK;
let loadedAt = 0;

// Asks the server for TURN credentials (the secret key stays there).
// Without them, public STUN still connects most networks.
export async function loadIceServers() {
  if (Date.now() - loadedAt < 10 * 60 * 1000) return servers;
  try {
    const { iceServers } = await api('/api/ice');
    if (iceServers?.length) servers = iceServers;
    loadedAt = Date.now();
  } catch {
    /* keep whatever we already have */
  }
  return servers;
}

export const getIceServers = () => servers;