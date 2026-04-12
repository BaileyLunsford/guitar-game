/**
 * useMetronome.js — Web Audio lookahead metronome
 *
 * Uses the shared AudioContext (audioContext.js) so its clock is the same
 * reference used by guitarSampler and useBackingTrack — a prerequisite for
 * beat-accurate synchronisation.
 *
 * Scheduler: 25 ms poll interval, 100 ms lookahead. BPM changes restart the
 * scheduler automatically (via useEffect dep). The startScheduler() function
 * is also called directly by syncToTime() for external alignment.
 *
 * API:
 *   const { clickOn, toggleClick, stopClick, syncToTime } = useMetronome(bpm)
 *
 *   clickOn      bool            — current on/off state
 *   toggleClick  ()              — flip on/off
 *   stopClick    ()              — force off
 *   syncToTime   (ctxTime)       — if running, restart scheduler anchored to
 *                                  ctxTime so the next click lands on beat 1
 *                                  of that AudioContext timestamp. No-op if off.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioContext } from './audioContext';

const LOOKAHEAD_S = 0.10;
const INTERVAL_MS = 25;
const CLICK_FREQ  = 1000;  // Hz
const CLICK_DUR   = 0.04;  // seconds
const CLICK_GAIN  = 0.28;

// ── Module-level synth (no React deps) ───────────────────────────────────────
function scheduleBlip(ctx, t) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type            = 'sine';
  osc.frequency.value = CLICK_FREQ;
  gain.gain.setValueAtTime(CLICK_GAIN, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + CLICK_DUR);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + CLICK_DUR + 0.005);
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useMetronome(bpm) {
  const [clickOn, setClickOn] = useState(false);

  // All mutable state in a single ref so callbacks never go stale
  const r = useRef({
    nextBeat: 0,
    timerId:  null,
    on:       false,  // mirrors clickOn state
    bpm:      bpm,    // mirrors bpm prop
  });

  // Keep mirrors in sync
  useEffect(() => { r.current.on  = clickOn; }, [clickOn]);
  useEffect(() => { r.current.bpm = bpm;     }, [bpm]);

  // ── Core scheduler — start from an explicit AudioContext timestamp ─────────
  // Defined inside hook but only closes over `r` (stable ref) → no stale data.
  function startScheduler(fromTime) {
    const ref = r.current;
    clearInterval(ref.timerId);
    ref.timerId  = null;
    ref.nextBeat = fromTime;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    function tick() {
      const now     = getAudioContext().currentTime;
      const beatSec = 60 / r.current.bpm;   // read live from ref → no stale BPM
      while (r.current.nextBeat < now + LOOKAHEAD_S) {
        scheduleBlip(ctx, r.current.nextBeat);
        r.current.nextBeat += beatSec;
      }
    }

    tick();
    ref.timerId = setInterval(tick, INTERVAL_MS);
  }

  // ── Effect: respond to on/bpm changes ─────────────────────────────────────
  useEffect(() => {
    const ref = r.current;
    if (!clickOn) {
      clearInterval(ref.timerId);
      ref.timerId = null;
      return;
    }
    startScheduler(getAudioContext().currentTime + 0.05);
    return () => {
      clearInterval(ref.timerId);
      ref.timerId = null;
    };
  }, [clickOn, bpm]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => clearInterval(r.current.timerId), []);

  const toggleClick = useCallback(() => setClickOn(v => !v), []);
  const stopClick   = useCallback(() => setClickOn(false), []);

  // syncToTime: externally align the click to a shared start time.
  // Only acts when the metronome is already running.
  const syncToTime  = useCallback((ctxTime) => {
    if (!r.current.on) return;
    startScheduler(ctxTime);
  }, []); // startScheduler only closes over stable `r` — no stale deps

  return { clickOn, toggleClick, stopClick, syncToTime };
}
