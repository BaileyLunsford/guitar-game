// Guitar Audition Game — App.js
// Bundle ID: com.orchestraaudition.guitar
// Theme: warm wood / mahogany

import React from 'react';
import TabNotationDisplay from './TabNotationDisplay';
import SongLearnEngine from './SongLearnEngine';
import Tuner from './Tuner';
import Metronome from './Metronome';
import ChordPlay from './ChordPlay';
import BarreChords from './BarreChords';
import CAGEDSystem from './CAGEDSystem';
import ScalePlay from './ScalePlay';
import useIAP from './useIAP';
import useAmbience from './useAmbience';
import LandingPage from './LandingPage';
import AuditionGame from './AuditionGame';
import LickPlay from './LickPlay';
import { guitarSampler } from './guitarSampler';
import OnboardingTour from './OnboardingTour';
import Flashcards from './Flashcards';
import UpgradeModal from './UpgradeModal';

const GUITAR_STRINGS = [
  { label: 'E2', freq: 82.41  },
  { label: 'A2', freq: 110.00 },
  { label: 'D3', freq: 146.83 },
  { label: 'G3', freq: 196.00 },
  { label: 'B3', freq: 246.94 },
  { label: 'E4', freq: 329.63 },
];
const GUITAR_THEME = { bg: '#120A04', card: '#2A1208', amber: '#E8A050', accent: '#C4603A' };

// ─── Colour palette ─────────────────────────────────────────────────────────
// #120A04  very dark mahogany  (background)
// #2A1208  dark wood panel     (surface / card)
// #C46428  warm mahogany       (primary)
// #E8833A  bright wood         (accent)
// #F5A65B  light grain         (highlight)
// #A0785A  worn wood           (muted text)
// #7B9E6B  sage green          (correct feedback)
// #C4603A  ember               (wrong feedback)

