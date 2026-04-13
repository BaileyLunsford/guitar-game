/**
 * ChordPlay.jsx — Guitar Audition Game
 * Chord diagram viewer organised by key, with Essential / Full Key tabs.
 *
 * Props: none (self-contained)
 */

import React, { useState } from 'react';
import { guitarSampler } from './guitarSampler';
import UpgradeModal from './UpgradeModal';
import LandingPage from './LandingPage';
import ChordDiagram from './ChordDiagram';

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
//   -1 = muted (X)   0 = open (O)   n = relative fret (1 = baseFret)
// baseFret: default 1. When >1, diagram shows "Nfr" label and thin top line.
const CL = {
  // ── Major chords ──
  G:  { name:'G',   full:'G Major',   frets:[3,2,0,0,0,3],       notes:['G2','B2','D3','G3','B3','G4'] },
  C:  { name:'C',   full:'C Major',   frets:[-1,3,2,0,1,0],      notes:['C3','E3','G3','C4','E4'] },
  D:  { name:'D',   full:'D Major',   frets:[-1,-1,0,2,3,2],     notes:['D3','A3','D4','F#4'] },
  A:  { name:'A',   full:'A Major',   frets:[-1,0,2,2,2,0],      notes:['A2','E3','A3','C#4','E4'] },
  E:  { name:'E',   full:'E Major',   frets:[0,2,2,1,0,0],       notes:['E2','B2','E3','G#3','B3','E4'] },
  F:  { name:'F',   full:'F Major',   frets:[1,3,3,2,1,1],       notes:['F2','C3','F3','A3','C4','F4'],
        barre:{ fret:1, from:0, to:5 } },

  // ── Dominant 7th ──
  B7: { name:'B7',  full:'B7',        frets:[-1,2,1,2,0,2],      notes:['B2','D#3','A3','B3','F#4'] },

  // ── Minor chords ──
  Am: { name:'Am',  full:'A Minor',   frets:[-1,0,2,2,1,0],      notes:['A2','E3','A3','C4','E4'] },
  Em: { name:'Em',  full:'E Minor',   frets:[0,0,2,2,0,0],       notes:['E2','A2','E3','A3','B3','E4'] },
  Dm: { name:'Dm',  full:'D Minor',   frets:[-1,-1,0,2,3,1],     notes:['D3','A3','D4','F4'] },
  Bm: { name:'Bm',  full:'B Minor',   frets:[-1,2,4,4,3,2],      notes:['B2','F#3','B3','D4','F#4'],
        barre:{ fret:2, from:1, to:5 } },

  // Barre chords — frets are relative to baseFret
  Csm:  { name:'C#m', full:'C# Minor', frets:[-1,1,3,3,2,-1], baseFret:4,
          notes:['C#3','G#3','C#4','E4'] },
  Fshm: { name:'F#m', full:'F# Minor', frets:[2,4,4,4,2,2],
          notes:['F#2','C#3','F#3','B3','C#4','F#4'] },
  Gshm: { name:'G#m', full:'G# Minor', frets:[1,3,3,1,1,1],  baseFret:4,
          notes:['G#2','D#3','G#3','B3','D#4','G#4'] },

  // ── Diminished chords ──
  Fshdim: { name:'F#°', full:'F# Dim', frets:[2,3,4,3,-1,-1],    notes:['F#2','C3','F#3','Bb3'] },
  Bdim:   { name:'B°',  full:'B Dim',  frets:[-1,2,3,4,-1,-1],   notes:['B2','F3','B3'] },
  Cshdim: { name:'C#°', full:'C# Dim', frets:[-1,1,2,3,2,-1], baseFret:4,
            notes:['C#3','G3','C#4','E4'] },
  Gshdim: { name:'G#°', full:'G# Dim', frets:[-1,2,0,1,0,-1],    notes:['B2','D3','G#3','B3'] },
  Dshdim: { name:'D#°', full:'D# Dim', frets:[-1,-1,1,2,0,2],    notes:['D#3','A3','B3','F#4'] },
};

