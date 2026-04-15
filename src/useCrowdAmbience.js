/**
 * useCrowdAmbience.js — Web Audio bar/restaurant crowd atmosphere
 *
 * Warm, low background murmur — like being in a busy restaurant.
 * Two soft bandpass layers (200–600 Hz) + gentle room rumble.
 * Periodic slight swell (natural conversation ebb/flow).
 * No harsh high-frequency filters.
 *
 * API (same shape as useAmbience):
 *   const { ambOn, ambToggle, ambStart, ambStop } = useCrowdAmbience()
 */

import { useState, useCallback, useRef } from 'react';

const MASTER_GAIN = 0.18;

function getCtx() {
  if (!getCtx._ctx) {
    getCtx._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (getCtx._ctx.state === 'suspended') getCtx._ctx.resume();
  return getCtx._ctx;
}

// Pink noise buffer — Voss-McCartney
function makePinkNoiseBuffer(ctx) {
  const sr  = ctx.sampleRate;
  const len = Math.ceil(sr * 3.0);
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

// Crowd murmur layer: pink noise → lowpass to kill harshness → wide bandpass for warmth
function makeMurmurLayer(ctx, mg, pinkBuf, bpFreq, gainVal) {
  const src = ctx.createBufferSource();
  src.buffer    = pinkBuf;
  src.loop      = true;
  src.loopStart = 0;
  src.loopEnd   = pinkBuf.duration;
  src.start(0, Math.random() * pinkBuf.duration);

  // First: kill everything above 700 Hz so no static
  const lp = ctx.createBiquadFilter();
  lp.type            = 'lowpass';
  lp.frequency.value = 700;
  lp.Q.value         = 0.5;

  // Then: gentle bandpass to shape the warmth band
  const bp = ctx.createBiquadFilter();
  bp.type            = 'bandpass';
  bp.frequency.value = bpFreq;
  bp.Q.value         = 0.6;  // wide, not harsh

  const gain = ctx.createGain();
  gain.gain.value = gainVal;

  src.connect(lp);
  lp.connect(bp);
  bp.connect(gain);
  gain.connect(mg);
  return { src, gain };
}

// Room rumble: low sine with gentle tremolo
function makeRumble(ctx, mg) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo  = ctx.createOscillator();
  const lfoG = ctx.createGain();

  osc.type            = 'sine';
  osc.frequency.value = 100;   // room resonance frequency
  gain.gain.value     = 0.04;  // very quiet

  lfo.type            = 'sine';
  lfo.frequency.value = 0.06;  // slow 16-second cycle
  lfoG.gain.value     = 0.015;

  lfo.connect(lfoG);
  lfoG.connect(gain.gain);
  osc.connect(gain);
  gain.connect(mg);
  osc.start();
  lfo.start();
  return { osc, lfo };
}

// Crowd swell: every 12–22s, gently raise the master gain by ~25%, then back down
function scheduleSwell(ctx, mg, swellRef) {
  const delay = 12000 + Math.random() * 10000;
  swellRef.current = setTimeout(() => {
    try {
      const t0       = ctx.currentTime;
      const riseTime = 1.8 + Math.random() * 1.0;
      const holdTime = 1.0 + Math.random() * 1.5;
      const fallTime = 2.5 + Math.random() * 1.5;
      const peak     = MASTER_GAIN * (1.2 + Math.random() * 0.15);

      mg.gain.setValueAtTime(MASTER_GAIN, t0);
      mg.gain.linearRampToValueAtTime(peak, t0 + riseTime);
      mg.gain.setValueAtTime(peak, t0 + riseTime + holdTime);
      mg.gain.linearRampToValueAtTime(MASTER_GAIN, t0 + riseTime + holdTime + fallTime);
    } catch (_) {}
    scheduleSwell(ctx, mg, swellRef);
  }, delay);
}

export default function useCrowdAmbience() {
  const [on,   setOn]   = useState(false);
  const nodes  = useRef({ mg: null, layers: [], rumble: null, pinkBuf: null });
  const swellRef = useRef(null);

  const stop = useCallback(() => {
    clearTimeout(swellRef.current);
    swellRef.current = null;
    const n = nodes.current;
    try {
      if (n.mg) {
        const ctx = getCtx();
        n.mg.gain.cancelScheduledValues(ctx.currentTime);
        n.mg.gain.setValueAtTime(n.mg.gain.value, ctx.currentTime);
        n.mg.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      }
    } catch (_) {}
    n.layers.forEach(({ src }) => { try { src.stop(); src.disconnect(); } catch (_) {} });
    n.layers = [];
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
      mg.gain.linearRampToValueAtTime(MASTER_GAIN, ctx.currentTime + 3.0);
      mg.connect(ctx.destination);
      n.mg = mg;

      if (!n.pinkBuf) n.pinkBuf = makePinkNoiseBuffer(ctx);
      const pb = n.pinkBuf;

      // Two warm murmur layers — low-mid frequencies only, no harshness
      n.layers = [
        makeMurmurLayer(ctx, mg, pb, 250, 0.45),  // low body warmth
        makeMurmurLayer(ctx, mg, pb, 480, 0.30),  // mid speech blur
      ];

      n.rumble = makeRumble(ctx, mg);

      // Start swell cycle after initial fade-in settles
      setTimeout(() => scheduleSwell(ctx, mg, swellRef), 5000);
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
