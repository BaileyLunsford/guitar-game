/**
 * FretboardNotes.jsx
 *
 * Three modes:
 *   Explorer  (FREE) — full neck, all note names, tap to hear
 *   Game      (PRO)  — note name shown, player taps correct fret
 *   Flashcard (PRO)  — fret position shown, player picks note from 4 options
 */

import React, { useState } from 'react';
import LandingPage from './LandingPage';
import { guitarSampler } from './guitarSampler';

// ── Theme ─────────────────────────────────────────────────────────────────────
const M = {
  bg:      '#120A04',
  surface: '#2A1208',
  panel:   '#1A0C05',
  accent:  '#E8833A',
  hi:      '#F5A65B',
  muted:   '#A0785A',
  text:    '#F5E8D8',
  border:  'rgba(196,100,40,0.25)',
  borderHi:'rgba(232,131,58,0.55)',
};

// ── Music theory ──────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// Semitones from C0 — E4, B3, G3, D3, A2, E2 (string 0 = high e, top visual)
const OPEN_SEMI   = [52, 47, 43, 38, 33, 28];
const STR_LABELS  = ['e','B','G','D','A','E'];
const NATURAL_NOTES = ['C','D','E','F','G','A','B'];

function noteAt(si, fret) {
  const s = OPEN_SEMI[si] + fret;
  return NOTE_NAMES[s % 12] + Math.floor(s / 12);
}

function noteLetter(note) { return note.replace(/\d+$/, ''); }

// ── Fretboard layout ──────────────────────────────────────────────────────────
const FW = 28;   // fret column width (px)
const SH = 20;   // string spacing
const PL = 10;   // left padding
const PT = 18;   // top padding
const NUT_X  = PL + FW;
const BOARD_W = PL + 13 * FW + 10;  // 384
const BOARD_H = PT + 5 * SH + 28;   // 146

function colX(f) { return PL + f * FW + FW / 2; }
function strY(i) { return PT + i * SH; }

// ── Module-level helpers for FlashcardMode ────────────────────────────────────
function makeRandomCard() {
  const si = Math.floor(Math.random() * 6);
  const f  = Math.floor(Math.random() * 13);
  return { si, fret: f, answer: noteAt(si, f) };
}

