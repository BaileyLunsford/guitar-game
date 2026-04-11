/**
 * ChordPlay.jsx — Guitar Audition Game
 * Chord diagram viewer with audio playback via guitarSampler.
 *
 * Props: none (self-contained with built-in chord library)
 */

import React, { useState } from 'react';
import { guitarSampler } from './guitarSampler';

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

// ─── Chord library ───────────────────────────────────────────────────────────
// frets: 6-element array [str6, str5, str4, str3, str2, str1] (low E → high E)
//   -1 = muted (X)   0 = open (O)   n = fret number
// notes: note names passed to guitarSampler — muted strings excluded
const CHORDS = [
  {
    name: 'G',
    full: 'G Major',
    frets: [3, 2, 0, 0, 0, 3],
    notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
  },
  {
    name: 'C',
    full: 'C Major',
    frets: [-1, 3, 2, 0, 1, 0],
    notes: ['C3', 'E3', 'G3', 'C4', 'E4'],
  },
  {
    name: 'D',
    full: 'D Major',
    frets: [-1, -1, 0, 2, 3, 2],
    notes: ['D3', 'A3', 'D4', 'F#4'],
  },
  {
    name: 'Em',
    full: 'E Minor',
    frets: [0, 2, 2, 0, 0, 0],
    notes: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'],
  },
  {
    name: 'A',
    full: 'A Major',
    frets: [-1, 0, 2, 2, 2, 0],
    notes: ['A2', 'E3', 'A3', 'C#4', 'E4'],
  },
  {
    name: 'E',
    full: 'E Major',
    frets: [0, 2, 2, 1, 0, 0],
    notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
  },
];

// ─── Chord diagram SVG ───────────────────────────────────────────────────────
// Layout:
//   6 vertical string lines, left=low E, right=high E
//   6 horizontal fret lines (nut + 5 frets)
//   Amber dots for finger positions
//   O / × above nut for open / muted strings
//   String labels E A D G B e below grid
const STR_GAP  = 30;   // px between strings
const FRET_GAP = 32;   // px between fret lines
const LEFT     = 20;   // x of string 6 (low E)
const TOP      = 46;   // y of nut line
const FRETS    = 5;    // number of fret spaces shown
const RIGHT    = LEFT + 5 * STR_GAP;   // x of string 1 (high E) = 170
const BOTTOM   = TOP  + FRETS * FRET_GAP;  // y of last fret line = 206
const SVG_W    = RIGHT + LEFT;         // 190
const SVG_H    = BOTTOM + 24;          // 230

const strX  = (si) => LEFT + si * STR_GAP;       // si: 0=low E … 5=high E
const fretY = (fi) => TOP  + fi * FRET_GAP;       // fi: 0=nut … 5=bottom
const dotY  = (fret) => TOP + (fret - 0.5) * FRET_GAP; // centre of fret space

function ChordDiagram({ frets, playing }) {
  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}
    >
      {/* ── String lines ── */}
      {[0,1,2,3,4,5].map(si => (
        <line key={`str${si}`}
          x1={strX(si)} y1={TOP}
          x2={strX(si)} y2={BOTTOM}
          stroke="rgba(245,232,216,0.35)" strokeWidth={1.5}
        />
      ))}

      {/* ── Fret lines (nut = thick) ── */}
      {[0,1,2,3,4,5].map(fi => (
        <line key={`fret${fi}`}
          x1={LEFT} y1={fretY(fi)}
          x2={RIGHT} y2={fretY(fi)}
          stroke={fi === 0 ? 'rgba(245,232,216,0.85)' : 'rgba(245,232,216,0.3)'}
          strokeWidth={fi === 0 ? 4 : 1.5}
        />
      ))}

      {/* ── X / O labels above nut ── */}
      {frets.map((f, si) => {
        if (f === 0) {
          return (
            <text key={`lbl${si}`}
              x={strX(si)} y={TOP - 10}
              textAnchor="middle"
              fill="rgba(245,232,216,0.75)"
              fontSize={13} fontFamily="Georgia,'Times New Roman',serif" fontWeight="700"
            >O</text>
          );
        }
        if (f === -1) {
          return (
            <text key={`lbl${si}`}
              x={strX(si)} y={TOP - 10}
              textAnchor="middle"
              fill={M.muted}
              fontSize={14} fontFamily="Georgia,'Times New Roman',serif" fontWeight="700"
            >×</text>
          );
        }
        return null;
      })}

      {/* ── Finger dots ── */}
      {frets.map((f, si) => {
        if (f <= 0) return null;
        return (
          <circle key={`dot${si}`}
            cx={strX(si)} cy={dotY(f)} r={10}
            fill={playing ? M.hi : M.accent}
            style={{ transition: 'fill 0.1s' }}
          />
        );
      })}

      {/* ── Fret numbers on right side (optional, all open-pos for now) ── */}

      {/* ── String labels below grid ── */}
      {['E','A','D','G','B','e'].map((label, si) => (
        <text key={`slbl${si}`}
          x={strX(si)} y={BOTTOM + 16}
          textAnchor="middle"
          fill={M.muted}
          fontSize={10} fontFamily="Georgia,'Times New Roman',serif"
        >{label}</text>
      ))}
    </svg>
  );
}

