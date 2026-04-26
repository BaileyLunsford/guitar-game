/**
 * useCrowdAmbience.js — Web Audio bar/restaurant crowd atmosphere
 *
 * Pure synthesis approach:
 *   - Three narrow bandpass voices (200Hz, 350Hz, 500Hz) each with a slow LFO
 *   - Periodic glass clink transients (800–1200Hz sine burst, fast decay)
 *   - Low room rumble oscillator (80–120Hz) with slow tremolo
 *   - No broadband white/pink noise
 *   - Master gain ~0.12
 *
 * API: { ambOn, ambToggle, ambStart, ambStop }
 */

import { useState, useCallback, useRef } from 'react';

const MASTER_GAIN = 0.12;
const VOICE_FREQS = [200, 350, 500];

function getCtx() {
  if (!getCtx._ctx) {
    getCtx._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (getCtx._ctx.state === 'suspended') getCtx._ctx.resume();
  return getCtx._ctx;
}

// Short pink noise buffer used only as source for narrow bandpass voices
function makePinkNoiseBuffer(ctx) {
  const sr  = ctx.sampleRate;
  const len = Math.ceil(sr * 4.0);
  const buf = ctx.createBuffer(1, len, sr);
  const d   = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179;
    b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520;
    b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522;
    b5 = -0.7616*b5 - w*0.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) / 7;
    b6 = w * 0.115926;
  }
  return buf;
}

// Narrow bandpass voice: noise source → narrow BP filter → gain with slow LFO
function makeVoice(ctx, mg, pinkBuf, freq, baseGain) {
  const src = ctx.createBufferSource();
  src.buffer    = pinkBuf;
  src.loop      = true;
  src.loopStart = 0;
  src.loopEnd   = pinkBuf.duration;
  src.start(0, Math.random() * pinkBuf.duration);

  const bp = ctx.createBiquadFilter();
  bp.type            = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value         = 4.0;  // narrow resonance

  const gain = ctx.createGain();
  gain.gain.value = baseGain;

  // Slow random-phase LFO for natural amplitude variation
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.type            = 'sine';
  lfo.frequency.value = 0.07 + Math.random() * 0.18;  // 0.07–0.25 Hz
  lfoG.gain.value     = baseGain * 0.45;               // 45% modulation depth
  lfo.connect(lfoG);
  lfoG.connect(gain.gain);
  lfo.start(0);

  src.connect(bp);
  bp.connect(gain);
  gain.connect(mg);
  return { src, lfo };
}

// Low room rumble at random 80–120 Hz with gentle tremolo
function makeRumble(ctx, mg) {
  const freq = 80 + Math.random() * 40;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo  = ctx.createOscillator();
  const lfoG = ctx.createGain();

  osc.type            = 'sine';
  osc.frequency.value = freq;
  gain.gain.value     = 0.06;

  lfo.type            = 'sine';
  lfo.frequency.value = 0.04 + Math.random() * 0.04;
  lfoG.gain.value     = 0.025;

  lfo.connect(lfoG);
  lfoG.connect(gain.gain);
  osc.connect(gain);
  gain.connect(mg);
  osc.start(0);
  lfo.start(0);
  return { osc, lfo };
}

// Schedule glass clink transients: sine burst at random 800–1200 Hz, fast exponential decay
function scheduleGlassClinks(ctx, mg, clinkRef) {
  function next() {
    const delay = 9000 + Math.random() * 22000;  // 9–31 seconds between clinks
    clinkRef.current = setTimeout(() => {
      try {
        const freq  = 800 + Math.random() * 400;
        const now   = ctx.currentTime;
        const osc   = ctx.createOscillator();
        const gain  = ctx.createGain();
        osc.type            = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.connect(gain);
        gain.connect(mg);
        osc.start(now);
        osc.stop(now + 0.5);
      } catch (_) {}
      next();
    }, delay);
  }
  next();
}

// Crowd swell: every 15–28s, raise master gain ~20%, then back down
function scheduleSwell(ctx, mg, swellRef) {
  const delay = 15000 + Math.random() * 13000;
  swellRef.current = setTimeout(() => {
    try {
      const t0       = ctx.currentTime;
      const riseTime = 2.0 + Math.random() * 1.2;
      const holdTime = 1.2 + Math.random() * 1.8;
      const fallTime = 2.8 + Math.random() * 1.5;
      const peak     = MASTER_GAIN * (1.18 + Math.random() * 0.14);

      mg.gain.setValueAtTime(MASTER_GAIN, t0);
      mg.gain.linearRampToValueAtTime(peak, t0 + riseTime);
      mg.gain.setValueAtTime(peak, t0 + riseTime + holdTime);
      mg.gain.linearRampToValueAtTime(MASTER_GAIN, t0 + riseTime + holdTime + fallTime);
    } catch (_) {}
    scheduleSwell(ctx, mg, swellRef);
  }, delay);
}

export default function useCrowdAmbience() {
  const [on, setOn] = useState(false);
  const nodes    = useRef({ mg: null, voices: [], rumble: null, pinkBuf: null });
  const swellRef = useRef(null);
  const clinkRef = useRef(null);

  const stop = useCallback(() => {
    clearTimeout(swellRef.current);
    clearTimeout(clinkRef.current);
    swellRef.current = null;
    clinkRef.current = null;
    const n = nodes.current;
    try {
      if (n.mg) {
        const ctx = getCtx();
        n.mg.gain.cancelScheduledValues(ctx.currentTime);
        n.mg.gain.setValueAtTime(n.mg.gain.value, ctx.currentTime);
        n.mg.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      }
    } catch (_) {}
    n.voices.forEach(({ src, lfo }) => {
      try { src.stop(); src.disconnect(); } catch (_) {}
      try { lfo.stop(); lfo.disconnect(); } catch (_) {}
    });
    n.voices = [];
    if (n.rumble) {
      try { n.rumble.osc.stop(); } catch (_) {}
      try { n.rumble.lfo.stop(); } catch (_) {}
      n.rumble = null;
    }
    if (n.mg) { try { n.mg.disconnect(); } catch (_) {} n.mg = null; }
  }, []);

  const start = useCallback(() => {
    const n = nodes.current;
    if (n.mg) return;
    try {
      const ctx = getCtx();

      const mg = ctx.createGain();
      mg.gain.setValueAtTime(0, ctx.currentTime);
      mg.gain.linearRampToValueAtTime(MASTER_GAIN, ctx.currentTime + 3.5);
      mg.connect(ctx.destination);
      n.mg = mg;

      if (!n.pinkBuf) n.pinkBuf = makePinkNoiseBuffer(ctx);
      const pb = n.pinkBuf;

      // Three narrow bandpass voices with independent LFOs
      n.voices = VOICE_FREQS.map((freq, i) =>
        makeVoice(ctx, mg, pb, freq, 0.28 - i * 0.04)
      );

      n.rumble = makeRumble(ctx, mg);

      // Start clinks and swell after initial fade-in
      setTimeout(() => {
        scheduleGlassClinks(ctx, mg, clinkRef);
        scheduleSwell(ctx, mg, swellRef);
      }, 4000);
    } catch (e) {
      console.warn('[useCrowdAmbience] start error:', e.message);
    }
  }, []);

  const toggle = useCallback(() => {
    setOn(prev => {
      const next = !prev;
      if (next) start(); else stop();
      return next;
    });
  }, [start, stop]);

  return { ambOn: on, ambToggle: toggle, ambStart: start, ambStop: stop };
}
