/**
 * ChordPlay.jsx — Guitar Audition Game
 * Chord diagram viewer organised by key, with audio playback.
 *
 * Props: none (self-contained)
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
  free:    '#7B9E6B',
};

// ─── Chord library ───────────────────────────────────────────────────────────
// frets: [str6, str5, str4, str3, str2, str1]  low E → high E
//   -1 = muted (X)   0 = open (O)   n = fret number
const CL = {
  G:  { name:'G',  full:'G Major', frets:[3,2,0,0,0,3],    notes:['G2','B2','D3','G3','B3','G4'] },
  C:  { name:'C',  full:'C Major', frets:[-1,3,2,0,1,0],   notes:['C3','E3','G3','C4','E4'] },
  D:  { name:'D',  full:'D Major', frets:[-1,-1,0,2,3,2],  notes:['D3','A3','D4','F#4'] },
  Em: { name:'Em', full:'E Minor', frets:[0,2,2,0,0,0],    notes:['E2','B2','E3','G3','B3','E4'] },
  A:  { name:'A',  full:'A Major', frets:[-1,0,2,2,2,0],   notes:['A2','E3','A3','C#4','E4'] },
  E:  { name:'E',  full:'E Major', frets:[0,2,2,1,0,0],    notes:['E2','B2','E3','G#3','B3','E4'] },
  B7: { name:'B7', full:'B7',      frets:[-1,2,1,2,0,2],   notes:['B2','D#3','A3','B3','F#4'] },
  F:  { name:'F',  full:'F Major', frets:[1,3,3,2,1,1],    notes:['F2','C3','F3','A3','C4','F4'] },
};

// ─── Keys ─────────────────────────────────────────────────────────────────────
// Each chord entry spreads the chord data and adds a roman-numeral degree label.
const KEYS = [
  {
    label: 'G', pro: false,
    chords: [
      { ...CL.G,  degree: 'I'  },
      { ...CL.C,  degree: 'IV' },
      { ...CL.D,  degree: 'V'  },
    ],
  },
  {
    label: 'D', pro: true,
    chords: [
      { ...CL.D,  degree: 'I'  },
      { ...CL.G,  degree: 'IV' },
      { ...CL.A,  degree: 'V'  },
    ],
  },
  {
    label: 'A', pro: true,
    chords: [
      { ...CL.A,  degree: 'I'  },
      { ...CL.D,  degree: 'IV' },
      { ...CL.E,  degree: 'V'  },
    ],
  },
  {
    label: 'E', pro: true,
    chords: [
      { ...CL.E,  degree: 'I'  },
      { ...CL.A,  degree: 'IV' },
      { ...CL.B7, degree: 'V'  },
    ],
  },
  {
    label: 'C', pro: true,
    chords: [
      { ...CL.C,  degree: 'I'  },
      { ...CL.F,  degree: 'IV' },
      { ...CL.G,  degree: 'V'  },
    ],
  },
];

// ─── SVG chord diagram ────────────────────────────────────────────────────────
const STR_GAP = 30;
const FRET_GAP = 32;
const LEFT   = 20;
const TOP    = 46;
const FRETS  = 5;
const RIGHT  = LEFT + 5 * STR_GAP;   // 170
const BOTTOM = TOP  + FRETS * FRET_GAP; // 206
const SVG_W  = RIGHT + LEFT;          // 190
const SVG_H  = BOTTOM + 24;           // 230

const strX = (si) => LEFT + si * STR_GAP;
const fretY = (fi) => TOP  + fi * FRET_GAP;
const dotY  = (fret) => TOP + (fret - 0.5) * FRET_GAP;

function ChordDiagram({ frets, playing }) {
  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width:'100%', maxWidth:240, display:'block', margin:'0 auto' }}
    >
      {/* String lines */}
      {[0,1,2,3,4,5].map(si => (
        <line key={`s${si}`}
          x1={strX(si)} y1={TOP} x2={strX(si)} y2={BOTTOM}
          stroke="rgba(245,232,216,0.35)" strokeWidth={1.5} />
      ))}

      {/* Fret lines — nut is thick */}
      {[0,1,2,3,4,5].map(fi => (
        <line key={`f${fi}`}
          x1={LEFT} y1={fretY(fi)} x2={RIGHT} y2={fretY(fi)}
          stroke={fi === 0 ? 'rgba(245,232,216,0.85)' : 'rgba(245,232,216,0.3)'}
          strokeWidth={fi === 0 ? 4 : 1.5} />
      ))}

      {/* X / O labels above nut */}
      {frets.map((f, si) => {
        if (f === 0)  return <text key={`lbl${si}`} x={strX(si)} y={TOP-10}
          textAnchor="middle" fill="rgba(245,232,216,0.75)"
          fontSize={13} fontFamily="Georgia,'Times New Roman',serif" fontWeight="700">O</text>;
        if (f === -1) return <text key={`lbl${si}`} x={strX(si)} y={TOP-10}
          textAnchor="middle" fill={M.muted}
          fontSize={14} fontFamily="Georgia,'Times New Roman',serif" fontWeight="700">×</text>;
        return null;
      })}

      {/* Finger dots */}
      {frets.map((f, si) => f > 0 ? (
        <circle key={`d${si}`}
          cx={strX(si)} cy={dotY(f)} r={10}
          fill={playing ? M.hi : M.accent}
          style={{ transition:'fill 0.1s' }} />
      ) : null)}

      {/* String labels */}
      {['E','A','D','G','B','e'].map((label, si) => (
        <text key={`sl${si}`} x={strX(si)} y={BOTTOM+16}
          textAnchor="middle" fill={M.muted}
          fontSize={10} fontFamily="Georgia,'Times New Roman',serif">{label}</text>
      ))}
    </svg>
  );
}