// ─── Song-learn data: Twinkle Twinkle — 14 measures, strings 1-2 ─────────────
// String 1 = high E (E4 open): fret0=E4, fret1=F4, fret3=G4, fret5=A4
// String 2 = B (B3 open):      fret1=C4, fret3=D4
// duration:2 = half note (occupies beats 3-4); measureMs uses max beat,
// so a half note on beat 3 with duration:2 correctly spans to beat 4.
const TWINKLE_SONG = {
  title: 'Twinkle Twinkle Little Star',
  bpm: 80,
  measures: [
    // M1: C C G G
    [
      { string: 2, fret: 1, beat: 1, noteName: 'C4' },
      { string: 2, fret: 1, beat: 2, noteName: 'C4' },
      { string: 1, fret: 3, beat: 3, noteName: 'G4' },
      { string: 1, fret: 3, beat: 4, noteName: 'G4' },
    ],
    // M2: A A G G
    [
      { string: 1, fret: 5, beat: 1, noteName: 'A4' },
      { string: 1, fret: 5, beat: 2, noteName: 'A4' },
      { string: 1, fret: 3, beat: 3, noteName: 'G4' },
      { string: 1, fret: 3, beat: 4, noteName: 'G4' },
    ],
    // M3: F F E E
    [
      { string: 1, fret: 1, beat: 1, noteName: 'F4' },
      { string: 1, fret: 1, beat: 2, noteName: 'F4' },
      { string: 1, fret: 0, beat: 3, noteName: 'E4' },
      { string: 1, fret: 0, beat: 4, noteName: 'E4' },
    ],
    // M4: D D C(half)
    [
      { string: 2, fret: 3, beat: 1, noteName: 'D4' },
      { string: 2, fret: 3, beat: 2, noteName: 'D4' },
      { string: 2, fret: 1, beat: 3, noteName: 'C4', duration: 2 },
    ],
    // M5: G G F F
    [
      { string: 1, fret: 3, beat: 1, noteName: 'G4' },
      { string: 1, fret: 3, beat: 2, noteName: 'G4' },
      { string: 1, fret: 1, beat: 3, noteName: 'F4' },
      { string: 1, fret: 1, beat: 4, noteName: 'F4' },
    ],
    // M6: E E D(half)
    [
      { string: 1, fret: 0, beat: 1, noteName: 'E4' },
      { string: 1, fret: 0, beat: 2, noteName: 'E4' },
      { string: 2, fret: 3, beat: 3, noteName: 'D4', duration: 2 },
    ],
    // M7: G G F F
    [
      { string: 1, fret: 3, beat: 1, noteName: 'G4' },
      { string: 1, fret: 3, beat: 2, noteName: 'G4' },
      { string: 1, fret: 1, beat: 3, noteName: 'F4' },
      { string: 1, fret: 1, beat: 4, noteName: 'F4' },
    ],
    // M8: E E D(half)
    [
      { string: 1, fret: 0, beat: 1, noteName: 'E4' },
      { string: 1, fret: 0, beat: 2, noteName: 'E4' },
      { string: 2, fret: 3, beat: 3, noteName: 'D4', duration: 2 },
    ],
    // M9: G G F F
    [
      { string: 1, fret: 3, beat: 1, noteName: 'G4' },
      { string: 1, fret: 3, beat: 2, noteName: 'G4' },
      { string: 1, fret: 1, beat: 3, noteName: 'F4' },
      { string: 1, fret: 1, beat: 4, noteName: 'F4' },
    ],
    // M10: E E D(half)
    [
      { string: 1, fret: 0, beat: 1, noteName: 'E4' },
      { string: 1, fret: 0, beat: 2, noteName: 'E4' },
      { string: 2, fret: 3, beat: 3, noteName: 'D4', duration: 2 },
    ],
    // M11: C C G G  (Twinkle twinkle reprise)
    [
      { string: 2, fret: 1, beat: 1, noteName: 'C4' },
      { string: 2, fret: 1, beat: 2, noteName: 'C4' },
      { string: 1, fret: 3, beat: 3, noteName: 'G4' },
      { string: 1, fret: 3, beat: 4, noteName: 'G4' },
    ],
    // M12: A A G(half)
    [
      { string: 1, fret: 5, beat: 1, noteName: 'A4' },
      { string: 1, fret: 5, beat: 2, noteName: 'A4' },
      { string: 1, fret: 3, beat: 3, noteName: 'G4', duration: 2 },
    ],
    // M13: F F E E
    [
      { string: 1, fret: 1, beat: 1, noteName: 'F4' },
      { string: 1, fret: 1, beat: 2, noteName: 'F4' },
      { string: 1, fret: 0, beat: 3, noteName: 'E4' },
      { string: 1, fret: 0, beat: 4, noteName: 'E4' },
    ],
    // M14: D D C(half)
    [
      { string: 2, fret: 3, beat: 1, noteName: 'D4' },
      { string: 2, fret: 3, beat: 2, noteName: 'D4' },
      { string: 2, fret: 1, beat: 3, noteName: 'C4', duration: 2 },
    ],
  ],
};

// ─── Tab-test data: Twinkle Twinkle — 8 notes on low E string (string 6) ───
// Guitar written pitch: sounds one octave lower than written.
// Open string 6 (E2 sounding) → written as E3 on treble clef.
// Frets 12–21 keep written pitches on the staff in a comfortable range.
const TWINKLE_LOW_E = [
  { string: 6, fret: 12, beat: 1, noteName: 'E4' },   // Twin-
  { string: 6, fret: 12, beat: 2, noteName: 'E4' },   // -kle
  { string: 6, fret: 19, beat: 3, noteName: 'B4' },   // Lit-
  { string: 6, fret: 19, beat: 4, noteName: 'B4' },   // -tle
  { string: 6, fret: 21, beat: 5, noteName: 'C#5' },  // Star
  { string: 6, fret: 21, beat: 6, noteName: 'C#5' },  // How
  { string: 6, fret: 19, beat: 7, noteName: 'B4' },   // I
  { string: 6, fret: 17, beat: 8, noteName: 'A4' },   // Won-
];

