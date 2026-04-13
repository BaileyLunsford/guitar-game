/**
 * SongLibrary.jsx — song list → detail → Listen / Learn / Play
 *
 * FREE: Twinkle Twinkle Little Star
 * PRO:  Ode to Joy, Amazing Grace, Cripple Creek, Shady Grove,
 *       Will the Circle Be Unbroken
 *
 * Props:
 *   isPro       boolean
 *   onUpgrade   () => void
 */

import React, { useState, useRef, useEffect } from 'react';
import SongLearnEngine from './SongLearnEngine';
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
  border:  'rgba(196,100,40,0.25)',
  borderHi:'rgba(232,131,58,0.55)',
};

// ── Song data ─────────────────────────────────────────────────────────────────
// Each note: { string, fret, beat, noteName, duration? }
// String numbering: 1=high e, 2=B, 3=G, 4=D, 5=A, 6=low E

const SONGS = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    genre: 'Children',
    difficulty: 'Beginner',
    durationEst: '1:20',
    pro: false,
    bpm: 80,
    measures: [
      [
        { string:2, fret:1, beat:1, noteName:'C4' },
        { string:2, fret:1, beat:2, noteName:'C4' },
        { string:1, fret:3, beat:3, noteName:'G4' },
        { string:1, fret:3, beat:4, noteName:'G4' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4' },
        { string:1, fret:5, beat:2, noteName:'A4' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:2 },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4' },
        { string:1, fret:1, beat:2, noteName:'F4' },
        { string:1, fret:0, beat:3, noteName:'E4' },
        { string:1, fret:0, beat:4, noteName:'E4' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4' },
        { string:2, fret:3, beat:2, noteName:'D4' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:2 },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:1, fret:3, beat:2, noteName:'G4' },
        { string:1, fret:1, beat:3, noteName:'F4' },
        { string:1, fret:1, beat:4, noteName:'F4' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4' },
        { string:1, fret:0, beat:2, noteName:'E4' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:2 },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:1, fret:3, beat:2, noteName:'G4' },
        { string:1, fret:1, beat:3, noteName:'F4' },
        { string:1, fret:1, beat:4, noteName:'F4' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4' },
        { string:1, fret:0, beat:2, noteName:'E4' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:2 },
      ],
    ],
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    genre: 'Classical',
    difficulty: 'Beginner',
    durationEst: '1:00',
    pro: true,
    bpm: 88,
    measures: [
      [
        { string:1, fret:0, beat:1, noteName:'E4' },
        { string:1, fret:0, beat:2, noteName:'E4' },
        { string:1, fret:1, beat:3, noteName:'F4' },
        { string:1, fret:3, beat:4, noteName:'G4' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:1, fret:1, beat:2, noteName:'F4' },
        { string:1, fret:0, beat:3, noteName:'E4' },
        { string:2, fret:3, beat:4, noteName:'D4' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4' },
        { string:2, fret:1, beat:2, noteName:'C4' },
        { string:2, fret:3, beat:3, noteName:'D4' },
        { string:1, fret:0, beat:4, noteName:'E4' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4' },
        { string:2, fret:3, beat:2, noteName:'D4' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:2 },
      ],
    ],
  },
  {
    id: 'amazing',
    title: 'Amazing Grace',
    genre: 'Hymn',
    difficulty: 'Beginner',
    durationEst: '1:10',
    pro: true,
    bpm: 72,
    measures: [
      [
        { string:2, fret:3, beat:1, noteName:'D4' },
        { string:1, fret:3, beat:2, noteName:'G4' },
        { string:2, fret:0, beat:3, noteName:'B3' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:2, fret:0, beat:2, noteName:'B3' },
        { string:1, fret:5, beat:3, noteName:'A4' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:1, fret:0, beat:2, noteName:'E4' },
        { string:2, fret:3, beat:3, noteName:'D4' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:2, fret:0, beat:2, noteName:'B3' },
        { string:3, fret:2, beat:3, noteName:'D5' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D5' },
        { string:2, fret:0, beat:2, noteName:'B3' },
        { string:1, fret:3, beat:3, noteName:'G4' },
      ],
    ],
  },
  {
    id: 'cripple',
    title: 'Cripple Creek',
    genre: 'Bluegrass',
    difficulty: 'Intermediate',
    durationEst: '0:55',
    pro: true,
    bpm: 120,
    measures: [
      [
        { string:1, fret:5, beat:1, noteName:'A4' },
        { string:1, fret:5, beat:2, noteName:'A4' },
        { string:1, fret:3, beat:3, noteName:'G4' },
        { string:1, fret:0, beat:4, noteName:'E4' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4' },
        { string:1, fret:0, beat:2, noteName:'E4' },
        { string:1, fret:3, beat:3, noteName:'G4' },
        { string:1, fret:5, beat:4, noteName:'A4' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:1, fret:0, beat:2, noteName:'E4' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:2 },
      ],
    ],
  },
  {
    id: 'shady',
    title: 'Shady Grove',
    genre: 'Folk',
    difficulty: 'Intermediate',
    durationEst: '1:05',
    pro: true,
    bpm: 96,
    measures: [
      [
        { string:1, fret:0, beat:1, noteName:'E4' },
        { string:1, fret:3, beat:2, noteName:'G4' },
        { string:1, fret:5, beat:3, noteName:'A4' },
        { string:1, fret:3, beat:4, noteName:'G4' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4' },
        { string:2, fret:3, beat:2, noteName:'D4' },
        { string:1, fret:0, beat:3, noteName:'E4' },
        { string:1, fret:3, beat:4, noteName:'G4' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4' },
        { string:2, fret:0, beat:2, noteName:'B3' },
        { string:1, fret:5, beat:3, noteName:'A4' },
        { string:1, fret:3, beat:4, noteName:'G4' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:2 },
        { string:2, fret:3, beat:3, noteName:'D4', duration:2 },
      ],
    ],
  },
  {
    id: 'circle',
    title: 'Will the Circle Be Unbroken',
    genre: 'Gospel / Bluegrass',
    difficulty: 'Intermediate',
    durationEst: '1:15',
    pro: true,
    bpm: 104,
    measures: [
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:1, fret:3, beat:2, noteName:'G4' },
        { string:1, fret:3, beat:3, noteName:'G4' },
        { string:1, fret:0, beat:4, noteName:'E4' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4' },
        { string:1, fret:3, beat:2, noteName:'G4' },
        { string:1, fret:3, beat:3, noteName:'G4' },
        { string:1, fret:5, beat:4, noteName:'A4' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4' },
        { string:1, fret:0, beat:2, noteName:'E4' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:2 },
      ],
    ],
  },
];

// ── Difficulty badge ──────────────────────────────────────────────────────────
function DiffBadge({ level }) {
  const color = level === 'Beginner' ? '#7B9E6B' : '#E8A050';
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
      background: `${color}22`, border: `1px solid ${color}88`, color,
    }}>{level}</span>
  );
}

// ── Listen mode — plays through full song with note highlighting ───────────────
function ListenMode({ song, onBack }) {
  const [playing,    setPlaying]    = useState(false);
  const [noteIdx,    setNoteIdx]    = useState(-1);
  const allNotes = song.measures.flat();
  const timerRef = useRef(null);
  const beatMs   = 60000 / song.bpm;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function play() {
    if (playing) return;
    setPlaying(true);
    setNoteIdx(0);
    playNote(0);
  }

  function playNote(idx) {
    if (idx >= allNotes.length) {
      setPlaying(false);
      setNoteIdx(-1);
      return;
    }
    setNoteIdx(idx);
    const note = allNotes[idx];
    guitarSampler.playNote(note.noteName);
    const dur = (note.duration || 1) * beatMs;
    timerRef.current = setTimeout(() => playNote(idx + 1), dur);
  }

  function stop() {
    clearTimeout(timerRef.current);
    setPlaying(false);
    setNoteIdx(-1);
  }

  return (
    <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={backBtn}>‹ Back</button>
        <div style={{ fontSize: 13, color: M.muted, marginBottom: 4 }}>{song.genre}</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px',
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {song.title}
        </h2>
        <div style={{ fontSize: 12, color: M.muted }}>Listen Mode · {song.durationEst}</div>
      </div>

      {/* Note display */}
      <div style={{
        background: M.surface, borderRadius: 16, border: `1px solid ${M.border}`,
        padding: '20px 16px', marginBottom: 20, minHeight: 80,
        display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start',
      }}>
        {allNotes.map((n, i) => (
          <span key={i} style={{
            padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: i === noteIdx ? M.accent : 'rgba(255,255,255,0.05)',
            color: i === noteIdx ? '#fff' : M.muted,
            border: `1px solid ${i === noteIdx ? M.accent : M.border}`,
            transition: 'background 0.1s, color 0.1s',
          }}>{n.noteName}</span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {!playing ? (
          <button onClick={play} style={primaryBtn}>▶ Play</button>
        ) : (
          <button onClick={stop} style={primaryBtn}>⏹ Stop</button>
        )}
      </div>
    </div>
  );
}

// ── Detail screen ─────────────────────────────────────────────────────────────
function SongDetail({ song, isPro, onUpgrade, onBack }) {
  const [mode, setMode] = useState(null); // null | 'listen' | 'learn' | 'play'

  if (mode === 'listen') return <ListenMode song={song} onBack={() => setMode(null)} />;
  if (mode === 'learn')  return <SongLearnEngine song={song} />;

  const locked = song.pro && !isPro;

  return (
    <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto' }}>
      <button onClick={onBack} style={backBtn}>‹ All Songs</button>

      <div style={{ textAlign: 'center', padding: '20px 0 28px' }}>
        <div style={{ fontSize: 56, marginBottom: 12,
          filter: 'drop-shadow(0 4px 16px rgba(196,100,40,0.45))' }}>🎵</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px',
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {song.title}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <DiffBadge level={song.difficulty} />
          {song.pro && (
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
              background: 'rgba(232,131,58,0.18)', border: '1px solid rgba(232,131,58,0.5)',
              color: M.accent,
            }}>PRO</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: M.muted }}>
          {song.genre} · {song.durationEst} · {song.bpm} BPM
        </div>
      </div>

      {locked ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 13, color: M.muted, marginBottom: 20 }}>
            Unlock all 5 PRO songs with a PRO subscription.
          </div>
          <button onClick={onUpgrade} style={primaryBtn}>Unlock PRO →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setMode('listen')} style={modeBtn}>
            <span style={{ fontSize: 22 }}>🎧</span>
            <div>
              <div style={{ fontWeight: 700 }}>Listen</div>
              <div style={{ fontSize: 11, color: M.muted }}>Hear the full song with highlighted notes</div>
            </div>
          </button>
          <button onClick={() => setMode('learn')} style={modeBtn}>
            <span style={{ fontSize: 22 }}>📖</span>
            <div>
              <div style={{ fontWeight: 700 }}>Song Learn</div>
              <div style={{ fontSize: 11, color: M.muted }}>Measure-by-measure with notation & tab</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Library list ──────────────────────────────────────────────────────────────
export default function SongLibrary({ isPro, onUpgrade }) {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <div style={{
        minHeight: '100vh', background: M.bg, color: M.text,
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: 'env(safe-area-inset-top,16px) 0 40px',
      }}>
        <SongDetail
          song={selected}
          isPro={isPro}
          onUpgrade={onUpgrade}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 40px',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <h1 style={{
          fontSize: 20, fontWeight: 800, margin: 0,
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Song Library</h1>
      </div>

      <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto' }}>
        {/* Free section */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>
          Free
        </div>
        {SONGS.filter(s => !s.pro).map(song => (
          <SongRow key={song.id} song={song} locked={false} onSelect={() => setSelected(song)} />
        ))}

        {/* PRO section */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, margin: '20px 0 8px' }}>
          PRO
        </div>
        {SONGS.filter(s => s.pro).map(song => (
          <SongRow key={song.id} song={song} locked={!isPro}
            onSelect={() => !isPro ? onUpgrade() : setSelected(song)} />
        ))}
      </div>
    </div>
  );
}

function SongRow({ song, locked, onSelect }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        padding: '14px 16px', borderRadius: 14, marginBottom: 10,
        background: M.surface, border: `1px solid ${M.border}`,
        color: M.text, fontFamily: "Georgia, serif", textAlign: 'left',
        cursor: 'pointer', opacity: locked ? 0.65 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 28 }}>🎵</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {song.title}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <DiffBadge level={song.difficulty} />
          <span style={{ fontSize: 10, color: M.muted }}>{song.genre}</span>
          <span style={{ fontSize: 10, color: M.muted }}>· {song.durationEst}</span>
        </div>
      </div>
      <span style={{ color: locked ? M.muted : M.accent, fontSize: 16 }}>
        {locked ? '🔒' : '›'}
      </span>
    </button>
  );
}

const primaryBtn = {
  padding: '14px 32px', borderRadius: 14,
  border: `1px solid ${M.borderHi}`,
  background: `linear-gradient(135deg,#C46428,#E8833A)`,
  color: '#fff', fontFamily: "Georgia, serif",
  fontWeight: 800, fontSize: 16, cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(232,131,58,0.3)',
};

const modeBtn = {
  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
  borderRadius: 14, border: `1px solid ${M.border}`,
  background: M.surface, color: M.text,
  fontFamily: "Georgia, serif", fontSize: 14, textAlign: 'left',
  cursor: 'pointer', width: '100%',
  WebkitTapHighlightColor: 'transparent',
};

const backBtn = {
  background: 'none', border: 'none', color: M.muted,
  fontSize: 14, cursor: 'pointer', padding: '0 0 16px',
  fontFamily: "Georgia, serif", display: 'block',
};
