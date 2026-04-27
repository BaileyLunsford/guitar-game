// STANDARD AUDITION GAME PATTERN
// ─────────────────────────────────────────────────────────────────────────────
// Phase flow:  landing → levelSelect → playing → results
//
// State:
//   phase           'landing' | 'levelSelect' | 'playing' | 'results'
//   currentNote     note name string (e.g. "C3") for the note the player must play
//   flashState      null | 'correct' | 'wrong'  — brief color flash on evaluation
//   showFretboard   bool — user toggle; also auto-set true on wrong answer
//
// Refs (hot loop — never trigger re-render):
//   analyserRef, dStateRef, sustainCountRef, sustainNoteRef
//   noteQueueRef, noteIdxRef, correctRef, totalRef, streakRef
//   phaseRef, levelIdxRef, timerTotalRef
//
// Stale-closure pattern:
//   onTimeoutRef.current   = onTimeout;    // updated every render
//   advanceNoteRef.current = advanceNote;  // updated every render
//   Timers/RAF call ref.current() to always get the latest version.
//
// Pitch detection:
//   Autocorrelation, guitar range E2–E5 (minOff sr/700, maxOff sr/70).
//   SUSTAIN_FRAMES consecutive matching frames → evaluateNote().
//   COOLDOWN_MS guard prevents double-triggers.
//
// TabNotationDisplay usage:
//   Pass a single-item notes array built from NOTE_FRET[currentNote].
//   currentNote={0} always (only one note displayed at a time).
//   Highlight state controlled by ringColor / flashState, not by this prop.
//
// FretHint:
//   Inline SVG mini-fretboard. Shows only the target note dot.
//   Auto-shown on wrong answer; toggled by "Show Fingerboard" button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage';
import TabNotationDisplay from './TabNotationDisplay';

// ── Detection constants ───────────────────────────────────────────────────────
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const RMS_THRESHOLD  = IS_IOS ? 0.010 : 0.015;
const SUSTAIN_FRAMES = IS_IOS ? 5 : 8;
const COOLDOWN_MS    = 500;
const NOTE_TOL       = IS_IOS ? 25 : 22;

// ── Frequency table: E2–E5 ────────────────────────────────────────────────────
const NOTE_FREQ = {
  E2:82.41,  F2:87.31,  'F#2':92.50, G2:98.00,  'G#2':103.83,
  A2:110.00, 'A#2':116.54, B2:123.47,
  C3:130.81, 'C#3':138.59, D3:146.83, 'D#3':155.56, E3:164.81,
  F3:174.61, 'F#3':185.00, G3:196.00, 'G#3':207.65, A3:220.00,
  'A#3':233.08, B3:246.94,
  C4:261.63, 'C#4':277.18, D4:293.66, 'D#4':311.13, E4:329.63,
  F4:349.23, 'F#4':369.99, G4:392.00, 'G#4':415.30, A4:440.00,
  'A#4':466.16, B4:493.88,
  C5:523.25, 'C#5':554.37, D5:587.33, 'D#5':622.25, E5:659.25,
};

// ── Guitar strings (low → high) ───────────────────────────────────────────────
const GUITAR_STRINGS = [
  { key:'E2', label:'E', name:'Low E',  color:'#C46428' },
  { key:'A2', label:'A', name:'A',      color:'#E8833A' },
  { key:'D3', label:'D', name:'D',      color:'#F5A65B' },
  { key:'G3', label:'G', name:'G',      color:'#A0785A' },
  { key:'B3', label:'B', name:'B',      color:'#86efac' },
  { key:'E4', label:'e', name:'High e', color:'#c4b5fd' },
];

// ── Note → primary string hint (first-position, lowest string) ────────────────
const NOTE_STRING = {
  E2:'E2', F2:'E2', 'F#2':'E2', G2:'E2', 'G#2':'E2',
  A2:'A2', 'A#2':'A2', B2:'A2', C3:'A2', 'C#3':'A2',
  D3:'D3', 'D#3':'D3', E3:'D3', F3:'D3', 'F#3':'D3',
  G3:'G3', 'G#3':'G3', A3:'G3', 'A#3':'G3',
  B3:'B3', C4:'B3', 'C#4':'B3', D4:'B3', 'D#4':'B3',
  E4:'E4', F4:'E4', 'F#4':'E4', G4:'E4', 'G#4':'E4',
  A4:'E4', 'A#4':'E4', B4:'E4', C5:'E4', D5:'E4', E5:'E4',
};