// ─── Tab test screen ────────────────────────────────────────────────────────
function TabTest() {
  const [started, setStarted] = React.useState(false);
  const [active, setActive] = React.useState(null);

  if (!started) return (
    <LandingPage
      emoji="🎼"
      title="Tab & Notation"
      description="Read music the guitarist's way. See standard notation and guitar tablature side by side. Train your eyes and ears together."
      difficulty="Beginner"
      features={['Standard notation + guitar tab overlay', 'Highlighted active note playback', 'Builds music reading fundamentals']}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#120A04',
      color: '#F5E8D8',
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎸</div>
          <h1 style={{
            fontSize: 20, fontWeight: 800, marginBottom: 4,
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Tab & Notation
          </h1>
          <p style={{ fontSize: 12, color: '#A0785A' }}>
            Twinkle Twinkle · 8 notes · low E string
          </p>
        </div>

        {/* Both staves */}
        <section style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: '#A0785A', letterSpacing: '0.1em',
            textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Notation + Tab
          </label>
          <div style={{ background: '#2A1208', borderRadius: 14, padding: '16px 12px',
            border: '1px solid rgba(196,100,40,0.2)' }}>
            <TabNotationDisplay
              notes={TWINKLE_LOW_E}
              currentNote={active}
            />
          </div>
        </section>

        {/* Notation only */}
        <section style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: '#A0785A', letterSpacing: '0.1em',
            textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Notation only
          </label>
          <div style={{ background: '#2A1208', borderRadius: 14, padding: '16px 12px',
            border: '1px solid rgba(196,100,40,0.2)' }}>
            <TabNotationDisplay
              notes={TWINKLE_LOW_E}
              showTab={false}
              currentNote={active}
            />
          </div>
        </section>

        {/* Tab only */}
        <section style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 11, color: '#A0785A', letterSpacing: '0.1em',
            textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Tab only
          </label>
          <div style={{ background: '#2A1208', borderRadius: 14, padding: '16px 12px',
            border: '1px solid rgba(196,100,40,0.2)' }}>
            <TabNotationDisplay
              notes={TWINKLE_LOW_E}
              showNotation={false}
              currentNote={active}
            />
          </div>
        </section>

        {/* Beat selector — tap to highlight */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: '#A0785A', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Tap a note to highlight
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TWINKLE_LOW_E.map((note, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActive(active === idx ? null : idx);
                  guitarSampler.resume();
                  guitarSampler.playNote(note.noteName);
                }}
                style={{
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "Georgia, serif",
                  background: active === idx
                    ? 'rgba(232,131,58,0.25)'
                    : 'rgba(196,100,40,0.1)',
                  border: `1px solid ${active === idx
                    ? 'rgba(232,131,58,0.7)'
                    : 'rgba(196,100,40,0.35)'}`,
                  color: active === idx ? '#F5A65B' : '#A0785A',
                  transition: 'all 0.15s',
                }}
              >
                {note.noteName}
                <span style={{ display: 'block', fontSize: 10, opacity: 0.7 }}>
                  fr.{note.fret}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <a
            href="#home"
            onClick={() => window.history.back()}
            style={{ color: '#A0785A', fontSize: 13, textDecoration: 'none' }}
          >
            ← Back to home
          </a>
        </div>

      </div>
    </div>
  );
}

// ─── Song play screen ────────────────────────────────────────────────────────
function SongPlayScreen({ song }) {
  const measures = song?.measures ?? [];
  const total    = measures.length;
  const bpm      = song?.bpm ?? 80;

  const [measureIdx, setMeasureIdx] = React.useState(0);
  const [playing,    setPlaying]    = React.useState(false);
  const [activeNote, setActiveNote] = React.useState(null); // index into current measure

  const timerRef      = React.useRef(null);
  const noteTimersRef = React.useRef([]);

  function clearNoteTimers() {
    noteTimersRef.current.forEach(t => clearTimeout(t));
    noteTimersRef.current = [];
    setActiveNote(null);
  }

  function measureMs(idx) {
    const m = measures[idx] ?? [];
    const beats = m.length > 0 ? Math.max(...m.map(n => n.beat + (n.duration ?? 1) - 1)) : 4;
    return Math.round(beats * (60_000 / bpm));
  }

  function playMeasureNotes(measure) {
    clearNoteTimers();
    guitarSampler.resume();
    const beatMs = 60_000 / bpm;
    measure.forEach((note, idx) => {
      const ms = Math.round((note.beat - 1) * beatMs);
      const t = setTimeout(() => {
        guitarSampler.playNote(note.noteName);
        setActiveNote(idx);
      }, ms);
      noteTimersRef.current.push(t);
    });
    // Clear highlight after last note finishes
    if (measure.length > 0) {
      const last = measure[measure.length - 1];
      const clearMs = Math.round((last.beat - 1 + (last.duration ?? 1)) * beatMs);
      const tc = setTimeout(() => setActiveNote(null), clearMs);
      noteTimersRef.current.push(tc);
    }
  }

  function stop() {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    clearNoteTimers();
    setPlaying(false);
  }

  // Play current measure's notes, then advance after its duration
  React.useEffect(() => {
    if (!playing) return;
    playMeasureNotes(measures[measureIdx] ?? []);
    const dur = measureMs(measureIdx);
    timerRef.current = setTimeout(() => {
      if (measureIdx >= total - 1) {
        setPlaying(false); // end of song
      } else {
        setMeasureIdx(i => i + 1);
      }
    }, dur);
    return () => clearTimeout(timerRef.current);
  }, [playing, measureIdx]); // eslint-disable-line

  React.useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearNoteTimers();
  }, []);

  function handlePlayPause() {
    if (playing) { stop(); return; }
    setMeasureIdx(0);
    setPlaying(true);
  }

  const pct = total > 1 ? (measureIdx / (total - 1)) * 100 : 0;
  const M = { bg:'#120A04', surface:'#2A1208', panel:'#1E0D06',
    primary:'#C46428', accent:'#E8833A', hi:'#F5A65B', muted:'#A0785A',
    text:'#F5E8D8', border:'rgba(196,100,40,0.25)', borderHi:'rgba(232,131,58,0.55)' };

  return (
    <div style={{ minHeight:'100vh', background:M.bg, color:M.text,
      fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px' }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:36, marginBottom:6,
            filter:'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
          <p style={{ fontSize:11, color:M.muted, textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:6 }}>Now Playing</p>
          <h1 style={{ fontSize:20, fontWeight:800, marginBottom:4, letterSpacing:'-0.01em',
            background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {song?.title ?? 'Song'}
          </h1>
          <p style={{ fontSize:13, color:M.muted }}>
            {playing
              ? <>Measure <strong style={{ color:M.hi }}>{measureIdx + 1}</strong> of {total}</>
              : measureIdx >= total - 1 && !playing
                ? <span style={{ color:M.hi }}>Complete</span>
                : <span style={{ color:M.muted }}>{total} measures · {bpm} BPM</span>
            }
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ height:5, background:M.surface, borderRadius:3,
          marginBottom:20, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:3,
            background:`linear-gradient(90deg,${M.primary},${M.accent})`,
            width:`${playing || measureIdx > 0 ? pct : 0}%`,
            transition:'width 0.35s ease' }} />
        </div>

        {/* Notation + Tab — updates in real time as measures advance */}
        <div style={{ background:M.surface, borderRadius:14,
          padding:'16px 12px', border:`1px solid ${M.border}`,
          marginBottom:24 }}>
          <TabNotationDisplay notes={measures[measureIdx] ?? []} currentNote={activeNote} />
        </div>

        {/* Big play/pause button */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:32 }}>
          <button
            onClick={handlePlayPause}
            style={{
              width:80, height:80, borderRadius:'50%',
              border:`2px solid ${playing ? M.borderHi : M.border}`,
              background: playing ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.12)',
              color: playing ? M.hi : M.text,
              fontSize:30, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s', userSelect:'none',
              boxShadow: playing ? '0 0 24px rgba(232,131,58,0.3)' : 'none',
            }}
          >
            {playing ? '⏹' : '▶'}
          </button>
        </div>

        {/* Measure dots */}
        <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:32, flexWrap:'wrap' }}>
          {measures.map((_, i) => (
            <div key={i} style={{
              width: i === measureIdx && playing ? 20 : 8,
              height:8, borderRadius:4,
              background: i < measureIdx ? M.primary
                : i === measureIdx ? M.accent : M.surface,
              transition:'all 0.2s ease',
            }} />
          ))}
        </div>

        {/* Back to Song Learn */}
        <div style={{ textAlign:'center', paddingBottom:40 }}>
          <a href="#song-learn"
            onClick={stop}
            style={{ color:M.muted, fontSize:13, textDecoration:'none' }}>
            ← Back to Song Learn
          </a>
        </div>

      </div>
    </div>
  );
}

