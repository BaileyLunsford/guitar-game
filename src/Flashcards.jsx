/**
 * Flashcards.jsx — Music theory and guitar note flashcards
 *
 * Decks: Notes · Chords · Tab · Theory
 * FREE tier: open-position notes (strings 1–2), 5 open chords,
 *            tab strings 1–3 frets 0–5, note values + time sigs
 * PRO tier:  full-range notes (strings 3–6), all-key chords + barre,
 *            tab all strings
 *
 * Card format: click card to flip. Correct ✓ / Skip → to advance.
 */

import React, { useState } from 'react';
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

// ─── Mini staff SVG ────────────────────────────────────────────────────────────
// step: diatonic steps from E4 (bottom staff line).
//   0=E4, 1=F4, 2=G4, 3=A4, 4=B4 … -1=D4, -2=C4, -3=B3 … -14=E2
function MiniStaff({ step }) {
  const BL = 50;          // bottom line (E4) Y
  const LG = 8;           // gap between adjacent lines (px)
  const noteX = 68;
  const noteY = BL - step * (LG / 2);
  const lineYs = [BL, BL - LG, BL - 2 * LG, BL - 3 * LG, BL - 4 * LG];

  // Collect ledger lines needed for this note
  const ledgers = [];
  if (step <= -2) {
    for (let s = -2; s >= step - (step % 2 === 0 ? 0 : 1); s -= 2) {
      if (s >= step) ledgers.push(BL - s * (LG / 2));
    }
  }
  if (step >= 10) {
    for (let s = 10; s <= step + (step % 2 === 0 ? 0 : 1); s += 2) {
      if (s <= step) ledgers.push(BL - s * (LG / 2));
    }
  }

  const svgH = Math.max(76, noteY + 18);

  return (
    <svg viewBox={`0 0 100 ${svgH}`}
      style={{ width: '100%', maxWidth: 100, display: 'block', margin: '0 auto' }}>
      {/* Treble clef */}
      <text x="8" y="58" fontSize="38" fill="rgba(245,232,216,0.45)"
        fontFamily="'Times New Roman', Georgia, serif">𝄞</text>
      {/* Staff lines */}
      {lineYs.map((y, i) => (
        <line key={i} x1="26" y1={y} x2="94" y2={y}
          stroke="rgba(245,232,216,0.38)" strokeWidth="1.5" />
      ))}
      {/* Ledger lines */}
      {ledgers.map((y, i) => (
        <line key={`l${i}`} x1={noteX - 10} y1={y} x2={noteX + 10} y2={y}
          stroke="rgba(245,232,216,0.55)" strokeWidth="1.5" />
      ))}
      {/* Note head */}
      <ellipse cx={noteX} cy={noteY} rx={6} ry={4.5}
        fill={M.accent}
        transform={`rotate(-18,${noteX},${noteY})`} />
    </svg>
  );
}

