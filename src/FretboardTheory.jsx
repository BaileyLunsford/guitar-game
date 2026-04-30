/**
 * FretboardTheory.jsx — Interactive fretboard theory lessons
 * PRO feature.
 *
 * Lessons:
 *   1. Half steps & whole steps
 *   2. Major scale construction (W-W-H-W-W-W-H)
 *   3. Key signatures and their notes
 *   4. How chords are built from scales
 *
 * Props:
 *   isPro      boolean
 *   onUpgrade  () => void
 */

import React, { useState } from 'react';
import LandingPage from './LandingPage';
import { guitarSampler } from './guitarSampler';

const M = {
  bg:      '#120A04',
  surface: '#2A1208',
  panel:   '#1A0C05',
  accent:  '#E8833A',
  hi:      '#F5A65B',
  gold:    '#F5C842',
  muted:   '#A0785A',
  text:    '#F5E8D8',
  green:   '#7B9E6B',
  border:  'rgba(196,100,40,0.25)',
  borderHi:'rgba(232,131,58,0.55)',
};

const NOTE_NAMES_C = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// Open string semitones from C0: E2 A2 D3 G3 B3 E4
const OPEN = [28,33,38,43,47,52];
const STR_LABELS = ['E','A','D','G','B','e'];

function semToName(semi) {
  return NOTE_NAMES_C[semi % 12] + Math.floor(semi / 12);
}

function isNatural(note) {
  return !note.includes('#');
}

// ── Lesson data ───────────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: 'halfwhole',
    title: '1. Half & Whole Steps',
    subtitle: 'The building blocks of music',
    body: `Every note on the guitar neck is one fret apart — that's a **half step** (semitone). Two frets is a **whole step** (whole tone).\n\nOn any string: moving up one fret = +1 half step. Moving up two frets = +1 whole step.\n\nThe musical alphabet has 12 notes before repeating: C · C# · D · D# · E · F · F# · G · G# · A · A# · B`,
    stringIdx: 1, // A string (string 5 → index 1 in OPEN array)
    fretRange: [0, 12],
    highlightFrets: null,
  },
  {
    id: 'majorscale',
    title: '2. Major Scale',
    subtitle: 'W-W-H-W-W-W-H',
    body: `The major scale follows a specific pattern of whole (W) and half (H) steps:\n\n**W – W – H – W – W – W – H**\n\nStarting from any note and following this pattern gives you the major scale for that key. The G major scale on the high e string starts at fret 3 (G).`,
    stringIdx: 5, // high e
    fretRange: [3, 15],
    // W=2 H=1 from G: G(3) A(5) B(7) C(8) D(10) E(12) F#(14) G(15)
    highlightFrets: [3,5,7,8,10,12,14,15],
    highlightNotes:  ['G','A','B','C','D','E','F#','G'],
  },
  {
    id: 'keysigs',
    title: '3. Key Signatures',
    subtitle: 'Which notes belong to which key',
    body: `A key signature tells you which notes are sharp or flat throughout a piece. Each major key has a unique set of notes derived from the W-W-H-W-W-W-H formula.\n\n**G major** adds one sharp: F#\n**D major** adds two: F# and C#\n**C major** has no sharps or flats\n\nThe fretboard below shows C major — only white-key notes (no sharps).`,
    stringIdx: 4, // B string
    fretRange: [0, 12],
    // C major on B string: B(0) C(1) D(3) E(5) F(6) G(8) A(10) B(12)
    highlightFrets: [0,1,3,5,6,8,10,12],
    highlightNotes:  ['B','C','D','E','F','G','A','B'],
  },
  {
    id: 'chords',
    title: '4. Building Chords',
    subtitle: 'Triads from the major scale',
    body: `Chords are built by stacking every other note of the scale — called **thirds**.\n\nFrom C major: C-E-G = **C major chord** (1st, 3rd, 5th scale degrees)\n\nThe quality (major/minor) depends on the intervals:\n• Major: Root + 4 half steps + 3 half steps\n• Minor: Root + 3 half steps + 4 half steps\n\nThe I, IV, and V chords in any key are always major — that's why they're the power chords.`,
    stringIdx: 4, // B string showing C major triad notes
    fretRange: [0, 12],
    highlightFrets: [1,5,10], // C E A on B string (approx triad illustration)
    highlightNotes:  ['C','E','A'],
  },
];

