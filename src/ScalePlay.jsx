/**
 * ScalePlay.jsx — Guitar Audition Game
 * Landing page + stepped drill for learning scales.
 *
 * Modes:
 *   landing  — scale selector, fretboard pattern, Hear the Scale, Start Drill
 *   drill    — one note at a time, Prev/Next, Loop, Repeat, BPM
 */

import React, { useState, useEffect, useRef } from 'react';
import { guitarSampler } from './guitarSampler';

// ─── Mahogany palette ────────────────────────────────────────────────────────
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
  green:    '#7B9E6B',
};

// ─── Scale data ──────────────────────────────────────────────────────────────
// string: 1=high E, 6=low E (guitar convention)
// STRING_NAMES[i] = open note name for string i (1-indexed)
const STRING_NAMES = { 1:'E4', 2:'B3', 3:'G3', 4:'D3', 5:'A2', 6:'E2' };
const STRING_LABELS = { 1:'e', 2:'B', 3:'G', 4:'D', 5:'A', 6:'E' };

const SCALES = [
  // ── FREE ────────────────────────────────────────────────────────────────
  {
    id: 'g-major',
    name: 'G Major',
    subtitle: 'Open Position',
    category: 'major',
    difficulty: 'Beginner',
    pro: false,
    notes: [
      { string: 6, fret: 3,  noteName: 'G3',  root: true  },
      { string: 6, fret: 5,  noteName: 'A3',  root: false },
      { string: 5, fret: 2,  noteName: 'B3',  root: false },
      { string: 5, fret: 3,  noteName: 'C4',  root: false },
      { string: 5, fret: 5,  noteName: 'D4',  root: false },
      { string: 4, fret: 2,  noteName: 'E4',  root: false },
      { string: 4, fret: 4,  noteName: 'F#4', root: false },
      { string: 4, fret: 5,  noteName: 'G4',  root: true  },
    ],
  },
  {
    id: 'a-minor',
    name: 'A Minor',
    subtitle: 'Open Position',
    category: 'minor',
    difficulty: 'Beginner',
    pro: false,
    notes: [
      { string: 6, fret: 5,  noteName: 'A3',  root: true  },
      { string: 5, fret: 2,  noteName: 'B3',  root: false },
      { string: 5, fret: 3,  noteName: 'C4',  root: false },
      { string: 5, fret: 5,  noteName: 'D4',  root: false },
      { string: 4, fret: 2,  noteName: 'E4',  root: false },
      { string: 4, fret: 3,  noteName: 'F4',  root: false },
      { string: 4, fret: 5,  noteName: 'G4',  root: false },
      { string: 3, fret: 2,  noteName: 'A4',  root: true  },
    ],
  },
  {
    id: 'g-pentatonic',
    name: 'G Major Pentatonic',
    subtitle: 'Pattern 1',
    category: 'pentatonic',
    difficulty: 'Beginner',
    pro: false,
    notes: [
      { string: 6, fret: 3,  noteName: 'G3',  root: true  },
      { string: 6, fret: 5,  noteName: 'A3',  root: false },
      { string: 5, fret: 2,  noteName: 'B3',  root: false },
      { string: 5, fret: 5,  noteName: 'D4',  root: false },
      { string: 4, fret: 2,  noteName: 'E4',  root: false },
      { string: 4, fret: 5,  noteName: 'G4',  root: true  },
    ],
  },
  // ── PRO — Major ──────────────────────────────────────────────────────────
  {
    id: 'd-major',
    name: 'D Major',
    subtitle: 'Open Position',
    category: 'major',
    difficulty: 'Beginner',
    pro: true,
    notes: [
      { string: 5, fret: 5,  noteName: 'D4',  root: true  },
      { string: 4, fret: 2,  noteName: 'E4',  root: false },
      { string: 4, fret: 4,  noteName: 'F#4', root: false },
      { string: 4, fret: 5,  noteName: 'G4',  root: false },
      { string: 3, fret: 2,  noteName: 'A4',  root: false },
      { string: 3, fret: 4,  noteName: 'B4',  root: false },
      { string: 2, fret: 4,  noteName: 'C#5', root: false },
      { string: 2, fret: 5,  noteName: 'D5',  root: true  },
    ],
  },
  {
    id: 'a-major',
    name: 'A Major',
    subtitle: 'Open Position',
    category: 'major',
    difficulty: 'Beginner',
    pro: true,
    notes: [
      { string: 5, fret: 0,  noteName: 'A2',  root: true  },
      { string: 5, fret: 2,  noteName: 'B2',  root: false },
      { string: 5, fret: 4,  noteName: 'C#3', root: false },
      { string: 4, fret: 0,  noteName: 'D3',  root: false },
      { string: 4, fret: 2,  noteName: 'E3',  root: false },
      { string: 4, fret: 4,  noteName: 'F#3', root: false },
      { string: 3, fret: 1,  noteName: 'G#3', root: false },
      { string: 3, fret: 2,  noteName: 'A3',  root: true  },
    ],
  },
  {
    id: 'e-major',
    name: 'E Major',
    subtitle: 'Open Position',
    category: 'major',
    difficulty: 'Beginner',
    pro: true,
    notes: [
      { string: 6, fret: 0,  noteName: 'E2',  root: true  },
      { string: 6, fret: 2,  noteName: 'F#2', root: false },
      { string: 6, fret: 4,  noteName: 'G#2', root: false },
      { string: 5, fret: 0,  noteName: 'A2',  root: false },
      { string: 5, fret: 2,  noteName: 'B2',  root: false },
      { string: 5, fret: 4,  noteName: 'C#3', root: false },
      { string: 4, fret: 1,  noteName: 'D#3', root: false },
      { string: 4, fret: 2,  noteName: 'E3',  root: true  },
    ],
  },
  {
    id: 'c-major',
    name: 'C Major',
    subtitle: 'Open Position',
    category: 'major',
    difficulty: 'Beginner',
    pro: true,
    notes: [
      { string: 5, fret: 3,  noteName: 'C3',  root: true  },
      { string: 5, fret: 5,  noteName: 'D3',  root: false },
      { string: 4, fret: 2,  noteName: 'E3',  root: false },
      { string: 4, fret: 3,  noteName: 'F3',  root: false },
      { string: 4, fret: 5,  noteName: 'G3',  root: false },
      { string: 3, fret: 2,  noteName: 'A3',  root: false },
      { string: 3, fret: 4,  noteName: 'B3',  root: false },
      { string: 2, fret: 1,  noteName: 'C4',  root: true  },
    ],
  },
  // ── PRO — Minor ──────────────────────────────────────────────────────────
  {
    id: 'd-minor',
    name: 'D Minor',
    subtitle: 'Open Position',
    category: 'minor',
    difficulty: 'Intermediate',
    pro: true,
    notes: [
      { string: 5, fret: 5,  noteName: 'D3',  root: true  },
      { string: 4, fret: 2,  noteName: 'E3',  root: false },
      { string: 4, fret: 3,  noteName: 'F3',  root: false },
      { string: 4, fret: 5,  noteName: 'G3',  root: false },
      { string: 3, fret: 2,  noteName: 'A3',  root: false },
      { string: 3, fret: 3,  noteName: 'Bb3', root: false },
      { string: 2, fret: 1,  noteName: 'C4',  root: false },
      { string: 2, fret: 3,  noteName: 'D4',  root: true  },
    ],
  },
  {
    id: 'e-minor',
    name: 'E Minor',
    subtitle: 'Open Position',
    category: 'minor',
    difficulty: 'Beginner',
    pro: true,
    notes: [
      { string: 6, fret: 0,  noteName: 'E2',  root: true  },
      { string: 6, fret: 2,  noteName: 'F#2', root: false },
      { string: 5, fret: 0,  noteName: 'A2',  root: false },
      { string: 5, fret: 2,  noteName: 'B2',  root: false },
      { string: 5, fret: 3,  noteName: 'C3',  root: false },
      { string: 4, fret: 0,  noteName: 'D3',  root: false },
      { string: 4, fret: 2,  noteName: 'E3',  root: true  },
      { string: 3, fret: 0,  noteName: 'G3',  root: false },
    ],
  },
  {
    id: 'b-minor',
    name: 'B Minor',
    subtitle: 'Open Position',
    category: 'minor',
    difficulty: 'Intermediate',
    pro: true,
    notes: [
      { string: 5, fret: 2,  noteName: 'B2',  root: true  },
      { string: 5, fret: 4,  noteName: 'C#3', root: false },
      { string: 4, fret: 1,  noteName: 'D3',  root: false },
      { string: 4, fret: 2,  noteName: 'E3',  root: false },
      { string: 4, fret: 4,  noteName: 'F#3', root: false },
      { string: 3, fret: 1,  noteName: 'G3',  root: false },
      { string: 3, fret: 2,  noteName: 'A3',  root: false },
      { string: 2, fret: 0,  noteName: 'B3',  root: true  },
    ],
  },
  // ── PRO — Pentatonic ──────────────────────────────────────────────────────
  {
    id: 'a-minor-pent',
    name: 'A Minor Pentatonic',
    subtitle: 'Pattern 1',
    category: 'pentatonic',
    difficulty: 'Intermediate',
    pro: true,
    notes: [
      { string: 6, fret: 5,  noteName: 'A2',  root: true  },
      { string: 6, fret: 8,  noteName: 'C3',  root: false },
      { string: 5, fret: 5,  noteName: 'D3',  root: false },
      { string: 5, fret: 7,  noteName: 'E3',  root: false },
      { string: 4, fret: 5,  noteName: 'G3',  root: false },
      { string: 4, fret: 7,  noteName: 'A3',  root: true  },
    ],
  },
  {
    id: 'd-minor-pent',
    name: 'D Minor Pentatonic',
    subtitle: 'Pattern 1',
    category: 'pentatonic',
    difficulty: 'Intermediate',
    pro: true,
    notes: [
      { string: 6, fret: 10, noteName: 'D3',  root: true  },
      { string: 6, fret: 13, noteName: 'F3',  root: false },
      { string: 5, fret: 10, noteName: 'G3',  root: false },
      { string: 5, fret: 12, noteName: 'A3',  root: false },
      { string: 4, fret: 10, noteName: 'C4',  root: false },
      { string: 4, fret: 12, noteName: 'D4',  root: true  },
    ],
  },
  {
    id: 'e-minor-pent',
    name: 'E Minor Pentatonic',
    subtitle: 'Pattern 1',
    category: 'pentatonic',
    difficulty: 'Intermediate',
    pro: true,
    notes: [
      { string: 6, fret: 0,  noteName: 'E2',  root: true  },
      { string: 6, fret: 3,  noteName: 'G2',  root: false },
      { string: 5, fret: 0,  noteName: 'A2',  root: false },
      { string: 5, fret: 2,  noteName: 'B2',  root: false },
      { string: 4, fret: 0,  noteName: 'D3',  root: false },
      { string: 4, fret: 2,  noteName: 'E3',  root: true  },
    ],
  },
  {
    id: 'b-minor-pent',
    name: 'B Minor Pentatonic',
    subtitle: 'Pattern 1',
    category: 'pentatonic',
    difficulty: 'Advanced',
    pro: true,
    notes: [
      { string: 5, fret: 2,  noteName: 'B2',  root: true  },
      { string: 5, fret: 5,  noteName: 'D3',  root: false },
      { string: 4, fret: 2,  noteName: 'E3',  root: false },
      { string: 4, fret: 4,  noteName: 'F#3', root: false },
      { string: 3, fret: 2,  noteName: 'A3',  root: false },
      { string: 3, fret: 4,  noteName: 'B3',  root: true  },
    ],
  },
  {
    id: 'c-minor-pent',
    name: 'C Minor Pentatonic',
    subtitle: 'Pattern 1',
    category: 'pentatonic',
    difficulty: 'Advanced',
    pro: true,
    notes: [
      { string: 5, fret: 3,  noteName: 'C3',  root: true  },
      { string: 5, fret: 6,  noteName: 'Eb3', root: false },
      { string: 4, fret: 3,  noteName: 'F3',  root: false },
      { string: 4, fret: 5,  noteName: 'G3',  root: false },
      { string: 3, fret: 3,  noteName: 'Bb3', root: false },
      { string: 3, fret: 5,  noteName: 'C4',  root: true  },
    ],
  },
];

