/**
 * CAGEDSystem.jsx — Five CAGED shapes for every root note
 *
 * Phase flow: landing → root selector → 5 shape cards
 * PRO gate: lock overlay on entire chord flow if !isPro
 *
 * Shape order: C → A → G → E → D (ascending neck position)
 * Root notes:  C, A, G, E, D
 *
 * Voicing notation:
 *   frets  — [str6…str1] relative to baseFret, -1=mute, 0=open
 *   baseFret — lowest fret of the window shown; 1 = open position
 *   barre  — { fret, from, to } string indices 0–5
 */

import React, { useState } from 'react';
import LandingPage  from './LandingPage';
import ChordDiagram from './ChordDiagram';
import UpgradeModal from './UpgradeModal';
import { guitarSampler } from './guitarSampler';

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

// ─── CAGED voicing data ────────────────────────────────────────────────────────
// Each root has 5 entries in CAGED order (C-shape, A-shape, G-shape, E-shape, D-shape).
// baseFret = lowest fret finger sits at (open strings = 1).
// position = human-readable neck position label.

const SHAPES = ['C-shape','A-shape','G-shape','E-shape','D-shape'];

const VOICINGS = {
  // ── Root: G ─────────────────────────────────────────────────────────────────
  G: [
    { // C-shape at 7fr  (barre across 5 strings, middle-finger cluster)
      shape: 'C-shape', position: '7th position', baseFret: 7,
      frets:  [-1,3,2,0,1,0],  // relative: x-A=3,D=2,G=0,B=1,e=0 → absolute 9,9,7,8,7
      // Actual: x,10,9,7,8,7 → baseFret=7 so frets relative: x,4,3,1,2,1
      frets:  [-1,4,3,1,2,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['G3','D4','G4','B4','D5'],
    },
    { // A-shape at 10fr
      shape: 'A-shape', position: '10th position', baseFret: 10,
      frets:  [-1,1,3,3,3,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['G3','D4','G4','B4','D5'],
    },
    { // G-shape open position
      shape: 'G-shape', position: 'Open position', baseFret: 1,
      frets:  [3,2,0,0,0,3],
      barre:  null,
      notes:  ['G2','B2','D3','G3','B3','G4'],
    },
    { // E-shape at 3fr
      shape: 'E-shape', position: '3rd position', baseFret: 3,
      frets:  [1,3,3,2,1,1],
      barre:  { fret:1, from:0, to:5 },
      notes:  ['G2','D3','G3','B3','D4','G4'],
    },
    { // D-shape at 5fr
      shape: 'D-shape', position: '5th position', baseFret: 5,
      frets:  [-1,-1,1,3,4,3],
      barre:  null,
      notes:  ['D4','G4','B4','G5'],
    },
  ],

  // ── Root: C ─────────────────────────────────────────────────────────────────
  C: [
    { // C-shape open position
      shape: 'C-shape', position: 'Open position', baseFret: 1,
      frets:  [-1,3,2,0,1,0],
      barre:  null,
      notes:  ['C3','E3','G3','C4','E4'],
    },
    { // A-shape at 3fr
      shape: 'A-shape', position: '3rd position', baseFret: 3,
      frets:  [-1,1,3,3,3,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['C3','G3','C4','E4','G4'],
    },
    { // G-shape at 5fr
      shape: 'G-shape', position: '5th position', baseFret: 5,
      frets:  [3,2,0,0,0,3],
      barre:  null,
      notes:  ['C3','E3','G3','C4','E4','C5'],
    },
    { // E-shape at 8fr
      shape: 'E-shape', position: '8th position', baseFret: 8,
      frets:  [1,3,3,2,1,1],
      barre:  { fret:1, from:0, to:5 },
      notes:  ['C3','G3','C4','E4','G4','C5'],
    },
    { // D-shape at 10fr
      shape: 'D-shape', position: '10th position', baseFret: 10,
      frets:  [-1,-1,1,3,4,3],
      barre:  null,
      notes:  ['G4','C5','E5','C6'],
    },
  ],

  // ── Root: A ─────────────────────────────────────────────────────────────────
  A: [
    { // C-shape at 9fr (barre)
      shape: 'C-shape', position: '9th position', baseFret: 9,
      frets:  [-1,4,3,1,2,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['A3','E4','A4','C#5','E5'],
    },
    { // A-shape open position
      shape: 'A-shape', position: 'Open position', baseFret: 1,
      frets:  [-1,0,2,2,2,0],
      barre:  null,
      notes:  ['A2','E3','A3','C#4','E4'],
    },
    { // G-shape at 2fr
      shape: 'G-shape', position: '2nd position', baseFret: 2,
      frets:  [3,2,0,0,0,3],
      barre:  null,
      notes:  ['A2','C#3','E3','A3','C#4','A4'],
    },
    { // E-shape at 5fr
      shape: 'E-shape', position: '5th position', baseFret: 5,
      frets:  [1,3,3,2,1,1],
      barre:  { fret:1, from:0, to:5 },
      notes:  ['A2','E3','A3','C#4','E4','A4'],
    },
    { // D-shape at 7fr
      shape: 'D-shape', position: '7th position', baseFret: 7,
      frets:  [-1,-1,1,3,4,3],
      barre:  null,
      notes:  ['E4','A4','C#5','A5'],
    },
  ],

  // ── Root: E ─────────────────────────────────────────────────────────────────
  E: [
    { // C-shape at 4fr (barre)
      shape: 'C-shape', position: '4th position', baseFret: 4,
      frets:  [-1,4,3,1,2,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['E3','B3','E4','G#4','B4'],
    },
    { // A-shape at 7fr
      shape: 'A-shape', position: '7th position', baseFret: 7,
      frets:  [-1,1,3,3,3,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['E3','B3','E4','G#4','B4'],
    },
    { // G-shape at 9fr
      shape: 'G-shape', position: '9th position', baseFret: 9,
      frets:  [3,2,0,0,0,3],
      barre:  null,
      notes:  ['E3','G#3','B3','E4','G#4','E5'],
    },
    { // E-shape open position
      shape: 'E-shape', position: 'Open position', baseFret: 1,
      frets:  [0,2,2,1,0,0],
      barre:  null,
      notes:  ['E2','B2','E3','G#3','B3','E4'],
    },
    { // D-shape at 2fr
      shape: 'D-shape', position: '2nd position', baseFret: 2,
      frets:  [-1,-1,1,3,4,3],
      barre:  null,
      notes:  ['B3','E4','G#4','E5'],
    },
  ],

  // ── Root: D ─────────────────────────────────────────────────────────────────
  D: [
    { // C-shape at 2fr (barre)
      shape: 'C-shape', position: '2nd position', baseFret: 2,
      frets:  [-1,4,3,1,2,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['D3','A3','D4','F#4','A4'],
    },
    { // A-shape at 5fr
      shape: 'A-shape', position: '5th position', baseFret: 5,
      frets:  [-1,1,3,3,3,1],
      barre:  { fret:1, from:1, to:5 },
      notes:  ['D3','A3','D4','F#4','A4'],
    },
    { // G-shape at 7fr
      shape: 'G-shape', position: '7th position', baseFret: 7,
      frets:  [3,2,0,0,0,3],
      barre:  null,
      notes:  ['D3','F#3','A3','D4','F#4','D5'],
    },
    { // E-shape at 10fr
      shape: 'E-shape', position: '10th position', baseFret: 10,
      frets:  [1,3,3,2,1,1],
      barre:  { fret:1, from:0, to:5 },
      notes:  ['D3','A3','D4','F#4','A4','D5'],
    },
    { // D-shape open position
      shape: 'D-shape', position: 'Open position', baseFret: 1,
      frets:  [-1,-1,0,2,3,2],
      barre:  null,
      notes:  ['D3','A3','D4','F#4'],
    },
  ],
};

const ROOTS = ['C','A','G','E','D'];

function btn(active = false, disabled = false) {
  return {
    padding: '10px 20px', borderRadius: 12,
    border: `1px solid ${active ? M.borderHi : M.border}`,
    background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.1)',
    color: disabled ? M.muted : (active ? M.hi : M.text),
    fontFamily: "Georgia,'Times New Roman',serif",
    fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s', userSelect: 'none',
  };
}

export default function CAGEDSystem({ isPro = false, onPurchase, onRestore }) {
  const [phase,      setPhase]      = useState('landing');
  const [rootIdx,    setRootIdx]    = useState(0);
  const [shapeIdx,   setShapeIdx]   = useState(0);
  const [playing,    setPlaying]    = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [modal,      setModal]      = useState(null);

  if (phase === 'landing') return (
    <LandingPage
      emoji="🎸"
      title="CAGED System"
      description="Every chord you know has 5 shapes on the neck. CAGED teaches you to see them all — and connect them."
      difficulty="Advanced"
      features={[
        '5 moveable shapes for every chord',
        'See the whole fretboard as one connected system',
        'Play the same chord 5 ways — pick the best one for any song',
      ]}
      onStart={() => setPhase('chords')}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  const root    = ROOTS[rootIdx];
  const voicing = VOICINGS[root][shapeIdx];
  const atStart = shapeIdx === 0;
  const atEnd   = shapeIdx >= 4;

  function handleHear() {
    if (playing || !isPro) return;
    setPlaying(true);
    guitarSampler.resume();
    voicing.notes.forEach((note, i) => {
      setTimeout(() => guitarSampler.playNote(note, { volume: 0.85 }), i * 40);
    });
    setTimeout(() => setPlaying(false), voicing.notes.length * 40 + 600);
  }

  function handleNotepill(note) {
    if (!isPro) return;
    guitarSampler.resume();
    guitarSampler.playNote(note, { volume: 0.9 });
    setActiveNote(note);
    setTimeout(() => setActiveNote(null), 600);
  }

  return (
    <div style={{ minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia,'Times New Roman',serif", padding: '24px 16px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 6,
            filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2,
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text' }}>CAGED System</h1>
          <p style={{ fontSize: 12, color: M.muted }}>5 shapes for every chord</p>
        </div>

        {/* Root selector */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center',
          marginBottom: 16, flexWrap: 'wrap' }}>
          {ROOTS.map((r, i) => (
            <button key={r} onClick={() => { setRootIdx(i); setShapeIdx(0); setPlaying(false); setActiveNote(null); }}
              style={{
                flexShrink: 0, padding: '7px 18px', borderRadius: 20,
                border: `1px solid ${i === rootIdx ? M.borderHi : M.border}`,
                background: i === rootIdx ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.08)',
                color: i === rootIdx ? M.hi : M.text,
                fontFamily: "Georgia,'Times New Roman',serif",
                fontWeight: 800, fontSize: 16,
                cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              }}>{r}</button>
          ))}
        </div>

        {/* Shape tabs */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center',
          marginBottom: 20, flexWrap: 'wrap' }}>
          {SHAPES.map((s, i) => (
            <button key={s} onClick={() => { setShapeIdx(i); setPlaying(false); setActiveNote(null); }}
              style={{
                padding: '5px 12px', borderRadius: 10,
                border: `1px solid ${i === shapeIdx ? M.borderHi : M.border}`,
                background: i === shapeIdx ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.06)',
                color: i === shapeIdx ? M.hi : M.muted,
                fontFamily: "Georgia,'Times New Roman',serif",
                fontWeight: 700, fontSize: 11,
                cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              }}>{s}</button>
          ))}
        </div>

        {/* PRO gate */}
        {!isPro ? (
          <div style={{ textAlign: 'center', padding: '52px 20px 48px',
            background: M.surface, borderRadius: 16,
            border: `1px solid ${M.border}`, marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: M.accent, marginBottom: 8 }}>
              CAGED System — PRO
            </div>
            <p style={{ fontSize: 13, color: M.muted, marginBottom: 16, lineHeight: 1.6 }}>
              Unlock all 5 shapes for every root note and hear each voicing.
            </p>
            <button onClick={() => setModal({ feature: 'CAGED System — PRO Feature' })}
              style={{ padding: '10px 24px', borderRadius: 12,
                border: `1px solid ${M.borderHi}`, background: 'rgba(232,131,58,0.18)',
                color: M.hi, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13,
                cursor: 'pointer' }}>
              Unlock PRO →
            </button>
          </div>
        ) : (
          <>
            {/* Shape name + position */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1,
                color: playing ? M.hi : M.accent,
                transition: 'color 0.15s' }}>{root}</div>
              <div style={{ fontSize: 14, color: M.text, marginTop: 5, fontWeight: 700 }}>
                {voicing.shape}
              </div>
              <div style={{ fontSize: 11, color: M.muted, marginTop: 3,
                letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {voicing.position}
              </div>
            </div>

            {/* Diagram */}
            <div style={{ background: M.surface, borderRadius: 16, padding: '20px 16px',
              border: `1px solid ${playing ? M.borderHi : M.border}`,
              marginBottom: 20, transition: 'border-color 0.15s' }}>
              <ChordDiagram
                frets={voicing.frets}
                baseFret={voicing.baseFret ?? 1}
                barre={voicing.barre}
                playing={playing}
              />
            </div>

            {/* Hear */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <button onClick={handleHear} disabled={playing} style={{
                ...btn(playing, playing),
                fontSize: 16, paddingLeft: 32, paddingRight: 32,
                paddingTop: 14, paddingBottom: 14,
                boxShadow: playing ? '0 0 20px rgba(232,131,58,0.25)' : 'none',
              }}>
                {playing ? '🎸 Playing…' : '🎸 Hear Shape'}
              </button>
            </div>

            {/* Notes */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: M.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 6 }}>Notes</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {voicing.notes.map((note, i) => {
                  const lit = activeNote === note;
                  return (
                    <button key={i} onClick={() => handleNotepill(note)} style={{
                      fontSize: 12, fontWeight: 700,
                      color:      lit ? '#4ade80' : M.hi,
                      background: lit ? 'rgba(74,222,128,0.15)' : 'rgba(196,100,40,0.12)',
                      border:     `1px solid ${lit ? '#4ade80' : M.border}`,
                      borderRadius: 8, padding: '3px 10px',
                      cursor: 'pointer', transition: 'all 0.1s',
                      fontFamily: "Georgia,'Times New Roman',serif",
                      userSelect: 'none',
                    }}>{note}</button>
                  );
                })}
              </div>
            </div>

            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
              <button onClick={() => { setPlaying(false); setActiveNote(null); setShapeIdx(i => Math.max(i - 1, 0)); }}
                disabled={atStart} style={btn(false, atStart)}>← Prev</button>
              <button onClick={() => { setPlaying(false); setActiveNote(null); setShapeIdx(i => Math.min(i + 1, 4)); }}
                disabled={atEnd} style={btn(false, atEnd)}>Next →</button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 12, color: M.muted, marginBottom: 32 }}>
              Shape <strong style={{ color: M.hi }}>{shapeIdx + 1}</strong> of 5
            </p>
          </>
        )}

        {/* Back */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <button onClick={() => setPhase('landing')}
            style={{ background: 'none', border: 'none', color: M.muted,
              fontFamily: "Georgia,'Times New Roman',serif", fontSize: 13, cursor: 'pointer' }}>
            ← Back
          </button>
        </div>

      </div>

      <UpgradeModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onPurchase={onPurchase}
        onRestore={onRestore}
        feature={modal?.feature}
      />
    </div>
  );
}