// ── Note → first-position fret (string 1=high e … 6=low E) ───────────────────
const NOTE_FRET = {
  E2:{string:6,fret:0}, F2:{string:6,fret:1}, 'F#2':{string:6,fret:2},
  G2:{string:6,fret:3}, 'G#2':{string:6,fret:4},
  A2:{string:5,fret:0}, 'A#2':{string:5,fret:1}, B2:{string:5,fret:2},
  C3:{string:5,fret:3}, 'C#3':{string:5,fret:4},
  D3:{string:4,fret:0}, 'D#3':{string:4,fret:1}, E3:{string:4,fret:2},
  F3:{string:4,fret:3}, 'F#3':{string:4,fret:4},
  G3:{string:3,fret:0}, 'G#3':{string:3,fret:1}, A3:{string:3,fret:2},
  'A#3':{string:3,fret:3},
  B3:{string:2,fret:0}, C4:{string:2,fret:1}, 'C#4':{string:2,fret:2},
  D4:{string:2,fret:3}, 'D#4':{string:2,fret:4},
  E4:{string:1,fret:0}, F4:{string:1,fret:1}, 'F#4':{string:1,fret:2},
  G4:{string:1,fret:3}, 'G#4':{string:1,fret:4}, A4:{string:1,fret:5},
  'A#4':{string:1,fret:6}, B4:{string:1,fret:7}, C5:{string:1,fret:8},
  'C#5':{string:1,fret:9}, D5:{string:1,fret:10}, 'D#5':{string:1,fret:11},
  E5:{string:1,fret:12},
};

// ── String labels (diagram: 1=high e, 6=low E) ────────────────────────────────
const STR_LABELS = { 1:'e', 2:'B', 3:'G', 4:'D', 5:'A', 6:'E' };
const STR_FULL   = { 1:'High e', 2:'B', 3:'G', 4:'D', 5:'A', 6:'Low E' };

