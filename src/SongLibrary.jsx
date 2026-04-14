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
import useBackingTrack from './useBackingTrack';
import { getAudioContext } from './audioContext';

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
// Duration codes: 'q'=quarter(1), 'h'=half(2), 'w'=whole(4),
//                 'dq'=dotted-quarter(1.5), 'e'=eighth(0.5),
//                 'qr'=quarter-rest(1), 'hr'=half-rest(2)

const BEAT_MAP = { q: 1, h: 2, w: 4, dq: 1.5, e: 0.5, qr: 1, hr: 2 };
const REST_CODES = new Set(['qr', 'hr']);

// Map song genre labels → backing track genre keys (blues / rock / country)
const GENRE_TO_TRACK = {
  'Children':           'blues',
  'Classical':          'blues',
  'Hymn':               'blues',
  'Folk':               'blues',
  'Bluegrass':          'country',
  'Gospel / Bluegrass': 'country',
};

function beatDur(d) {
  if (!d) return 1;
  if (typeof d === 'number') return d;
  return BEAT_MAP[d] || 1;
}

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
      // M1 "Twinkle twinkle"
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      // M2 "little star"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      // M3 "How I wonder"
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      // M4 "what you are"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'h' },
      ],
      // M5 "Up above the"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      // M6 "world so high"
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      // M7 "Like a diamond"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      // M8 "in the sky"
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      // M9 "Twinkle twinkle" (reprise bridge)
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      // M10
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      // M11 "Twinkle twinkle" (final verse)
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      // M12
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      // M13
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      // M14
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'h' },
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
      // M1
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      // M2
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      // M3
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      // M4
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      // M5 (repeat)
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      // M6
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      // M7
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      // M8 (cadence)
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'h' },
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
      // M1 "A-maz-ing" (3/4: dq+e=2b, q=1b)
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'dq' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      // M2 "grace, how"
      [
        { string:3, fret:2, beat:1, noteName:'D5', duration:'h' },
        { string:3, fret:2, beat:3, noteName:'D5', duration:'q' },
      ],
      // M3 "sweet the"
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'dq' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      // M4 "sound that"
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      // M5 "saved a"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'dq' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      // M6 "wretch like"
      [
        { string:3, fret:2, beat:1, noteName:'D5', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      // M7 "me, I"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'dq' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      // M8 "once was"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
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
    bpm: 140,
    measures: [
      // M1 A-part
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'e' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'e' },
        { string:2, fret:3, beat:5, noteName:'D4', duration:'e' },
        { string:1, fret:0, beat:6, noteName:'E4', duration:'e' },
        { string:1, fret:3, beat:7, noteName:'G4', duration:'e' },
        { string:1, fret:5, beat:8, noteName:'A4', duration:'e' },
      ],
      // M2
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:5, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:7, noteName:'D4', duration:'qr' },
      ],
      // M3 B-part
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'e' },
        { string:1, fret:5, beat:5, noteName:'A4', duration:'e' },
        { string:1, fret:5, beat:6, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:7, noteName:'G4', duration:'q' },
      ],
      // M4
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'e' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'e' },
        { string:2, fret:3, beat:5, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:7, noteName:'C4', duration:'h' },
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
    bpm: 100,
    measures: [
      // M1 Verse (3/4)
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      // M2
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      // M3
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      // M4
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      // M5 Chorus
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      // M6
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      // M7
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      // M8
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'hr' },
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
      // M1 "Will the circle"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      // M2 "be unbroken"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      // M3 "by and by Lord"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      // M4 "by and by"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'h' },
      ],
      // M5 "In the sky Lord"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      // M6 "in the sky"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      // M7 "There's a better"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      // M8 "home a-waiting"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'w' },
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
  const [playing,  setPlaying]  = useState(false);
  const [noteIdx,  setNoteIdx]  = useState(-1);

  const allNotes    = song.measures.flat();
  const displayNotes = allNotes
    .map((n, i) => ({ ...n, allIdx: i }))
    .filter(n => !REST_CODES.has(n.duration));

  const timerRef = useRef(null);
  const beatMs   = 60000 / song.bpm;

  // Backing track — genre-mapped, synced to song BPM
  const trackGenre = GENRE_TO_TRACK[song.genre] || 'blues';
  const { trackOn, toggleTrack, stopTrack, syncToTime } = useBackingTrack(trackGenre, song.bpm);

  // Cleanup: stop timer + backing track when component unmounts or user goes back
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    stopTrack();
  }, []); // eslint-disable-line

  function play() {
    if (playing) return;
    guitarSampler.resume?.();
    // Anchor backing track to beat 1 now — same pattern as LickPlay
    const ctx = getAudioContext();
    const startTime = ctx.currentTime + 0.05;
    if (!trackOn) toggleTrack(); // turn on first if needed
    syncToTime(startTime);       // re-anchor pattern to beat 1
    setPlaying(true);
    playNote(0);
  }

  function playNote(idx) {
    if (idx >= allNotes.length) {
      setPlaying(false);
      setNoteIdx(-1);
      stopTrack(); // auto-stop when song finishes
      return;
    }
    setNoteIdx(idx);
    const note = allNotes[idx];
    if (!REST_CODES.has(note.duration)) {
      guitarSampler.playNote(note.noteName);
    }
    const dur = beatDur(note.duration) * beatMs;
    timerRef.current = setTimeout(() => playNote(idx + 1), dur);
  }

  function stop() {
    clearTimeout(timerRef.current);
    setPlaying(false);
    setNoteIdx(-1);
    stopTrack();
  }

  function handleBack() {
    stop();
    onBack();
  }

  return (
    <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleBack} style={backBtn}>‹ Back</button>
        <div style={{ fontSize: 13, color: M.muted, marginBottom: 4 }}>{song.genre}</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px',
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {song.title}
        </h2>
        <div style={{ fontSize: 12, color: M.muted }}>Listen Mode · {song.durationEst} · {song.bpm} BPM</div>
      </div>

      {/* Note display */}
      <div style={{
        background: M.surface, borderRadius: 16, border: `1px solid ${M.border}`,
        padding: '20px 16px', marginBottom: 20, minHeight: 80,
        display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start',
      }}>
        {displayNotes.map((n, i) => (
          <span key={i} style={{
            padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: n.allIdx === noteIdx ? M.accent : 'rgba(255,255,255,0.05)',
            color: n.allIdx === noteIdx ? '#fff' : M.muted,
            border: `1px solid ${n.allIdx === noteIdx ? M.accent : M.border}`,
            transition: 'background 0.1s, color 0.1s',
          }}>{n.noteName}</span>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {!playing ? (
          <button onClick={play} style={primaryBtn}>▶ Play</button>
        ) : (
          <button onClick={stop} style={primaryBtn}>⏹ Stop</button>
        )}
        <button
          onClick={toggleTrack}
          style={{
            padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
            border: `1px solid ${trackOn ? M.borderHi : M.border}`,
            background: trackOn ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
            color: trackOn ? M.hi : M.muted,
            fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700,
            transition: 'all 0.15s',
          }}
        >
          🥁 {trackOn ? 'Track On' : 'Track Off'}
        </button>
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
