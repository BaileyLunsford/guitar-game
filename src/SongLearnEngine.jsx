/**
 * SongLearnEngine.jsx — Guitar Audition Game
 * Displays a song measure-by-measure with navigation, loop, and BPM controls.
 *
 * Props:
 *   song  { title, bpm, measures: Array<Array<{string, fret, noteName, beat}>> }
 *
 * Playback model:
 *   - Repeat  : plays the current measure's notes once, no looping
 *   - Loop    : standalone toggle — loops the current measure until turned off
 *   - Play FS : navigates to #song-play (separate full-song screen)
 */

import React, { useState, useEffect, useRef } from 'react';
import TabNotationDisplay from './TabNotationDisplay';
import LandingPage from './LandingPage';
import { guitarSampler } from './guitarSampler';
import useBackingTrack from './useBackingTrack';
import { getAudioContext } from './audioContext';

// ─── Mahogany palette ────────────────────────────────────────────────────────
const M = {
  bg:      '#120A04',
  surface: '#2A1208',
  panel:   '#1E0D06',
  primary: '#C46428',
  accent:  '#E8833A',
  hi:      '#F5A65B',
  muted:   '#A0785A',
  text:    '#F5E8D8',
  border:  'rgba(196,100,40,0.25)',
  borderHi:'rgba(232,131,58,0.55)',
};

