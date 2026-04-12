/**
 * audioContext.js — Shared AudioContext singleton
 *
 * All audio subsystems (guitarSampler, useMetronome, useBackingTrack) import
 * getAudioContext() so they share one AudioContext instance and one clock.
 * This guarantees ctx.currentTime is the same reference point everywhere,
 * which is the prerequisite for beat-accurate synchronisation.
 *
 * Usage:
 *   import { getAudioContext } from './audioContext';
 *   const ctx = getAudioContext();   // always the same instance
 */

let _ctx = null;

export function getAudioContext() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}