const CATEGORIES = ['major', 'minor', 'pentatonic'];
const CATEGORY_LABELS = { major: 'Major', minor: 'Minor', pentatonic: 'Pentatonic' };
const DIFFICULTY_COLOR = {
  Beginner:     { bg: 'rgba(123,158,107,0.15)', border: 'rgba(123,158,107,0.45)', color: '#7B9E6B' },
  Intermediate: { bg: 'rgba(232,131,58,0.15)',  border: 'rgba(232,131,58,0.45)',  color: '#E8833A' },
  Advanced:     { bg: 'rgba(196,60,40,0.18)',   border: 'rgba(196,60,40,0.5)',    color: '#E06040' },
};

// ─── Fretboard pattern SVG ────────────────────────────────────────────────────
// Shows strings 1-6 (top = string 1 = high e), frets 0–maxFret
// Dots: amber for root, cream for other notes
function FretboardDiagram({ notes }) {
  const allFrets  = notes.map(n => n.fret);
  const minFret   = Math.min(...allFrets.filter(f => f > 0), 1);
  const maxFret   = Math.max(...allFrets, 5);
  const startFret = allFrets.some(f => f === 0) ? 0 : Math.max(0, minFret - 1);
  const endFret   = maxFret + 1;
  const numFrets  = endFret - startFret;

  const W = 320, H = 130;
  const padL = 28, padR = 16, padT = 14, padB = 14;
  const gridW = W - padL - padR;
  const gridH = H - padT - padB;
  const strGap  = gridH / 5;        // 6 strings → 5 gaps
  const fretGap = gridW / numFrets;  // numFrets columns

  function strY(s) { return padT + (s - 1) * strGap; } // string 1 at top
  function fretX(f) { return padL + (f - startFret) * fretGap; }
  function midX(f)  { return fretX(f) - fretGap / 2; } // center between fret f-1 and f

  const dotR = 9;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: 320 }}>
      {/* Nut / start indicator */}
      {startFret === 0 && (
        <rect x={padL} y={padT - 2} width={3} height={gridH + 4}
          fill={M.hi} rx={1} />
      )}
      {startFret > 0 && (
        <text x={padL - 6} y={padT + gridH / 2 + 4}
          fill={M.muted} fontSize={9} textAnchor="middle"
          fontFamily="Georgia, serif">{startFret}fr</text>
      )}

      {/* String lines */}
      {[1,2,3,4,5,6].map(s => (
        <line key={s}
          x1={padL} y1={strY(s)} x2={padL + gridW} y2={strY(s)}
          stroke="rgba(196,100,40,0.35)" strokeWidth={s === 6 ? 1.8 : 1} />
      ))}

      {/* Fret lines */}
      {Array.from({ length: numFrets + 1 }, (_, i) => startFret + i).map(f => (
        <line key={f}
          x1={fretX(f)} y1={padT} x2={fretX(f)} y2={padT + gridH}
          stroke="rgba(196,100,40,0.22)" strokeWidth={1} />
      ))}

      {/* String labels (left side) */}
      {[1,2,3,4,5,6].map(s => (
        <text key={s} x={padL - 10} y={strY(s) + 4}
          fill={M.muted} fontSize={8} textAnchor="middle"
          fontFamily="Georgia, serif">{STRING_LABELS[s]}</text>
      ))}

      {/* Scale note dots */}
      {notes.map((n, i) => {
        const cx = n.fret === 0 ? padL - 12 : midX(n.fret);
        const cy = strY(n.string);
        const fill = n.root ? M.accent : M.text;
        const textFill = n.root ? '#120A04' : '#2A1208';
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={dotR}
              fill={fill} stroke={n.root ? M.hi : 'rgba(245,232,216,0.3)'}
              strokeWidth={1} />
            <text x={cx} y={cy + 3.5} textAnchor="middle"
              fill={textFill} fontSize={7} fontWeight="700"
              fontFamily="Georgia, serif">
              {n.noteName.replace('#', '♯').replace('b', '♭')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Single note position card (drill mode) ──────────────────────────────────
function NotePositionCard({ note, active }) {
  const strLabel = STRING_LABELS[note.string];
  const strFull  = ['high e','B','G','D','A','low E'][note.string - 1];
  return (
    <div style={{
      background: M.surface, borderRadius: 16,
      border: `1px solid ${active ? M.borderHi : M.border}`,
      padding: '28px 20px', textAlign: 'center',
      boxShadow: active ? '0 0 20px rgba(232,131,58,0.18)' : 'none',
      transition: 'all 0.2s',
    }}>
      {/* Note name */}
      <div style={{
        fontSize: 48, fontWeight: 900, lineHeight: 1,
        background: `linear-gradient(135deg, ${M.accent}, ${M.hi})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 10,
      }}>
        {note.noteName.replace('#','♯').replace('b','♭')}
      </div>

      {/* Fret + String — large */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: M.text }}>{note.fret}</div>
          <div style={{ fontSize: 10, color: M.muted, textTransform: 'uppercase',
            letterSpacing: '0.1em' }}>Fret</div>
        </div>
        <div style={{ width: 1, background: M.border }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: M.text }}>{strLabel}</div>
          <div style={{ fontSize: 10, color: M.muted, textTransform: 'uppercase',
            letterSpacing: '0.1em' }}>String</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: M.muted }}>{strFull} string · fret {note.fret}</div>

      {note.root && (
        <div style={{
          display: 'inline-block', marginTop: 12,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
          background: 'rgba(232,131,58,0.18)', border: `1px solid ${M.borderHi}`,
          color: M.accent,
        }}>Root Note</div>
      )}
    </div>
  );
}

// ─── Button style ─────────────────────────────────────────────────────────────
function btnStyle(active = false, disabled = false) {
  return {
    padding: '10px 18px', borderRadius: 12,
    border: `1px solid ${active ? M.borderHi : M.border}`,
    background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.1)',
    color: disabled ? M.muted : (active ? M.hi : M.text),
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s', userSelect: 'none',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScalePlay() {
  const [category,  setCategory]  = useState('major');
  const [scaleId,   setScaleId]   = useState('g-major');
  const [mode,      setMode]      = useState('landing'); // 'landing' | 'drill'
  const [noteIdx,   setNoteIdx]   = useState(0);
  const [bpm,       setBpm]       = useState(80);
  const [loop,      setLoop]      = useState(false);
  const [loopTick,  setLoopTick]  = useState(0);
  const [activeNote,setActiveNote]= useState(null); // index during drill

  const noteTimersRef = useRef([]);
  const loopTimerRef  = useRef(null);

  const scale        = SCALES.find(s => s.id === scaleId) ?? SCALES[0];
  const catScales    = SCALES.filter(s => s.category === category);
  const notes        = scale.notes;
  const total        = notes.length;
  const currentNote  = notes[noteIdx] ?? notes[0];

  // ── Audio helpers ───────────────────────────────────────────────────────
  function clearNoteTimers() {
    noteTimersRef.current.forEach(t => clearTimeout(t));
    noteTimersRef.current = [];
    setActiveNote(null);
  }

  function playNote(note, onDone) {
    guitarSampler.resume();
    guitarSampler.playNote(note.noteName);
    if (onDone) {
      const t = setTimeout(onDone, 60_000 / bpm);
      noteTimersRef.current.push(t);
    }
  }

  // Play the full scale once (landing page "Hear the Scale")
  function hearScale() {
    clearNoteTimers();
    guitarSampler.resume();
    const beatMs = 60_000 / bpm;
    notes.forEach((note, i) => {
      const t = setTimeout(() => guitarSampler.playNote(note.noteName), i * beatMs);
      noteTimersRef.current.push(t);
    });
  }

  // Drill: play single note immediately
  function playDrillNote(note) {
    clearNoteTimers();
    guitarSampler.resume();
    guitarSampler.playNote(note.noteName);
    setActiveNote(0); // only one note shown at a time in drill
    const t = setTimeout(() => setActiveNote(null), 60_000 / bpm);
    noteTimersRef.current.push(t);
  }

  // ── Loop effect (drill) ─────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'drill') return;
    if (!loop) {
      clearTimeout(loopTimerRef.current);
      return;
    }
    playDrillNote(currentNote);
    const dur = Math.round(60_000 / bpm) + 200;
    loopTimerRef.current = setTimeout(() => setLoopTick(t => t + 1), dur);
    return () => clearTimeout(loopTimerRef.current);
  }, [loop, noteIdx, bpm, loopTick, mode]); // eslint-disable-line

  // ── Navigate → play (drill) ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'drill' || loop) return;
    playDrillNote(currentNote);
    return () => clearNoteTimers();
  }, [noteIdx, mode]); // eslint-disable-line

  // ── Enter drill — play first note ───────────────────────────────────────
  useEffect(() => {
    if (mode === 'drill') {
      setNoteIdx(0);
      setLoop(false);
    }
  }, [mode]); // eslint-disable-line

  // ── Cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(loopTimerRef.current);
    clearNoteTimers();
  }, []);

  // ── Drill controls ──────────────────────────────────────────────────────
  function handlePrev() { setLoop(false); setNoteIdx(i => Math.max(i - 1, 0)); }
  function handleNext() { setLoop(false); setNoteIdx(i => Math.min(i + 1, total - 1)); }
  function handleRepeat() { setLoop(false); playDrillNote(currentNote); }

  // ── Scale selection ─────────────────────────────────────────────────────
  function selectScale(s) {
    if (s.pro) return; // locked — no-op (PRO gate)
    setScaleId(s.id);
    setNoteIdx(0);
    setLoop(false);
    setMode('landing');
  }

  // ── Render: Landing ─────────────────────────────────────────────────────
  if (mode === 'landing') {
    const dc = DIFFICULTY_COLOR[scale.difficulty] ?? DIFFICULTY_COLOR.Beginner;
    return (
      <div style={{
        minHeight: '100vh', background: M.bg, color: M.text,
        fontFamily: "Georgia, 'Times New Roman', serif", padding: '24px 16px',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 6,
              filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
            <h1 style={{
              fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Scale Play</h1>
            <p style={{ fontSize: 13, color: M.muted, maxWidth: 280, margin: '0 auto' }}>
              Learn scales step by step. The app plays each note — follow along on your guitar.
            </p>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: '7px 16px', borderRadius: 20,
                border: `1px solid ${category === cat ? M.borderHi : M.border}`,
                background: category === cat ? 'rgba(232,131,58,0.2)' : 'rgba(196,100,40,0.07)',
                color: category === cat ? M.hi : M.muted,
                fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              }}>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Scale pills */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
            marginBottom: 20, scrollbarWidth: 'none',
          }}>
            {catScales.map(s => {
              const isSelected = s.id === scaleId;
              return (
                <button key={s.id} onClick={() => selectScale(s)} style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                  border: `1px solid ${isSelected ? M.borderHi : s.pro ? 'rgba(160,120,90,0.3)' : M.border}`,
                  background: isSelected
                    ? 'rgba(232,131,58,0.2)'
                    : s.pro ? 'rgba(160,120,90,0.06)' : 'rgba(196,100,40,0.08)',
                  color: isSelected ? M.hi : s.pro ? 'rgba(160,120,90,0.6)' : M.text,
                  fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 12,
                  cursor: s.pro ? 'default' : 'pointer',
                  transition: 'all 0.15s', userSelect: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {s.pro && <span style={{ fontSize: 10 }}>🔒</span>}
                  {s.name}
                  {!s.pro && (
                    <span style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: '0.08em',
                      textTransform: 'uppercase', padding: '1px 5px', borderRadius: 10,
                      background: 'rgba(123,158,107,0.15)', border: '1px solid rgba(123,158,107,0.4)',
                      color: M.green,
                    }}>FREE</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected scale card */}
          <div style={{
            background: M.surface, borderRadius: 16,
            border: `1px solid ${M.border}`, padding: '18px 16px', marginBottom: 16,
          }}>
            {/* Scale name + difficulty */}
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: M.text,
                  marginBottom: 2 }}>{scale.name}</div>
                <div style={{ fontSize: 12, color: M.muted }}>{scale.subtitle}</div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
                background: dc.bg, border: `1px solid ${dc.border}`, color: dc.color,
                marginTop: 2, flexShrink: 0,
              }}>{scale.difficulty}</span>
            </div>

            <div style={{ fontSize: 11, color: M.muted, marginBottom: 14 }}>
              {notes.length} notes · strings {Math.max(...notes.map(n=>n.string))}–{Math.min(...notes.map(n=>n.string))}
            </div>

            {/* Fretboard diagram */}
            <div style={{ marginBottom: 16, overflowX: 'auto' }}>
              <FretboardDiagram notes={notes} />
            </div>

            {/* Hear the Scale */}
            <button onClick={hearScale} style={{
              width: '100%', padding: '12px', borderRadius: 12,
              border: `1px solid ${M.border}`,
              background: 'rgba(196,100,40,0.1)',
              color: M.text, fontFamily: "Georgia, serif",
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              ♪ Hear the Scale
            </button>
          </div>

          {/* BPM for Hear the Scale */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            padding: '12px 20px', background: M.panel,
            border: `1px solid ${M.border}`, borderRadius: 14, marginBottom: 20,
          }}>
            <button onClick={() => setBpm(b => Math.max(40, b - 10))} disabled={bpm <= 40}
              style={{ ...btnStyle(false, bpm <= 40), padding: '6px 14px', fontSize: 18, lineHeight: 1 }}>−</button>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: M.accent, lineHeight: 1 }}>{bpm}</div>
              <div style={{ fontSize: 9, color: M.muted, textTransform: 'uppercase',
                letterSpacing: '0.12em', marginTop: 2 }}>BPM</div>
            </div>
            <button onClick={() => setBpm(b => Math.min(200, b + 10))} disabled={bpm >= 200}
              style={{ ...btnStyle(false, bpm >= 200), padding: '6px 14px', fontSize: 18, lineHeight: 1 }}>+</button>
          </div>

          {/* Start Drill */}
          <button onClick={() => setMode('drill')} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: `1px solid ${M.borderHi}`,
            background: 'rgba(232,131,58,0.18)',
            color: M.hi, fontFamily: "Georgia, serif",
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            marginBottom: 28, transition: 'all 0.15s',
          }}>
            Start Drill →
          </button>

          {/* Back */}
          <div style={{ textAlign: 'center', paddingBottom: 40 }}>
            <a href="#" style={{ color: M.muted, fontSize: 13, textDecoration: 'none' }}>
              ← Back to home
            </a>
          </div>

        </div>
      </div>
    );
  }

  // ── Render: Drill ────────────────────────────────────────────────────────
  const atStart = noteIdx === 0;
  const atEnd   = noteIdx >= total - 1;
  const pct     = total > 1 ? (noteIdx / (total - 1)) * 100 : 100;

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif", padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 36, marginBottom: 6,
            filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
          <h1 style={{
            fontSize: 18, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{scale.name}</h1>
          <p style={{ fontSize: 13, color: M.muted, marginBottom: 10 }}>
            Note <strong style={{ color: M.hi }}>{noteIdx + 1}</strong> of {total}
          </p>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {notes.map((n, i) => (
              <button key={i} onClick={() => { setLoop(false); setNoteIdx(i); }}
                title={n.noteName}
                style={{
                  width: i === noteIdx ? 22 : 10, height: 10, borderRadius: 5,
                  border: 'none', padding: 0, cursor: 'pointer',
                  background: i === noteIdx ? (n.root ? M.accent : M.hi)
                    : i < noteIdx ? M.primary : M.surface,
                  transition: 'all 0.2s ease',
                }} />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 5, background: M.surface, borderRadius: 3,
          marginBottom: 20, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${M.primary}, ${M.accent})`,
            width: `${pct}%`, transition: 'width 0.35s ease',
          }} />
        </div>

        {/* Note position card */}
        <div style={{ marginBottom: 20 }}>
          <NotePositionCard note={currentNote} active={activeNote !== null} />
        </div>

        {/* Prev / Repeat / Next */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
          <button onClick={handlePrev} disabled={atStart} style={btnStyle(false, atStart)}>← Prev</button>
          <button onClick={handleRepeat} style={btnStyle(false, false)}>↺ Repeat</button>
          <button onClick={handleNext} disabled={atEnd} style={btnStyle(false, atEnd)}>Next →</button>
        </div>

        {/* Loop */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
          <button onClick={() => setLoop(l => !l)} style={btnStyle(loop, false)}>
            🔁 {loop ? 'Loop On' : 'Loop Off'}
          </button>
        </div>

        {/* BPM */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: '14px 20px', background: M.panel,
          border: `1px solid ${M.border}`, borderRadius: 14, marginBottom: 28,
        }}>
          <button onClick={() => setBpm(b => Math.max(40, b - 10))} disabled={bpm <= 40}
            style={{ ...btnStyle(false, bpm <= 40), padding: '7px 16px', fontSize: 18, lineHeight: 1 }}>−</button>
          <div style={{ textAlign: 'center', minWidth: 72 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: M.accent, lineHeight: 1 }}>{bpm}</div>
            <div style={{ fontSize: 10, color: M.muted, textTransform: 'uppercase',
              letterSpacing: '0.12em', marginTop: 2 }}>BPM</div>
          </div>
          <button onClick={() => setBpm(b => Math.min(200, b + 10))} disabled={bpm >= 200}
            style={{ ...btnStyle(false, bpm >= 200), padding: '7px 16px', fontSize: 18, lineHeight: 1 }}>+</button>
        </div>

        {/* Back to landing */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <button onClick={() => { setLoop(false); setMode('landing'); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: M.muted, fontSize: 13, fontFamily: "Georgia, serif",
            }}>
            ← Back to Scale Select
          </button>
        </div>

      </div>
    </div>
  );
}
