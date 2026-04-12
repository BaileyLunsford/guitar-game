/**
 * LickPlay.jsx — Guitar Lick & Riff Learner
 *
 * Phase flow:  landing → categorySelect → lickSelect → drill
 *
 * Structure:
 *   landing        — LandingPage component
 *   categorySelect — grid of genre categories (Blues FREE, Rock PRO, Country PRO)
 *   lickSelect     — list of licks in the chosen category
 *   drill          — measure-by-measure playback (SongLearnEngine pattern)
 *
 * PRO gate:
 *   Tapping a PRO category fires UpgradeModal. Drill is never reached for PRO
 *   licks unless isPro=true.
 *
 * Audio:
 *   guitarSampler — same sampler used by SongLearnEngine.
 *   Loop effect owns audio when loop=true; navigation effect owns it otherwise.
 *   Both effects guard: if (phase !== 'drill') return;
 *
 * TabNotationDisplay usage:
 *   notes = currentMeasure  (array of {string, fret, beat, noteName})
 *   currentNote = activeNote (index, null when silent)
 */

import React, { useState, useEffect, useRef } from 'react';
import LandingPage    from './LandingPage';
import TabNotationDisplay from './TabNotationDisplay';
import UpgradeModal   from './UpgradeModal';
import { guitarSampler } from './guitarSampler';

// ── Palette ───────────────────────────────────────────────────────────────────
const M = {
  bg:       '#120A04',
  surface:  '#2A1208',
  panel:    '#1E0D06',
  primary:  '#C46428',
  accent:   '#E8833A',
  hi:       '#F5A65B',
  muted:    '#A0785A',
  text:     '#F5E8D8',
  border:   'rgba(196,100,40,0.25)',
  borderHi: 'rgba(232,131,58,0.55)',
};

// ── Lick data ─────────────────────────────────────────────────────────────────
// Note format: { string, fret, beat, noteName }
// string: 1=high e, 2=B, 3=G, 4=D, 5=A, 6=low E
// beat: 1-indexed position within the measure