function makeOptions(card) {
  const correct = noteLetter(card.answer);
  const others  = NOTE_NAMES.filter(n => n !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  return [correct, ...others].sort(() => Math.random() - 0.5);
}

// ── Shared fretboard SVG ──────────────────────────────────────────────────────
function FretboardSVG({ mode, targetLetter, onTap, flashPos, flashResult }) {
  const cells = [];

  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= 12; f++) {
      const note   = noteAt(s, f);
      const letter = noteLetter(note);
      const cx     = colX(f);
      const cy     = strY(s);
      const isFlash = flashPos && flashPos.si === s && flashPos.fret === f;

      let fill   = 'rgba(255,255,255,0.07)';
      let stroke = 'rgba(196,100,40,0.28)';
      let tColor = M.muted;
      let r      = 9;
      let showLabel = mode === 'explorer';

      if (isFlash) {
        fill   = flashResult === 'correct' ? 'rgba(80,200,80,0.55)' : 'rgba(210,50,50,0.55)';
        stroke = flashResult === 'correct' ? '#5dc85d' : '#d23232';
        tColor = '#fff';
        r      = 11;
        showLabel = true;
      } else if (mode === 'game' && targetLetter && letter === targetLetter) {
        stroke = 'rgba(232,131,58,0.45)';
      }

      cells.push(
        <g key={`${s}-${f}`}
          onClick={() => onTap && onTap(s, f, note)}
          style={{ cursor: onTap ? 'pointer' : 'default' }}>
          {/* Invisible hit area */}
          <rect x={PL + f * FW} y={PT + s * SH - SH / 2}
            width={FW} height={SH} fill="transparent" />
          <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={0.8} />
          {showLabel && (
            <text x={cx} y={cy + 3} textAnchor="middle"
              fontSize="7" fontFamily="Georgia, serif"
              fill={tColor} fontWeight="700" pointerEvents="none">
              {letter}
            </text>
          )}
        </g>
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      style={{ width: '100%', maxWidth: BOARD_W, display: 'block' }}>

      {/* Fretboard body */}
      <rect x={NUT_X} y={PT - 12} width={BOARD_W - NUT_X - 6} height={5 * SH + 24}
        rx={3} fill="#1E0D06" stroke="rgba(196,100,40,0.2)" strokeWidth={0.7} />

      {/* String lines */}
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1={PL + 2} y1={strY(i)} x2={BOARD_W - 8} y2={strY(i)}
          stroke="rgba(245,232,216,0.28)"
          strokeWidth={i < 2 ? 0.7 : i < 4 ? 1.1 : 1.5} />
      ))}

      {/* Nut */}
      <rect x={NUT_X - 2.5} y={PT - 10} width={5} height={5 * SH + 20}
        rx={1} fill="rgba(245,210,100,0.65)" />

      {/* Fret wires */}
      {[1,2,3,4,5,6,7,8,9,10,11,12].map(k => (
        <line key={k}
          x1={PL + (k + 1) * FW} y1={PT - 8}
          x2={PL + (k + 1) * FW} y2={PT + 5 * SH + 8}
          stroke="rgba(160,100,50,0.45)" strokeWidth={0.7} />
      ))}

      {/* Position markers — inlaid between strings */}
      {[3, 5, 7, 9].map(f => (
        <circle key={f} cx={colX(f)}
          cy={PT + 2.5 * SH}
          r={3} fill="rgba(196,100,40,0.35)" />
      ))}
      {/* Fret 12 — double dot */}
      <circle cx={colX(12)} cy={PT + 1.5 * SH} r={3} fill="rgba(196,100,40,0.35)" />
      <circle cx={colX(12)} cy={PT + 3.5 * SH} r={3} fill="rgba(196,100,40,0.35)" />

      {/* String labels (left of nut) */}
      {[0,1,2,3,4,5].map(i => (
        <text key={i} x={PL - 2} y={strY(i) + 4}
          textAnchor="end" fontSize="8" fontFamily="Georgia, serif" fill={M.muted}>
          {STR_LABELS[i]}
        </text>
      ))}

      {/* Fret number labels */}
      {[3, 5, 7, 9, 12].map(f => (
        <text key={f} x={colX(f)} y={PT - 5}
          textAnchor="middle" fontSize="7" fontFamily="Georgia, serif"
          fill="rgba(160,120,90,0.45)">
          {f}
        </text>
      ))}

      {/* Note circles */}
      {cells}
    </svg>
  );
}

