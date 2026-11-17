// Per-socket rate limiting. Add a rule here whenever a new event is introduced.
// Each rule: max events allowed per windowMs.
const RULES = {
  default: { max: 30, windowMs: 1000 },
  signal: { max: 60, windowMs: 1000 }, // WebRTC offers/answers/ICE
  'room:join': { max: 5, windowMs: 5000 },
  'room:media': { max: 10, windowMs: 2000 },
  'room:screen-start': { max: 3, windowMs: 5000 },
  'chat:message': { max: 5, windowMs: 3000 },
  'whiteboard:draw': { max: 120, windowMs: 1000 },
  'whiteboard:sync': { max: 5, windowMs: 5000 },
  'whiteboard:undo': { max: 10, windowMs: 2000 },
  'whiteboard:clear': { max: 2, windowMs: 5000 },
};

const MAX_STRIKES = 20; // disconnect clients that keep flooding

export function applySocketRateLimit(socket) {
  const buckets = new Map();
  let strikes = 0;

  socket.use(([event], next) => {
    const rule = RULES[event] || RULES.default;
    const now = Date.now();
    let bucket = buckets.get(event);
    if (!bucket || now - bucket.start >= rule.windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(event, bucket);
    }
    bucket.count += 1;

    if (bucket.count > rule.max) {
      strikes += 1;
      if (strikes >= MAX_STRIKES) {
        socket.disconnect(true);
        return;
      }
      return next(new Error('rate_limited'));
    }
    next();
  });
}