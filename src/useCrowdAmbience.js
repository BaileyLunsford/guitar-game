/**
 * useCrowdAmbience.js — bar/restaurant crowd atmosphere via sine oscillator banks
 *
 * No noise source. 16 sine oscillators in the vocal formant range (180–650 Hz),
 * each with a slow frequency drift LFO (0.01–0.04 Hz) and a "talker" amplitude
 * envelope cycling at 2–5 Hz to simulate syllable bursts. Result: a soft, warm
 * crowd murmur without the highway/ocean quality of filtered noise.
 *
 * API: { ambOn, ambToggle, ambStart, ambStop }
 */

import { useState, useCallback, useRef } from 'react';

const MASTER_GAIN   = 0.06;
const NUM_VOICES    = 16;

// Vocal frequency clusters: low chest (180–260), mid vowel (280–420), upper formant (450–650)
const FREQ_RANGES = [
  [180, 260],
  [280, 420],
  [450, 650],
];

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

function getCtx() {
  if (!getCtx._ctx) {
    getCtx._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (getCtx._ctx.state === 'suspended') getCtx._ctx.resume();
  return getCtx._ctx;
}

// One "talker" voice: sine osc at a vocal frequency with a slow syllable-rate AM envelope
function makeVoice(ctx, mg, voiceIdx) {
  const rangeIdx = voiceIdx % FREQ_RANGES.length;
  const [lo, hi] = FREQ_RANGES[rangeIdx];
  const freq     = rand(lo, hi);
  const baseGain = rand(0.015, 0.045);

  // Main oscillator
  const osc  = ctx.createOscillator();
  osc.type            = 'sine';
  osc.frequency.value = freq;
  osc.start(0);

  // Slow frequency drift (0.01–0.04 Hz) — keeps voices from phasing together
  const freqLfo   = ctx.createOscillator();
  const freqLfoG  = ctx.createGain();
  freqLfo.type            = 'sine';
  freqLfo.frequency.value = rand(0.01, 0.04);
  freqLfoG.gain.value     = freq * 0.012;   // ±1.2% drift
  freqLfo.connect(freqLfoG);
  freqLfoG.connect(osc.frequency);
  freqLfo.start(0);

  // Amplitude gain node
  const gain = ctx.createGain();
  gain.gain.value = baseGain;

  // "Syllable" AM LFO (2–5 Hz) — asymmetric so voices don't pulse in unison
  const amLfo  = ctx.createOscillator();
  const amLfoG = ctx.createGain();
  amLfo.type            = 'sine';
  amLfo.frequency.value = rand(2.0, 5.0);
  amLfoG.gain.value     = baseGain * rand(0.3, 0.55); // partial modulation depth
  amLfo.connect(amLfoG);
  amLfoG.connect(gain.gain);
  amLfo.start(rand(0, 3)); // stagger phase

  osc.connect(gain);
  gain.connect(mg);

  return { osc, freqLfo, amLfo, gain };
}

// Glass clink: two short sines (700 + 1400 Hz) — brief attack, 0.4s exponential decay
function scheduleGlassClinks(ctx, mg, clinkRef) {
  function next() {
    const delay = rand(9000, 22000);
    clinkRef.current = setTimeout(() => {
      try {
        const now = ctx.currentTime;
        [700, 1400].forEach((hz, i) => {
          const osc  = ctx.createOscillator();
          const g    = ctx.createGain();
          osc.type            = 'sine';
          osc.frequency.value = hz;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.04 - i * 0.01, now + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
          osc.connect(g); g.connect(mg);
          osc.start(now); osc.stop(now + 0.45);
        });
      } catch (_) {}
      next();
    }, delay);
  }
  next();
}

// Crowd swell: master gain rises ~15–20% then returns, every 18–35 s
function scheduleSwell(ctx, mg, swellRef) {
  const delay = rand(18000, 35000);
  swellRef.current = setTimeout(() => {
    try {
      const t0       = ctx.currentTime;
      const rise     = rand(2.5, 4.0);
      const hold     = rand(1.0, 2.5);
      const fall     = rand(3.0, 5.0);
      const peak     = MASTER_GAIN * rand(1.14, 1.22);
      mg.gain.setValueAtTime(mg.gain.value, t0);
      mg.gain.linearRampToValueAtTime(peak, t0 + rise);
      mg.gain.setValueAtTime(peak, t0 + rise + hold);
      mg.gain.linearRampToValueAtTime(MASTER_GAIN, t0 + rise + hold + fall);
    } catch (_) {}
    scheduleSwell(ctx, mg, swellRef);
  }, delay);
}

export default function useCrowdAmbience() {
  const [on,      setOn]      = useState(false);
  const nodesRef  = useRef({ mg: null, voices: [] });
  const swellRef  = useRef(null);
  const clinkRef  = useRef(null);

  const stop = useCallback(() => {
    clearTimeout(swellRef.current);
    clearTimeout(clinkRef.current);
    swellRef.current = null;
    clinkRef.current = null;

    const { mg, voices } = nodesRef.current;
    try {
      if (mg) {
        const ctx = getCtx();
        mg.gain.cancelScheduledValues(ctx.currentTime);
        mg.gain.setValueAtTime(mg.gain.value, ctx.currentTime);
        mg.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
    } catch (_) {}

    voices.forEach(({ osc, freqLfo, amLfo }) => {
      try { osc.stop();    osc.disconnect();    } catch (_) {}
      try { freqLfo.stop(); freqLfo.disconnect(); } catch (_) {}
      try { amLfo.stop();  amLfo.disconnect();  } catch (_) {}
    });

    if (mg) { try { setTimeout(() => mg.disconnect(), 600); } catch (_) {} }
    nodesRef.current = { mg: null, voices: [] };
  }, []);

  const start = useCallback(() => {
    if (nodesRef.current.mg) return;
    try {
      const ctx = getCtx();

      const mg = ctx.createGain();
      mg.gain.setValueAtTime(0, ctx.currentTime);
      mg.gain.linearRampToValueAtTime(MASTER_GAIN, ctx.currentTime + 4.0);
      mg.connect(ctx.destination);
      nodesRef.current.mg = mg;

      const voices = [];
      for (let i = 0; i < NUM_VOICES; i++) {
        voices.push(makeVoice(ctx, mg, i));
      }
      nodesRef.current.voices = voices;

      setTimeout(() => {
        scheduleGlassClinks(ctx, mg, clinkRef);
        scheduleSwell(ctx, mg, swellRef);
      }, 4500);
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