// ─── Tab diagram ──────────────────────────────────────────────────────────────
function TabDiagram({ string: activeStr, fret }) {
  const labels = ['', 'e', 'B', 'G', 'D', 'A', 'E'];
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: M.muted, marginBottom: 10,
        fontFamily: "Georgia, serif", letterSpacing: '0.05em' }}>
        String {activeStr} ({labels[activeStr]}) · Fret {fret}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 16, lineHeight: 2 }}>
        {[1,2,3,4,5,6].map(s => {
          const active = s === activeStr;
          return (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
              color: active ? M.hi : 'rgba(245,232,216,0.15)',
              fontWeight: active ? 800 : 400,
            }}>
              <span style={{ width: 14, textAlign: 'right', fontSize: 10,
                fontFamily: "Georgia, serif",
                color: active ? M.muted : 'rgba(245,232,216,0.08)' }}>
                {labels[s]}
              </span>
              <span style={{ letterSpacing: '0.1em' }}>
                {active ? `──${fret === 0 ? '0' : fret}──` : '─────'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Theory symbol ────────────────────────────────────────────────────────────
function TheorySymbol({ type }) {
  const W = 70, H = 80;
  const cx = 35, noteY = 60;

  switch (type) {
    case 'whole-note':
      return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',margin:'0 auto'}}>
        <ellipse cx={cx} cy={noteY} rx={11} ry={8} fill="none" stroke={M.accent} strokeWidth={2.5}/>
      </svg>;
    case 'half-note':
      return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',margin:'0 auto'}}>
        <ellipse cx={cx} cy={noteY} rx={10} ry={7.5} fill="none" stroke={M.accent} strokeWidth={2.5}
          transform={`rotate(-18,${cx},${noteY})`}/>
        <line x1={cx+10} y1={noteY-2} x2={cx+10} y2={noteY-34} stroke={M.accent} strokeWidth={2}/>
      </svg>;
    case 'quarter-note':
      return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',margin:'0 auto'}}>
        <ellipse cx={cx} cy={noteY} rx={10} ry={7.5} fill={M.accent}
          transform={`rotate(-18,${cx},${noteY})`}/>
        <line x1={cx+9} y1={noteY-2} x2={cx+9} y2={noteY-34} stroke={M.accent} strokeWidth={2}/>
      </svg>;
    case 'eighth-note':
      return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',margin:'0 auto'}}>
        <ellipse cx={cx} cy={noteY} rx={10} ry={7.5} fill={M.accent}
          transform={`rotate(-18,${cx},${noteY})`}/>
        <line x1={cx+9} y1={noteY-2} x2={cx+9} y2={noteY-34} stroke={M.accent} strokeWidth={2}/>
        <path d={`M${cx+9},${noteY-34} Q${cx+30},${noteY-28} ${cx+16},${noteY-18}`}
          fill="none" stroke={M.accent} strokeWidth={2}/>
      </svg>;
    case 'whole-rest':
      return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',margin:'0 auto'}}>
        <line x1={cx-16} y1={50} x2={cx+16} y2={50} stroke={M.accent} strokeWidth={1.5}/>
        <rect x={cx-14} y={50} width={28} height={9} fill={M.accent}/>
      </svg>;
    case 'half-rest':
      return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',margin:'0 auto'}}>
        <rect x={cx-14} y={50} width={28} height={9} fill={M.accent}/>
        <line x1={cx-16} y1={59} x2={cx+16} y2={59} stroke={M.accent} strokeWidth={1.5}/>
      </svg>;
    case 'quarter-rest':
      return <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{display:'block',margin:'0 auto'}}>
        <text x={cx} y={noteY} textAnchor="middle" fontSize="36" fill={M.accent}
          fontFamily="'Times New Roman',serif">𝄽</text>
      </svg>;
    case '4-4':
    case '3-4':
      return <div style={{ fontSize: 44, fontWeight: 900, color: M.accent,
        fontFamily: "'Times New Roman',serif", textAlign: 'center', lineHeight: 1 }}>
        {type === '4-4' ? <><div>4</div><div>4</div></> : <><div>3</div><div>4</div></>}
      </div>;
    default:
      return <div style={{ fontSize: 48, color: M.accent, textAlign: 'center' }}>{type}</div>;
  }
}

// ─── Card data ─────────────────────────────────────────────────────────────────
const NOTES_FREE = [
  { step:-3, name:'B3', sub:'String 2 (B) · Open',   note:'B3' },
  { step:-2, name:'C4', sub:'String 2 (B) · Fret 1', note:'C4' },
  { step:-1, name:'D4', sub:'String 2 (B) · Fret 3', note:'D4' },
  { step: 0, name:'E4', sub:'String 1 (e) · Open',   note:'E4' },
  { step: 1, name:'F4', sub:'String 1 (e) · Fret 1', note:'F4' },
  { step: 2, name:'G4', sub:'String 1 (e) · Fret 3', note:'G4' },
  { step: 3, name:'A4', sub:'String 1 (e) · Fret 5', note:'A4' },
];
const NOTES_PRO = [
  { step:-5, name:'G3', sub:'String 3 (G) · Open',   note:'G3', pro:true },
  { step:-4, name:'A3', sub:'String 3 (G) · Fret 2', note:'A3', pro:true },
  { step:-3, name:'B3', sub:'String 3 (G) · Fret 4', note:'B3', pro:true },
  { step:-8, name:'D3', sub:'String 4 (D) · Open',   note:'D3', pro:true },
  { step:-7, name:'E3', sub:'String 4 (D) · Fret 2', note:'E3', pro:true },
  { step:-6, name:'F3', sub:'String 4 (D) · Fret 3', note:'F3', pro:true },
  { step:-11,name:'A2', sub:'String 5 (A) · Open',   note:'A2', pro:true },
  { step:-10,name:'B2', sub:'String 5 (A) · Fret 2', note:'B2', pro:true },
  { step:-9, name:'C3', sub:'String 5 (A) · Fret 3', note:'C3', pro:true },
  { step:-14,name:'E2', sub:'String 6 (E) · Open',   note:'E2', pro:true },
  { step:-13,name:'F2', sub:'String 6 (E) · Fret 1', note:'F2', pro:true },
  { step:-12,name:'G2', sub:'String 6 (E) · Fret 3', note:'G2', pro:true },
];

const CHORDS_FREE = [
  { name:'G',  full:'G Major', frets:[3,2,0,0,0,3],   notes:['G2','B2','D3','G3','B3','G4'] },
  { name:'C',  full:'C Major', frets:[-1,3,2,0,1,0],  notes:['C3','E3','G3','C4','E4'] },
  { name:'D',  full:'D Major', frets:[-1,-1,0,2,3,2], notes:['D3','A3','D4','F#4'] },
  { name:'Em', full:'E Minor', frets:[0,2,2,0,0,0],   notes:['E2','B2','E3','G3','B3','E4'] },
  { name:'Am', full:'A Minor', frets:[-1,0,2,2,1,0],  notes:['A2','E3','A3','C4','E4'] },
];
const CHORDS_PRO = [
  { name:'F',  full:'F Major',  frets:[1,3,3,2,1,1],  notes:['F2','C3','F3','A3','C4','F4'],
    barre:{fret:1,from:0,to:5}, pro:true },
  { name:'B',  full:'B Major',  frets:[-1,2,4,4,4,2], notes:['B2','F#3','B3','D#4','F#4'],
    barre:{fret:2,from:1,to:5}, pro:true },
  { name:'Bm', full:'B Minor',  frets:[-1,2,4,4,3,2], notes:['B2','F#3','B3','D4','F#4'],
    barre:{fret:2,from:1,to:5}, pro:true },
  { name:'F#m',full:'F# Minor', frets:[2,4,4,3,2,2],  notes:['F#2','C#3','F#3','A3','C#4','F#4'],
    barre:{fret:2,from:0,to:5}, pro:true },
];

const TAB_FREE = [
  { string:1, fret:0, note:'E4' }, { string:1, fret:1, note:'F4' },
  { string:1, fret:3, note:'G4' }, { string:1, fret:5, note:'A4' },
  { string:2, fret:0, note:'B3' }, { string:2, fret:1, note:'C4' },
  { string:2, fret:3, note:'D4' }, { string:2, fret:5, note:'E4' },
  { string:3, fret:0, note:'G3' }, { string:3, fret:2, note:'A3' },
  { string:3, fret:4, note:'B3' }, { string:3, fret:5, note:'C4' },
];
const TAB_PRO = [
  { string:4, fret:0, note:'D3', pro:true }, { string:4, fret:2, note:'E3', pro:true },
  { string:4, fret:3, note:'F3', pro:true }, { string:4, fret:5, note:'G3', pro:true },
  { string:5, fret:0, note:'A2', pro:true }, { string:5, fret:2, note:'B2', pro:true },
  { string:5, fret:3, note:'C3', pro:true }, { string:5, fret:5, note:'D3', pro:true },
  { string:6, fret:0, note:'E2', pro:true }, { string:6, fret:1, note:'F2', pro:true },
  { string:6, fret:3, note:'G2', pro:true }, { string:6, fret:5, note:'A2', pro:true },
];

const THEORY_CARDS = [
  { symbol:'whole-note',   name:'Whole Note',        answer:'4 beats — the longest common note value' },
  { symbol:'half-note',    name:'Half Note',          answer:'2 beats — open note head with a stem' },
  { symbol:'quarter-note', name:'Quarter Note',       answer:'1 beat — filled note head with a stem' },
  { symbol:'eighth-note',  name:'Eighth Note',        answer:'½ beat — filled note head with stem and flag' },
  { symbol:'whole-rest',   name:'Whole Rest',         answer:'4 beats of silence — hangs below the 4th line' },
  { symbol:'half-rest',    name:'Half Rest',          answer:'2 beats of silence — sits on top of the 3rd line' },
  { symbol:'quarter-rest', name:'Quarter Rest',       answer:'1 beat of silence' },
  { symbol:'4-4',          name:'4/4 Time Signature', answer:'4 beats per measure — quarter note gets 1 beat. The most common time signature in popular music.' },
  { symbol:'3-4',          name:'3/4 Time Signature', answer:'3 beats per measure — quarter note gets 1 beat. Common in waltzes.' },
];

// Advanced theory: key signatures and modes (text-only cards)
const THEORY_ADV_CARDS = [
  { symbol:'4-4', name:'Key of G Major', answer:'1 sharp (F#). Relative minor: E minor. I–IV–V = G–C–D.' },
  { symbol:'4-4', name:'Key of D Major', answer:'2 sharps (F# C#). Relative minor: B minor. I–IV–V = D–G–A.' },
  { symbol:'4-4', name:'Key of A Major', answer:'3 sharps (F# C# G#). Relative minor: F# minor. I–IV–V = A–D–E.' },
  { symbol:'4-4', name:'Key of E Major', answer:'4 sharps (F# C# G# D#). Relative minor: C# minor. I–IV–V = E–A–B.' },
  { symbol:'4-4', name:'Key of C Major', answer:'No sharps or flats. Relative minor: A minor. I–IV–V = C–F–G.' },
  { symbol:'4-4', name:'Key of F Major', answer:'1 flat (Bb). Relative minor: D minor. I–IV–V = F–Bb–C.' },
  { symbol:'4-4', name:'Ionian (Major) Mode', answer:'W-W-H-W-W-W-H. The standard major scale. Bright, happy sound.' },
  { symbol:'4-4', name:'Dorian Mode', answer:'W-H-W-W-W-H-W. Minor mode with a raised 6th. Jazzy, cool sound. Used in "Scarborough Fair".' },
  { symbol:'4-4', name:'Mixolydian Mode', answer:'W-W-H-W-W-H-W. Major scale with a flat 7th. Bluesy, rock sound.' },
  { symbol:'4-4', name:'Aeolian (Natural Minor) Mode', answer:'W-H-W-W-H-W-W. The natural minor scale. Dark, expressive sound.' },
  { symbol:'4-4', name:'Pentatonic Scale', answer:'5 notes: Root–2nd–3rd–5th–6th (major), or Root–b3–4–5–b7 (minor). The backbone of blues and rock soloing.' },
  { symbol:'4-4', name:'Blues Scale', answer:'Pentatonic minor + b5 (blue note): Root–b3–4–b5–5–b7. Core of blues and rock improvisation.' },
];

const DECK_SECTIONS = [
  {
    level: 'Beginner',
    color: { bg:'rgba(123,158,107,0.12)', border:'rgba(123,158,107,0.4)', text:'#7B9E6B' },
    decks: [
      { id:'notes-basic',  label:'Open Notes',   sub:'Strings 1–2' },
      { id:'chords-open',  label:'Open Chords',  sub:'G C D Em Am' },
      { id:'theory',       label:'Theory',       sub:'Note values & time sigs' },
    ],
  },
  {
    level: 'Intermediate',
    color: { bg:'rgba(232,131,58,0.12)', border:'rgba(232,131,58,0.4)', text:'#E8833A' },
    decks: [
      { id:'tab',          label:'Tab Reading',  sub:'Strings 1–3' },
      { id:'notes-pro',    label:'Notes (PRO)',   sub:'Strings 3–6', pro:true },
    ],
  },
  {
    level: 'Advanced',
    color: { bg:'rgba(196,60,40,0.12)', border:'rgba(196,60,40,0.4)', text:'#E06040' },
    decks: [
      { id:'chords-barre', label:'Barre Chords',   sub:'F B Bm F#m', pro:true },
      { id:'tab-pro',      label:'Tab (PRO)',       sub:'Strings 4–6', pro:true },
      { id:'theory-adv',   label:'Keys & Modes',   sub:'Key sigs, modes, scales', pro:true },
    ],
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

function getDeckCards(deckId) {
  switch (deckId) {
    case 'notes-basic':  return NOTES_FREE;
    case 'notes-pro':    return NOTES_PRO;
    case 'chords-open':  return CHORDS_FREE;
    case 'chords-barre': return CHORDS_PRO;
    case 'tab':          return TAB_FREE;
    case 'tab-pro':      return TAB_PRO;
    case 'theory':       return THEORY_CARDS;
    case 'theory-adv':   return THEORY_ADV_CARDS;
    default:             return [];
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Flashcards({ isPro = false, onPurchase, onRestore }) {
  const [deck,    setDeck]    = useState('notes-basic');
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score,   setScore]   = useState(0);
  const [done,    setDone]    = useState(false);
  const [modal,   setModal]   = useState(null);

  const allDecksFlat = DECK_SECTIONS.flatMap(s => s.decks);
  const activeDeckMeta = allDecksFlat.find(d => d.id === deck);
  const isProDeck = activeDeckMeta?.pro && !isPro;

  // Build active card list
  const cards = isProDeck ? [] : getDeckCards(deck);

  const card    = cards[cardIdx];
  const total   = cards.length;
  const atEnd   = cardIdx >= total - 1;

  function switchDeck(id) {
    setDeck(id); setCardIdx(0); setFlipped(false); setScore(0); setDone(false);
  }

  function advance(correct) {
    if (correct) setScore(s => s + 1);
    setFlipped(false);
    setTimeout(() => {
      if (atEnd) { setDone(true); }
      else { setCardIdx(i => i + 1); }
    }, 180);
  }

  function restart() {
    setCardIdx(0); setFlipped(false); setScore(0); setDone(false);
  }

  // ── Completion screen ──────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight:'100vh', background:M.bg, color:M.text,
      fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ maxWidth:360, textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🎸</div>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:8,
          background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text' }}>Deck Complete!</h1>
        <p style={{ fontSize:15, color:M.muted, marginBottom:6 }}>
          {score} / {total} correct
        </p>
        <div style={{ fontSize:36, marginBottom:24 }}>
          {score === total ? '🏆' : score >= total * 0.7 ? '⭐' : '💪'}
        </div>
        <button onClick={restart} style={{ ...btn(true), marginBottom:12, display:'block', width:'100%' }}>
          Retry Deck
        </button>
        <button onClick={() => { window.location.hash = ''; }}
          style={{ background:'none', border:'none', color:M.muted,
            fontFamily:"Georgia,serif", fontSize:13, cursor:'pointer' }}>
          ← Back to Home
        </button>
      </div>
    </div>
  );

  // ── Main deck view ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:M.bg, color:M.text,
      fontFamily:"Georgia,'Times New Roman',serif", padding:'24px 16px' }}>
      <style>{`
        .fc-inner {
          position: relative; width: 100%; height: 300px;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transition: transform 0.45s ease;
          cursor: pointer;
        }
        .fc-inner.flipped { transform: rotateY(180deg); }
        .fc-face {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 16px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 20px;
        }
        .fc-back { transform: rotateY(180deg); }
      `}</style>

      <div style={{ maxWidth: 420, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:32, marginBottom:6 }}>🃏</div>
          <h1 style={{ fontSize:18, fontWeight:800, marginBottom:2,
            background:'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text' }}>Flashcards</h1>
          <p style={{ fontSize:12, color:M.muted }}>
            Card <strong style={{ color:M.hi }}>{cardIdx + 1}</strong> of {total}
            {' · '}Score: <strong style={{ color:M.hi }}>{score}</strong>
          </p>
        </div>

        {/* Deck sections */}
        <div style={{ marginBottom: 20 }}>
          {DECK_SECTIONS.map(sec => (
            <div key={sec.level} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: sec.color.text,
                marginBottom: 6, paddingLeft: 2,
              }}>{sec.level}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {sec.decks.map(d => {
                  const isSel = deck === d.id;
                  const isLocked = d.pro && !isPro;
                  return (
                    <button key={d.id} onClick={() => switchDeck(d.id)} style={{
                      padding: '6px 12px', borderRadius: 10, textAlign: 'left',
                      border: `1px solid ${isSel ? sec.color.border : isLocked ? 'rgba(160,120,90,0.2)' : M.border}`,
                      background: isSel ? sec.color.bg : isLocked ? 'rgba(160,120,90,0.04)' : 'rgba(196,100,40,0.06)',
                      color: isSel ? sec.color.text : isLocked ? 'rgba(160,120,90,0.45)' : M.muted,
                      fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {isLocked && <span style={{ fontSize: 9, marginRight: 4 }}>🔒</span>}
                      {d.label}
                      <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 1 }}>{d.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* PRO gate for pro decks */}
        {isProDeck ? (
          <div style={{ textAlign:'center', padding:'48px 20px',
            background:M.surface, borderRadius:16,
            border:`1px solid ${M.border}`, marginBottom:20 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
            <div style={{ fontSize:16, fontWeight:800, color:M.accent, marginBottom:8 }}>
              PRO Cards — Unlock Full Range
            </div>
            <button onClick={() => setModal({ feature:'Flashcards PRO — Full Range' })}
              style={{ marginTop:8, padding:'10px 24px', borderRadius:12,
                border:`1px solid ${M.borderHi}`, background:'rgba(232,131,58,0.18)',
                color:M.hi, fontFamily:"Georgia,serif", fontWeight:700, fontSize:13,
                cursor:'pointer' }}>
              Unlock PRO →
            </button>
          </div>
        ) : (
          <>
            {/* Flip card */}
            <div style={{ perspective:'1200px', marginBottom:16 }}
              onClick={() => setFlipped(f => !f)}>
              <div className={`fc-inner${flipped ? ' flipped' : ''}`}>

                {/* Front */}
                {(() => {
                  const isNotes  = deck === 'notes-basic' || deck === 'notes-pro';
                  const isChords = deck === 'chords-open' || deck === 'chords-barre';
                  const isTab    = deck === 'tab' || deck === 'tab-pro';
                  const isTheory = deck === 'theory' || deck === 'theory-adv';
                  return (
                    <>
                      <div className="fc-face"
                        style={{ background:M.surface, border:`1px solid ${M.border}` }}>
                        <div style={{ fontSize:11, color:M.muted, letterSpacing:'0.1em',
                          textTransform:'uppercase', marginBottom:16 }}>
                          {isNotes  ? 'What note is this?' :
                           isChords ? 'Show the chord shape' :
                           isTab    ? 'What note?' :
                           deck === 'theory-adv' ? 'What do you know about this?' :
                                      'Name this symbol'}
                        </div>
                        {isNotes  && <MiniStaff step={card.step} />}
                        {isChords && (
                          <div style={{ fontSize:52, fontWeight:800, color:M.accent,
                            lineHeight:1, marginBottom:8 }}>{card.name}</div>
                        )}
                        {isTab    && <TabDiagram string={card.string} fret={card.fret} />}
                        {isTheory && deck === 'theory' && <TheorySymbol type={card.symbol} />}
                        {isTheory && deck === 'theory-adv' && (
                          <div style={{ fontSize: 22, fontWeight: 800, color: M.accent,
                            lineHeight: 1.3, textAlign: 'center', padding: '0 8px' }}>
                            {card.name}
                          </div>
                        )}
                        <div style={{ fontSize:11, color:'rgba(160,120,90,0.6)',
                          marginTop:16, letterSpacing:'0.05em' }}>Tap to flip</div>
                      </div>

                      {/* Back */}
                      <div className="fc-face fc-back"
                        style={{ background:M.panel, border:`1px solid ${M.borderHi}` }}>
                        {isNotes && (
                          <>
                            <div style={{ fontSize:44, fontWeight:800, color:M.hi,
                              lineHeight:1, marginBottom:8 }}>{card.name}</div>
                            <div style={{ fontSize:13, color:M.muted }}>{card.sub}</div>
                            <button onClick={e => { e.stopPropagation(); guitarSampler.resume(); guitarSampler.playNote(card.note, {volume:0.9}); }}
                              style={{ marginTop:14, ...btn(false), padding:'6px 16px', fontSize:12 }}>
                              🎸 Hear
                            </button>
                          </>
                        )}
                        {isChords && (
                          <>
                            <div style={{ fontSize:15, fontWeight:700, color:M.hi, marginBottom:8 }}>
                              {card.full}
                            </div>
                            <div style={{ width:'100%', maxWidth:160 }}>
                              <ChordDiagram frets={card.frets} baseFret={1} barre={card.barre} playing={false}/>
                            </div>
                            <button onClick={e => {
                              e.stopPropagation();
                              guitarSampler.resume();
                              card.notes.forEach((n,i) => setTimeout(() => guitarSampler.playNote(n,{volume:0.85}), i*40));
                            }} style={{ marginTop:8, ...btn(false), padding:'5px 14px', fontSize:12 }}>
                              🎸 Hear
                            </button>
                          </>
                        )}
                        {isTab && (
                          <div style={{ fontSize:44, fontWeight:800, color:M.hi, lineHeight:1 }}>
                            {card.note}
                          </div>
                        )}
                        {isTheory && (
                          <>
                            <div style={{ fontSize:16, fontWeight:800, color:M.hi,
                              marginBottom:10 }}>{card.name}</div>
                            <div style={{ fontSize:13, color:M.text, lineHeight:1.7,
                              textAlign:'center', maxWidth:260 }}>{card.answer}</div>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => advance(false)} style={{ ...btn(false), flex:1, maxWidth:160 }}>
                Skip →
              </button>
              <button onClick={() => advance(true)} style={{
                flex:1, maxWidth:160,
                padding:'10px 20px', borderRadius:12,
                border:'1px solid rgba(74,222,128,0.5)',
                background:'rgba(74,222,128,0.12)',
                color:'#4ade80',
                fontFamily:"Georgia,'Times New Roman',serif",
                fontWeight:700, fontSize:14, cursor:'pointer',
                transition:'all 0.15s',
              }}>
                Correct ✓
              </button>
            </div>
          </>
        )}

        {/* Progress bar */}
        <div style={{ height:4, background:M.surface, borderRadius:2, marginTop:16 }}>
          <div style={{ height:'100%', borderRadius:2,
            background:`linear-gradient(90deg,${M.primary},${M.accent})`,
            width:`${((cardIdx) / total) * 100}%`,
            transition:'width 0.3s ease' }}/>
        </div>

        {/* Back link */}
        <div style={{ textAlign:'center', paddingTop:20, paddingBottom:32 }}>
          <button onClick={() => { window.location.hash = ''; }}
            style={{ background:'none', border:'none', color:M.muted,
              fontFamily:"Georgia,serif", fontSize:13, cursor:'pointer' }}>
            ← Back to Home
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
