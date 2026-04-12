/**
 * useBackingTrack.js — Procedural Web Audio backing track generator
 *
 * Uses the shared AudioContext (audioContext.js) so ctx.currentTime is the
 * same clock reference used by guitarSampler and useMetronome.
 *
 * ── Drums ────────────────────────────────────────────────────────────────────
 *   Kick   — sine osc, pitch envelope 140 Hz → 55 Hz, beats 1 + 3
 *   Snare  — bandpass-filtered noise burst + tonal triangle body, beats 2 + 4
 *   Hi-hat — highpass-filtered noise burst, 8th-note subdivisions
 *
 * ── Bass ─────────────────────────────────────────────────────────────────────
 *   Triangle osc through 280 Hz LP filter.
 *   Blues   — walking E-blues quarter-note line (E2 G2 A2 Bb2 | B2 A2 G2 E2)
 *   Rock    — syncopated E2 riff, heavy on beats 1+3
 *   Country — boom-chuck root: A2 beat 1, D2 beat 3
 *
 * ── Rhythm guitar ────────────────────────────────────────────────────────────
 *   Sawtooth stack (root + 5th + octave, 2 ms stagger per partial → strum).
 *   Blues   — chord stabs beats 2 + 4
 *   Rock    — 8th-note power-chord chugs
 *   Country — chord strums beats 2 + 4 ("chuck")
 *
 * ── Scheduler ────────────────────────────────────────────────────────────────
 *   30 ms poll, 120 ms lookahead (same pattern as useMetronome).
 *   startScheduler(fromTime) is the single entry point — used by the effect
 *   AND by syncToTime() so both paths set the same anchor.
 *   Genre or BPM change → effect restarts from beat 1.
 *   AudioContext failure → degrades silently, toggle resets to off.
 *
 * API:
 *   const { trackOn, toggleTrack, stopTrack, syncToTime } = useBackingTrack(genre, bpm)
 *
 *   syncToTime(ctxTime) — if running, restart pattern anchored to ctxTime.
 *                          No-op if track is off.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioContext } from './audioContext';

const LOOKAHEAD_S = 0.12;
const INTERVAL_MS = 30;
const NOISE_DUR_S = 2.0;
const MASTER_VOL  = 0.40;

const HZ = {
  D2:  73.42,
  E2:  82.41,
  G2:  98.00,
  A2: 110.00,
  Bb2:116.54,
  B2: 123.47,
};

const G = {
  kick:   1.40,
  snare:  0.85,
  hihat:  0.12,
  bass:   0.75,
  rhythm: 0.10,
};

const PAT = {
  blues: {
    steps: 16,
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
    steps: 8,
    kick:   [1,0, 0,0, 1,0, 0,0],
    snare:  [0,0, 1,0, 0,0, 1,0],
    hihat:  [1,1, 1,1, 1,1, 1,1],
    bass:   [HZ.E2, 0, 0, HZ.E2, HZ.E2, 0, 0, HZ.E2],
    rhythm: [1,1, 1,1, 1,1, 1,1],
    rootHz: HZ.E2,
  },
  country: {
    steps: 8,
    kick:   [1,0, 0,0, 1,0, 0,0],
    snare:  [0,0, 1,0, 0,0, 1,0],
    hihat:  [1,0, 1,0, 1,0, 1,0],
    bass:   [HZ.A2, 0, 0, 0, HZ.D2, 0, 0, 0],
    rhythm: [0,0, 1,0, 0,0, 1,0],
    rootHz: HZ.A2,
  },
};

// ── Module-level synthesis functions (no React deps) ─────────────────────────

function scheduleKick(ctx, mg, t) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
  gain.gain.setValueAtTime(G.kick, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain);  gain.connect(mg);
  osc.start(t);  osc.stop(t + 0.35);
}

function scheduleSnare(ctx, mg, nb, t) {
  const noise  = ctx.createBufferSource();
  noise.buffer = nb;
  const offset = Math.random() * (NOISE_DUR_S - 0.18);
  const bpf    = ctx.createBiquadFilter();
  bpf.type = 'bandpass';  bpf.frequency.value = 2200;  bpf.Q.value = 0.7;
  const nGain  = ctx.createGain();
  nGain.gain.setValueAtTime(G.snare, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  noise.connect(bpf);  bpf.connect(nGain);  nGain.connect(mg);
  noise.start(t, offset, 0.14);

  const osc   = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.05);
  oGain.gain.setValueAtTime(0.22, t);
  oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(oGain);  oGain.connect(mg);
  osc.start(t);  osc.stop(t + 0.06);
}

function scheduleHihat(ctx, mg, nb, t) {
  const dur    = 0.04;
  const offset = Math.random() * (NOISE_DUR_S - 0.08);
  const noise  = ctx.createBufferSource();
  noise.buffer = nb;
  const hpf    = ctx.createBiquadFilter();
  hpf.type = 'highpass';  hpf.frequency.value = 8000;
  const gain   = ctx.createGain();
  gain.gain.setValueAtTime(G.hihat, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(hpf);  hpf.connect(gain);  gain.connect(mg);
  noise.start(t, offset, dur);
}

function scheduleBass(ctx, mg, t, freq, stepDur) {
  const dur  = stepDur * 1.7;
  const osc  = ctx.createOscillator();
  const lpf  = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'triangle';  osc.frequency.value = freq;
  lpf.type = 'lowpass';   lpf.frequency.value = 280;  lpf.Q.value = 0.5;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(G.bass, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(lpf);  lpf.connect(gain);  gain.connect(mg);
  osc.start(t);  osc.stop(t + dur + 0.02);
}

function scheduleRhythm(ctx, mg, t, rootHz, stepDur, genreId) {
  const isRock  = genreId === 'rock';
  const decayT  = isRock ? stepDur * 0.55 : stepDur * 0.45;
  const freqs   = [rootHz, rootHz * 1.498, rootHz * 2.0];
  freqs.forEach((f, i) => {
    const stagger = i * 0.002;
    const osc  = ctx.createOscillator();
    const lpf  = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = f * (1 + (i - 1) * 0.004);
    lpf.type = 'lowpass';  lpf.frequency.value = isRock ? 600 : 750;
    gain.gain.setValueAtTime(0, t + stagger);
    gain.gain.linearRampToValueAtTime(G.rhythm / freqs.length, t + stagger + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, t + stagger + decayT);
    osc.connect(lpf);  lpf.connect(gain);  gain.connect(mg);
    osc.start(t + stagger);  osc.stop(t + stagger + decayT + 0.02);
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useBackingTrack(genre, bpm) {
  const [on, setOn] = useState(false);

  const r = useRef({
    masterGain:   null,
    noiseBuffer:  null,
    timerId:      null,
    nextStepTime: 0,
    nextStepIdx:  0,
    // mirrors — kept current for use inside callbacks
    on:    false,
    genre: null,
    bpm:   120,
  });

  // Keep mirrors in sync with props/state
  useEffect(() => { r.current.on    = on;    }, [on]);
  useEffect(() => { r.current.genre = genre; }, [genre]);
  useEffect(() => { r.current.bpm   = bpm;   }, [bpm]);

  // ── One-time audio node setup (lazy) ──────────────────────────────────────
  function boot() {
    try {
      const ctx = getAudioContext();
      if (!r.current.masterGain) {
        const mg = ctx.createGain();
        mg.gain.value = MASTER_VOL;
        mg.connect(ctx.destination);
        r.current.masterGain = mg;
      }
      if (!r.current.noiseBuffer) {
        const nb = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * NOISE_DUR_S), ctx.sampleRate);
        const nd = nb.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        r.current.noiseBuffer = nb;
      }
      return ctx;
    } catch (e) {
      console.warn('[useBackingTrack] AudioContext unavailable:', e.message);
      return null;
    }
  }

  // ── Core scheduler — start pattern from an explicit AudioContext timestamp ─
  // Defined inside hook but only closes over `r` (stable ref) → no stale data.
  function startScheduler(fromTime) {
    const ref = r.current;
    clearInterval(ref.timerId);
    ref.timerId      = null;
    ref.nextStepTime = fromTime;
    ref.nextStepIdx  = 0;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    function tick() {
      const { masterGain: mg, noiseBuffer: nb } = r.current;
      if (!mg || !nb) return;

      const now = ctx.currentTime;
      while (r.current.nextStepTime < now + LOOKAHEAD_S) {
        const curGenre  = r.current.genre;
        const pat       = PAT[curGenre] || PAT.blues;
        const stepDur   = 30 / r.current.bpm;
        const step      = r.current.nextStepIdx % pat.steps;
        const t         = r.current.nextStepTime;

        try {
          if (pat.kick[step])   scheduleKick(ctx, mg, t);
          if (pat.snare[step])  scheduleSnare(ctx, mg, nb, t);
          if (pat.hihat[step])  scheduleHihat(ctx, mg, nb, t);
          const bassHz = pat.bass[step];
          if (bassHz)           scheduleBass(ctx, mg, t, bassHz, stepDur);
          if (pat.rhythm[step]) scheduleRhythm(ctx, mg, t, pat.rootHz, stepDur, curGenre);
        } catch (e) {
          console.warn('[useBackingTrack] synthesis error:', e.message);
        }

        r.current.nextStepTime += stepDur;
        r.current.nextStepIdx++;
      }
    }

    tick();
    ref.timerId = setInterval(tick, INTERVAL_MS);
  }

  // ── Effect: respond to on/genre/bpm changes ───────────────────────────────
  useEffect(() => {
    const ref = r.current;
    if (!on || !genre) {
      clearInterval(ref.timerId);
      ref.timerId = null;
      return;
    }
    const ctx = boot();
    if (!ctx) { setOn(false); return; }

    startScheduler(ctx.currentTime + 0.05);

    return () => {
      clearInterval(ref.timerId);
      ref.timerId = null;
    };
  }, [on, genre, bpm]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => clearInterval(r.current.timerId), []);

  const toggleTrack = useCallback(() => setOn(v => !v), []);
  const stopTrack   = useCallback(() => setOn(false), []);

  // syncToTime: externally align the pattern to a shared start time.
  // Only acts when the backing track is already running.
  const syncToTime  = useCallback((ctxTime) => {
    if (!r.current.on || !r.current.genre) return;
    boot();
    startScheduler(ctxTime);
  }, []); // startScheduler only closes over stable `r` — no stale deps

  return { trackOn: on, toggleTrack, stopTrack, syncToTime };
}