// ─── Keys — Essential (I IV V) + Full diatonic set ───────────────────────────
const KEYS = [
  {
    label: 'C', pro: true,
    chords: [
      { ...CL.C,    degree: 'I'    },
      { ...CL.Dm,   degree: 'ii'   },
      { ...CL.Em,   degree: 'iii'  },
      { ...CL.F,    degree: 'IV'   },
      { ...CL.G,    degree: 'V'    },
      { ...CL.Am,   degree: 'vi'   },
      { ...CL.Bdim, degree: 'vii°' },
    ],
  },
  {
    label: 'A', pro: true,
    chords: [
      { ...CL.A,      degree: 'I'    },
      { ...CL.Bm,     degree: 'ii'   },
      { ...CL.Csm,    degree: 'iii'  },
      { ...CL.D,      degree: 'IV'   },
      { ...CL.E,      degree: 'V'    },
      { ...CL.Fshm,   degree: 'vi'   },
      { ...CL.Gshdim, degree: 'vii°' },
    ],
  },
  {
    label: 'G', pro: false,
    chords: [
      { ...CL.G,      degree: 'I'    },
      { ...CL.Am,     degree: 'ii'   },
      { ...CL.Bm,     degree: 'iii'  },
      { ...CL.C,      degree: 'IV'   },
      { ...CL.D,      degree: 'V'    },
      { ...CL.Em,     degree: 'vi'   },
      { ...CL.Fshdim, degree: 'vii°' },
    ],
  },
  {
    label: 'E', pro: true,
    chords: [
      { ...CL.E,      degree: 'I'    },
      { ...CL.Fshm,   degree: 'ii'   },
      { ...CL.Gshm,   degree: 'iii'  },
      { ...CL.A,      degree: 'IV'   },
      { ...CL.B7,     degree: 'V'    },
      { ...CL.Csm,    degree: 'vi'   },
      { ...CL.Dshdim, degree: 'vii°' },
    ],
  },
  {
    label: 'D', pro: true,
    chords: [
      { ...CL.D,      degree: 'I'    },
      { ...CL.Em,     degree: 'ii'   },
      { ...CL.Fshm,   degree: 'iii'  },
      { ...CL.G,      degree: 'IV'   },
      { ...CL.A,      degree: 'V'    },
      { ...CL.Bm,     degree: 'vi'   },
      { ...CL.Cshdim, degree: 'vii°' },
    ],
  },
];

