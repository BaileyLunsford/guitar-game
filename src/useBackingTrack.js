/**
 * useBackingTrack.js — looping backing track at reduced volume
 *
 * Fetches, decodes, and loops an MP3. Degrades gracefully on 404 (button
 * renders but plays silence; trackOn resets to false after the failed fetch).
 *
 * Genre switching:
 *   Pass a new `src` when the genre changes. The hook immediately stops any
 *   playing source, clears the cached buffer, and resets trackOn to false.
 *   The new track only loads+plays when the user explicitly turns it on again.
 *   This guarantees the wrong genre's audio never plays.
 *
 * TODO: add backing track files to public/audio/backing/
 *   blues-loop.mp3   — blues shuffle groove, key of E
 *   rock-loop.mp3    — driving rock beat
 *   country-loop.mp3 — country two-step groove
 *
 * API:
 *   const { trackOn, toggleTrack, stopTrack } = useBackingTrack(src)
 *
 *   src        string | null  — URL of the MP3 to loop (null = no track)
 *   trackOn    bool           — current on/off state
 *   toggleTrack ()            — flip on/off
 *   stopTrack   ()            — force off and stop audio immediately
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const BACKING_VOLUME = 0.40;

export default function useBackingTrack(src) {
  const [on, setOn] = useState(false);
  const r = useRef({
    ctx:        null,
    gainNode:   null,
    source:     null,   // current BufferSourceNode
    buf:        null,   // decoded AudioBuffer
    fetchedFor: null,   // src string that buf was decoded from
    fetching:   false,
  });

  function getCtx() {
    if (!r.current.ctx) {
      r.current.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return r.current.ctx;
  }

  function stopSource() {
    try { r.current.source?.stop(); } catch (_) { /* already stopped */ }
    r.current.source = null;
  }

  function startSource(buf) {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    stopSource();

    if (!r.current.gainNode) {
      r.current.gainNode = ctx.createGain();
      r.current.gainNode.gain.value = BACKING_VOLUME;
      r.current.gainNode.connect(ctx.destination);
    }

    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop   = true;
    node.connect(r.current.gainNode);
    node.start();
    r.current.source = node;
  }

  // ── When src changes: stop immediately, wipe cache, reset to off ──────────
  useEffect(() => {
    stopSource();
    r.current.buf        = null;
    r.current.fetchedFor = null;
    r.current.fetching   = false;
    setOn(false);
  }, [src]); // eslint-disable-line

  // ── React to on/off ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!on || !src) {
      if (!on) stopSource();
      return;
    }

    // Buffer already cached for this src — play immediately
    if (r.current.buf && r.current.fetchedFor === src) {
      startSource(r.current.buf);
      return;
    }

    // Already fetching — wait; the fetch callback will call startSource
    if (r.current.fetching) return;

    // Fetch + decode
    r.current.fetching = true;
    const ctx = getCtx();
    fetch(src)
      .then(res => {
        if (!res.ok) throw new Error(`[useBackingTrack] 404: ${src}`);
        return res.arrayBuffer();
      })
      .then(ab => ctx.decodeAudioData(ab))
      .then(decoded => {
        r.current.fetching   = false;
        r.current.buf        = decoded;
        r.current.fetchedFor = src;
        // Only play if still on and src hasn't changed since fetch started
        if (on && r.current.fetchedFor === src) startSource(decoded);
      })
      .catch(err => {
        r.current.fetching = false;
        console.warn(err.message + ' — backing track unavailable, toggle reset');
        setOn(false);
      });
  }, [on, src]); // eslint-disable-line

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopSource(), []);

  const toggleTrack = useCallback(() => setOn(v => !v), []);
  const stopTrack   = useCallback(() => { stopSource(); setOn(false); }, []);

  return { trackOn: on, toggleTrack, stopTrack };
}
