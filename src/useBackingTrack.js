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
 * ── Chord strumming ───────────────────────────────────────────────────────────
 *   guitarSampler.playNote() via setTimeout offsets.
 *   Scheduled inside the same tick() as drums/bass — one clock, no drift.
 *   Caller passes pre-resolved note arrays (string[][]) + strumPatternId.
 *
 * ── Scheduler ────────────────────────────────────────────────────────────────
 *   30 ms poll, 120 ms lookahead (same pattern as useMetronome).
 *   startScheduler(fromTime) is the single entry point — used by the effect
 *   AND by syncToTime() so both paths set the same anchor.
 *   Genre or BPM change → effect restarts from beat 1.
 *   AudioContext failure → degrades silently, toggle resets to off.
 *
 * API:
 *   const { trackOn, toggleTrack, stopTrack, syncToTime,
 *           setDrumsOnDirect, setBassOnDirect,
 *           setChordOptionsDirect } = useBackingTrack(genre, bpm, drumsOn, bassOn)
 *
 *   setChordOptionsDirect(opts) — update chord scheduling live without restart
 *     opts: { enabled, measures, timeSig, strumPatternId, onChordChange }
 *       measures: string[][] — pre-resolved note arrays per measure (from caller)
 *       onChordChange: (flatIdx: number) => void — called when each measure fires
 */

import { useEffect, useRef, useCallback } from 'react';
import { getAudioContext } from './audioContext';
import { guitarSampler } from './guitarSampler';

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

// ── Strum patterns ────────────────────────────────────────────────────────────
export const STRUM_PATTERNS = [
  { id: 'off',        name: 'Single Strum', sub: 'measure', steps: ['D'] },
  { id: 'all-down',   name: 'All Down',     sub: 'quarter', steps: ['D','D','D','D'] },
  { id: 'down-up',    name: 'Down-Up',      sub: 'eighth',  steps: ['D','U','D','U','D','U','D','U'] },
  { id: 'folk',       name: 'Folk',         sub: 'eighth',  steps: ['D','-','D','U','-','U','D','U'] },
  { id: 'country',    name: 'Country',      sub: 'eighth',  steps: ['D','D','U','-','U','D','U','-'] },
  { id: 'waltz',      name: 'Waltz (3/4)',  sub: 'quarter', steps: ['D','D','U'] },
  { id: 'slow-rock',  name: 'Slow Rock',    sub: 'eighth',  steps: ['D','-','-','U','-','-','D','-'] },
];

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

