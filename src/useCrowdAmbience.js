/**
 * useCrowdAmbience.js — Web Audio crowd atmosphere generator
 *
 * Generates a looping bar/concert crowd sound using only Web Audio API:
 *   - Pink noise filtered to warm crowd murmur (multiple bandpass layers)
 *   - Low-frequency rumble (60–120 Hz room resonance)
 *   - Occasional subtle cheer envelopes
 *   - Seamless — no audio files required
 *
 * API (same shape as useAmbience):
 *   const { ambOn, ambToggle, ambStart, ambStop } = useCrowdAmbience()
 */

import { useState, useCallback, useRef } from 'react';

const MASTER_GAIN  = 0.28;
const RUMBLE_GAIN  = 0.06;
const CHEER_INTERVAL_MIN = 8000;   // ms between cheer bursts
const CHEER_INTERVAL_MAX = 18000;

function getCtx() {
  if (!getCtx._ctx) {
    getCtx._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (getCtx._ctx.state === 'suspended') getCtx._ctx.resume();
  return getCtx._ctx;
}

// Build a pink-noise buffer (~2 s) using Voss-McCartney algorithm
function makePinkNoiseBuffer(ctx) {
  const sr     = ctx.sampleRate;
  const len    = Math.ceil(sr * 2.0);
  const buf    = ctx.createBuffer(1, len, sr);
  const data   = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < len; i++) {
    const wh = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + wh*0.0555179;
    b1 = 0.99332*b1 + wh*0.0750759;
    b2 = 0.96900*b2 + wh*0.1538520;
    b3 = 0.86650*b3 + wh*0.3104856;
    b4 = 0.55000*b4 + wh*0.5329522;
    b5 = -0.7616*b5 - wh*0.0168980;
    data[i] = (b0+b1+b2+b3+b4+b5+b6 + wh*0.5362) / 7;
    b6 = wh * 0.115926;
  }
  return buf;
}

// Single crowd layer: pink noise → bandpass filter → gain
function makeCrowdLayer(ctx, mg, noiseBuf, freq, q, gainVal) {
  const src  = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop   = true;
  src.loopStart = 0;
  src.loopEnd   = noiseBuf.duration;
  // Random loop start offset so layers don't phase-align
  const offset  = Math.random() * noiseBuf.duration;

  const bpf  = ctx.createBiquadFilter();
  bpf.type            = 'bandpass';
  bpf.frequency.value = freq;
  bpf.Q.value         = q;

  const gain = ctx.createGain();
  gain.gain.value = gainVal;

  src.connect(bpf);
  bpf.connect(gain);
  gain.connect(mg);
  src.start(0, offset);
  return src;
}

// Low rumble: sine oscillator with slow LFO modulation
function makeRumble(ctx, mg) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo  = ctx.createOscillator();
  const lfoG = ctx.createGain();

  osc.type             = 'sine';
  osc.frequency.value  = 68;
  gain.gain.value      = RUMBLE_GAIN;

  lfo.type             = 'sine';
  lfo.frequency.value  = 0.08; // very slow modulation
  lfoG.gain.value      = 0.03;

  lfo.connect(lfoG);
  lfoG.connect(gain.gain);
  osc.connect(gain);
  gain.connect(mg);
  osc.start();
  lfo.start();
  return { osc, gain, lfo, lfoG };
}

// Schedule a random cheer burst: brief amplitude swell at 1–3 kHz
function scheduleCheer(ctx, mg, onDone) {
  const interval = CHEER_INTERVAL_MIN +
    Math.random() * (CHEER_INTERVAL_MAX - CHEER_INTERVAL_MIN);

  const id = setTimeout(() => {
    try {
      const t0   = ctx.currentTime;
      const dur  = 1.4 + Math.random() * 1.2;  // 1.4–2.6 s
      const peak = 0.06 + Math.random() * 0.05;

      // Short white-noise burst through highpass for "ahhh" texture
      const sr  = ctx.sampleRate;
      const len = Math.ceil(sr * (dur + 0.1));
      const nb  = ctx.createBuffer(1, len, sr);
      const nd  = nb.getChannelData(0);
      for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;

      const src   = ctx.createBufferSource();
      src.buffer  = nb;
      const bpf   = ctx.createBiquadFilter();
      bpf.type            = 'bandpass';
      bpf.frequency.value = 1400 + Math.random() * 800;
      bpf.Q.value         = 0.6;
      const gain  = ctx.createGain();
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + dur * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      src.connect(bpf);
      bpf.connect(gain);
      gain.connect(mg);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    } catch (_) {}

    onDone(); // schedule next cheer
  }, interval);

  return id;
}

export default function useCrowdAmbience() {
  const [on, setOn] = useState(false);
  const nodes = useRef({
    mg: null, layers: [], rumble: null, cheerId: null, pinkBuf: null,
  });

  const stop = useCallback(() => {
    const n = nodes.current;
    try {
      if (n.mg) { n.mg.gain.setValueAtTime(0, getCtx().currentTime + 0.05); }
    } catch (_) {}
    n.layers.forEach(s => { try { s.stop(); s.disconnect(); } catch (_) {} });
    n.layers = [];
    if (n.rumble) {
      try { n.rumble.osc.stop();  } catch (_) {}
      try { n.rumble.lfo.stop();  } catch (_) {}
      try { n.rumble.osc.disconnect(); n.rumble.lfo.disconnect(); } catch (_) {}
      n.rumble = null;
    }
    clearTimeout(n.cheerId);
    n.cheerId = null;
    if (n.mg) { try { n.mg.disconnect(); } catch (_) {} n.mg = null; }
  }, []);

  const start = useCallback(() => {
    const n = nodes.current;
    if (n.mg) return; // already running
    try {
      const ctx = getCtx();

      // Master gain with slow fade-in
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(0, ctx.currentTime);
      mg.gain.linearRampToValueAtTime(MASTER_GAIN, ctx.currentTime + 2.5);
      mg.connect(ctx.destination);
      n.mg = mg;

      // Build pink noise buffer (lazy, cached per call)
      if (!n.pinkBuf) n.pinkBuf = makePinkNoiseBuffer(ctx);
      const pb = n.pinkBuf;

      // Multiple crowd murmur layers at different frequency bands
      n.layers = [
        makeCrowdLayer(ctx, mg, pb,  280, 0.7, 0.35),  // low murmur body
        makeCrowdLayer(ctx, mg, pb,  600, 0.9, 0.28),  // mid chatter
        makeCrowdLayer(ctx, mg, pb, 1200, 1.2, 0.18),  // upper presence
        makeCrowdLayer(ctx, mg, pb,  180, 0.5, 0.20),  // low warmth
      ];

      // Rumble
      n.rumble = makeRumble(ctx, mg);

      // Cheer loop
      function nextCheer() {
        n.cheerId = scheduleCheer(ctx, mg, nextCheer);
      }
      nextCheer();
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