// ── Explorer mode ─────────────────────────────────────────────────────────────
function ExplorerMode() {
  const [tapped, setTapped] = useState(null);

  function handleTap(si, fret, note) {
    guitarSampler.resume?.();
    guitarSampler.playNote(note);
    setTapped({ si, fret, note });
    setTimeout(() => setTapped(null), 1100);
  }

  return (
    <>
      <div style={{
        background: M.panel, borderRadius: 14, border: `1px solid ${M.border}`,
        padding: '14px 16px', marginBottom: 14, textAlign: 'center', minHeight: 64,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {tapped ? (
          <>
            <div style={{
              fontSize: 34, fontWeight: 900, lineHeight: 1,
              background: `linear-gradient(135deg,${M.accent},${M.hi})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{tapped.note}</div>
            <div style={{ fontSize: 11, color: M.muted, marginTop: 4 }}>
              {STR_LABELS[tapped.si]}-string · fret {tapped.fret}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: M.muted }}>Tap any fret to hear and see the note</div>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <FretboardSVG mode="explorer" onTap={handleTap}
          flashPos={tapped} flashResult="correct" />
      </div>
      <div style={{ fontSize: 10, color: M.muted, textAlign: 'center', marginTop: 6 }}>
        6 strings · frets 0–12
      </div>
    </>
  );
}

// ── Game mode ─────────────────────────────────────────────────────────────────
function GameMode({ isPro, onUpgrade }) {
  const [score,    setScore]    = useState(0);
  const [streak,   setStreak]   = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [target,   setTarget]   = useState(
    () => NATURAL_NOTES[Math.floor(Math.random() * NATURAL_NOTES.length)]
  );
  const [flashPos, setFlashPos] = useState(null);
  const [flashRes, setFlashRes] = useState(null);
  const [locked,   setLocked]   = useState(false);

  if (!isPro) return <ProGate label="Fretboard Game" onUpgrade={onUpgrade} />;

  function nextTarget() {
    setTarget(NATURAL_NOTES[Math.floor(Math.random() * NATURAL_NOTES.length)]);
    setFlashPos(null); setFlashRes(null); setLocked(false);
  }

  function handleTap(si, fret, note) {
    if (locked) return;
    setAttempts(a => a + 1);
    setFlashPos({ si, fret });
    if (noteLetter(note) === target) {
      guitarSampler.resume?.();
      guitarSampler.playNote(note);
      setFlashRes('correct');
      setScore(s => s + 1);
      setStreak(s => s + 1);
      setLocked(true);
      setTimeout(nextTarget, 900);
    } else {
      setFlashRes('wrong');
      setStreak(0);
      setLocked(true);
      setTimeout(() => { setFlashPos(null); setFlashRes(null); setLocked(false); }, 600);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['Score', score], ['Streak', streak], ['Tries', attempts]].map(([lbl, val]) => (
          <div key={lbl} style={{
            flex: 1, background: M.panel, borderRadius: 10,
            border: `1px solid ${M.border}`, padding: '10px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: M.accent }}>{val}</div>
            <div style={{ fontSize: 9, color: M.muted, marginTop: 2 }}>{lbl.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <div style={{
        background: M.surface, borderRadius: 16, border: `1px solid ${M.borderHi}`,
        padding: '16px', marginBottom: 14, textAlign: 'center',
      }}>
        <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.1em', marginBottom: 4 }}>FIND THIS NOTE</div>
        <div style={{
          fontSize: 54, fontWeight: 900, lineHeight: 1,
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>{target}</div>
        <div style={{ fontSize: 11, color: M.muted, marginTop: 6 }}>Tap all correct positions on the neck</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <FretboardSVG mode="game" targetLetter={target}
          onTap={handleTap} flashPos={flashPos} flashResult={flashRes} />
      </div>
    </>
  );
}

// ── Flashcard mode ────────────────────────────────────────────────────────────
function FlashcardMode({ isPro, onUpgrade }) {
  const [score,   setScore]   = useState(0);
  const [streak,  setStreak]  = useState(0);
  const [card,    setCard]    = useState(makeRandomCard);
  const [options, setOptions] = useState(() => makeOptions(makeRandomCard()));
  const [chosen,  setChosen]  = useState(null);

  if (!isPro) return <ProGate label="Flashcard Mode" onUpgrade={onUpgrade} />;

  function handleChoice(opt) {
    if (chosen) return;
    setChosen(opt);
    const correct = noteLetter(card.answer);
    if (opt === correct) {
      guitarSampler.resume?.();
      guitarSampler.playNote(card.answer);
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
    setTimeout(() => {
      const next = makeRandomCard();
      setCard(next);
      setOptions(makeOptions(next));
      setChosen(null);
    }, 950);
  }

  const correct = noteLetter(card.answer);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['Score', score], ['Streak', streak]].map(([lbl, val]) => (
          <div key={lbl} style={{
            flex: 1, background: M.panel, borderRadius: 10,
            border: `1px solid ${M.border}`, padding: '10px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: M.accent }}>{val}</div>
            <div style={{ fontSize: 9, color: M.muted, marginTop: 2 }}>{lbl.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <div style={{
        background: M.surface, borderRadius: 16, border: `1px solid ${M.borderHi}`,
        padding: '18px 16px', marginBottom: 14, textAlign: 'center',
      }}>
        <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.1em', marginBottom: 10 }}>WHAT NOTE IS THIS?</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: M.text, marginBottom: 4 }}>
          {STR_LABELS[card.si]}-string · Fret {card.fret}
        </div>
        <div style={{ fontSize: 11, color: M.muted }}>
          {card.fret === 0 ? 'Open string' : `${card.fret}th fret`}
        </div>
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <FretboardSVG mode="explorer" flashPos={card} flashResult="correct" onTap={null} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {options.map(opt => {
          let bg = 'rgba(255,255,255,0.05)';
          let border = M.border;
          let color = M.text;
          if (chosen) {
            if (opt === correct)     { bg = 'rgba(80,200,80,0.18)';  border = '#5dc85d'; color = '#5dc85d'; }
            else if (opt === chosen) { bg = 'rgba(210,50,50,0.18)';  border = '#d23232'; color = '#d23232'; }
          }
          return (
            <button key={opt} onClick={() => handleChoice(opt)} style={{
              padding: '14px 8px', borderRadius: 12,
              background: bg, border: `1px solid ${border}`, color,
              fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 20,
              cursor: chosen ? 'default' : 'pointer', transition: 'all 0.12s',
            }}>{opt}</button>
          );
        })}
      </div>
    </>
  );
}

// ── Shared PRO gate ───────────────────────────────────────────────────────────
function ProGate({ label, onUpgrade }) {
  return (
    <div style={{
      textAlign: 'center', padding: '36px 16px',
      background: M.panel, borderRadius: 16, border: `1px solid ${M.border}`,
    }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: M.accent, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 13, color: M.muted, marginBottom: 22, lineHeight: 1.6 }}>
        This mode is part of PRO.
      </div>
      <button onClick={onUpgrade} style={{
        padding: '12px 28px', borderRadius: 12,
        background: `linear-gradient(135deg,#C46428,${M.accent})`,
        border: `1px solid ${M.borderHi}`,
        color: '#fff', fontWeight: 800, fontSize: 15,
        fontFamily: "Georgia, serif", cursor: 'pointer',
      }}>Unlock PRO →</button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FretboardNotes({ isPro, onUpgrade }) {
  const [started, setStarted] = useState(false);
  const [mode,    setMode]    = useState(null); // null | 'explorer' | 'game' | 'flashcard'

  if (!started) return (
    <LandingPage
      emoji="🎸"
      title="Fretboard Notes"
      description="Knowing note names on the neck unlocks scales, chord theory, and soloing. Explore the full fretboard, then drill yourself with Game or Flashcard mode."
      difficulty="Intermediate"
      features={[
        'Explorer (FREE) — all 78 notes, tap to hear',
        'Game (PRO) — tap every fret matching the named note',
        'Flashcard (PRO) — multiple-choice note quiz',
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
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => mode ? setMode(null) : (window.location.hash = '')}
          style={{ background: 'none', border: 'none', color: M.muted, fontSize: 22,
            cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <div>
          <h1 style={{
            fontSize: 18, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Fretboard Notes</h1>
          <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            {mode ? mode.toUpperCase() : 'INTERMEDIATE'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px' }}>

        {!mode ? (
          /* Mode select */
          <>
            <div style={{
              background: M.panel, borderRadius: 12, border: `1px solid ${M.border}`,
              padding: '12px 14px', marginBottom: 18, fontSize: 12, color: M.muted, lineHeight: 1.65,
            }}>
              <strong style={{ color: M.hi }}>Explorer</strong> is free — see and hear every note.{' '}
              <strong style={{ color: M.accent }}>Game</strong> and{' '}
              <strong style={{ color: M.accent }}>Flashcard</strong> require PRO.
            </div>

            {[
              { id: 'explorer',  label: 'Explorer',   sub: 'Interactive note reference — tap to hear', badge: 'FREE', pro: false, emoji: '🗺' },
              { id: 'game',      label: 'Game',        sub: 'Find every fret that matches the note',    badge: 'PRO',  pro: true,  emoji: '🎯' },
              { id: 'flashcard', label: 'Flashcard',   sub: 'Multiple-choice note name quiz',           badge: 'PRO',  pro: true,  emoji: '🃏' },
            ].map(m => (
              <button key={m.id}
                onClick={() => { if (m.pro && !isPro) onUpgrade(); else setMode(m.id); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${M.border}`,
                  borderRadius: 14, padding: '16px 18px', marginBottom: 10,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                <div style={{ fontSize: 28 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: M.text }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: M.muted, marginTop: 2 }}>{m.sub}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                  background: m.pro ? 'rgba(232,131,58,0.18)' : 'rgba(100,180,100,0.15)',
                  border: `1px solid ${m.pro ? 'rgba(232,131,58,0.5)' : 'rgba(100,180,100,0.4)'}`,
                  color: m.pro ? M.accent : '#7BC47B',
                }}>{m.badge}</span>
              </button>
            ))}
          </>
        ) : mode === 'explorer' ? (
          <ExplorerMode />
        ) : mode === 'game' ? (
          <GameMode isPro={isPro} onUpgrade={onUpgrade} />
        ) : (
          <FlashcardMode isPro={isPro} onUpgrade={onUpgrade} />
        )}

      </div>
    </div>
  );
}
