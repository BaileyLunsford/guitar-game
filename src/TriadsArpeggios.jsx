/**
 * TriadsArpeggios.jsx — Triads & Arpeggios for lead playing
 *
 * Props:
 *   isPro      boolean
 *   onUpgrade  () => void
 */

import React, { useState, useRef, useEffect } from 'react';
import ChordDiagram from './ChordDiagram';
import { guitarSampler } from './guitarSampler';
import LandingPage from './LandingPage';

// ── Theme ─────────────────────────────────────────────────────────────────────
const M = {
  bg:      '#120A04',
  surface: '#2A1208',
  panel:   '#1A0C05',
  accent:  '#E8833A',
  hi:      '#F5A65B',
  gold:    '#F5C842',
  muted:   '#A0785A',
  text:    '#F5E8D8',
  border:  'rgba(196,100,40,0.25)',
  borderHi:'rgba(232,131,58,0.55)',
};

// ── Guitar tuning ─────────────────────────────────────────────────────────────
// Standard EADGBE, in semitones from C0 (C0=0, C1=12, C2=24, C3=36, C4=48)
// E2=28, A2=33, D3=38, G3=43, B3=47, E4=52
const OPEN_SEMI = [28, 33, 38, 43, 47, 52]; // index 0=E2(low), 5=E4(high)
const NOTE_CLASSES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function semToName(semi) {
  return NOTE_CLASSES[semi % 12] + Math.floor(semi / 12);
}

// ── Triad computation ─────────────────────────────────────────────────────────
// String groups: spec "1"=high e, ascending order = lowest→highest pitch
// Group "1-2-3" → e-B-G → OPEN_SEMI indices [3,4,5] (ascending pitch: G→B→e)
const STRING_GROUPS = [
  { label: '1-2-3', asc: [3,4,5] },  // G-B-e  (top 3)
  { label: '2-3-4', asc: [2,3,4] },  // D-G-B
  { label: '3-4-5', asc: [1,2,3] },  // A-D-G
  { label: '4-5-6', asc: [0,1,2] },  // E-A-D  (bottom 3)
];

const ROOTS = ['C','D','E','F','G','A','B'];
const ROOT_SEMI = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const INTERVALS = { major: [0,4,7], minor: [0,3,7] };
const INV_LABELS = ['Root', '1st', '2nd'];

function possibleFrets(strIdx, noteClass) {
  const openClass = OPEN_SEMI[strIdx] % 12;
  const frets = [];
  for (let f = 0; f <= 15; f++) {
    if ((openClass + f) % 12 === noteClass) frets.push(f);
  }
  return frets;
}

/**
 * Compute triad shapes for all 3 inversions on a string group.
 * Returns array of 3 items: { guitarFrets:[low,mid,high], baseFret, relFrets, noteNames }
 * asc = [low_str_idx, mid_str_idx, high_str_idx] (ascending pitch order)
 */
function computeTriad(asc, rootNote12, intervals) {
  const triadNotes = intervals.map(i => (rootNote12 + i) % 12);
  const results = [];

  for (let inv = 0; inv < 3; inv++) {
    // Root pos: low string → root, mid → 3rd, high → 5th
    // 1st inv:  low string → 3rd,  mid → 5th, high → root
    // 2nd inv:  low string → 5th,  mid → root, high → 3rd
    const noteFor = [
      triadNotes[inv % 3],
      triadNotes[(inv + 1) % 3],
      triadNotes[(inv + 2) % 3],
    ];

    const opts = asc.map((si, i) => possibleFrets(si, noteFor[i]));
    let best = null;

    for (const f0 of opts[0]) {
      for (const f1 of opts[1]) {
        for (const f2 of opts[2]) {
          const span = Math.max(f0,f1,f2) - Math.min(f0,f1,f2);
          if (span <= 4) {
            const total = f0 + f1 + f2;
            if (!best || total < best.total) {
              best = { guitarFrets:[f0,f1,f2], span, total };
            }
          }
        }
      }
    }

    if (best) {
      const minF = Math.min(...best.guitarFrets);
      const bf   = minF === 0 ? 1 : minF;
      const relFrets = best.guitarFrets.map(f => f === 0 ? 0 : f - bf + 1);
      const noteNames = asc.map((si, i) => semToName(OPEN_SEMI[si] + best.guitarFrets[i]));
      results.push({ guitarFrets: best.guitarFrets, baseFret: bf, relFrets, noteNames });
    } else {
      results.push(null);
    }
  }
  return results;
}

