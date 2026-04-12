/**
 * useBackingTrack.js — Procedural Web Audio backing track generator
 *
 * No audio files. Synthesises drums, bass, and rhythm guitar entirely from
 * Web Audio API primitives.
 *
 * ── Drums ────────────────────────────────────────────────────────────────────
 *   Kick   — sine oscillator, pitch envelope 140 Hz → 55 Hz, beats 1 + 3
 *   Snare  — bandpass-filtered noise burst + tonal triangle body, beats 2 + 4
 *   Hi-hat — highpass-filtered noise burst, 8th-note subdivisions
 *
 * ── Bass ─────────────────────────────────────────────────────────────────────
 *   Triangle oscillator through a 280 Hz low-pass filter.
 *   Blues   — walking E-blues quarter-note line over 2 bars
 *               (E2 G2 A2 Bb2 | B2 A2 G2 E2)
 *   Rock    — syncopated E2 riff (heavy on beats 1 + 3, 8th-note kick on 2+ 4+)
 *   Country — boom-chuck root: A2 on beat 1, D2 on beat 3
 *
 * ── Rhythm guitar ────────────────────────────────────────────────────────────
 *   Sawtooth stack (root + 5th + octave, 2ms stagger per partial → strum feel).
 *   Blues   — muted chord stabs on beats 2 + 4
 *   Rock    — 8th-note power-chord chugs
 *   Country — chord strums on beats 2 + 4 (the "chuck" in boom-chuck)
 *
 * ── Scheduler ────────────────────────────────────────────────────────────────
 *   Lookahead pattern (identical to useMetronome): 30 ms poll, 120 ms ahead.
 *   BPM or genre change → effect restarts from beat 1 (no glitch carry-over).
 *   AudioContext failure → degrades silently, toggle resets to off.
 *
 * API:
 *   const { trackOn, toggleTrack, stopTrack } = useBackingTrack(genre, bpm)
 *   genre — 'blues' | 'rock' | 'country' | null
 *   bpm   — number (stays in sync with lick BPM slider)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Scheduler constants ───────────────────────────────────────────────────────
const LOOKAHEAD_S  = 0.12;   // seconds to schedule ahead
const INTERVAL_MS  = 30;     // scheduler poll interval
const NOISE_DUR_S  = 2.0;    // pre-generated noise buffer length
const MASTER_VOL   = 0.40;   // overall backing track volume

// ── Frequencies (Hz) ─────────────────────────────────────────────────────────
const HZ = {
  D2:  73.42,
  E2:  82.41,
  G2:  98.00,
  A2: 110.00,
  Bb2:116.54,
  B2: 123.47,
};

// ── Per-instrument gain levels (before master) ────────────────────────────────
const G = {
  kick:   1.40,
  snare:  0.85,
  hihat:  0.12,
  bass:   0.75,
  rhythm: 0.10,
};

// ── Pattern definitions ───────────────────────────────────────────────────────
// 8th-note grid.  Each row is one bar; two rows = 2-bar loop.
// Drums/rhythm: 1 = trigger, 0 = rest
// Bass: Hz value = play that pitch, 0 = rest

const PAT = {
  blues: {
    steps: 16,  // 2-bar loop
    kick:   [1,0, 0,0, 1,0, 0,0,  1,0, 0,0, 1,0, 0,0],
    snare:  [0,0, 1,0, 0,0, 1,0,  0,0, 1,0, 0,0, 1,0],
    hihat:  [1,1, 1,1, 1,1, 1,1,  1,1, 1,1, 1,1, 1,1],
    bass:   [
      HZ.E2, 0, HZ.G2,  0, HZ.A2,  0, HZ.Bb2, 0,
      HZ.B2, 0, HZ.A2,  0, HZ.G2,  0, HZ.E2,  0,
    ],
    rhythm: [0,0, 1,0, 0,0, 1,0,  0,0, 1,0, 0,0, 1,0],
    rootHz: HZ.E2,
  },
  rock: {
    steps: 8,   // 1-bar loop
    kick:   [1,0, 0,0, 1,0, 0,0],
    snare:  [0,0, 1,0, 0,0, 1,0],
    hihat:  [1,1, 1,1, 1,1, 1,1],
    bass:   [HZ.E2, 0, 0, HZ.E2, HZ.E2, 0, 0, HZ.E2],
    rhythm: [1,1, 1,1, 1,1, 1,1],
    rootHz: HZ.E2,
  },
  country: {
    steps: 8,   // 1-bar loop
    kick:   [1,0, 0,0, 1,0, 0,0],
    snare:  [0,0, 1,0, 0,0, 1,0],
    hihat:  [1,0, 1,0, 1,0, 1,0],  // quarter notes (country feel)
    bass:   [HZ.A2, 0, 0, 0, HZ.D2, 0, 0, 0],
    rhythm: [0,0, 1,0, 0,0, 1,0],
    rootHz: HZ.A2,
  },
};

// ── Module-level synthesis functions ─────────────────────────────────────────
// Pure: take AudioContext, master GainNode, noise AudioBuffer, timing, params.
// Defined outside the hook so they are never re-created on render.

function scheduleKick(ctx, mg, t) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
  gain.gain.setValueAtTime(G.kick, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain);
  gain.connect(mg);
  osc.start(t);
  osc.stop(t + 0.35);
}

function scheduleSnare(ctx, mg, nb, t) {
  // Noise burst — random section of pre-generated buffer to avoid repetition
  const noise  = ctx.createBufferSource();
  noise.buffer = nb;
  const offset = Math.random() * (NOISE_DUR_S - 0.18);

  const bpf = ctx.createBiquadFilter();
  bpf.type            = 'bandpass';
  bpf.frequency.value = 2200;
  bpf.Q.value         = 0.7;

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(G.snare, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

  noise.connect(bpf);
  bpf.connect(nGain);
  nGain.connect(mg);
  noise.start(t, offset, 0.14);

  // Tonal body — gives the snare its "crack"
  const osc   = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.05);
  oGain.gain.setValueAtTime(0.22, t);
  oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(oGain);
  oGain.connect(mg);
  osc.start(t);
  osc.stop(t + 0.06);
}

function scheduleHihat(ctx, mg, nb, t) {
  const dur    = 0.04;
  const offset = Math.random() * (NOISE_DUR_S - 0.08);

  const noise  = ctx.createBufferSource();
  noise.buffer = nb;

  const hpf = ctx.createBiquadFilter();
  hpf.type            = 'highpass';
  hpf.frequency.value = 8000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(G.hihat, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  noise.connect(hpf);
  hpf.connect(gain);
  gain.connect(mg);
  noise.start(t, offset, dur);
}

function scheduleBass(ctx, mg, t, freq, stepDur) {
  const dur = stepDur * 1.7;  // sustain slightly beyond the step

  const osc  = ctx.createOscillator();
  const lpf  = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type            = 'triangle';
  osc.frequency.value = freq;

  lpf.type            = 'lowpass';
  lpf.frequency.value = 280;
  lpf.Q.value         = 0.5;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(G.bass, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(lpf);
  lpf.connect(gain);
  gain.connect(mg);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function scheduleRhythm(ctx, mg, t, rootHz, stepDur, genreId) {
  // Chord: root + 5th (×1.498) + octave (×2.0), 2ms stagger per partial
  const isRock  = genreId === 'rock';
  const decayT  = isRock ? stepDur * 0.55 : stepDur * 0.45;
  const freqs   = [rootHz, rootHz * 1.498, rootHz * 2.0];

  freqs.forEach((f, i) => {
    const stagger = i * 0.002;  // 2ms between partials → strum feel

    const osc  = ctx.createOscillator();
    const lpf  = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type            = 'sawtooth';
    osc.frequency.value = f * (1 + (i - 1) * 0.004); // slight spread per partial

    lpf.type            = 'lowpass';
    lpf.frequency.value = isRock ? 600 : 750;

    gain.gain.setValueAtTime(0, t + stagger);
    gain.gain.linearRampToValueAtTime(G.rhythm / freqs.length, t + stagger + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, t + stagger + decayT);

    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(mg);
    osc.start(t + stagger);
    osc.stop(t + stagger + decayT + 0.02);
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useBackingTrack(genre, bpm) {
  const [on, setOn] = useState(false);
  const r = useRef({
    ctx:          null,
    masterGain:   null,
    noiseBuffer:  null,
    timerId:      null,
    nextStepTime: 0,
    nextStepIdx:  0,
  });

  // Lazy AudioContext + noise buffer init (deferred until first toggle-on)
  function boot() {
    if (r.current.ctx) return r.current.ctx;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // 2 s of white noise, pre-generated once, reused for every snare/hihat hit
      const nb  = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * NOISE_DUR_S), ctx.sampleRate);
      const nd  = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

      const mg = ctx.createGain();
      mg.gain.value = MASTER_VOL;
      mg.connect(ctx.destination);

      r.current.ctx         = ctx;
      r.current.noiseBuffer = nb;
      r.current.masterGain  = mg;
      return ctx;
    } catch (e) {
      console.warn('[useBackingTrack] AudioContext unavailable:', e.message);
      return null;
    }
  }

  // ── Scheduler effect — restarts whenever on / genre / bpm changes ─────────
  useEffect(() => {
    const ref = r.current;

    if (!on || !genre) {
      clearInterval(ref.timerId);
      ref.timerId = null;
      return;
    }

    const ctx = boot();
    if (!ctx) { setOn(false); return; }
    if (ctx.state === 'suspended') ctx.resume();

    const pat     = PAT[genre] || PAT.blues;
    const stepDur = 30 / bpm;   // 8th-note duration in seconds

    // Always restart from beat 1 on each effect run
    ref.nextStepTime = ctx.currentTime + 0.05;
    ref.nextStepIdx  = 0;

    function tick() {
      const { ctx: c, masterGain: mg, noiseBuffer: nb } = r.current;
      if (!c || !mg || !nb) return;
      const now = c.currentTime;

      while (ref.nextStepTime < now + LOOKAHEAD_S) {
        const step = ref.nextStepIdx % pat.steps;
        const t    = ref.nextStepTime;

        try {
          if (pat.kick[step])   scheduleKick(c, mg, t);
          if (pat.snare[step])  scheduleSnare(c, mg, nb, t);
          if (pat.hihat[step])  scheduleHihat(c, mg, nb, t);
          const bassHz = pat.bass[step];
          if (bassHz)           scheduleBass(c, mg, t, bassHz, stepDur);
          if (pat.rhythm[step]) scheduleRhythm(c, mg, t, pat.rootHz, stepDur, genre);
        } catch (e) {
          console.warn('[useBackingTrack] synthesis error:', e.message);
        }

        ref.nextStepTime += stepDur;
        ref.nextStepIdx++;
      }
    }

    tick();
    ref.timerId = setInterval(tick, INTERVAL_MS);

    return () => {
      clearInterval(ref.timerId);
      ref.timerId = null;
    };
  }, [on, genre, bpm]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => clearInterval(r.current.timerId), []);

  const toggleTrack = useCallback(() => setOn(v => !v), []);
  const stopTrack   = useCallback(() => setOn(false), []);

  return { trackOn: on, toggleTrack, stopTrack };
}
