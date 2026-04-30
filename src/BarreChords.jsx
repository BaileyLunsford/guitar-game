/**
 * BarreChords.jsx — Moveable barre chord shapes
 *
 * Phase flow: landing → chords
 * FREE: B major, F#m
 * PRO:  Bb major, Cm, Ab major, C#m
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

// ─── Chord data ───────────────────────────────────────────────────────────────
const CHORDS = [
  {
    name: 'B',   full: 'B Major',  shape: 'A-shape', position: '2nd position',
    frets: [-1,2,4,4,4,2], baseFret: 1,
    barre: { fret:2, from:1, to:5 },
    notes: ['B2','F#3','B3','D#4','F#4'],
    pro: false,
  },
  {
    name: 'F#m', full: 'F# Minor', shape: 'E-shape', position: '2nd position',
    frets: [2,4,4,3,2,2], baseFret: 1,
    barre: { fret:2, from:0, to:5 },
    notes: ['F#2','C#3','F#3','A3','C#4','F#4'],
    pro: false,
  },
  {
    name: 'Bb',  full: 'Bb Major', shape: 'A-shape', position: '1st position',
    frets: [-1,1,3,3,3,1], baseFret: 1,
    barre: { fret:1, from:1, to:5 },
    notes: ['Bb2','F3','Bb3','D4','F4'],
    pro: true,
  },
  {
    name: 'Cm',  full: 'C Minor',  shape: 'A-shape', position: '3rd position',
    frets: [-1,3,5,5,4,3], baseFret: 1,
    barre: { fret:3, from:1, to:5 },
    notes: ['C3','G3','C4','Eb4','G4'],
    pro: true,
  },
  {
    name: 'Ab',  full: 'Ab Major', shape: 'E-shape', position: '4th position',
    frets: [4,4,6,6,6,4], baseFret: 1,
    barre: { fret:4, from:0, to:5 },
    notes: ['Ab2','Eb3','Ab3','C4','Eb4','Ab4'],
    pro: true,
  },
  {
    name: 'C#m', full: 'C# Minor', shape: 'A-shape', position: '4th position',
    frets: [-1,4,6,6,5,4], baseFret: 1,
    barre: { fret:4, from:1, to:5 },
    notes: ['C#3','G#3','C#4','E4','G#4'],
    pro: true,
  },
];

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

export default function BarreChords({ isPro = false, onPurchase, onRestore, initialChord = null }) {
  // Deep-link target: jump to a specific chord by name (e.g. 'F', 'Bm')
  const initialIdx = React.useMemo(() => {
    if (!initialChord) return null;
    const i = CHORDS.findIndex(c => c.name === initialChord);
    return i >= 0 ? i : null;
  }, [initialChord]);

  const [phase,      setPhase]      = useState(initialIdx != null ? 'chords' : 'landing');
  const [chordIdx,   setChordIdx]   = useState(initialIdx ?? 0);
  const [playing,    setPlaying]    = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [modal,      setModal]      = useState(null);

  if (phase === 'landing') return (
    <LandingPage
      emoji="🤘"
      title="Barre Chords"
      description="One shape. Every key. Slide it up the neck and you're in a new key instantly."
      difficulty="Intermediate"
      features={[
        'E-shape and A-shape moveable forms',
        'Major and minor voicings',
        'FREE: B major, F#m — PRO unlocks all shapes',
      ]}
      onStart={() => setPhase('chords')}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  const chord  = CHORDS[chordIdx];
  const locked = chord.pro && !isPro;
  const atStart = chordIdx === 0;
  const atEnd   = chordIdx >= CHORDS.length - 1;

  function handleHear() {
    if (playing || locked) return;
    setPlaying(true);
    guitarSampler.resume();
    chord.notes.forEach((note, i) => {
      setTimeout(() => guitarSampler.playNote(note, { volume: 0.85 }), i * 40);
    });
    setTimeout(() => setPlaying(false), chord.notes.length * 40 + 600);
  }

  function handleNotepill(note) {
    if (locked) return;
    guitarSampler.resume();
    guitarSampler.playNote(note, { volume: 0.9 });
    setActiveNote(note);
    setTimeout(() => setActiveNote(null), 600);
  }

  return (
    <div style={{ minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia,'Times New Roman',serif", padding: '24px 16px' }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 6,
            filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🤘</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2,
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text' }}>Barre Chords</h1>
          <p style={{ fontSize: 12, color: M.muted }}>Moveable shapes up the neck</p>
        </div>

        {/* Chord dot nav */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {CHORDS.map((c, i) => (
            <button key={i}
              onClick={() => { setPlaying(false); setActiveNote(null); setChordIdx(i); }}
              title={c.name}
              style={{
                width: i === chordIdx ? 24 : 10, height: 10,
                borderRadius: 5, border: 'none', padding: 0,
                background: i === chordIdx ? M.accent : i < chordIdx ? M.primary : M.surface,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }} />
          ))}
        </div>

        {/* PRO lock overlay */}
        {locked ? (
          <div style={{ textAlign: 'center', padding: '52px 20px 48px',
            background: M.surface, borderRadius: 16,
            border: `1px solid ${M.border}`, marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: M.accent, marginBottom: 8 }}>
              {chord.full} — PRO
            </div>
            <button onClick={() => setModal({ feature: `${chord.full} — PRO Feature` })}
              style={{ marginTop: 12, padding: '10px 24px', borderRadius: 12,
                border: `1px solid ${M.borderHi}`, background: 'rgba(232,131,58,0.18)',
                color: M.hi, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13,
                cursor: 'pointer' }}>
              Unlock PRO →
            </button>
          </div>
        ) : (
          <>
            {/* Chord name + shape label */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1,
                color: playing ? M.hi : M.accent,
                transition: 'color 0.15s' }}>{chord.name}</div>
              <div style={{ fontSize: 13, color: M.muted, marginTop: 5 }}>
                {chord.full} —{' '}
                <span style={{ color: M.accent, fontWeight: 700 }}>{chord.shape}</span>
              </div>
              <div style={{ fontSize: 11, color: M.muted, marginTop: 3,
                letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {chord.position}
              </div>
            </div>

            {/* Diagram */}
            <div style={{ background: M.surface, borderRadius: 16, padding: '20px 16px',
              border: `1px solid ${playing ? M.borderHi : M.border}`,
              marginBottom: 20, transition: 'border-color 0.15s' }}>
              <ChordDiagram
                frets={chord.frets}
                baseFret={chord.baseFret ?? 1}
                barre={chord.barre}
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
                {playing ? '🎸 Playing…' : '🎸 Hear Chord'}
              </button>
            </div>

            {/* Notes */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: M.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 6 }}>Notes</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {chord.notes.map((note, i) => {
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
          </>
        )}

        {/* Prev / Next */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
          <button onClick={() => { setPlaying(false); setActiveNote(null); setChordIdx(i => Math.max(i - 1, 0)); }}
            disabled={atStart} style={btn(false, atStart)}>← Prev</button>
          <button onClick={() => { setPlaying(false); setActiveNote(null); setChordIdx(i => Math.min(i + 1, CHORDS.length - 1)); }}
            disabled={atEnd} style={btn(false, atEnd)}>Next →</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: M.muted, marginBottom: 32 }}>
          Chord <strong style={{ color: M.hi }}>{chordIdx + 1}</strong> of {CHORDS.length}
        </p>

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