// ── Piano keyboard illustration: half vs whole steps ────────────────────────
// One-octave keyboard (C → C) with three step markers above the keys:
//   C → D  Whole step (skips C#)
//   E → F  Half step  (no black key between — the "aha" for beginners)
//   F → G  Whole step (skips F#)
// Used in Lesson 1 to make the abstract "half/whole step" concept concrete
// before showing it on the guitar fretboard below.
function PianoStepsDiagram() {
  const W = 290, H = 132;
  const padTop = 30;          // room for labels above keys
  const whiteW = 36, whiteH = 96;
  const blackW = 24, blackH = 60;
  const whites = [
    { x: 0,   label: 'C' }, { x: 36,  label: 'D' }, { x: 72,  label: 'E' },
    { x: 108, label: 'F' }, { x: 144, label: 'G' }, { x: 180, label: 'A' },
    { x: 216, label: 'B' }, { x: 252, label: 'C' },
  ];
  const blacks = [
    { x: 25 }, { x: 61 }, { x: 133 }, { x: 169 }, { x: 205 },
  ];

  // Step bracket: small staple-shape with letter centered above
  const StepLabel = ({ x1, x2, label, color }) => (
    <g>
      <line x1={x1} y1={20} x2={x2} y2={20} stroke={color} strokeWidth={1.4} />
      <line x1={x1} y1={20} x2={x1} y2={padTop - 3} stroke={color} strokeWidth={1.4} />
      <line x1={x2} y1={20} x2={x2} y2={padTop - 3} stroke={color} strokeWidth={1.4} />
      <text x={(x1 + x2) / 2} y={14} textAnchor="middle"
        fontSize="11" fontWeight="800" fill={color}
        fontFamily="Georgia, serif">{label}</text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%"
      style={{ display: 'block', maxWidth: 320, margin: '0 auto' }}>
      {/* Step brackets above */}
      <StepLabel x1={18}  x2={54}  label="W" color={M.accent} />
      <StepLabel x1={90}  x2={126} label="H" color={M.gold} />
      <StepLabel x1={126} x2={162} label="W" color={M.accent} />

      {/* White keys */}
      {whites.map((w, i) => (
        <g key={'w' + i}>
          <rect x={w.x} y={padTop} width={whiteW} height={whiteH}
            fill="#F5E8D8" stroke={M.muted} strokeWidth={0.8} rx={1.5} />
          <text x={w.x + whiteW / 2} y={padTop + whiteH - 6}
            textAnchor="middle" fontSize="10" fontFamily="Georgia, serif"
            fill="#5C4738" fontWeight={600}>{w.label}</text>
        </g>
      ))}

      {/* Black keys (drawn after whites so they sit on top of white edges) */}
      {blacks.map((b, i) => (
        <rect key={'b' + i} x={b.x} y={padTop} width={blackW} height={blackH}
          fill="#1A0C05" stroke="#1A0C05" strokeWidth={0.5} rx={1.5} />
      ))}
    </svg>
  );
}

