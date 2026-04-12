import { useState, useCallback, useRef } from 'react';

export default function useAmbience(src = '/orchestra.wav') {
  const [on, setOn] = useState(false);
  const amb = useRef({ src: null, gain: null, buf: null, fetching: false });

  function getCtx() {
    if (!getCtx._ctx) getCtx._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (getCtx._ctx.state === 'suspended') getCtx._ctx.resume();
    return getCtx._ctx;
  }

  const stop = useCallback(() => {
    const a = amb.current;
    try { if (a.gain) { const ctx = getCtx(); a.gain.gain.setValueAtTime(0, ctx.currentTime); } } catch(e) {}
    if (a.src) { try { a.src.stop(0); } catch(e) {} try { a.src.disconnect(); } catch(e) {} a.src = null; }
    if (a.gain) { try { a.gain.disconnect(); } catch(e) {} a.gain = null; }
  }, []);

  const start = useCallback(() => {
    const a = amb.current;
    if (a.src || a.fetching) return;
    const ctx = getCtx();

    function attach(buf) {
      a.src = ctx.createBufferSource();
      a.gain = ctx.createGain();
      a.src.buffer = buf;
      a.src.loop = true;
      a.gain.gain.value = 0.15;
      a.src.connect(a.gain);
      a.gain.connect(ctx.destination);
      a.src.start(0);
    }

    if (a.buf) { attach(a.buf); return; }

    a.fetching = true;
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(b => ctx.decodeAudioData(b))
      .then(d => {
        a.fetching = false;
        a.buf = d;
        if (!amb.current.src) attach(d); // guard against stop() racing fetch
      })
      .catch(e => { a.fetching = false; console.warn('[ambience] fetch error:', e); });
  }, [src]);

  const toggle = useCallback(() => {
    setOn(prev => {
      const next = !prev;
      if (next) start(); else stop();
      return next;
    });
  }, [start, stop]);

  return { ambOn: on, ambToggle: toggle, ambStart: start, ambStop: stop };
}
