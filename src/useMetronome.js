/**
 * useMetronome.js — Web Audio lookahead metronome
 *
 * Uses the Web Audio clock (ctx.currentTime) rather than setInterval for
 * sample-accurate timing. A 25ms scheduler interval looks ~100ms ahead and
 * pre-schedules oscillator blips, so the click stays tight even under JS jank.
 *
 * API:
 *   const { clickOn, toggleClick, stopClick } = useMetronome(bpm)
 *
 *   clickOn     bool   — current state
 *   toggleClick ()     — flip on/off
 *   stopClick   ()     — force off
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const LOOKAHEAD_S  = 0.10;  // schedule this many seconds ahead
const INTERVAL_MS  = 25;    // scheduler poll interval
const CLICK_FREQ   = 1000;  // Hz — short sine blip
const CLICK_DUR    = 0.04;  // seconds
const CLICK_GAIN   = 0.28;  // output level

export default function useMetronome(bpm) {
  const [clickOn, setClickOn] = useState(false);
  const ref = useRef({
    ctx:      null,
    nextBeat: 0,     // ctx.currentTime of next scheduled beat
    timerId:  null,
  });

  function getCtx() {
    if (!ref.current.ctx) {
      ref.current.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ref.current.ctx;
  }

  function scheduleBlip(time) {
    const ctx  = getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type            = 'sine';
    osc.frequency.value = CLICK_FREQ;
    gain.gain.setValueAtTime(CLICK_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DUR);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + CLICK_DUR + 0.005);
  }

  useEffect(() => {
    const r = ref.current;
    if (!clickOn) {
      clearInterval(r.timerId);
      r.timerId  = null;
      return;
    }

    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const beatSec  = 60 / bpm;
    r.nextBeat = ctx.currentTime + 0.05; // small startup delay

    function tick() {
      const now = getCtx().currentTime;
      while (r.nextBeat < now + LOOKAHEAD_S) {
        scheduleBlip(r.nextBeat);
        r.nextBeat += beatSec;
      }
    }

    tick();
    r.timerId = setInterval(tick, INTERVAL_MS);

    return () => {
      clearInterval(r.timerId);
      r.timerId = null;
    };
  }, [clickOn, bpm]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => clearInterval(ref.current.timerId), []);

  const toggleClick = useCallback(() => setClickOn(v => !v), []);
  const stopClick   = useCallback(() => setClickOn(false), []);

  return { clickOn, toggleClick, stopClick };
}