// ── Fretboard diagram for a single string ─────────────────────────────────────
function StringDiagram({ stringIdx, fretRange, highlightFrets, onFretTap }) {
  const [startFret, endFret] = fretRange;
  const numFrets = endFret - startFret;
  const W = 300, H = 60;
  const padL = 28, padR = 10, padT = 10, padB = 24;
  const gridW = W - padL - padR;
  const fretGap = gridW / numFrets;
  const stringY = padT + (H - padT - padB) / 2;
  const dotY = padT + (H - padT - padB) + 10;
  const DOTS_AT = new Set([3,5,7,9,12]);

  function fretX(f) { return padL + (f - startFret) * fretGap; }
  function midX(f)  { return fretX(f) - fretGap / 2; }

  const open = OPEN[stringIdx];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: W }}>
      {/* Nut */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke={M.text} strokeWidth={3} />
      {/* String */}
      <line x1={padL} y1={stringY} x2={W - padR} y2={stringY} stroke="rgba(245,232,216,0.6)" strokeWidth={1.5} />
      {/* Fret lines */}
      {Array.from({ length: numFrets }, (_, i) => startFret + 1 + i).map(f => (
        <line key={f}
          x1={fretX(f)} y1={padT} x2={fretX(f)} y2={H - padB}
          stroke="rgba(196,100,40,0.2)" strokeWidth={1} />
      ))}
      {/* Position dots */}
      {Array.from({ length: numFrets }, (_, i) => startFret + 1 + i).map(f => {
        if (!DOTS_AT.has(f)) return null;
        return <circle key={f} cx={midX(f)} cy={dotY} r={2.5} fill="rgba(232,131,58,0.5)" />;
      })}
      {/* String label */}
      <text x={padL - 8} y={stringY + 4} fill={M.muted} fontSize={10} textAnchor="middle"
        fontFamily="Georgia,serif">{STR_LABELS[stringIdx]}</text>
      {/* Highlighted frets */}
      {(highlightFrets || []).map((f, i) => {
        const cx = f === 0 ? padL + 10 : midX(f);
        return (
          <g key={i} onClick={() => onFretTap && onFretTap(semToName(open + f))}
            style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={stringY} r={10}
              fill={M.accent} stroke="rgba(232,131,58,0.4)" strokeWidth={2} />
          </g>
        );
      })}
      {/* Fret numbers */}
      {[0, 3, 5, 7, 9, 12].filter(f => f >= startFret && f <= endFret).map(f => (
        <text key={f}
          x={f === 0 ? padL : midX(f + 0.5)}
          y={H - 2}
          fill={M.muted} fontSize={8} textAnchor="middle" fontFamily="Georgia,serif">{f}</text>
      ))}
    </svg>
  );
}

