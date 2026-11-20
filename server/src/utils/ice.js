// Short-lived TURN credentials from Cloudflare. The long-term key never leaves the server.
const TTL_SECONDS = 24 * 60 * 60;
const REUSE_MS = (TTL_SECONDS / 2) * 1000; // reuse for 12 h, so each call has 12 h+ of validity left

let cache = null; // { servers, at }
let inflight = null; // a request in progress, shared by everyone who asks at the same time

// Browsers block TURN on port 53. ":5349" must not match, so the port is matched exactly.
const isPort53 = (url) => /:53(\?|$)/.test(url);

function clean(raw) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((s) => ({ ...s, urls: [].concat(s.urls || []).filter((u) => !isPort53(u)) }))
    .filter((s) => s.urls.length > 0);
}

async function request() {
  const { TURN_KEY_ID, TURN_KEY_API_TOKEN } = process.env;
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${TURN_KEY_ID}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL_SECONDS }),
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!res.ok) throw new Error(`Cloudflare TURN returned ${res.status}`);
  const data = await res.json();
  return clean(data.iceServers);
}

// Returns [] when TURN is not configured or Cloudflare is unreachable.
// The client then falls back to public STUN, which still works on most networks.
export async function getTurnServers() {
  if (!process.env.TURN_KEY_ID || !process.env.TURN_KEY_API_TOKEN) return [];
  if (cache && Date.now() - cache.at < REUSE_MS) return cache.servers;

  if (!inflight) {
    inflight = request()
      .then((servers) => {
        cache = { servers, at: Date.now() };
        return servers;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (err) {
    console.error('TURN credentials failed:', err.message);
    return cache?.servers ?? [];
  }
}