// ─── Button style ─────────────────────────────────────────────────────────────
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
    transition: 'all 0.15s',
    userSelect: 'none',
  };
}

// ─── ChordPlay component ─────────────────────────────────────────────────────
export default function ChordPlay() {
  const [idx,     setIdx]     = useState(0);
  const [playing, setPlaying] = useState(false);

  const chord   = CHORDS[idx];
  const atStart = idx === 0;
  const atEnd   = idx >= CHORDS.length - 1;

  function handleHear() {
    if (playing) return;
    setPlaying(true);
    guitarSampler.resume();
    // Strum low → high with 40ms between strings for a natural feel
    chord.notes.forEach((note, i) => {
      setTimeout(() => guitarSampler.playNote(note, { volume: 0.85 }), i * 40);
    });
    // Light up the diagram briefly
    setTimeout(() => setPlaying(false), chord.notes.length * 40 + 600);
  }

  function handlePrev() {
    setPlaying(false);
    setIdx(i => Math.max(i - 1, 0));
  }

  function handleNext() {
    setPlaying(false);
    setIdx(i => Math.min(i + 1, CHORDS.length - 1));
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia,'Times New Roman',serif", padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 6,
            filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
          <h1 style={{
            fontSize: 20, fontWeight: 800, marginBottom: 2, letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Chord Play</h1>
          <p style={{ fontSize: 12, color: M.muted }}>Open position chords</p>
        </div>

        {/* ── Chord name ── */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            fontSize: 48, fontWeight: 800, lineHeight: 1,
            color: playing ? M.hi : M.accent,
            transition: 'color 0.15s',
          }}>{chord.name}</div>
          <div style={{ fontSize: 14, color: M.muted, marginTop: 4 }}>{chord.full}</div>
        </div>

        {/* ── Chord diagram ── */}
        <div style={{
          background: M.surface, borderRadius: 16, padding: '20px 16px',
          border: `1px solid ${playing ? M.borderHi : M.border}`,
          marginBottom: 20, transition: 'border-color 0.15s',
        }}>
          <ChordDiagram frets={chord.frets} playing={playing} />
        </div>

        {/* ── Hear Chord button ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <button
            onClick={handleHear}
            disabled={playing}
            style={{
              ...btn(playing, playing),
              fontSize: 16, paddingLeft: 32, paddingRight: 32, paddingTop: 14, paddingBottom: 14,
              boxShadow: playing ? '0 0 20px rgba(232,131,58,0.25)' : 'none',
            }}
          >
            {playing ? '🎸 Playing…' : '🎸 Hear Chord'}
          </button>
        </div>

        {/* ── Notes label ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: M.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 6 }}>Notes</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {chord.notes.map((note, i) => (
              <span key={i} style={{
                fontSize: 12, fontWeight: 700,
                color: M.hi, background: 'rgba(196,100,40,0.12)',
                border: `1px solid ${M.border}`,
                borderRadius: 8, padding: '3px 10px',
              }}>{note}</span>
            ))}
          </div>
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
          <button onClick={handlePrev} disabled={atStart} style={btn(false, atStart)}>
            ← Prev
          </button>

          {/* Chord selector dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {CHORDS.map((c, i) => (
              <button
                key={i}
                onClick={() => { setPlaying(false); setIdx(i); }}
                title={c.full}
                style={{
                  width: i === idx ? 24 : 10, height: 10,
                  borderRadius: 5, border: 'none', padding: 0,
                  background: i === idx ? M.accent : i < idx ? M.primary : M.surface,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          <button onClick={handleNext} disabled={atEnd} style={btn(false, atEnd)}>
            Next →
          </button>
        </div>

        {/* ── Chord index label ── */}
        <p style={{ textAlign: 'center', fontSize: 12, color: M.muted, marginBottom: 32 }}>
          Chord <strong style={{ color: M.hi }}>{idx + 1}</strong> of {CHORDS.length}
        </p>

        {/* ── Back link ── */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <a href="#" style={{ color: M.muted, fontSize: 13, textDecoration: 'none' }}>
            ← Back to home
          </a>
        </div>

      </div>
    </div>
  );
}