/**
 * Build the 6-element frets array for ChordDiagram.
 * asc = ascending string indices [low, mid, high]
 * relFrets = relative fret values [low, mid, high]
 */
function buildDiagramFrets(asc, relFrets) {
  const arr = [-1,-1,-1,-1,-1,-1];
  asc.forEach((si, i) => { arr[si] = relFrets[i]; });
  return arr;
}

// ── Arpeggio computation ──────────────────────────────────────────────────────
function computeArpeggio(rootNote12, intervals) {
  const triadClasses = intervals.map(i => (rootNote12 + i) % 12);
  const ascending = [];
  let prevSemi = -1;

  for (let si = 0; si <= 5; si++) {
    const open = OPEN_SEMI[si];
    const minTarget = Math.max(open, prevSemi + 1);
    for (let f = 0; f <= 17; f++) {
      const semi = open + f;
      if (semi >= minTarget && triadClasses.includes(semi % 12)) {
        ascending.push({ strIdx: si, fret: f, noteName: semToName(semi) });
        prevSemi = semi;
        break;
      }
    }
  }
  return ascending;
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function TabBar({ options, value, onChange, style }) {
  return (
    <div style={{
      display: 'flex', gap: 4, background: M.surface,
      borderRadius: 12, padding: 4, ...style,
    }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding: '8px 6px', borderRadius: 9, border: 'none',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "Georgia, serif",
          background: value === o.value ? M.accent : 'transparent',
          color: value === o.value ? '#fff' : M.muted,
          transition: 'background 0.15s, color 0.15s',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function PillRow({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(o => (
          <button key={o.value ?? o} onClick={() => onChange(o.value ?? o)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "Georgia, serif",
            background: (o.value ?? o) === value ? M.accent : 'rgba(255,255,255,0.06)',
            color: (o.value ?? o) === value ? '#fff' : M.muted,
            transition: 'background 0.15s, color 0.15s',
          }}>{o.label ?? o}</button>
        ))}
      </div>
    </div>
  );
}

// ── Triads section ────────────────────────────────────────────────────────────
function TriadsSection() {
  const [quality,     setQuality]     = useState('major');
  const [groupIdx,    setGroupIdx]    = useState(0);
  const [root,        setRoot]        = useState('G');
  const [inversion,   setInversion]   = useState(0);
  const [playMode,    setPlayMode]    = useState(null); // null | 'chord' | 'arp'
  const [triadBpm,    setTriadBpm]    = useState(80);
  const playTimerRef = useRef(null);
  const arpTimersRef = useRef([]);

  useEffect(() => () => {
    clearTimeout(playTimerRef.current);
    arpTimersRef.current.forEach(t => clearTimeout(t));
  }, []);

  const group  = STRING_GROUPS[groupIdx];
  const shapes = computeTriad(group.asc, ROOT_SEMI[root], INTERVALS[quality]);
  const shape  = shapes[inversion];

  const diagramFrets = shape
    ? buildDiagramFrets(group.asc, shape.relFrets)
    : [-1,-1,-1,-1,-1,-1];

  function stopPlay() {
    clearTimeout(playTimerRef.current);
    arpTimersRef.current.forEach(t => clearTimeout(t));
    arpTimersRef.current = [];
    setPlayMode(null);
  }

  function playChord() {
    if (!shape) return;
    stopPlay();
    guitarSampler.resume?.();
    shape.guitarFrets.forEach((f, i) => {
      guitarSampler.playNote(semToName(OPEN_SEMI[group.asc[i]] + f));
    });
    setPlayMode('chord');
    playTimerRef.current = setTimeout(() => setPlayMode(null), 1200);
  }

  function playArpeggio() {
    if (!shape) return;
    stopPlay();
    guitarSampler.resume?.();
    const beatMs = 60000 / triadBpm;
    shape.guitarFrets.forEach((f, i) => {
      const t = setTimeout(() => {
        guitarSampler.playNote(semToName(OPEN_SEMI[group.asc[i]] + f));
        if (i === shape.guitarFrets.length - 1) {
          playTimerRef.current = setTimeout(() => setPlayMode(null), beatMs);
        }
      }, i * beatMs);
      arpTimersRef.current.push(t);
    });
    setPlayMode('arp');
  }

  function playSingleNote(noteNameFull) {
    guitarSampler.resume?.();
    guitarSampler.playNote(noteNameFull);
  }

  const rootQualLabel = root + (quality === 'minor' ? 'm' : '');

  return (
    <div style={{ padding: '0 16px', maxWidth: 440, margin: '0 auto' }}>
      {/* Quality */}
      <TabBar
        options={[{value:'major',label:'Major'},{value:'minor',label:'Minor'}]}
        value={quality}
        onChange={q => { setQuality(q); setInversion(0); }}
        style={{ marginBottom: 16 }}
      />

      {/* String group */}
      <PillRow
        label="String Group"
        options={STRING_GROUPS.map((g,i) => ({ value: i, label: g.label }))}
        value={groupIdx}
        onChange={i => { setGroupIdx(i); setInversion(0); }}
      />

      {/* Root */}
      <PillRow
        label="Root"
        options={ROOTS}
        value={root}
        onChange={r => { setRoot(r); setInversion(0); }}
      />

      {/* Inversion */}
      <PillRow
        label="Inversion"
        options={INV_LABELS.map((l,i) => ({ value: i, label: l }))}
        value={inversion}
        onChange={setInversion}
      />

      {/* Diagram card */}
      <div style={{
        background: M.surface, borderRadius: 18, border: `1px solid ${M.border}`,
        padding: '20px 16px 16px', textAlign: 'center',
      }}>
        {/* Title */}
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontSize: 18, fontWeight: 900,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{rootQualLabel}</span>
          <span style={{ fontSize: 12, color: M.muted, marginLeft: 8 }}>
            {INV_LABELS[inversion]} Position · Strings {group.label}
          </span>
        </div>

        {/* Fret position label */}
        {shape && shape.baseFret > 1 && (
          <div style={{ fontSize: 11, color: M.muted, marginBottom: 4 }}>
            {shape.baseFret}fr
          </div>
        )}

        {/* Chord diagram */}
        {shape ? (
          <ChordDiagram
            frets={diagramFrets}
            baseFret={shape.baseFret}
            playing={playing}
          />
        ) : (
          <div style={{ color: M.muted, fontSize: 12, padding: '40px 0' }}>
            No shape available for this voicing
          </div>
        )}

        {/* Individual note pills */}
        {shape && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4, marginBottom: 14 }}>
            {shape.noteNames.map((nn, i) => (
              <button
                key={i}
                onClick={() => playSingleNote(nn)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${M.borderHi}`,
                  background: 'rgba(232,131,58,0.10)',
                  color: M.hi, fontFamily: "Georgia, serif",
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
              >
                {nn.replace(/\d/, '')}
              </button>
            ))}
          </div>
        )}

        {/* Chord / Arpeggio buttons + BPM */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={playChord}
            disabled={!shape}
            style={{
              padding: '10px 20px', borderRadius: 12,
              border: `1px solid ${playMode === 'chord' ? M.accent : M.borderHi}`,
              background: playMode === 'chord'
                ? `linear-gradient(135deg,${M.accent},${M.hi})`
                : 'rgba(232,131,58,0.12)',
              color: playMode === 'chord' ? '#fff' : M.accent,
              fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700,
              cursor: shape ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {playMode === 'chord' ? '♪ Playing…' : '♪ Chord'}
          </button>
          <button
            onClick={playArpeggio}
            disabled={!shape}
            style={{
              padding: '10px 20px', borderRadius: 12,
              border: `1px solid ${playMode === 'arp' ? M.accent : M.borderHi}`,
              background: playMode === 'arp'
                ? `linear-gradient(135deg,${M.accent},${M.hi})`
                : 'rgba(232,131,58,0.12)',
              color: playMode === 'arp' ? '#fff' : M.accent,
              fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700,
              cursor: shape ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {playMode === 'arp' ? '♩ Playing…' : '♩ Arpeggio'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setTriadBpm(b => Math.max(40, b - 5))}
              style={{
                width: 28, height: 28, borderRadius: 8, border: `1px solid ${M.border}`,
                background: 'rgba(196,100,40,0.08)', color: M.muted,
                fontFamily: "Georgia, serif", fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >−</button>
            <span style={{ fontSize: 13, color: M.muted, minWidth: 44, textAlign: 'center' }}>
              {triadBpm} <span style={{ fontSize: 10 }}>bpm</span>
            </span>
            <button
              onClick={() => setTriadBpm(b => Math.min(200, b + 5))}
              style={{
                width: 28, height: 28, borderRadius: 8, border: `1px solid ${M.border}`,
                background: 'rgba(196,100,40,0.08)', color: M.muted,
                fontFamily: "Georgia, serif", fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
          </div>
        </div>
      </div>

      {/* Prev / Next inversions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <button
          onClick={() => setInversion(i => (i + 2) % 3)}
          style={navBtn}
        >‹ Prev</button>
        <span style={{ fontSize: 11, color: M.muted, alignSelf: 'center' }}>
          {inversion + 1} / 3
        </span>
        <button
          onClick={() => setInversion(i => (i + 1) % 3)}
          style={navBtn}
        >Next ›</button>
      </div>
    </div>
  );
}

// ── Arpeggios section ─────────────────────────────────────────────────────────
function ArpeggiosSection() {
  const [quality,  setQuality]  = useState('major');
  const [root,     setRoot]     = useState('G');
  const [pattern,  setPattern]  = useState('ascending');
  const [bpm,      setBpm]      = useState(120);
  const [playing,  setPlaying]  = useState(false);
  const [activeIdx,setActiveIdx]= useState(-1);
  const timerRef   = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const ascending  = computeArpeggio(ROOT_SEMI[root], INTERVALS[quality]);
  const descending = [...ascending].reverse();
  const both       = [...ascending, ...descending.slice(1)];

  const notes = pattern === 'ascending' ? ascending
              : pattern === 'descending' ? descending
              : both;

  function playArpeggio() {
    if (playing) {
      clearTimeout(timerRef.current);
      setPlaying(false);
      setActiveIdx(-1);
      return;
    }
    setPlaying(true);
    guitarSampler.resume?.();
    const beatMs = 60000 / bpm;
    let i = 0;
    function playNext() {
      if (i >= notes.length) {
        setPlaying(false);
        setActiveIdx(-1);
        return;
      }
      setActiveIdx(i);
      guitarSampler.playNote(notes[i].noteName);
      i++;
      timerRef.current = setTimeout(playNext, beatMs);
    }
    playNext();
  }

  const STRING_LABELS = ['E','A','D','G','B','e'];

  return (
    <div style={{ padding: '0 16px', maxWidth: 440, margin: '0 auto' }}>
      {/* Quality */}
      <TabBar
        options={[{value:'major',label:'Major'},{value:'minor',label:'Minor'}]}
        value={quality}
        onChange={q => { setQuality(q); if (playing) { clearTimeout(timerRef.current); setPlaying(false); setActiveIdx(-1); } }}
        style={{ marginBottom: 16 }}
      />

      {/* Root */}
      <PillRow
        label="Root"
        options={ROOTS}
        value={root}
        onChange={r => { setRoot(r); if (playing) { clearTimeout(timerRef.current); setPlaying(false); setActiveIdx(-1); } }}
      />

      {/* Pattern */}
      <PillRow
        label="Pattern"
        options={[
          { value: 'ascending',  label: 'Ascending' },
          { value: 'descending', label: 'Descending' },
          { value: 'both',       label: 'Both' },
        ]}
        value={pattern}
        onChange={p => { setPattern(p); if (playing) { clearTimeout(timerRef.current); setPlaying(false); setActiveIdx(-1); } }}
      />

      {/* Note sequence */}
      <div style={{
        background: M.surface, borderRadius: 16,
        border: `1px solid ${M.border}`,
        padding: '16px 14px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, marginBottom: 10 }}>
          {root}{quality === 'minor' ? 'm' : ''} · {pattern}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {notes.map((n, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 10px', borderRadius: 10, minWidth: 44,
              background: i === activeIdx
                ? M.accent
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${i === activeIdx ? M.accent : M.border}`,
              transition: 'background 0.08s, border-color 0.08s',
            }}>
              <span style={{
                fontSize: 14, fontWeight: 800,
                color: i === activeIdx ? '#fff' : M.text,
              }}>{n.noteName.replace(/\d/,'')}</span>
              <span style={{
                fontSize: 9, color: i === activeIdx ? 'rgba(255,255,255,0.8)' : M.muted,
                marginTop: 2,
              }}>
                {STRING_LABELS[n.strIdx]} · {n.fret}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BPM control */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: M.surface, borderRadius: 14,
        border: `1px solid ${M.border}`,
        padding: '12px 16px', marginBottom: 16,
      }}>
        <span style={{ fontSize: 11, color: M.muted, flexShrink: 0 }}>BPM</span>
        <input
          type="range" min="60" max="160" value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          style={{ flex: 1, accentColor: M.accent }}
        />
        <span style={{
          fontSize: 18, fontWeight: 900, color: M.hi,
          minWidth: 36, textAlign: 'right',
        }}>{bpm}</span>
      </div>

      {/* Play button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={playArpeggio} style={{
          padding: '14px 40px', borderRadius: 14,
          border: `1px solid ${playing ? M.accent : M.borderHi}`,
          background: playing
            ? `linear-gradient(135deg,${M.accent},${M.hi})`
            : `linear-gradient(135deg,#C46428,${M.accent})`,
          color: '#fff', fontFamily: "Georgia, serif",
          fontWeight: 800, fontSize: 16, cursor: 'pointer',
          boxShadow: playing ? `0 4px 24px rgba(232,131,58,0.5)` : '0 4px 16px rgba(232,131,58,0.25)',
          transition: 'all 0.15s',
        }}>
          {playing ? '⏹ Stop' : '▶ Play Arpeggio'}
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TriadsArpeggios({ isPro, onUpgrade }) {
  const [started, setStarted] = useState(false);
  const [tab,     setTab]     = useState('triads');

  if (!started) return (
    <LandingPage
      emoji="🎵"
      title="Triads & Arpeggios"
      description="Small chords and melodic patterns for lead playing — the building blocks of solos and fills."
      difficulty="Advanced"
      features={[
        'Major and minor triads in all 3 inversions',
        '4 string groups across the full neck',
        'Arpeggios — ascending and descending patterns',
        'Moveable shapes in every key',
      ]}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 60px',
      position: 'relative',
    }}>

      {/* PRO gate overlay */}
      {!isPro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(18,10,4,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{ fontSize: 60, marginBottom: 20,
            filter: 'drop-shadow(0 4px 20px rgba(232,131,58,0.5))' }}>🔒</div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, marginBottom: 10,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>PRO Feature</h2>
          <p style={{ fontSize: 14, color: M.muted, textAlign: 'center',
            maxWidth: 260, lineHeight: 1.6, marginBottom: 28 }}>
            Triads & Arpeggios is part of the PRO subscription.
          </p>
          <button onClick={onUpgrade} style={{
            padding: '14px 36px', borderRadius: 14,
            border: `1px solid ${M.borderHi}`,
            background: `linear-gradient(135deg,#C46428,${M.accent})`,
            color: '#fff', fontFamily: "Georgia, serif",
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(232,131,58,0.3)',
            marginBottom: 16,
          }}>Unlock PRO →</button>
          <a href="#" style={{
            fontSize: 13, color: M.muted, textDecoration: 'none',
          }}>← Back to Home</a>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 18, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Triads & Arpeggios</h1>
          <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            ADVANCED · PRO
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ padding: '0 16px', maxWidth: 440, margin: '0 auto 20px' }}>
        <TabBar
          options={[
            { value: 'triads',     label: 'Triads' },
            { value: 'arpeggios', label: 'Arpeggios' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'triads'     && <TriadsSection />}
      {tab === 'arpeggios' && <ArpeggiosSection />}
    </div>
  );
}

// ── Shared button styles ───────────────────────────────────────────────────────
const navBtn = {
  padding: '9px 20px', borderRadius: 10,
  border: `1px solid ${M.border}`,
  background: 'rgba(196,100,40,0.08)',
  color: M.muted, fontFamily: "Georgia, serif",
  fontSize: 13, cursor: 'pointer',
};