// ─── Button style ─────────────────────────────────────────────────────────────
function btn(active = false, disabled = false) {
  return {
    padding:'10px 20px', borderRadius:12,
    border:`1px solid ${active ? M.borderHi : M.border}`,
    background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.1)',
    color: disabled ? M.muted : (active ? M.hi : M.text),
    fontFamily:"Georgia,'Times New Roman',serif",
    fontWeight:700, fontSize:14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition:'all 0.15s', userSelect:'none',
  };
}

// ─── ChordPlay ────────────────────────────────────────────────────────────────
export default function ChordPlay() {
  const [keyIdx,     setKeyIdx]     = useState(0);
  const [chordIdx,   setChordIdx]   = useState(0);
  const [playing,    setPlaying]    = useState(false);
  const [activeNote, setActiveNote] = useState(null);

  const currentKey   = KEYS[keyIdx];
  const currentChord = currentKey.chords[chordIdx];
  const atStart      = chordIdx === 0;
  const atEnd        = chordIdx >= currentKey.chords.length - 1;

  function handleKeySelect(i) {
    setKeyIdx(i);
    setChordIdx(0);
    setPlaying(false);
    setActiveNote(null);
  }

  function handleHear() {
    if (playing) return;
    setPlaying(true);
    guitarSampler.resume();
    currentChord.notes.forEach((note, i) => {
      setTimeout(() => guitarSampler.playNote(note, { volume:0.85 }), i * 40);
    });
    setTimeout(() => setPlaying(false), currentChord.notes.length * 40 + 600);
  }

  function handleNotepill(note) {
    guitarSampler.resume();
    guitarSampler.playNote(note, { volume:0.9 });
    setActiveNote(note);
    setTimeout(() => setActiveNote(null), 600);
  }

  function handlePrev() {
    setPlaying(false); setActiveNote(null);
    setChordIdx(i => Math.max(i - 1, 0));
  }

  function handleNext() {
    setPlaying(false); setActiveNote(null);
    setChordIdx(i => Math.min(i + 1, currentKey.chords.length - 1));
  }

  return (
    <div style={{
      minHeight:'100vh', background:M.bg, color:M.text,
      fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px',
    }}>
      <div style={{ maxWidth:400, margin:'0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:36, marginBottom:6,
            filter:'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
          <h1 style={{
            fontSize:20, fontWeight:800, marginBottom:2, letterSpacing:'-0.01em',
            background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>Chord Play</h1>
          <p style={{ fontSize:12, color:M.muted }}>Open position chords</p>
        </div>

        {/* ── Key selector ── */}
        <div style={{
          display:'flex', gap:8, overflowX:'auto', justifyContent:'center',
          paddingBottom:4, marginBottom:20,
          // hide scrollbar on iOS/WebKit
          WebkitOverflowScrolling:'touch',
        }}>
          {KEYS.map((k, i) => {
            const active = i === keyIdx;
            return (
              <button key={i} onClick={() => handleKeySelect(i)} style={{
                flexShrink:0,
                padding:'7px 16px', borderRadius:20,
                border:`1px solid ${active ? M.borderHi : M.border}`,
                background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.08)',
                color: active ? M.hi : k.pro ? M.muted : M.text,
                fontFamily:"Georgia,'Times New Roman',serif",
                fontWeight:800, fontSize:15,
                cursor:'pointer', transition:'all 0.15s', userSelect:'none',
                display:'flex', alignItems:'center', gap:5,
              }}>
                {k.label}
                {k.pro
                  ? <span style={{ fontSize:11, opacity:0.8 }}>🔒</span>
                  : <span style={{
                      fontSize:8, fontWeight:800, color:M.free,
                      letterSpacing:'0.08em', textTransform:'uppercase',
                    }}>FREE</span>
                }
              </button>
            );
          })}
        </div>

        {/* ── PRO gate ── */}
        {currentKey.pro ? (
          <div style={{
            textAlign:'center', padding:'52px 20px 48px',
            background:M.surface, borderRadius:16,
            border:`1px solid ${M.border}`, marginBottom:32,
          }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🔒</div>
            <div style={{
              fontSize:18, fontWeight:800, color:M.accent, marginBottom:8,
            }}>Key of {currentKey.label} — PRO</div>
            <p style={{ fontSize:13, color:M.muted, lineHeight:1.7, marginBottom:0 }}>
              Unlock all 5 keys and 8 chords<br/>by upgrading to PRO.
            </p>
          </div>
        ) : (
          <>
            {/* ── Chord name + degree ── */}
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{
                fontSize:48, fontWeight:800, lineHeight:1,
                color: playing ? M.hi : M.accent,
                transition:'color 0.15s',
              }}>{currentChord.name}</div>
              <div style={{ fontSize:13, color:M.muted, marginTop:5 }}>
                {currentChord.full} —{' '}
                <span style={{ color:M.accent, fontWeight:700 }}>
                  {currentChord.degree} chord
                </span>
              </div>
            </div>

            {/* ── Chord diagram ── */}
            <div style={{
              background:M.surface, borderRadius:16, padding:'20px 16px',
              border:`1px solid ${playing ? M.borderHi : M.border}`,
              marginBottom:20, transition:'border-color 0.15s',
            }}>
              <ChordDiagram frets={currentChord.frets} playing={playing} />
            </div>

            {/* ── Hear Chord ── */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <button
                onClick={handleHear}
                disabled={playing}
                style={{
                  ...btn(playing, playing),
                  fontSize:16, paddingLeft:32, paddingRight:32,
                  paddingTop:14, paddingBottom:14,
                  boxShadow: playing ? '0 0 20px rgba(232,131,58,0.25)' : 'none',
                }}
              >
                {playing ? '🎸 Playing…' : '🎸 Hear Chord'}
              </button>
            </div>

            {/* ── Note pills ── */}
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <p style={{ fontSize:11, color:M.muted, letterSpacing:'0.08em',
                textTransform:'uppercase', marginBottom:6 }}>Notes</p>
              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                {currentChord.notes.map((note, i) => {
                  const lit = activeNote === note;
                  return (
                    <button key={i} onClick={() => handleNotepill(note)} style={{
                      fontSize:12, fontWeight:700,
                      color:      lit ? '#4ade80' : M.hi,
                      background: lit ? 'rgba(74,222,128,0.15)' : 'rgba(196,100,40,0.12)',
                      border:     `1px solid ${lit ? '#4ade80' : M.border}`,
                      borderRadius:8, padding:'3px 10px',
                      cursor:'pointer', transition:'all 0.1s',
                      fontFamily:"Georgia,'Times New Roman',serif",
                      userSelect:'none',
                    }}>{note}</button>
                  );
                })}
              </div>
            </div>

            {/* ── Navigation ── */}
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:12 }}>
              <button onClick={handlePrev} disabled={atStart} style={btn(false, atStart)}>
                ← Prev
              </button>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {currentKey.chords.map((_, i) => (
                  <button key={i}
                    onClick={() => { setPlaying(false); setChordIdx(i); }}
                    style={{
                      width: i === chordIdx ? 24 : 10, height:10,
                      borderRadius:5, border:'none', padding:0,
                      background: i === chordIdx ? M.accent : i < chordIdx ? M.primary : M.surface,
                      cursor:'pointer', transition:'all 0.2s ease',
                    }} />
                ))}
              </div>
              <button onClick={handleNext} disabled={atEnd} style={btn(false, atEnd)}>
                Next →
              </button>
            </div>

            {/* ── Chord index ── */}
            <p style={{ textAlign:'center', fontSize:12, color:M.muted, marginBottom:32 }}>
              Chord <strong style={{ color:M.hi }}>{chordIdx + 1}</strong> of {currentKey.chords.length}
            </p>
          </>
        )}

        {/* ── Back link ── */}
        <div style={{ textAlign:'center', paddingBottom:40 }}>
          <a href="#" style={{ color:M.muted, fontSize:13, textDecoration:'none' }}>
            ← Back to home
          </a>
        </div>

      </div>
    </div>
  );
}