// ─── Reusable button style ────────────────────────────────────────────────────
function btnStyle(active = false, disabled = false) {
  return {
    padding: '10px 18px',
    borderRadius: 12,
    border: `1px solid ${active ? M.borderHi : M.border}`,
    background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.1)',
    color: disabled ? M.muted : (active ? M.hi : M.text),
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s',
    userSelect: 'none',
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SongLearnEngine({ song }) {
  const [started,    setStarted]    = useState(false);
  const [measureIdx, setMeasureIdx] = useState(0);
  const [bpm,        setBpm]        = useState(song?.bpm ?? 80);
  const [loop,       setLoop]       = useState(false);
  const [loopTick,   setLoopTick]   = useState(0); // bumped each cycle to re-arm loop
  const [activeNote, setActiveNote] = useState(null); // index into currentMeasure

  const loopTimerRef  = useRef(null);
  const noteTimersRef = useRef([]);

  const { trackOn, toggleTrack, stopTrack, syncToTime } = useBackingTrack('blues', bpm);

  const measures       = song?.measures ?? [];
  const total          = measures.length;
  const currentMeasure = measures[measureIdx] ?? [];

  // ── Audio helpers ─────────────────────────────────────────────────────────

  function clearNoteTimers() {
    noteTimersRef.current.forEach(t => clearTimeout(t));
    noteTimersRef.current = [];
    setActiveNote(null);
  }

  // ±20–40ms random offset applied independently per note (not cumulative)
  function jitterMs() {
    const mag = 20 + Math.random() * 20;
    return Math.random() < 0.5 ? mag : -mag;
  }

  function playMeasureNotes(measure, bpmValue) {
    clearNoteTimers();
    guitarSampler.resume();
    const ctx = getAudioContext();
    const t   = ctx.currentTime + 0.05;
    if (trackOn) syncToTime(t);
    const beatMs = 60_000 / bpmValue;
    measure.forEach((note, idx) => {
      const ms = Math.max(0, Math.round((note.beat - 1) * beatMs) + jitterMs());
      const t = setTimeout(() => {
        guitarSampler.playNote(note.noteName);
        setActiveNote(idx);
      }, ms);
      noteTimersRef.current.push(t);
    });
    // Clear highlight after last note finishes
    if (measure.length > 0) {
      const last = measure[measure.length - 1];
      const clearMs = Math.round((last.beat - 1 + (last.duration ?? 1)) * beatMs);
      const tc = setTimeout(() => setActiveNote(null), clearMs);
      noteTimersRef.current.push(tc);
    }
  }

  // Duration of a measure in ms — uses beat + (duration-1) so half notes
  // (duration:2 on beat 3) correctly extend the measure to beat 4.
  function measureMs(idx) {
    const m = measures[idx] ?? [];
    const beats = m.length > 0 ? Math.max(...m.map(n => n.beat + (n.duration ?? 1) - 1)) : 4;
    return Math.round(beats * (60_000 / bpm));
  }

  // ── Loop effect ───────────────────────────────────────────────────────────
  // Standalone measure loop — independent of Play Full Song.
  // When loop=true: play notes now, then schedule the next cycle via loopTick.
  // When loop=false: cancel any pending cycle immediately.
  useEffect(() => {
    if (!started) return;
    if (!loop) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
      return;
    }
    playMeasureNotes(currentMeasure, bpm);
    const dur = measureMs(measureIdx);
    loopTimerRef.current = setTimeout(() => setLoopTick(t => t + 1), dur);
    return () => clearTimeout(loopTimerRef.current);
  }, [started, loop, measureIdx, bpm, loopTick]); // eslint-disable-line

  // ── Navigation note-play effect ───────────────────────────────────────────
  // Fires when the displayed measure changes due to Prev / Next / dot tap.
  // Skipped when loop is active (loop effect owns audio then).
  // Skipped until the user has clicked Get Started.
  useEffect(() => {
    if (!started) return;
    if (loop) return;
    playMeasureNotes(currentMeasure, bpm);
    return () => clearNoteTimers();
  }, [started, measureIdx]); // eslint-disable-line

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(loopTimerRef.current);
    clearNoteTimers();
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────

  function handlePrev() {
    setLoop(false); // stop any active loop; navigation note-play effect takes over
    setMeasureIdx(i => Math.max(i - 1, 0));
  }

  // Replay current measure once — no looping, no auto-advance
  function handleRepeat() {
    setLoop(false);
    playMeasureNotes(currentMeasure, bpm);
  }

  function handleNext() {
    setLoop(false);
    setMeasureIdx(i => Math.min(i + 1, total - 1));
  }

  // Navigate to the full-song playback screen
  function handlePlaySong() {
    setLoop(false);
    stopTrack();
    window.location.hash = '#song-play';
  }

  if (!started) return (
    <LandingPage
      emoji="🎵"
      title="Song Learn"
      description="Learn songs measure by measure. Follow the notation and tab as each note plays. Perfect for beginners building their repertoire."
      difficulty="Beginner"
      features={['Measure-by-measure playback', 'Standard notation + guitar tab', 'Adjustable BPM tempo']}
      onStart={() => { setMeasureIdx(0); setStarted(true); }}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  const atStart = measureIdx === 0;
  const atEnd   = measureIdx >= total - 1;
  const pct     = total > 1 ? (measureIdx / (total - 1)) * 100 : 100;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: M.bg,
      color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 36, marginBottom: 6, filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>
            🎸
          </div>
          <h1 style={{
            fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {song?.title ?? 'Song'}
          </h1>
          <p style={{ fontSize: 13, color: M.muted, marginBottom: 10 }}>
            Measure <strong style={{ color: M.hi }}>{measureIdx + 1}</strong> of {total}
          </p>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {measures.map((_, i) => (
              <button
                key={i}
                onClick={() => { setLoop(false); setMeasureIdx(i); }}
                title={`Measure ${i + 1}`}
                style={{
                  width: i === measureIdx ? 22 : 10,
                  height: 10, borderRadius: 5, border: 'none',
                  background: i === measureIdx ? M.accent
                    : i < measureIdx ? M.primary : M.surface,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Progress bar ──────────────────────────────────────────────── */}
        <div style={{
          height: 5, background: M.surface, borderRadius: 3,
          marginBottom: 20, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${M.primary}, ${M.accent})`,
            width: `${pct}%`,
            transition: 'width 0.35s ease',
          }} />
        </div>

        {/* ── Notation + Tab display ─────────────────────────────────────── */}
        <div style={{
          background: M.surface, borderRadius: 14,
          padding: '16px 12px', border: `1px solid ${M.border}`,
          marginBottom: 20,
        }}>
          <TabNotationDisplay notes={currentMeasure} currentNote={activeNote} />
        </div>

        {/* ── Navigation: Prev / Repeat / Next ─────────────────────────── */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12,
        }}>
          <button onClick={handlePrev} disabled={atStart} style={btnStyle(false, atStart)}>
            ← Prev
          </button>
          <button onClick={handleRepeat} style={btnStyle(false, false)}>
            ↺ Repeat
          </button>
          <button onClick={handleNext} disabled={atEnd} style={btnStyle(false, atEnd)}>
            Next →
          </button>
        </div>

        {/* ── Play full song + Loop + Track ────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={handlePlaySong}
            style={{ ...btnStyle(false, false), paddingLeft: 22, paddingRight: 22 }}
          >
            ▶ Play Full Song
          </button>
          <button
            onClick={() => setLoop(l => !l)}
            style={btnStyle(loop, false)}
          >
            🔁 {loop ? 'Loop On' : 'Loop Off'}
          </button>
          <button
            onClick={toggleTrack}
            style={btnStyle(trackOn, false)}
          >
            🥁 {trackOn ? 'Track On' : 'Track Off'}
          </button>
        </div>

        {/* ── BPM control ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: '14px 20px', background: M.panel,
          border: `1px solid ${M.border}`, borderRadius: 14, marginBottom: 28,
        }}>
          <button
            onClick={() => setBpm(b => Math.max(40, b - 1))}
            disabled={bpm <= 40}
            style={{ ...btnStyle(false, bpm <= 40), padding: '7px 16px', fontSize: 18, lineHeight: 1 }}
          >
            −
          </button>
          <div style={{ textAlign: 'center', minWidth: 72 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: M.accent, lineHeight: 1 }}>
              {bpm}
            </div>
            <div style={{
              fontSize: 10, color: M.muted, textTransform: 'uppercase',
              letterSpacing: '0.12em', marginTop: 2,
            }}>
              BPM
            </div>
          </div>
          <button
            onClick={() => setBpm(b => Math.min(200, b + 1))}
            disabled={bpm >= 200}
            style={{ ...btnStyle(false, bpm >= 200), padding: '7px 16px', fontSize: 18, lineHeight: 1 }}
          >
            +
          </button>
        </div>

        {/* ── Back link ─────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <a
            href="#"
            onClick={() => stopTrack()}
            style={{ color: M.muted, fontSize: 13, textDecoration: 'none' }}
          >
            ← Back to home
          </a>
        </div>

      </div>
    </div>
  );
}