const LICK_DATA = {
  blues: [
    {
      id: 'blues-1',
      title: 'Blues Shuffle',
      bars: 2,
      bpm: 80,
      measures: [
        [
          { string:6, fret:0, beat:1, noteName:'E3' },
          { string:6, fret:3, beat:2, noteName:'G3' },
          { string:6, fret:5, beat:3, noteName:'A3' },
          { string:6, fret:6, beat:4, noteName:'A#3' },
        ],
        [
          { string:5, fret:2, beat:1, noteName:'B3' },
          { string:5, fret:0, beat:2, noteName:'A2' },
          { string:6, fret:3, beat:3, noteName:'G3' },
          { string:6, fret:0, beat:4, noteName:'E3' },
        ],
      ],
    },
    {
      id: 'blues-2',
      title: 'Pentatonic Run',
      bars: 2,
      bpm: 90,
      measures: [
        [
          { string:1, fret:0, beat:1, noteName:'E4' },
          { string:2, fret:3, beat:2, noteName:'D4' },
          { string:3, fret:4, beat:3, noteName:'B3' },
          { string:3, fret:0, beat:4, noteName:'G3' },
        ],
        [
          { string:6, fret:0, beat:1, noteName:'E3' },
          { string:6, fret:3, beat:2, noteName:'G3' },
          { string:5, fret:2, beat:3, noteName:'B3' },
          { string:1, fret:0, beat:4, noteName:'E4' },
        ],
      ],
    },
    {
      id: 'blues-3',
      title: 'Turnaround',
      bars: 2,
      bpm: 75,
      measures: [
        [
          { string:6, fret:0, beat:1, noteName:'E3' },
          { string:6, fret:2, beat:2, noteName:'F#3' },
          { string:6, fret:3, beat:3, noteName:'G3' },
          { string:6, fret:4, beat:4, noteName:'G#3' },
        ],
        [
          { string:5, fret:0, beat:1, noteName:'A2' },
          { string:6, fret:3, beat:2, noteName:'G3' },
          { string:6, fret:2, beat:3, noteName:'F#3' },
          { string:6, fret:0, beat:4, noteName:'E3' },
        ],
      ],
    },
  ],

  rock: [
    {
      id: 'rock-1',
      title: 'Power Riff',
      bars: 2,
      bpm: 100,
      measures: [
        [
          { string:6, fret:0, beat:1, noteName:'E3' },
          { string:5, fret:2, beat:2, noteName:'B2' },
          { string:6, fret:0, beat:3, noteName:'E3' },
          { string:5, fret:3, beat:4, noteName:'C3' },
        ],
        [
          { string:6, fret:0, beat:1, noteName:'E3' },
          { string:5, fret:2, beat:2, noteName:'B2' },
          { string:5, fret:0, beat:3, noteName:'A2' },
          { string:6, fret:0, beat:4, noteName:'E3' },
        ],
      ],
    },
    {
      id: 'rock-2',
      title: 'Pentatonic Climb',
      bars: 2,
      bpm: 110,
      measures: [
        [
          { string:6, fret:0, beat:1, noteName:'E3' },
          { string:6, fret:3, beat:2, noteName:'G3' },
          { string:5, fret:0, beat:3, noteName:'A2' },
          { string:5, fret:2, beat:4, noteName:'B2' },
        ],
        [
          { string:4, fret:0, beat:1, noteName:'D3' },
          { string:4, fret:2, beat:2, noteName:'E3' },
          { string:3, fret:0, beat:3, noteName:'G3' },
          { string:3, fret:2, beat:4, noteName:'A3' },
        ],
      ],
    },
    {
      id: 'rock-3',
      title: 'Hammer & Pull',
      bars: 2,
      bpm: 95,
      measures: [
        [
          { string:4, fret:0, beat:1, noteName:'D3' },
          { string:4, fret:2, beat:2, noteName:'E3' },
          { string:4, fret:0, beat:3, noteName:'D3' },
          { string:5, fret:3, beat:4, noteName:'C3' },
        ],
        [
          { string:5, fret:2, beat:1, noteName:'B2' },
          { string:5, fret:0, beat:2, noteName:'A2' },
          { string:6, fret:3, beat:3, noteName:'G3' },
          { string:6, fret:0, beat:4, noteName:'E3' },
        ],
      ],
    },
  ],

  country: [
    {
      id: 'country-1',
      title: 'Chicken Pickin\'',
      bars: 2,
      bpm: 100,
      measures: [
        [
          { string:3, fret:0, beat:1, noteName:'G3' },
          { string:2, fret:0, beat:2, noteName:'B3' },
          { string:1, fret:0, beat:3, noteName:'E4' },
          { string:2, fret:3, beat:4, noteName:'D4' },
        ],
        [
          { string:3, fret:2, beat:1, noteName:'A3' },
          { string:2, fret:0, beat:2, noteName:'B3' },
          { string:3, fret:0, beat:3, noteName:'G3' },
          { string:4, fret:0, beat:4, noteName:'D3' },
        ],
      ],
    },
    {
      id: 'country-2',
      title: 'Banjo Roll',
      bars: 2,
      bpm: 90,
      measures: [
        [
          { string:5, fret:0, beat:1, noteName:'A2' },
          { string:3, fret:2, beat:2, noteName:'A3' },
          { string:2, fret:0, beat:3, noteName:'B3' },
          { string:1, fret:0, beat:4, noteName:'E4' },
        ],
        [
          { string:2, fret:3, beat:1, noteName:'D4' },
          { string:3, fret:2, beat:2, noteName:'A3' },
          { string:4, fret:2, beat:3, noteName:'E3' },
          { string:5, fret:0, beat:4, noteName:'A2' },
        ],
      ],
    },
    {
      id: 'country-3',
      title: 'Pedal Steel Bend',
      bars: 2,
      bpm: 80,
      measures: [
        [
          { string:2, fret:0, beat:1, noteName:'B3' },
          { string:2, fret:3, beat:2, noteName:'D4' },
          { string:1, fret:0, beat:3, noteName:'E4' },
          { string:2, fret:5, beat:4, noteName:'E4' },
        ],
        [
          { string:2, fret:3, beat:1, noteName:'D4' },
          { string:3, fret:2, beat:2, noteName:'A3' },
          { string:3, fret:0, beat:3, noteName:'G3' },
          { string:4, fret:0, beat:4, noteName:'D3' },
        ],
      ],
    },
  ],
};

// ── Category definitions ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'blues',
    label: 'Blues',
    emoji: '🎵',
    description: 'Open position · Key of E',
    pro: false,
  },
  {
    id: 'rock',
    label: 'Rock',
    emoji: '🤘',
    description: 'Power chords & riffs',
    pro: true,
  },
  {
    id: 'country',
    label: 'Country',
    emoji: '🤠',
    description: "Chicken pickin' & bends",
    pro: true,
  },
];