// guitarSampler.playNote() is async/immediate — use setTimeout offsets for future scheduling
function scheduleChordStrum(ctx, notes, strumPatternId, bpm, atCtxTime) {
  const pat    = STRUM_PATTERNS.find(p => p.id === strumPatternId) || STRUM_PATTERNS[0];
  const beats  = pat.sub === 'eighth' ? 0.5 : pat.sub === 'measure' ? 4 : 1;
  const stepMs = (60000 / bpm) * beats;
  const baseMs = (atCtxTime - ctx.currentTime) * 1000;
  pat.steps.forEach((step, i) => {
    if (step === '-') return;
    const offsetMs    = Math.max(0, baseMs + Math.round(i * stepMs));
    const orderedNotes = step === 'U' ? [...notes].reverse() : notes;
    orderedNotes.forEach((note, ni) => {
      setTimeout(() => {
        try { guitarSampler.playNote(note); } catch (_) {}
      }, offsetMs + ni * 14);
    });
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useBackingTrack(genre, bpm, drumsOn = true, bassOn = true) {
  const r = useRef({
    masterGain:   null,
    noiseBuffer:  null,
    timerId:      null,
    nextStepTime: 0,
    nextStepIdx:  0,
    // mirrors — kept current for use inside callbacks
    genre:    null,
    bpm:      120,
    drumsOn:  true,
    bassOn:   true,
    // chord scheduling state (updated via setChordOptionsDirect)
    chordEnabled:    false,
    chordMeasures:   null,   // string[][] pre-resolved per-measure note arrays
    chordTimeSig:    '4/4',
    chordStrumPatId: 'off',
    chordOnChange:   null,   // (flatIdx: number) => void
    chordNextTime:   0,
    chordMeasureIdx: 0,
    // pending sync time: set by syncToTime when genre is still null (cold start),
    // consumed by useEffect so drums and chord start at the caller's intended time
    pendingSyncTime: null,
  });

  // Keep mirrors in sync with props
  useEffect(() => { r.current.genre   = genre;   }, [genre]);
  useEffect(() => { r.current.bpm     = bpm;     }, [bpm]);
  useEffect(() => { r.current.drumsOn = drumsOn; }, [drumsOn]);
  useEffect(() => { r.current.bassOn  = bassOn;  }, [bassOn]);

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
    ref.pendingSyncTime  = null;  // consumed — clear so stale value never leaks
    clearInterval(ref.timerId);
    ref.timerId         = null;
    ref.nextStepTime    = fromTime;
    ref.nextStepIdx     = 0;
    ref.chordNextTime   = fromTime;
    ref.chordMeasureIdx = 0;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    function tick() {
      const { masterGain: mg, noiseBuffer: nb } = r.current;
      if (!mg || !nb) return;

      const now = ctx.currentTime;

      // ── Drums + bass ────────────────────────────────────────────────────────
      while (r.current.nextStepTime < now + LOOKAHEAD_S) {
        const curGenre  = r.current.genre;
        const pat       = PAT[curGenre] || PAT.blues;
        const stepDur   = 30 / r.current.bpm;
        const step      = r.current.nextStepIdx % pat.steps;
        const t         = r.current.nextStepTime;

        try {
          const drums = r.current.drumsOn;
          const bass  = r.current.bassOn;
          if (drums && pat.kick[step])   scheduleKick(ctx, mg, t);
          if (drums && pat.snare[step])  scheduleSnare(ctx, mg, nb, t);
          if (drums && pat.hihat[step])  scheduleHihat(ctx, mg, nb, t);
          const bassHz = pat.bass[step];
          if (bass && bassHz)            scheduleBass(ctx, mg, t, bassHz, stepDur);
          if (drums && pat.rhythm[step]) scheduleRhythm(ctx, mg, t, pat.rootHz, stepDur, curGenre);
        } catch (e) {
          console.warn('[useBackingTrack] synthesis error:', e.message);
        }

        r.current.nextStepTime += stepDur;
        r.current.nextStepIdx++;
      }

      // ── Chord strumming — same tick, same clock ──────────────────────────
      const cEnabled  = r.current.chordEnabled;
      const cMeasures = r.current.chordMeasures;

      if (!cEnabled || !cMeasures || cMeasures.length === 0) {
        // Advance chordNextTime silently so enabling mid-play doesn't burst
        if (r.current.chordNextTime < now) r.current.chordNextTime = now;
      } else {
        const beatsPerMeasure = parseInt((r.current.chordTimeSig || '4/4').split('/')[0]) || 4;
        const mDur = (beatsPerMeasure * 60) / r.current.bpm;

        while (r.current.chordNextTime < now + LOOKAHEAD_S) {
          const t   = r.current.chordNextTime;
          const idx = r.current.chordMeasureIdx % cMeasures.length;
          const notes = cMeasures[idx];

          if (notes && notes.length > 0) {
            try {
              scheduleChordStrum(ctx, notes, r.current.chordStrumPatId, r.current.bpm, t);
            } catch (e) {
              console.warn('[useBackingTrack] chord strum error:', e.message);
            }
          }

          const cb = r.current.chordOnChange;
          if (cb) {
            const capturedIdx = idx;
            setTimeout(() => cb(capturedIdx), Math.max(0, (t - ctx.currentTime) * 1000));
          }

          r.current.chordNextTime   += mDur;
          r.current.chordMeasureIdx++;
        }
      }
    }

    tick();
    ref.timerId = setInterval(tick, INTERVAL_MS);
  }

  // ── Effect: start/stop based on genre (non-null = playing) ─────────────────
  useEffect(() => {
    const ref = r.current;
    if (!genre) {
      clearInterval(ref.timerId);
      ref.timerId = null;
      return;
    }
    const ctx = boot();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // Use the time saved by syncToTime (called from handleStart before setPlaying(true))
    // so drums and chord start at the same clock reference as the metronome.
    const fromTime = ref.pendingSyncTime ?? (ctx.currentTime + 0.05);
    startScheduler(fromTime);

    return () => {
      clearInterval(ref.timerId);
      ref.timerId = null;
    };
  }, [genre, bpm]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => clearInterval(r.current.timerId), []);

  // syncToTime: align the pattern to a shared AudioContext start time.
  // When called before genre is set (cold start), saves the time for useEffect to consume.
  const syncToTime = useCallback((ctxTime) => {
    r.current.pendingSyncTime = ctxTime;
    if (!r.current.genre) return;
    boot();
    startScheduler(ctxTime);
  }, []); // startScheduler only closes over stable `r` — no stale deps

  // Direct ref setters — bypass the useEffect cycle so toggle takes effect immediately
  const setDrumsOnDirect = useCallback((val) => { r.current.drumsOn = val; }, []);
  const setBassOnDirect  = useCallback((val) => { r.current.bassOn  = val; }, []);

  // Update chord options live without restarting the scheduler
  const setChordOptionsDirect = useCallback((opts) => {
    if (opts.enabled       !== undefined) r.current.chordEnabled    = opts.enabled;
    if (opts.measures      !== undefined) r.current.chordMeasures   = opts.measures;
    if (opts.timeSig       !== undefined) r.current.chordTimeSig    = opts.timeSig;
    if (opts.strumPatternId !== undefined) r.current.chordStrumPatId = opts.strumPatternId;
    if (opts.onChordChange !== undefined) r.current.chordOnChange   = opts.onChordChange;
  }, []);

  // stopTrack kept for API compatibility — setting genre=null from the caller stops it
  const stopTrack   = useCallback(() => {}, []);
  const toggleTrack = useCallback(() => {}, []);

  return {
    trackOn: !!genre,
    toggleTrack,
    stopTrack,
    syncToTime,
    setDrumsOnDirect,
    setBassOnDirect,
    setChordOptionsDirect,
  };
}