const ESSENTIAL_DEGREES = new Set(['I', 'IV', 'V']);

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
export default function ChordPlay({ isPro = false, onPurchase, onRestore }) {
  const [phase,      setPhase]      = useState('landing'); // 'landing' | 'chords'
  const [keyIdx,     setKeyIdx]     = useState(0);
  const [chordIdx,   setChordIdx]   = useState(0);
  const [mode,       setMode]       = useState('essential'); // 'essential' | 'full'
  const [playing,    setPlaying]    = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [modal,      setModal]      = useState(null); // null | { feature }

  if (phase === 'landing') return (
    <LandingPage
      emoji="🎸"
      title="Chord Play"
      description="Learn open position chords used in real songs. Master the shapes that unlock thousands of songs."
      difficulty="Beginner"
      features={[
        'CAGED chord system',
        'Hear every chord voiced correctly',
        'I-IV-V and full diatonic sets',
      ]}
      onStart={() => setPhase('chords')}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  const currentKey    = KEYS[keyIdx];
  const currentChords = mode === 'essential'
    ? currentKey.chords.filter(c => ESSENTIAL_DEGREES.has(c.degree))
    : currentKey.chords;
  const currentChord  = currentChords[chordIdx] ?? currentChords[0];
  const atStart       = chordIdx === 0;
  const atEnd         = chordIdx >= currentChords.length - 1;
  const isAdvanced    = currentChord?.degree === 'vii°';

  function handleKeySelect(i) {
    const key = KEYS[i];
    if (key.pro && !isPro) {
      setModal({ feature: `Key of ${key.label} — PRO Feature` });
      return;
    }
    setKeyIdx(i);
    setChordIdx(0);
    setPlaying(false);
    setActiveNote(null);
  }

  function handleModeSelect(m) {
    setMode(m);
    setChordIdx(0);
    setPlaying(false);
    setActiveNote(null);
  }

  function handleHear() {
    if (playing || !currentChord) return;
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
    setChordIdx(i => Math.min(i + 1, currentChords.length - 1));
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
          paddingBottom:4, marginBottom:12, WebkitOverflowScrolling:'touch',
        }}>
          {KEYS.map((k, i) => {
            const active = i === keyIdx;
            return (
              <button key={i} onClick={() => handleKeySelect(i)} style={{
                flexShrink:0, padding:'7px 16px', borderRadius:20,
                border:`1px solid ${active ? M.borderHi : M.border}`,
                background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.08)',
                color: active ? M.hi : k.pro ? M.muted : M.text,
                fontFamily:"Georgia,'Times New Roman',serif",
                fontWeight:800, fontSize:15,
                cursor:'pointer', transition:'all 0.15s', userSelect:'none',
                display:'flex', alignItems:'center', gap:5,
              }}>
                {k.label}
                {k.pro && !isPro
                  ? <span style={{ fontSize:11, opacity:0.8 }}>🔒</span>
                  : !k.pro
                    ? <span style={{ fontSize:8, fontWeight:800, color:M.free,
                        letterSpacing:'0.08em', textTransform:'uppercase' }}>FREE</span>
                    : null
                }
              </button>
            );
          })}
        </div>

        {/* ── Mode tabs ── */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20 }}>
          {[
            { id:'essential', label:'Essential (I-IV-V)' },
            { id:'full',      label:'Full Key (all 7)'   },
          ].map(tab => {
            const active = mode === tab.id;
            return (
              <button key={tab.id} onClick={() => handleModeSelect(tab.id)} style={{
                padding:'7px 14px', borderRadius:10,
                border:`1px solid ${active ? M.borderHi : M.border}`,
                background: active ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.06)',
                color: active ? M.hi : M.muted,
                fontFamily:"Georgia,'Times New Roman',serif",
                fontWeight:700, fontSize:12,
                cursor:'pointer', transition:'all 0.15s', userSelect:'none',
              }}>{tab.label}</button>
            );
          })}
        </div>

        {/* ── PRO gate (shown only if somehow on a pro key without isPro) ── */}
        {currentKey.pro && !isPro ? (
          <div style={{
            textAlign:'center', padding:'52px 20px 48px',
            background:M.surface, borderRadius:16,
            border:`1px solid ${M.border}`, marginBottom:32,
          }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🔒</div>
            <div style={{ fontSize:18, fontWeight:800, color:M.accent, marginBottom:8 }}>
              Key of {currentKey.label} — PRO
            </div>
            <button onClick={() => setModal({ feature: `Key of ${currentKey.label} — PRO Feature` })}
              style={{
                marginTop:12, padding:'10px 24px', borderRadius:12,
                border:`1px solid ${M.borderHi}`, background:'rgba(232,131,58,0.18)',
                color:M.hi, fontFamily:"Georgia,serif", fontWeight:700, fontSize:13,
                cursor:'pointer',
              }}>
              Unlock PRO →
            </button>
          </div>
        ) : (
          <>
            {/* ── Chord name + degree + advanced badge ── */}
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
              {isAdvanced && (
                <span style={{
                  display:'inline-block', marginTop:6,
                  fontSize:9, fontWeight:800, letterSpacing:'0.1em',
                  textTransform:'uppercase', padding:'2px 9px', borderRadius:20,
                  background:'rgba(160,120,90,0.15)',
                  border:`1px solid ${M.border}`,
                  color:M.muted,
                }}>Advanced</span>
              )}
            </div>

            {/* ── Chord diagram ── */}
            <div style={{
              background:M.surface, borderRadius:16, padding:'20px 16px',
              border:`1px solid ${playing ? M.borderHi : M.border}`,
              marginBottom:20, transition:'border-color 0.15s',
            }}>
              <ChordDiagram
                frets={currentChord.frets}
                baseFret={currentChord.baseFret ?? 1}
                barre={currentChord.barre}
                playing={playing}
              />
            </div>

            {/* ── Hear Chord ── */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <button onClick={handleHear} disabled={playing} style={{
                ...btn(playing, playing),
                fontSize:16, paddingLeft:32, paddingRight:32,
                paddingTop:14, paddingBottom:14,
                boxShadow: playing ? '0 0 20px rgba(232,131,58,0.25)' : 'none',
              }}>
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
                {currentChords.map((_, i) => (
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
              Chord <strong style={{ color:M.hi }}>{chordIdx + 1}</strong> of {currentChords.length}
            </p>
          </>
        )}

        {/* ── Back link ── */}
        <div style={{ textAlign:'center', paddingBottom:40 }}>
          <button onClick={() => setPhase('landing')}
            style={{ background:'none', border:'none', color:M.muted,
              fontFamily:"Georgia,'Times New Roman',serif", fontSize:13, cursor:'pointer' }}>
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