// ── Reusable button style ─────────────────────────────────────────────────────
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
    WebkitTapHighlightColor: 'transparent',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LickPlay({ isPro = false, onPurchase, onRestore }) {
  // ── Phase ─────────────────────────────────────────────────────────────────
  const [phase,       setPhase]       = useState('landing');
  // 'landing' | 'categorySelect' | 'lickSelect' | 'drill'

  // ── Selection ─────────────────────────────────────────────────────────────
  const [activeCat,   setActiveCat]   = useState(null);  // category id string
  const [activeLick,  setActiveLick]  = useState(null);  // lick object

  // ── Drill state ───────────────────────────────────────────────────────────
  const [measureIdx,  setMeasureIdx]  = useState(0);
  const [bpm,         setBpm]         = useState(80);
  const [loop,        setLoop]        = useState(false);
  const [loopTick,    setLoopTick]    = useState(0);
  const [activeNote,  setActiveNote]  = useState(null);

  // ── PRO modal ─────────────────────────────────────────────────────────────
  const [modal,       setModal]       = useState(null); // null | { feature }

  const loopTimerRef  = useRef(null);
  const noteTimersRef = useRef([]);

  // ── Audio helpers ─────────────────────────────────────────────────────────
  function clearNoteTimers() {
    noteTimersRef.current.forEach(t => clearTimeout(t));
    noteTimersRef.current = [];
    setActiveNote(null);
  }

  function playMeasureNotes(measure, bpmVal) {
    clearNoteTimers();
    guitarSampler.resume();
    const beatMs = 60_000 / bpmVal;
    measure.forEach((note, idx) => {
      const ms = Math.round((note.beat - 1) * beatMs);
      const t = setTimeout(() => {
        guitarSampler.playNote(note.noteName);
        setActiveNote(idx);
      }, ms);
      noteTimersRef.current.push(t);
    });
    if (measure.length > 0) {
      const last = measure[measure.length - 1];
      const clearMs = Math.round((last.beat - 1 + (last.duration ?? 1)) * beatMs);
      const tc = setTimeout(() => setActiveNote(null), clearMs);
      noteTimersRef.current.push(tc);
    }
  }

  function measureMs(measures, idx, bpmVal) {
    const m = measures[idx] ?? [];
    const beats = m.length > 0
      ? Math.max(...m.map(n => n.beat + (n.duration ?? 1) - 1))
      : 4;
    return Math.round(beats * (60_000 / bpmVal));
  }

  // ── Loop effect ───────────────────────────────────────────────────────────
  const measures       = activeLick?.measures ?? [];
  const currentMeasure = measures[measureIdx] ?? [];

  useEffect(() => {
    if (phase !== 'drill') return;
    if (!loop) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
      return;
    }
    playMeasureNotes(currentMeasure, bpm);
    const dur = measureMs(measures, measureIdx, bpm);
    loopTimerRef.current = setTimeout(() => setLoopTick(t => t + 1), dur);
    return () => clearTimeout(loopTimerRef.current);
  }, [phase, loop, measureIdx, bpm, loopTick]); // eslint-disable-line

  // ── Navigation play effect ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'drill') return;
    if (loop) return;
    playMeasureNotes(currentMeasure, bpm);
    return () => clearNoteTimers();
  }, [phase, measureIdx]); // eslint-disable-line

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(loopTimerRef.current);
    clearNoteTimers();
  }, []);

  // ── Drill controls ────────────────────────────────────────────────────────
  const total  = measures.length;
  const atStart = measureIdx === 0;
  const atEnd   = measureIdx >= total - 1;

  function handlePrev() {
    setLoop(false);
    setMeasureIdx(i => Math.max(i - 1, 0));
  }
  function handleRepeat() {
    setLoop(false);
    playMeasureNotes(currentMeasure, bpm);
  }
  function handleNext() {
    setLoop(false);
    setMeasureIdx(i => Math.min(i + 1, total - 1));
  }

  function openDrill(lick) {
    setActiveLick(lick);
    setMeasureIdx(0);
    setBpm(lick.bpm ?? 80);
    setLoop(false);
    setActiveNote(null);
    setPhase('drill');
  }

  // ── Render: Landing ───────────────────────────────────────────────────────
  if (phase === 'landing') return (
    <LandingPage
      emoji="🎸"
      title="Lick Play"
      description="Learn classic guitar licks and riffs phrase by phrase. Master the building blocks of lead guitar."
      difficulty="Intermediate"
      features={[
        'Short 2–4 measure phrases',
        'Standard notation + tab',
        'Loop any lick for practice',
      ]}
      onStart={() => setPhase('categorySelect')}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  // ── Render: Category select ───────────────────────────────────────────────
  if (phase === 'categorySelect') return (
    <>
      <div style={{ minHeight:'100vh', background:M.bg, color:M.text,
        fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px' }}>
        <div style={{ maxWidth:420, margin:'0 auto' }}>

          <button onClick={() => setPhase('landing')}
            style={{ background:'none', border:'none', color:M.muted,
              fontFamily:"Georgia,serif", fontSize:13, cursor:'pointer',
              padding:'0 0 20px', display:'block' }}>
            ← Back
          </button>

          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:6,
            background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text' }}>
            Lick Play
          </h1>
          <p style={{ fontSize:13, color:M.muted, marginBottom:24 }}>
            Choose a category
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {CATEGORIES.map(cat => {
              const locked = cat.pro && !isPro;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (locked) {
                      setModal({ feature: `${cat.label} Licks — PRO Feature` });
                    } else {
                      setActiveCat(cat.id);
                      setPhase('lickSelect');
                    }
                  }}
                  style={{
                    background: M.surface,
                    border: `1px solid ${M.border}`,
                    borderRadius: 16,
                    padding: '16px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                    fontFamily: "Georgia,serif",
                    color: locked ? M.muted : M.text,
                    transition: 'all 0.15s',
                    WebkitTapHighlightColor: 'transparent',
                    opacity: locked ? 0.8 : 1,
                  }}
                >
                  <div style={{ fontSize:32, lineHeight:1 }}>{cat.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:16,
                      color: locked ? M.muted : M.hi }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize:12, color:M.muted, marginTop:2 }}>
                      {cat.description}
                    </div>
                  </div>
                  {locked ? (
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{
                        fontSize:10, fontWeight:800, letterSpacing:'0.06em',
                        padding:'3px 10px', borderRadius:20,
                        background:'rgba(232,131,58,0.12)',
                        border:'1px solid rgba(232,131,58,0.4)',
                        color:M.accent, whiteSpace:'nowrap',
                      }}>PRO</span>
                      <span style={{ fontSize:16, color:M.muted }}>🔒</span>
                    </div>
                  ) : (
                    <span style={{
                      fontSize:10, fontWeight:800, letterSpacing:'0.06em',
                      padding:'3px 10px', borderRadius:20,
                      background:'rgba(123,158,107,0.15)',
                      border:'1px solid rgba(123,158,107,0.45)',
                      color:'#7B9E6B', whiteSpace:'nowrap',
                    }}>FREE</span>
                  )}
                  <span style={{ color:M.muted, fontSize:18 }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onPurchase={onPurchase}
        onRestore={onRestore}
        feature={modal?.feature}
      />
    </>
  );

  // ── Render: Lick select ───────────────────────────────────────────────────
  if (phase === 'lickSelect') {
    const cat   = CATEGORIES.find(c => c.id === activeCat);
    const licks = LICK_DATA[activeCat] ?? [];
    return (
      <div style={{ minHeight:'100vh', background:M.bg, color:M.text,
        fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px' }}>
        <div style={{ maxWidth:420, margin:'0 auto' }}>

          <button onClick={() => setPhase('categorySelect')}
            style={{ background:'none', border:'none', color:M.muted,
              fontFamily:"Georgia,serif", fontSize:13, cursor:'pointer',
              padding:'0 0 20px', display:'block' }}>
            ← {cat?.label}
          </button>

          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:6,
            background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text' }}>
            {cat?.label} Licks
          </h1>
          <p style={{ fontSize:13, color:M.muted, marginBottom:24 }}>
            {cat?.description}
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {licks.map((lick, i) => (
              <button
                key={lick.id}
                onClick={() => openDrill(lick)}
                style={{
                  background: M.surface,
                  border: `1px solid ${M.border}`,
                  borderRadius: 16,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  fontFamily: "Georgia,serif",
                  color: M.text,
                  transition: 'all 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background:'rgba(196,100,40,0.15)',
                  border:`1px solid ${M.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:900, color:M.accent,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:M.text, marginBottom:2 }}>
                    {lick.title}
                  </div>
                  <div style={{ fontSize:11, color:M.muted }}>
                    {lick.bars} bar{lick.bars !== 1 ? 's' : ''} · {lick.bpm} BPM
                  </div>
                </div>
                <span style={{ color:M.muted, fontSize:18 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Drill ─────────────────────────────────────────────────────────
  const pct = total > 1 ? (measureIdx / (total - 1)) * 100 : 100;
  const cat = CATEGORIES.find(c => c.id === activeCat);

  return (
    <div style={{ minHeight:'100vh', background:M.bg, color:M.text,
      fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px' }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:32, marginBottom:4,
            filter:'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>
            {cat?.emoji ?? '🎸'}
          </div>
          <h1 style={{ fontSize:18, fontWeight:800, marginBottom:4, letterSpacing:'-0.01em',
            background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text' }}>
            {activeLick?.title}
          </h1>
          <p style={{ fontSize:12, color:M.muted, marginBottom:10 }}>
            <span style={{ color:M.hi }}>{cat?.label}</span>
            {' · '}Measure{' '}
            <strong style={{ color:M.hi }}>{measureIdx + 1}</strong> of {total}
          </p>

          {/* Dot indicators */}
          <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
            {measures.map((_, i) => (
              <button key={i} onClick={() => { setLoop(false); setMeasureIdx(i); }}
                title={`Measure ${i + 1}`}
                style={{
                  width: i === measureIdx ? 22 : 10, height:10,
                  borderRadius:5, border:'none',
                  background: i === measureIdx ? M.accent
                    : i < measureIdx ? M.primary : M.surface,
                  cursor:'pointer', transition:'all 0.2s ease', padding:0,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ height:5, background:M.surface, borderRadius:3,
          marginBottom:18, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:3,
            background:`linear-gradient(90deg,${M.primary},${M.accent})`,
            width:`${pct}%`, transition:'width 0.35s ease' }} />
        </div>

        {/* ── Notation + Tab ── */}
        <div style={{ background:M.surface, borderRadius:14,
          padding:'16px 12px', border:`1px solid ${M.border}`, marginBottom:18 }}>
          <TabNotationDisplay notes={currentMeasure} currentNote={activeNote} />
        </div>

        {/* ── Navigation: Prev / Repeat / Next ── */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:10 }}>
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

        {/* ── Play Full Lick + Loop ── */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:18 }}>
          <button
            onClick={() => {
              setLoop(false);
              setMeasureIdx(0);
              // Play all measures sequentially
              let offset = 0;
              measures.forEach((m, i) => {
                const delay = offset;
                offset += measureMs(measures, i, bpm);
                setTimeout(() => {
                  setMeasureIdx(i);
                  playMeasureNotes(m, bpm);
                }, delay);
              });
            }}
            style={{ ...btnStyle(false, false), paddingLeft:24, paddingRight:24 }}
          >
            ▶ Play Full Lick
          </button>
          <button onClick={() => setLoop(l => !l)} style={btnStyle(loop, false)}>
            🔁 {loop ? 'Loop On' : 'Loop Off'}
          </button>
        </div>

        {/* ── BPM control ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16,
          padding:'14px 20px', background:M.panel,
          border:`1px solid ${M.border}`, borderRadius:14, marginBottom:24 }}>
          <button onClick={() => setBpm(b => Math.max(40, b - 10))} disabled={bpm <= 40}
            style={{ ...btnStyle(false, bpm <= 40), padding:'7px 16px', fontSize:18, lineHeight:1 }}>
            −
          </button>
          <div style={{ textAlign:'center', minWidth:72 }}>
            <div style={{ fontSize:30, fontWeight:800, color:M.accent, lineHeight:1 }}>{bpm}</div>
            <div style={{ fontSize:10, color:M.muted, textTransform:'uppercase',
              letterSpacing:'0.12em', marginTop:2 }}>BPM</div>
          </div>
          <button onClick={() => setBpm(b => Math.min(200, b + 10))} disabled={bpm >= 200}
            style={{ ...btnStyle(false, bpm >= 200), padding:'7px 16px', fontSize:18, lineHeight:1 }}>
            +
          </button>
        </div>

        {/* ── Back link ── */}
        <div style={{ textAlign:'center', paddingBottom:40 }}>
          <button
            onClick={() => { setLoop(false); clearNoteTimers(); setPhase('lickSelect'); }}
            style={{ background:'none', border:'none', color:M.muted,
              fontFamily:"Georgia,serif", fontSize:13, cursor:'pointer' }}>
            ← Back to Lick Select
          </button>
        </div>

      </div>
    </div>
  );
}