// ─── Shared stub screen ──────────────────────────────────────────────────────
function StubScreen({ icon, title, description, pro = false }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#120A04', color: '#F5E8D8',
      fontFamily: "Georgia, 'Times New Roman', serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16,
        filter: 'drop-shadow(0 4px 16px rgba(196,100,40,0.45))' }}>{icon}</div>
      <h1 style={{
        fontSize: 22, fontWeight: 800, marginBottom: 8,
        background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>{title}</h1>
      {pro && (
        <span style={{
          display: 'inline-block', marginBottom: 16,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
          background: 'rgba(232,131,58,0.18)', border: '1px solid rgba(232,131,58,0.5)',
          color: '#E8833A',
        }}>PRO</span>
      )}
      <p style={{ fontSize: 14, color: '#A0785A', lineHeight: 1.7,
        maxWidth: 280, marginBottom: 40 }}>{description}</p>
      <a href="#" style={{
        fontSize: 13, color: '#A0785A', textDecoration: 'none',
        padding: '10px 22px', borderRadius: 12,
        border: '1px solid rgba(196,100,40,0.3)',
        background: 'rgba(196,100,40,0.08)',
      }}>← Back to home</a>
    </div>
  );
}

// ─── Home screen ────────────────────────────────────────────────────────────
const HOME_SECTIONS = [
  {
    label: 'Beginner', sectionBadge: 'FREE', sectionBadgeClass: 'badge-free',
    items: [
      { icon: '🎸', title: 'Audition Game',  desc: 'Sight-read notes with real-time mic pitch detection', hash: '#audition',   pro: false },
      { icon: '🎵', title: 'Song Learn',     desc: 'Measure-by-measure playback with notation & tab',    hash: '#song-learn', pro: false },
      { icon: '🎼', title: 'Tab & Notation', desc: 'Standard notation with guitar tablature overlay',    hash: '#tab-test',   pro: false },
      { icon: '🃏', title: 'Flashcards',     desc: 'Drill notes, chords, tab & theory — flip to check', hash: '#flashcards', pro: false },
    ],
  },
  {
    label: 'Intermediate', sectionBadge: null,
    items: [
      { icon: '🎹', title: 'Scale Play',    desc: 'Interactive scale patterns across the fretboard',  hash: '#scale-play',   pro: false },
      { icon: '🎸', title: 'Lick Play',     desc: 'Classic riffs phrase by phrase',                   hash: '#lick-play',    pro: false },
      { icon: '🤘', title: 'Barre Chords',  desc: 'Moveable E and A shapes in every key',             hash: '#barre-chords', pro: false },
      { icon: '🎸', title: 'Chord Play',    desc: 'Open chords, voicings & I–IV–V progressions',      hash: '#chord-play',   pro: true  },
    ],
  },
  {
    label: 'Advanced', sectionBadge: 'PRO', sectionBadgeClass: 'badge-pro',
    items: [
      { icon: '🎸', title: 'CAGED System',        desc: 'One chord. Five positions. The whole neck.',  hash: '#caged',  pro: true, soon: false },
      { icon: '🎵', title: 'Triads & Arpeggios',  desc: 'Lead playing essentials',                     hash: null,      pro: true, soon: true  },
      { icon: '🎙', title: 'Backing Tracks',       desc: 'Full band for every genre',                   hash: null,      pro: true, soon: true  },
      { icon: '📈', title: 'Progress Tracker',     desc: 'Streaks, goals, and charts',                  hash: null,      pro: true, soon: true  },
    ],
  },
  {
    label: 'Always Free', sectionBadge: 'FREE', sectionBadgeClass: 'badge-free',
    items: [
      { icon: '🎸', title: 'Tuner',     desc: 'Chromatic pitch detection for EADGBE tuning', hash: '#tuner',     pro: false },
      { icon: '⏱',  title: 'Metronome', desc: 'Tap tempo, subdivisions & accent control',    hash: '#metronome', pro: false },
    ],
  },
];