export default function FretboardTheory({ isPro, onUpgrade }) {
  const [started,    setStarted]    = useState(false);
  const [lessonIdx,  setLessonIdx]  = useState(0);

  if (!started) return (
    <LandingPage
      emoji="📐"
      title="Fretboard Theory"
      description="Understand why the guitar works the way it does — half steps, scales, keys, and chords from first principles."
      difficulty="Advanced"
      features={[
        'Half steps and whole steps on the neck',
        'Major scale formula W-W-H-W-W-W-H',
        'Key signatures and their notes',
        'How triads are built from scales',
      ]}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  const lesson = LESSONS[lessonIdx];

  function handleFretTap(noteName) {
    guitarSampler.resume?.();
    guitarSampler.playNote(noteName);
  }

  // Parse **bold** markdown-lite
  function renderBody(text) {
    return text.split('\n').map((line, li) => {
      if (!line.trim()) return <br key={li} />;
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={li} style={{ margin: '0 0 6px', lineHeight: 1.7 }}>
          {parts.map((p, pi) =>
            pi % 2 === 1
              ? <strong key={pi} style={{ color: M.hi }}>{p}</strong>
              : p
          )}
        </p>
      );
    });
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 60px',
      position: 'relative',
    }}>
      {/* PRO gate */}
      {!isPro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(18,10,4,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, marginBottom: 10,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>PRO Feature</h2>
          <p style={{ fontSize: 14, color: M.muted, textAlign: 'center',
            maxWidth: 260, lineHeight: 1.6, marginBottom: 28 }}>
            Fretboard Theory is part of the PRO subscription.
          </p>
          <button onClick={onUpgrade} style={{
            padding: '14px 36px', borderRadius: 14,
            border: `1px solid ${M.borderHi}`,
            background: `linear-gradient(135deg,#C46428,${M.accent})`,
            color: '#fff', fontFamily: "Georgia, serif",
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(232,131,58,0.3)', marginBottom: 16,
          }}>Unlock PRO →</button>
          <a href="#" style={{ fontSize: 13, color: M.muted, textDecoration: 'none' }}>← Back</a>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <div>
          <h1 style={{
            fontSize: 18, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Fretboard Theory</h1>
          <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            ADVANCED · PRO
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 20px' }}>

        {/* Lesson tabs */}
        <div style={{
          display: 'flex', gap: 4, background: M.surface,
          borderRadius: 12, padding: 4, marginBottom: 20,
          overflowX: 'auto',
        }}>
          {LESSONS.map((l, i) => (
            <button key={l.id} onClick={() => setLessonIdx(i)} style={{
              flex: 1, padding: '8px 6px', borderRadius: 9, border: 'none',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: "Georgia, serif", whiteSpace: 'nowrap',
              background: i === lessonIdx ? M.accent : 'transparent',
              color: i === lessonIdx ? '#fff' : M.muted,
              transition: 'background 0.15s, color 0.15s',
            }}>{i + 1}</button>
          ))}
        </div>

        {/* Lesson card */}
        <div style={{
          background: M.surface, borderRadius: 18, border: `1px solid ${M.border}`,
          padding: '20px 18px', marginBottom: 20,
        }}>
          <div style={{ marginBottom: 4 }}>
            <h2 style={{
              fontSize: 16, fontWeight: 900, margin: '0 0 4px',
              background: `linear-gradient(135deg,${M.accent},${M.hi})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{lesson.title}</h2>
            <div style={{ fontSize: 11, color: M.muted, marginBottom: 14 }}>{lesson.subtitle}</div>
          </div>
          <div style={{ fontSize: 12, color: M.muted, lineHeight: 1.7, marginBottom: 16 }}>
            {renderBody(lesson.body)}
          </div>

          {/* Lesson 1 only: piano keyboard illustration to ground the
              half/whole step concept before showing it on guitar */}
          {lesson.id === 'halfwhole' && (
            <div style={{
              background: M.panel, borderRadius: 12, border: `1px solid ${M.border}`,
              padding: '14px 12px 10px', marginBottom: 12,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: M.muted,
                marginBottom: 10, textAlign: 'center',
              }}>On a Piano Keyboard</div>
              <PianoStepsDiagram />
              <div style={{
                fontSize: 11, color: M.muted, fontStyle: 'italic',
                marginTop: 8, lineHeight: 1.5, textAlign: 'center',
              }}>
                <span style={{ color: M.gold, fontWeight: 700 }}>E → F</span> is a
                half step even with no black key between — same as on the guitar:
                one fret apart.
              </div>
            </div>
          )}

          {/* Fretboard diagram */}
          <div style={{
            background: M.panel, borderRadius: 12, border: `1px solid ${M.border}`,
            padding: '12px 8px', marginBottom: 8,
          }}>
            <StringDiagram
              stringIdx={lesson.stringIdx}
              fretRange={lesson.fretRange}
              highlightFrets={lesson.highlightFrets}
              onFretTap={handleFretTap}
            />
          </div>
          {lesson.highlightNotes && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {lesson.highlightNotes.map((n, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: 'rgba(232,131,58,0.14)', border: `1px solid ${M.border}`,
                  color: M.hi,
                }}>{n}</span>
              ))}
            </div>
          )}
          {lesson.highlightFrets && (
            <div style={{ fontSize: 10, color: M.muted, marginTop: 6 }}>
              Tap the orange dots to hear each note
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setLessonIdx(i => Math.max(0, i - 1))}
            disabled={lessonIdx === 0}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: `1px solid ${M.border}`,
              background: 'rgba(196,100,40,0.08)',
              color: lessonIdx === 0 ? M.muted : M.text,
              fontFamily: "Georgia, serif", fontSize: 13, cursor: lessonIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: lessonIdx === 0 ? 0.4 : 1,
            }}
          >‹ Prev</button>
          <span style={{ fontSize: 11, color: M.muted }}>
            {lessonIdx + 1} / {LESSONS.length}
          </span>
          <button
            onClick={() => setLessonIdx(i => Math.min(LESSONS.length - 1, i + 1))}
            disabled={lessonIdx === LESSONS.length - 1}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: `1px solid ${M.border}`,
              background: 'rgba(196,100,40,0.08)',
              color: lessonIdx === LESSONS.length - 1 ? M.muted : M.text,
              fontFamily: "Georgia, serif", fontSize: 13,
              cursor: lessonIdx === LESSONS.length - 1 ? 'not-allowed' : 'pointer',
              opacity: lessonIdx === LESSONS.length - 1 ? 0.4 : 1,
            }}
          >Next ›</button>
        </div>

      </div>
    </div>
  );
}
