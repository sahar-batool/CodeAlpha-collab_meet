import { useEffect, useState } from 'react';

// One shared audio context for every tile. Browsers limit how many can exist.
let sharedCtx = null;
function getCtx() {
  if (!sharedCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

export function useSpeaking(stream, enabled = true) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || !enabled || stream.getAudioTracks().length === 0) {
      setSpeaking(false);
      return;
    }
    const ctx = getCtx();
    if (!ctx) return;
    ctx.resume?.().catch(() => {});

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    let active = false;
    let quietSince = 0;

    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const loudness = Math.sqrt(sum / data.length);
      const now = Date.now();

      if (loudness > 0.04) {
        quietSince = 0;
        if (!active) {
          active = true;
          setSpeaking(true);
        }
      } else if (active) {
        // Wait 400 ms of quiet so the highlight doesn't flicker between words.
        if (!quietSince) quietSince = now;
        else if (now - quietSince > 400) {
          active = false;
          setSpeaking(false);
        }
      }
    }, 100);

    return () => {
      clearInterval(timer);
      source.disconnect();
      setSpeaking(false);
    };
  }, [stream, enabled]);

  return speaking;
}