function Home({ ambOn, ambToggle, onShowTour, isPro, onUpgrade }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#120A04', color: '#F5E8D8',
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 env(safe-area-inset-bottom,16px)',
      overflowY: 'auto',
    }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #120A04; }
        .feat-card {
          background: #2A1208;
          border: 1px solid rgba(196,100,40,0.22);
          border-radius: 16px;
          padding: 16px 14px 14px;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: border-color 0.15s, background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .feat-card:hover, .feat-card:active {
          border-color: rgba(232,131,58,0.55);
          background: #341609;
        }
        .feat-card.soon {
          opacity: 0.45; cursor: default; pointer-events: none;
        }
        .feat-icon { font-size: 28px; margin-bottom: 6px;
          filter: drop-shadow(0 2px 6px rgba(196,100,40,0.35)); }
        .feat-title { font-size: 14px; font-weight: 800; color: #F5E8D8;
          letter-spacing: -0.01em; }
        .feat-desc { font-size: 11px; color: #A0785A; line-height: 1.5; flex: 1; }
        .feat-badge {
          align-self: flex-start; margin-top: 8px;
          font-size: 9px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 2px 8px; border-radius: 20px;
        }
        .badge-free {
          background: rgba(123,158,107,0.15);
          border: 1px solid rgba(123,158,107,0.45);
          color: #7B9E6B;
        }
        .badge-pro {
          background: rgba(232,131,58,0.18);
          border: 1px solid rgba(232,131,58,0.5);
          color: #E8833A;
        }
        .badge-soon {
          background: rgba(160,120,90,0.15);
          border: 1px solid rgba(160,120,90,0.4);
          color: #A0785A;
        }
        .section-header {
          display: flex; align-items: center; gap: 10;
          padding: '0 16px'; margin-bottom: 10px;
        }
        .amb-toggle {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; max-width: 448px; margin: 0 auto 24px;
          padding: 14px 18px; border-radius: 14px; cursor: pointer;
          background: #2A1208; border: 1px solid rgba(196,100,40,0.22);
          color: #F5E8D8; font-family: Georgia, serif; font-size: 14px;
          transition: border-color 0.15s, background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .amb-toggle:active { background: #341609; border-color: rgba(232,131,58,0.55); }
        .amb-pip {
          width: 42px; height: 24px; border-radius: 12px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(196,100,40,0.3);
          position: relative; transition: background 0.2s, border-color 0.2s;
        }
        .amb-pip.on { background: #C46428; border-color: #E8833A; }
        .amb-pip::after {
          content: ''; position: absolute; top: 3px; left: 3px;
          width: 16px; height: 16px; border-radius: 50%;
          background: rgba(255,255,255,0.4); transition: transform 0.2s, background 0.2s;
        }
        .amb-pip.on::after { transform: translateX(18px); background: #fff; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '32px 24px 24px', position: 'relative' }}>
        {/* Top-right controls: PRO badge (or Unlock link) + ? button */}
        <div style={{ position: 'absolute', top: 32, right: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          {isPro ? (
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '0.1em',
              padding: '3px 8px', borderRadius: 20,
              background: 'linear-gradient(135deg,#F5C842,#E8A838)',
              color: '#120A04',
            }}>PRO</span>
          ) : (
            <button onClick={() => onUpgrade()} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#E8833A', fontSize: 12, fontWeight: 700,
              fontFamily: "Georgia, serif", padding: 0,
            }}>Unlock PRO →</button>
          )}
          <button onClick={onShowTour} style={{
            width: 30, height: 30, borderRadius: '50%',
            border: '1px solid rgba(196,100,40,0.4)',
            background: 'rgba(196,100,40,0.12)',
            color: '#A0785A', fontFamily: "Georgia, serif",
            fontSize: 14, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, flexShrink: 0,
          }}>?</button>
        </div>

        <div style={{ fontSize: 64, marginBottom: 12,
          filter: 'drop-shadow(0 4px 20px rgba(196,100,40,0.55))' }}>🎸</div>
        <h1 style={{
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6,
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428,#F5A65B)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Guitar Audition Game</h1>
        <p style={{ fontSize: 13, color: '#A0785A', letterSpacing: '0.08em',
          textTransform: 'uppercase', fontWeight: 500 }}>
          Learn · Tune · Play
        </p>
      </div>

      {/* Sectioned feature grid */}
      <div style={{ padding: '0 16px 32px', maxWidth: 480, margin: '0 auto' }}>
        {HOME_SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: 28 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#A0785A' }}>
                {section.label}
              </span>
              {section.sectionBadge && (
                <span className={`feat-badge ${section.sectionBadgeClass}`} style={{ marginTop: 0 }}>
                  {section.sectionBadge}
                </span>
              )}
              <div style={{ flex: 1, height: 1, background: 'rgba(196,100,40,0.18)' }} />
            </div>
            {/* 2-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {section.items.map(f => {
                const isLocked = f.soon && !isPro;
                return (
                <a
                  key={f.title}
                  href={(!f.soon && f.hash) ? f.hash : undefined}
                  onClick={isLocked ? (e) => { e.preventDefault(); onUpgrade(f.title + ' — PRO Feature'); } : undefined}
                  className={`feat-card${f.soon ? ' soon' : ''}`}
                  style={isLocked ? { cursor: 'pointer', pointerEvents: 'auto', opacity: 0.55 } : undefined}
                >
                  <div className="feat-icon">{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                  {f.soon ? (
                    <span className="feat-badge badge-soon">Soon</span>
                  ) : (
                    <span className={`feat-badge ${f.pro ? 'badge-pro' : 'badge-free'}`}>
                      {f.pro ? 'PRO' : 'FREE'}
                    </span>
                  )}
                </a>
              );})}
            </div>
          </div>
        ))}
      </div>

      {/* Ambience toggle */}
      <div style={{ padding: '0 16px' }}>
        <button className="amb-toggle" onClick={ambToggle}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>🎵 Ambience</div>
            <div style={{ fontSize: 11, color: '#A0785A' }}>Background music while you practice</div>
          </div>
          <div className={`amb-pip${ambOn ? ' on' : ''}`} />
        </button>
      </div>
    </div>
  );
}

// ─── Root — hash-based routing ───────────────────────────────────────────────
export default function App() {
  const [hash,         setHash]         = React.useState(window.location.hash);
  const [showTour,     setShowTour]     = React.useState(() => !localStorage.getItem('guitar_tour_seen'));
  const [tourSlide,    setTourSlide]    = React.useState(0);
  const [showUpgrade,  setShowUpgrade]  = React.useState(false);
  const prevIsProRef                    = React.useRef(localStorage.getItem('guitar_pro') === 'true');
  const { isPro, purchase, restore, purchasePro, restorePurchases, devToggle } = useIAP();
  const { ambOn, ambToggle, ambStop } = useAmbience('/orchestra.wav');

  // Detect PRO upgrade → show post-upgrade tour slide
  React.useEffect(() => {
    if (isPro && !prevIsProRef.current && !showUpgrade) {
      prevIsProRef.current = true;
      setTourSlide(3);
      setShowTour(true);
    } else {
      prevIsProRef.current = isPro;
    }
  }, [isPro, showUpgrade]);

  React.useEffect(() => {
    const onHash = () => {
      ambStop();
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [ambStop]);

  function handleTourComplete() {
    localStorage.setItem('guitar_tour_seen', '1');
    setShowTour(false);
    setTourSlide(0);
  }

  function handleTourUpgrade() {
    localStorage.setItem('guitar_tour_seen', '1');
    setShowTour(false);
    setTourSlide(0);
    setShowUpgrade(true);
  }

  // Called from Home header "Unlock PRO →", locked cards, and DEV triple-tap
  function handleUpgrade(featureOrSignal) {
    if (featureOrSignal === '__devToggle__') {
      devToggle();
      return;
    }
    setShowUpgrade(true);
  }

  if (showTour) return (
    <>
      <OnboardingTour
        onComplete={handleTourComplete}
        onUpgrade={handleTourUpgrade}
        startSlide={tourSlide}
      />
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onPurchase={purchase}
        onRestore={restore}
      />
    </>
  );

  if (hash === '#audition')    return <AuditionGame />;
  if (hash === '#tab-test')    return <TabTest />;
  if (hash === '#song-learn')  return <SongLearnEngine song={TWINKLE_SONG} />;
  if (hash === '#song-play')   return <SongPlayScreen  song={TWINKLE_SONG} />;
  if (hash === '#tuner')       return <Tuner strings={GUITAR_STRINGS} theme={GUITAR_THEME} title="Tune Your Guitar" />;
  if (hash === '#scale-play')  return <ScalePlay    isPro={isPro} onPurchase={purchase} onRestore={restore} />;
  if (hash === '#lick-play')   return <LickPlay     isPro={isPro} onPurchase={purchase} onRestore={restore} />;
  if (hash === '#chord-play')  return <ChordPlay    isPro={isPro} onPurchase={purchase} onRestore={restore} />;
  if (hash === '#barre-chords')return <BarreChords  isPro={isPro} onPurchase={purchase} onRestore={restore} />;
  if (hash === '#caged')       return <CAGEDSystem  isPro={isPro} onPurchase={purchase} onRestore={restore} />;
  if (hash === '#flashcards')  return <Flashcards   isPro={isPro} onPurchase={purchase} onRestore={restore} />;
  if (hash === '#metronome')   return <Metronome theme={GUITAR_THEME} title="Guitar Metronome" />;

  return (
    <>
      <Home ambOn={ambOn} ambToggle={ambToggle} onShowTour={() => { setTourSlide(0); setShowTour(true); }} isPro={isPro} onUpgrade={handleUpgrade} />
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onPurchase={purchase}
        onRestore={restore}
      />
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={devToggle}
          style={{
            position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)', border: '1px solid #666',
            color: '#fff', fontSize: 12, padding: '8px 16px', borderRadius: 8,
            cursor: 'pointer', zIndex: 9999, fontFamily: 'monospace', whiteSpace: 'nowrap',
          }}
        >[DEV] Toggle PRO — {isPro ? 'ON' : 'OFF'}</button>
      )}
    </>
  );
}