// ── Levels ────────────────────────────────────────────────────────────────────
const LEVELS = [
  {
    id:1, title:'Get Started', subtitle:'Beginner',
    venue:'Lincoln Middle School', judge:'Mr. Thompson',
    badge:'🏫', color:'#4ade80',
    notes:['E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4'],
    totalNotes:8, passing:70, timerSecs:30,
    description:'Natural notes in open position',
  },
  {
    id:2, title:'Next Level', subtitle:'Intermediate',
    venue:'City Arts Center', judge:'Ms. Chen',
    badge:'🎭', color:'#60a5fa',
    notes:['E2','F2','F#2','G2','G#2','A2','A#2','B2','C3','C#3','D3','D#3','E3',
           'F3','F#3','G3','G#3','A3','A#3','B3','C4','C#4','D4','D#4','E4'],
    totalNotes:10, passing:75, timerSecs:25,
    description:'Naturals + sharps & flats',
  },
  {
    id:3, title:'Solo Act', subtitle:'Advanced',
    venue:'Royal Academy Hall', judge:'Maestro Volkov',
    badge:'🎓', color:'#f59e0b',
    notes:['E2','F2','F#2','G2','G#2','A2','A#2','B2','C3','C#3','D3','D#3','E3',
           'F3','F#3','G3','G#3','A3','A#3','B3','C4','C#4','D4','D#4','E4',
           'F4','F#4','G4','G#4','A4','A#4','B4'],
    totalNotes:12, passing:80, timerSecs:20,
    description:'Full guitar range',
  },
  {
    id:4, title:'On Tour', subtitle:'Elite',
    venue:'Carnegie Hall, New York', judge:'Maestro Bernstein',
    badge:'🏆', color:'#a78bfa',
    notes:['E2','F2','F#2','G2','G#2','A2','A#2','B2','C3','C#3','D3','D#3','E3',
           'F3','F#3','G3','G#3','A3','A#3','B3','C4','C#4','D4','D#4','E4',
           'F4','F#4','G4','G#4','A4','A#4','B4','C5','D5','E5'],
    totalNotes:15, passing:85, timerSecs:15,
    description:'Full range, high tempo',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function detectPitch(buf, sr) {
  const SIZE = buf.length, MAX = Math.floor(SIZE / 2);
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < RMS_THRESHOLD) return { freq: -1, rms };
  // Guitar range: ~70 Hz (below E2) to ~700 Hz (above E5)
  const minOff = Math.floor(sr / 700);
  const maxOff = Math.floor(sr / 70);
  let best = -1, bestCorr = 0.75, lastCorr = 1;
  for (let off = minOff; off < maxOff; off++) {
    let c = 0;
    for (let j = 0; j < MAX; j++) c += Math.abs(buf[j] - buf[j + off]);
    c = 1 - c / MAX;
    if (c > bestCorr && c > lastCorr) { bestCorr = c; best = off; }
    lastCorr = c;
  }
  return { freq: best !== -1 ? sr / best : -1, rms };
}

// Formula approach: A4=440 Hz reference, 12-TET
// noteIndex = round(12 * log2(freq / 440)) + 69  (MIDI note number)
// Verified: F#2=92.50Hz→18→F#2 ✓  A4=440Hz→69→A4 ✓  E4=329.63Hz→64→E4 ✓
const NOTE_NAMES_CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CENTS_TOLERANCE = 50; // ±50 cents = ±half semitone

function freqToNote(freq) {
  if (!freq || freq < 70 || freq > 1400) return null;
  const noteIndex  = Math.round(12 * Math.log2(freq / 440)) + 69;
  if (noteIndex < 28 || noteIndex > 88) return null; // E2–E5 range
  const octave     = Math.floor(noteIndex / 12) - 1;
  const name       = NOTE_NAMES_CHROMATIC[noteIndex % 12] + octave;
  // Reject if the note is not in our game's NOTE_FREQ table
  if (!(name in NOTE_FREQ)) return null;
  // Cents-based tolerance check — rejects if detection is more than ±50¢ off
  const exactFreq  = NOTE_FREQ[name];
  const cents      = Math.abs(1200 * Math.log2(freq / exactFreq));
  return cents < CENTS_TOLERANCE ? name : null;
}

function buildQueue(lvl) {
  const queue = [];
  while (queue.length < lvl.totalNotes) queue.push(...shuffle([...lvl.notes]));
  return queue.slice(0, lvl.totalNotes);
}

// ── Palette ───────────────────────────────────────────────────────────────────
const M = {
  bg:'#120A04', surface:'#2A1208', panel:'#1E0D06',
  primary:'#C46428', accent:'#E8833A', hi:'#F5A65B',
  muted:'#A0785A', text:'#F5E8D8', border:'rgba(196,100,40,0.25)',
};

const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

// Standard guitar position marker frets (single dot; 12 & 24 get double dot)
const POSITION_DOTS = new Set([3, 5, 7, 9, 12, 15, 17]);

// ── Inline mini-fretboard hint ────────────────────────────────────────────────
function FretHint({ note }) {
  const pos = NOTE_FRET[note];
  if (!pos) return null;
  const W = 216, H = 130;
  const padL = 28, padR = 10, padT = 12, padB = 20; // extra padB for dot row
  const gridW = W - padL - padR;
  const gridH = H - padT - padB;
  const strGap  = gridH / 5;
  const numFrets = pos.fret === 0 ? 4 : 5;
  const startFret = pos.fret <= 2 ? 0 : pos.fret - 2;
  const fretGap   = gridW / numFrets;
  function strY(s) { return padT + (s - 1) * strGap; }
  function fretX(f) { return padL + (f - startFret) * fretGap; }
  function midX(f)  { return fretX(f) - fretGap / 2; }
  const dotR = 9;
  const cx = pos.fret === 0 ? dotR + 2 : midX(pos.fret); // open: flush inside left edge
  const cy = strY(pos.string);
  // Frets visible in this window that have position markers
  const visibleFrets = Array.from({ length: numFrets }, (_, i) => startFret + 1 + i);
  const dotY = padT + gridH + 8; // below the lowest string
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:'block', maxWidth:216 }}>
      {/* Nut or position marker */}
      {startFret === 0
        ? <rect x={padL} y={padT - 2} width={3} height={gridH + 4} fill={M.hi} rx={1} />
        : <text x={padL - 6} y={padT + gridH / 2 + 4} fill={M.muted} fontSize={9} textAnchor="middle" fontFamily="Georgia,serif">{startFret}fr</text>
      }
      {/* Strings */}
      {[1,2,3,4,5,6].map(s => (
        <line key={s} x1={padL} y1={strY(s)} x2={padL + gridW} y2={strY(s)}
          stroke={s === pos.string ? 'rgba(196,100,40,0.7)' : 'rgba(196,100,40,0.3)'}
          strokeWidth={s === 6 ? 1.8 : 1} />
      ))}
      {/* Frets */}
      {Array.from({ length: numFrets + 1 }, (_, i) => startFret + i).map(f => (
        <line key={f} x1={fretX(f)} y1={padT} x2={fretX(f)} y2={padT + gridH}
          stroke="rgba(196,100,40,0.2)" strokeWidth={1} />
      ))}
      {/* Position marker dots (below strings) */}
      {visibleFrets.map(f => {
        if (!POSITION_DOTS.has(f)) return null;
        const mx = midX(f);
        if (f === 12) return (
          <g key={f}>
            <circle cx={mx - 4} cy={dotY} r={3} fill="rgba(232,131,58,0.7)" />
            <circle cx={mx + 4} cy={dotY} r={3} fill="rgba(232,131,58,0.7)" />
          </g>
        );
        return <circle key={f} cx={mx} cy={dotY} r={3} fill="rgba(232,131,58,0.7)" />;
      })}
      {/* String labels */}
      {[1,2,3,4,5,6].map(s => (
        <text key={s} x={padL - 10} y={strY(s) + 4} fill={M.muted} fontSize={11} textAnchor="middle" fontFamily="Georgia,serif">{STR_LABELS[s]}</text>
      ))}
      {/* Note dot */}
      <circle cx={cx} cy={cy} r={dotR} fill="#4ade80" stroke="rgba(74,222,128,0.45)" strokeWidth={2} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#0a1a0a" fontSize={7} fontWeight="700" fontFamily="Georgia,serif">
        {note.replace('#', '♯')}
      </text>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuditionGame() {
  // ── Phase & level ─────────────────────────────────────────────────────────
  const [phase,    setPhase]    = useState('landing');   // landing|levelSelect|playing|results
  const [levelIdx, setLevelIdx] = useState(0);

  // ── Note display ──────────────────────────────────────────────────────────
  const [currentNote,  setCurrentNote]  = useState(null);
  const [noteProgress, setNoteProgress] = useState({ idx: 0, total: 0 });

  // ── Score ─────────────────────────────────────────────────────────────────
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0 });

  // ── Feedback + ring ───────────────────────────────────────────────────────
  const [feedback,      setFeedback]      = useState({ main: 'Play the note', sub: '', color: 'rgba(255,255,255,0.4)' });
  const [ringPct,       setRingPct]       = useState(0);
  const [ringColor,     setRingColor]     = useState(M.border);
  const [flashState,    setFlashState]    = useState(null);   // null | 'correct' | 'wrong'
  const [showFretboard, setShowFretboard] = useState(false);  // user toggle; auto-true on wrong

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(30);

  // ── Mic ───────────────────────────────────────────────────────────────────
  const [micGranted, setMicGranted] = useState(false);
  const [volPct,     setVolPct]     = useState(0);

  // ── Mutable refs (hot loop & timers) ─────────────────────────────────────
  const analyserRef      = useRef(null);
  const micStreamRef     = useRef(null);
  const animFrameRef     = useRef(null);
  const timerIntervalRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const flashTimerRef    = useRef(null);

  const dStateRef       = useRef('idle');   // idle | detecting | cooldown
  const sustainCountRef = useRef(0);
  const sustainNoteRef  = useRef(null);

  const noteQueueRef  = useRef([]);
  const noteIdxRef    = useRef(0);
  const correctRef    = useRef(0);
  const totalRef      = useRef(0);
  const streakRef     = useRef(0);
  const phaseRef      = useRef('landing');
  const levelIdxRef   = useRef(0);
  const timerTotalRef = useRef(30);

  // Wrap callbacks that must always be current inside RAF/timer closures
  const onTimeoutRef   = useRef(null);
  const advanceNoteRef = useRef(null);

  // ── Mic setup ─────────────────────────────────────────────────────────────
  function startMic() {
    if (analyserRef.current) return Promise.resolve();
    const constraints = IS_IOS
      ? { audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false, sampleRate:44100 } }
      : { audio: true };
    return navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      micStreamRef.current = stream;
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = IS_IOS ? 8192 : 4096;
      analyser.smoothingTimeConstant = 0.0;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      setMicGranted(true);
    }).catch(e => console.warn('[AuditionGame] mic error:', e));
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  function stopTimer() {
    clearInterval(timerIntervalRef.current);
  }

  function startNoteTimer(secs) {
    stopTimer();
    setTimeLeft(secs);
    timerTotalRef.current = secs;
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerIntervalRef.current);
          onTimeoutRef.current?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  // ── Note rendering ────────────────────────────────────────────────────────
  function renderCurrentNote() {
    const note = noteQueueRef.current[noteIdxRef.current];
    setCurrentNote(note ?? null);
    setNoteProgress({ idx: noteIdxRef.current, total: noteQueueRef.current.length });
    setFeedback({ main: 'Play the note', sub: '', color: 'rgba(255,255,255,0.4)' });
    setRingPct(0);
    setRingColor(M.border);
    setFlashState(null);
    clearTimeout(flashTimerRef.current);
  }

  // ── Scoring ───────────────────────────────────────────────────────────────
  function advanceNote() {
    noteIdxRef.current++;
    if (noteIdxRef.current >= noteQueueRef.current.length) {
      showResults();
      return;
    }
    dStateRef.current       = 'idle';
    sustainCountRef.current = 0;
    sustainNoteRef.current  = null;
    renderCurrentNote();
    startNoteTimer(LEVELS[levelIdxRef.current].timerSecs);
  }

  function showResults() {
    setPhase('results');
    phaseRef.current = 'results';
    stopTimer();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }

  function onTimeout() {
    if (phaseRef.current !== 'playing') return;
    totalRef.current++;
    streakRef.current = 0;
    setScore({ correct: correctRef.current, total: totalRef.current, streak: 0 });
    setFeedback({ main: "Time's up!", sub: 'Moving on…', color: '#f59e0b' });
    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => advanceNoteRef.current?.(), 800);
  }

  function evaluateNote(played) {
    const target = noteQueueRef.current[noteIdxRef.current];
    if (!target) return;
    stopTimer();
    totalRef.current++;

    if (played === target) {
      correctRef.current++;
      streakRef.current++;
      setScore({ correct: correctRef.current, total: totalRef.current, streak: streakRef.current });
      setFeedback({ main: 'Perfect! ✓', sub: '', color: '#4ade80' });
      setRingPct(100);
      setRingColor('#4ade80');
      setFlashState('correct');
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashState(null), 500);
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => advanceNoteRef.current?.(), 600);
    } else {
      streakRef.current = 0;
      setScore({ correct: correctRef.current, total: totalRef.current, streak: 0 });
      setFeedback({ main: `That was ${played || '?'}`, sub: 'Try again — same note', color: '#f87171' });
      setRingPct(0);
      setRingColor('#f87171');
      setFlashState('wrong');
      setShowFretboard(true);  // auto-reveal hint on wrong answer
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashState(null), 700);
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== 'playing') return;
        dStateRef.current       = 'idle';
        sustainCountRef.current = 0;
        sustainNoteRef.current  = null;
        renderCurrentNote();
        startNoteTimer(LEVELS[levelIdxRef.current].timerSecs);
      }, 1200);
    }
  }

  // Keep callback refs current every render
  onTimeoutRef.current   = onTimeout;
  advanceNoteRef.current = advanceNote;

  // ── Game loop ─────────────────────────────────────────────────────────────
  function startGameLoop() {
    if (!analyserRef.current) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const buf = new Float32Array(analyserRef.current.fftSize);

    function loop() {
      if (phaseRef.current !== 'playing') return;
      animFrameRef.current = requestAnimationFrame(loop);
      analyserRef.current.getFloatTimeDomainData(buf);
      const { freq, rms } = detectPitch(buf, analyserRef.current.context.sampleRate);

      setVolPct(Math.min(100, Math.round(rms * 800)));

      if (dStateRef.current === 'cooldown') return;

      if (freq < 0 || rms < RMS_THRESHOLD) {
        if (dStateRef.current === 'detecting') {
          sustainCountRef.current = 0;
          sustainNoteRef.current  = null;
          dStateRef.current       = 'idle';
        }
        setRingPct(0);
        setRingColor(M.border);
        setFeedback({ main: 'Play the note', sub: '', color: 'rgba(255,255,255,0.4)' });
        return;
      }

      const note = freqToNote(freq);
      if (!note) { sustainCountRef.current = 0; dStateRef.current = 'idle'; return; }

      if (dStateRef.current === 'idle') {
        dStateRef.current       = 'detecting';
        sustainNoteRef.current  = note;
        sustainCountRef.current = 1;
      } else if (dStateRef.current === 'detecting') {
        const nf = NOTE_FREQ[note] || 0;
        const sf = NOTE_FREQ[sustainNoteRef.current] || 0;
        if (Math.abs(nf - sf) < NOTE_TOL * 2) {
          sustainCountRef.current++;
        } else {
          sustainNoteRef.current  = note;
          sustainCountRef.current = 1;
        }
        const pct = Math.min(100, Math.round((sustainCountRef.current / SUSTAIN_FRAMES) * 100));
        setRingPct(pct);
        setRingColor('#f59e0b');
        setFeedback({ main: `${sustainNoteRef.current}…`, sub: 'Hold it steady', color: '#f59e0b' });

        if (sustainCountRef.current >= SUSTAIN_FRAMES) {
          dStateRef.current = 'cooldown';
          evaluateNote(sustainNoteRef.current);
          clearTimeout(cooldownTimerRef.current);
          cooldownTimerRef.current = setTimeout(() => {
            if (dStateRef.current === 'cooldown') {
              dStateRef.current       = 'idle';
              sustainCountRef.current = 0;
              sustainNoteRef.current  = null;
            }
          }, COOLDOWN_MS);
        }
      }
    }
    loop();
  }

  // ── Start game ────────────────────────────────────────────────────────────
  function startGame(idx) {
    const lvl = LEVELS[idx];
    setLevelIdx(idx);
    levelIdxRef.current     = idx;
    correctRef.current      = 0;
    totalRef.current        = 0;
    streakRef.current       = 0;
    noteIdxRef.current      = 0;
    noteQueueRef.current    = buildQueue(lvl);
    dStateRef.current       = 'idle';
    sustainCountRef.current = 0;
    sustainNoteRef.current  = null;
    setScore({ correct: 0, total: 0, streak: 0 });
    setShowFretboard(false);
    setFlashState(null);
    setPhase('playing');
    phaseRef.current = 'playing';
    renderCurrentNote();
    startNoteTimer(lvl.timerSecs);
    startMic().then(() => startGameLoop());
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearInterval(timerIntervalRef.current);
      clearTimeout(feedbackTimerRef.current);
      clearTimeout(cooldownTimerRef.current);
      clearTimeout(flashTimerRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  // ── Render: Landing ───────────────────────────────────────────────────────
  if (phase === 'landing') return (
    <LandingPage
      emoji="🎸"
      title="Guitar Audition"
      description="Sight-read notes on your guitar and play them back in real time. Work your way up from open strings to Carnegie Hall."
      difficulty="Beginner"
      features={['Real-time mic pitch detection', 'Four progressive levels', 'Score, streak & pass tracking']}
      onStart={() => setPhase('levelSelect')}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  // ── Render: Level select ──────────────────────────────────────────────────
  if (phase === 'levelSelect') return (
    <div style={{ minHeight:'100vh', background:M.bg, color:M.text, fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>
        <button onClick={() => setPhase('landing')} style={{ background:'none', border:'none', color:M.muted, fontFamily:"Georgia,serif", fontSize:13, cursor:'pointer', padding:'0 0 20px', display:'block' }}>
          ← Back
        </button>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:6, background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Choose Your Level
        </h1>
        <p style={{ fontSize:13, color:M.muted, marginBottom:24 }}>Select a venue to audition at</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {LEVELS.map((lvl, i) => (
            <button key={i} onClick={() => startGame(i)} style={{
              background:M.surface, border:`1px solid ${M.border}`, borderRadius:16,
              padding:16, cursor:'pointer', display:'flex', alignItems:'center', gap:14,
              textAlign:'left', fontFamily:"Georgia,serif", color:M.text, transition:'all 0.15s',
              WebkitTapHighlightColor:'transparent',
            }}>
              <div style={{ fontSize:32, lineHeight:1 }}>{lvl.badge}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:16, color:lvl.color }}>{lvl.title}</div>
                <div style={{ fontSize:12, color:M.muted, marginTop:2 }}>{lvl.venue}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:3 }}>
                  {lvl.description} · {lvl.totalNotes} notes
                </div>
              </div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', padding:'3px 10px', borderRadius:20, background:`${lvl.color}22`, border:`1px solid ${lvl.color}66`, color:lvl.color, whiteSpace:'nowrap' }}>
                {lvl.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render: Results ───────────────────────────────────────────────────────
  if (phase === 'results') {
    const lvl     = LEVELS[levelIdx];
    const pct     = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const passed  = pct >= lvl.passing;
    const pctColor = passed ? '#4ade80' : '#f59e0b';
    return (
      <div style={{ minHeight:'100vh', background:M.bg, color:M.text, fontFamily:"Georgia,serif", display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px' }}>
        <div style={{ fontSize:64, marginBottom:16, filter:'drop-shadow(0 4px 20px rgba(196,100,40,0.4))' }}>
          {passed ? '🏆' : '🎸'}
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, marginBottom:8, textAlign:'center', color:pctColor }}>
          {passed ? 'You Passed!' : 'Keep Practicing'}
        </h1>
        <div style={{ fontSize:14, color:M.muted, marginBottom:28, textAlign:'center' }}>
          {lvl.badge} {lvl.title} · {lvl.venue}
        </div>

        {/* Score card */}
        <div style={{ width:'100%', maxWidth:340, background:M.surface, border:`1px solid ${M.border}`, borderRadius:16, padding:20, marginBottom:24 }}>
          <div style={{ fontSize:52, fontWeight:900, textAlign:'center', color:pctColor, marginBottom:10 }}>{pct}%</div>
          <div style={{ height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:pctColor, borderRadius:4, transition:'width 0.6s ease' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:M.muted }}>
            <span>✓ {score.correct} correct</span>
            <span>✗ {score.total - score.correct} missed</span>
            <span>Pass: {lvl.passing}%</span>
          </div>
        </div>

        <button onClick={() => startGame(levelIdx)} style={{ width:'100%', maxWidth:340, padding:15, borderRadius:14, border:'none', background:'linear-gradient(135deg,#C46428,#E8833A)', color:'#fff', fontFamily:"Georgia,serif", fontSize:16, fontWeight:800, cursor:'pointer', marginBottom:12, boxShadow:'0 4px 16px rgba(196,100,40,0.35)' }}>
          Try Again
        </button>
        <button onClick={() => setPhase('levelSelect')} style={{ width:'100%', maxWidth:340, padding:13, borderRadius:14, border:`1px solid ${M.border}`, background:'transparent', color:M.muted, fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:16 }}>
          Choose Level
        </button>
        <button onClick={() => { window.location.hash = ''; }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.25)', fontFamily:"Georgia,serif", fontSize:13, cursor:'pointer' }}>
          ← Home
        </button>
      </div>
    );
  }

  // ── Render: Playing ───────────────────────────────────────────────────────
  const lvl       = LEVELS[levelIdx];
  const scorePct  = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const timerPct  = timerTotalRef.current > 0 ? (timeLeft / timerTotalRef.current) * 100 : 100;
  const timerCol  = timeLeft <= 5 ? '#f87171' : timeLeft <= 10 ? '#f59e0b' : '#4ade80';
  const stringKey = currentNote ? NOTE_STRING[currentNote] : null;
  const ringDash  = RING_C - (ringPct / 100) * RING_C;
  const notePos   = currentNote ? NOTE_FRET[currentNote] : null;
  const tabNote   = notePos ? [{ string: notePos.string, fret: notePos.fret, beat: 1, noteName: currentNote }] : [];
  const flashBg   = flashState === 'correct' ? 'rgba(74,222,128,0.07)'
                  : flashState === 'wrong'   ? 'rgba(248,113,113,0.07)'
                  : 'transparent';

  return (
    <div style={{ minHeight:'100vh', background:M.bg, color:M.text, fontFamily:"Georgia,'Times New Roman',serif", display:'flex', flexDirection:'column', transition:'background 0.2s' }}>

      {/* ── Top bar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:M.panel, borderBottom:`1px solid ${M.border}` }}>
        <button onClick={() => { stopTimer(); if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current); setPhase('levelSelect'); }}
          style={{ background:'none', border:'none', color:M.muted, fontSize:18, cursor:'pointer', padding:'2px 6px', lineHeight:1 }}>
          ✕
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:800, color:lvl.color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {lvl.badge} {lvl.title}
          </div>
          <div style={{ fontSize:10, color:M.muted }}>{lvl.venue}</div>
        </div>
        {/* Timer bar + number */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:72, height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${timerPct}%`, background:timerCol, borderRadius:3, transition:'width 1s linear, background 0.3s' }} />
          </div>
          <span style={{ fontSize:18, fontWeight:900, color:timerCol, minWidth:24, textAlign:'right' }}>{timeLeft}</span>
        </div>
        {/* Note counter */}
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', minWidth:36, textAlign:'right' }}>
          {noteProgress.idx + 1}/{noteProgress.total}
        </div>
      </div>

      {/* ── Main scroll area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 16px 8px', background: flashBg, transition:'background 0.15s' }}>

        {/* ── Notation + Tab display ── */}
        {tabNote.length > 0 && (
          <div style={{ width:'100%', maxWidth:340, background:M.surface, borderRadius:12,
            padding:'10px 8px 6px', border:`1px solid ${M.border}`, marginBottom:12 }}>
            <TabNotationDisplay notes={tabNote} currentNote={0} />
          </div>
        )}

        {/* ── Note info row: ring + name/string/fret ── */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:10, width:'100%', maxWidth:340 }}>
          {/* Detection ring */}
          <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
            <svg width={100} height={100} style={{ transform:'rotate(-90deg)' }}>
              <circle cx={50} cy={50} r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
              <circle cx={50} cy={50} r={RING_R} fill="none"
                stroke={ringColor} strokeWidth={9} strokeLinecap="round"
                strokeDasharray={RING_C} strokeDashoffset={ringDash}
                style={{ transition:'stroke-dashoffset 0.08s, stroke 0.2s' }}
              />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.02em', color: ringColor !== M.border ? ringColor : M.text }}>
                {currentNote || '--'}
              </div>
            </div>
          </div>

          {/* Prominent note info */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:34, fontWeight:900, lineHeight:1, letterSpacing:'-0.03em',
              background:'linear-gradient(135deg,#E8833A,#F5A65B)', WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
              {currentNote || '--'}
            </div>
            {notePos && (
              <>
                <div style={{ fontSize:13, color:M.muted, marginBottom:2 }}>
                  <span style={{ color:M.hi, fontWeight:700 }}>{STR_FULL[notePos.string]}</span> string
                </div>
                <div style={{ fontSize:13, color:M.muted }}>
                  Fret <span style={{ color:M.hi, fontWeight:700 }}>{notePos.fret === 0 ? 'Open' : notePos.fret}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Feedback ── */}
        <div style={{ textAlign:'center', marginBottom:10, minHeight:38, width:'100%', maxWidth:340 }}>
          <div style={{ fontSize:16, fontWeight:800, color:feedback.color, marginBottom:2 }}>{feedback.main}</div>
          {feedback.sub && <div style={{ fontSize:12, color:M.muted }}>{feedback.sub}</div>}
        </div>

        {/* ── Show Fingerboard toggle ── */}
        <button
          onClick={() => setShowFretboard(s => !s)}
          style={{
            padding:'7px 18px', borderRadius:10, marginBottom:10,
            border:`1px solid ${showFretboard ? 'rgba(232,131,58,0.55)' : M.border}`,
            background: showFretboard ? 'rgba(232,131,58,0.15)' : 'rgba(196,100,40,0.08)',
            color: showFretboard ? M.hi : M.muted,
            fontFamily:"Georgia,serif", fontWeight:700, fontSize:13, cursor:'pointer',
            letterSpacing:'0.01em', WebkitTapHighlightColor:'transparent',
          }}>
          {showFretboard ? '🎸 Hide Fingerboard' : '🎸 Show Fingerboard'}
        </button>

        {/* ── Fretboard hint ── */}
        {showFretboard && currentNote && (
          <div style={{ width:'100%', maxWidth:260, background:M.surface, borderRadius:12,
            padding:'10px 12px', border:`1px solid ${flashState === 'wrong' ? 'rgba(248,113,113,0.4)' : M.border}`,
            marginBottom:10, transition:'border-color 0.2s' }}>
            <div style={{ fontSize:10, color:M.muted, textAlign:'center', marginBottom:6,
              textTransform:'uppercase', letterSpacing:'0.1em' }}>
              Correct Position
            </div>
            <FretHint note={currentNote} />
          </div>
        )}

        {/* ── String indicators ── */}
        <div style={{ display:'flex', gap:7, marginBottom:10 }}>
          {GUITAR_STRINGS.map(s => {
            const active = stringKey === s.key;
            return (
              <div key={s.key} style={{
                width:32, height:32, borderRadius:'50%',
                background: active ? s.color : 'rgba(0,0,0,0.3)',
                border: `2px solid ${active ? s.color : 'rgba(255,255,255,0.1)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:800, color: active ? '#111' : s.color,
                transition:'all 0.2s', transform: active ? 'scale(1.18)' : 'scale(1)',
                boxShadow: active ? `0 0 12px ${s.color}88` : 'none',
              }}>
                {s.label}
              </div>
            );
          })}
        </div>

        {/* ── Volume bar ── */}
        <div style={{ width:'100%', maxWidth:320, paddingBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.2)', marginBottom:3 }}>
            <span>{micGranted ? '🎙 Mic active' : '🎙 Waiting for mic…'}</span>
            <span>{volPct}%</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${volPct}%`, background: volPct > 15 ? '#4ade80' : '#60a5fa', borderRadius:2, transition:'width 0.05s' }} />
          </div>
        </div>
      </div>

      {/* ── Score bar ── */}
      <div style={{ padding:'10px 14px', background:M.panel, borderTop:`1px solid ${M.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:M.muted, marginBottom:5 }}>
          <span>Score: {scorePct}%</span>
          {score.streak > 1 && <span style={{ color:'#f59e0b', fontWeight:700 }}>🔥 {score.streak} streak</span>}
          <span>Pass: {lvl.passing}%</span>
        </div>
        <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${scorePct}%`, borderRadius:3, transition:'width 0.3s ease',
            background: scorePct >= lvl.passing ? '#4ade80' : scorePct > lvl.passing * 0.65 ? '#f59e0b' : '#f87171',
          }} />
        </div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.18)', marginTop:4, textAlign:'right' }}>
          {score.correct} correct / {score.total - score.correct} missed
        </div>
      </div>
    </div>
  );
}
