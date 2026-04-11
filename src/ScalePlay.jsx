/**
 * ScalePlay.jsx — Guitar Audition Game
 * Landing page + stepped drill for learning scales.
 *
 * Modes:
 *   landing  — scale selector, level picker, fretboard pattern, Hear the Scale, Start Drill
 *   drill    — one note at a time, fretboard highlight, notation+tab, Prev/Next, Loop, BPM
 */

import React, { useState, useEffect, useRef } from 'react';
import TabNotationDisplay from './TabNotationDisplay';
import { guitarSampler } from './guitarSampler';

// ─── Mahogany palette ────────────────────────────────────────────────────────
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
  green:    '#7B9E6B',
  greenHi:  '#4ade80',
};

const STRING_LABELS = { 1:'e', 2:'B', 3:'G', 4:'D', 5:'A', 6:'E' };

// ─── Scale data ───────────────────────────────────────────────────────────────
// FREE scales use `levels: [{label, notes}, ...]`
// PRO scales use `notes: [...]` (locked, diagram only)
const SCALES = [
  // ── FREE ────────────────────────────────────────────────────────────────────
  {
    id: 'g-major', name: 'G Major', subtitle: 'Open Position',
    category: 'major', difficulty: 'Beginner', pro: false,
    levels: [
      {
        label: 'Level 1',
        desc: 'G3 → G4',
        notes: [
          { string: 6, fret: 3, noteName: 'G3',  root: true  },
          { string: 6, fret: 5, noteName: 'A3',  root: false },
          { string: 5, fret: 2, noteName: 'B3',  root: false },
          { string: 5, fret: 3, noteName: 'C4',  root: false },
          { string: 5, fret: 5, noteName: 'D4',  root: false },
          { string: 4, fret: 2, noteName: 'E4',  root: false },
          { string: 4, fret: 4, noteName: 'F#4', root: false },
          { string: 4, fret: 5, noteName: 'G4',  root: true  },
          { string: 4, fret: 4, noteName: 'F#4', root: false },
          { string: 4, fret: 2, noteName: 'E4',  root: false },
          { string: 5, fret: 5, noteName: 'D4',  root: false },
          { string: 5, fret: 3, noteName: 'C4',  root: false },
          { string: 5, fret: 2, noteName: 'B3',  root: false },
          { string: 6, fret: 5, noteName: 'A3',  root: false },
          { string: 6, fret: 3, noteName: 'G3',  root: true  },
        ],
      },
      {
        label: 'Level 2',
        desc: 'G4 → G5',
        notes: [
          { string: 4, fret: 5, noteName: 'G4',  root: true  },
          { string: 3, fret: 2, noteName: 'A4',  root: false },
          { string: 3, fret: 4, noteName: 'B4',  root: false },
          { string: 2, fret: 1, noteName: 'C5',  root: false },
          { string: 2, fret: 3, noteName: 'D5',  root: false },
          { string: 2, fret: 5, noteName: 'E5',  root: false },
          { string: 1, fret: 2, noteName: 'F#5', root: false },
          { string: 1, fret: 3, noteName: 'G5',  root: true  },
          { string: 1, fret: 2, noteName: 'F#5', root: false },
          { string: 2, fret: 5, noteName: 'E5',  root: false },
          { string: 2, fret: 3, noteName: 'D5',  root: false },
          { string: 2, fret: 1, noteName: 'C5',  root: false },
          { string: 3, fret: 4, noteName: 'B4',  root: false },
          { string: 3, fret: 2, noteName: 'A4',  root: false },
          { string: 4, fret: 5, noteName: 'G4',  root: true  },
        ],
      },
    ],
  },
  {
    id: 'a-minor', name: 'A Minor', subtitle: 'Open Position',
    category: 'minor', difficulty: 'Beginner', pro: false,
    levels: [
      {
        label: 'Level 1',
        desc: 'A3 → A4',
        notes: [
          { string: 6, fret: 5, noteName: 'A3',  root: true  },
          { string: 5, fret: 2, noteName: 'B3',  root: false },
          { string: 5, fret: 3, noteName: 'C4',  root: false },
          { string: 5, fret: 5, noteName: 'D4',  root: false },
          { string: 4, fret: 2, noteName: 'E4',  root: false },
          { string: 4, fret: 3, noteName: 'F4',  root: false },
          { string: 4, fret: 5, noteName: 'G4',  root: false },
          { string: 3, fret: 2, noteName: 'A4',  root: true  },
          { string: 4, fret: 5, noteName: 'G4',  root: false },
          { string: 4, fret: 3, noteName: 'F4',  root: false },
          { string: 4, fret: 2, noteName: 'E4',  root: false },
          { string: 5, fret: 5, noteName: 'D4',  root: false },
          { string: 5, fret: 3, noteName: 'C4',  root: false },
          { string: 5, fret: 2, noteName: 'B3',  root: false },
          { string: 6, fret: 5, noteName: 'A3',  root: true  },
        ],
      },
      {
        label: 'Level 2',
        desc: 'A4 → A5',
        notes: [
          { string: 3, fret: 2, noteName: 'A4',  root: true  },
          { string: 3, fret: 4, noteName: 'B4',  root: false },
          { string: 2, fret: 1, noteName: 'C5',  root: false },
          { string: 2, fret: 3, noteName: 'D5',  root: false },
          { string: 2, fret: 5, noteName: 'E5',  root: false },
          { string: 1, fret: 1, noteName: 'F5',  root: false },
          { string: 1, fret: 3, noteName: 'G5',  root: false },
          { string: 1, fret: 5, noteName: 'A5',  root: true  },
          { string: 1, fret: 3, noteName: 'G5',  root: false },
          { string: 1, fret: 1, noteName: 'F5',  root: false },
          { string: 2, fret: 5, noteName: 'E5',  root: false },
          { string: 2, fret: 3, noteName: 'D5',  root: false },
          { string: 2, fret: 1, noteName: 'C5',  root: false },
          { string: 3, fret: 4, noteName: 'B4',  root: false },
          { string: 3, fret: 2, noteName: 'A4',  root: true  },
        ],
      },
    ],
  },
  {
    id: 'g-pentatonic', name: 'G Major Pentatonic', subtitle: 'Pattern 1',
    category: 'pentatonic', difficulty: 'Beginner', pro: false,
    levels: [
      {
        label: 'Level 1',
        desc: 'G3 → G4',
        notes: [
          { string: 6, fret: 3, noteName: 'G3',  root: true  },
          { string: 6, fret: 5, noteName: 'A3',  root: false },
          { string: 5, fret: 2, noteName: 'B3',  root: false },
          { string: 5, fret: 5, noteName: 'D4',  root: false },
          { string: 4, fret: 2, noteName: 'E4',  root: false },
          { string: 4, fret: 5, noteName: 'G4',  root: true  },
          { string: 4, fret: 2, noteName: 'E4',  root: false },
          { string: 5, fret: 5, noteName: 'D4',  root: false },
          { string: 5, fret: 2, noteName: 'B3',  root: false },
          { string: 6, fret: 5, noteName: 'A3',  root: false },
          { string: 6, fret: 3, noteName: 'G3',  root: true  },
        ],
      },
      {
        label: 'Level 2',
        desc: 'G4 → G5',
        notes: [
          { string: 4, fret: 5, noteName: 'G4',  root: true  },
          { string: 3, fret: 2, noteName: 'A4',  root: false },
          { string: 3, fret: 4, noteName: 'B4',  root: false },
          { string: 2, fret: 3, noteName: 'D5',  root: false },
          { string: 2, fret: 5, noteName: 'E5',  root: false },
          { string: 1, fret: 3, noteName: 'G5',  root: true  },
          { string: 2, fret: 5, noteName: 'E5',  root: false },
          { string: 2, fret: 3, noteName: 'D5',  root: false },
          { string: 3, fret: 4, noteName: 'B4',  root: false },
          { string: 3, fret: 2, noteName: 'A4',  root: false },
          { string: 4, fret: 5, noteName: 'G4',  root: true  },
        ],
      },
    ],
  },
  // ── PRO — Major ─────────────────────────────────────────────────────────────
  {
    id: 'd-major', name: 'D Major', subtitle: 'Open Position',
    category: 'major', difficulty: 'Beginner', pro: true,
    notes: [
      { string: 5, fret: 5, noteName: 'D4',  root: true  },
      { string: 4, fret: 2, noteName: 'E4',  root: false },
      { string: 4, fret: 4, noteName: 'F#4', root: false },
      { string: 4, fret: 5, noteName: 'G4',  root: false },
      { string: 3, fret: 2, noteName: 'A4',  root: false },
      { string: 3, fret: 4, noteName: 'B4',  root: false },
      { string: 2, fret: 4, noteName: 'C#5', root: false },
      { string: 2, fret: 5, noteName: 'D5',  root: true  },
    ],
  },
  {
    id: 'a-major', name: 'A Major', subtitle: 'Open Position',
    category: 'major', difficulty: 'Beginner', pro: true,
    notes: [
      { string: 5, fret: 0, noteName: 'A2',  root: true  },
      { string: 5, fret: 2, noteName: 'B2',  root: false },
      { string: 5, fret: 4, noteName: 'C#3', root: false },
      { string: 4, fret: 0, noteName: 'D3',  root: false },
      { string: 4, fret: 2, noteName: 'E3',  root: false },
      { string: 4, fret: 4, noteName: 'F#3', root: false },
      { string: 3, fret: 1, noteName: 'G#3', root: false },
      { string: 3, fret: 2, noteName: 'A3',  root: true  },
    ],
  },
  {
    id: 'e-major', name: 'E Major', subtitle: 'Open Position',
    category: 'major', difficulty: 'Beginner', pro: true,
    notes: [
      { string: 6, fret: 0, noteName: 'E2',  root: true  },
      { string: 6, fret: 2, noteName: 'F#2', root: false },
      { string: 6, fret: 4, noteName: 'G#2', root: false },
      { string: 5, fret: 0, noteName: 'A2',  root: false },
      { string: 5, fret: 2, noteName: 'B2',  root: false },
      { string: 5, fret: 4, noteName: 'C#3', root: false },
      { string: 4, fret: 1, noteName: 'D#3', root: false },
      { string: 4, fret: 2, noteName: 'E3',  root: true  },
    ],
  },
  {
    id: 'c-major', name: 'C Major', subtitle: 'Open Position',
    category: 'major', difficulty: 'Beginner', pro: true,
    notes: [
      { string: 5, fret: 3, noteName: 'C3',  root: true  },
      { string: 5, fret: 5, noteName: 'D3',  root: false },
      { string: 4, fret: 2, noteName: 'E3',  root: false },
      { string: 4, fret: 3, noteName: 'F3',  root: false },
      { string: 4, fret: 5, noteName: 'G3',  root: false },
      { string: 3, fret: 2, noteName: 'A3',  root: false },
      { string: 3, fret: 4, noteName: 'B3',  root: false },
      { string: 2, fret: 1, noteName: 'C4',  root: true  },
    ],
  },
  // ── PRO — Minor ─────────────────────────────────────────────────────────────
  {
    id: 'd-minor', name: 'D Minor', subtitle: 'Open Position',
    category: 'minor', difficulty: 'Intermediate', pro: true,
    notes: [
      { string: 5, fret: 5, noteName: 'D3',  root: true  },
      { string: 4, fret: 2, noteName: 'E3',  root: false },
      { string: 4, fret: 3, noteName: 'F3',  root: false },
      { string: 4, fret: 5, noteName: 'G3',  root: false },
      { string: 3, fret: 2, noteName: 'A3',  root: false },
      { string: 3, fret: 3, noteName: 'Bb3', root: false },
      { string: 2, fret: 1, noteName: 'C4',  root: false },
      { string: 2, fret: 3, noteName: 'D4',  root: true  },
    ],
  },
  {
    id: 'e-minor', name: 'E Minor', subtitle: 'Open Position',
    category: 'minor', difficulty: 'Beginner', pro: true,
    notes: [
      { string: 6, fret: 0, noteName: 'E2',  root: true  },
      { string: 6, fret: 2, noteName: 'F#2', root: false },
      { string: 5, fret: 0, noteName: 'A2',  root: false },
      { string: 5, fret: 2, noteName: 'B2',  root: false },
      { string: 5, fret: 3, noteName: 'C3',  root: false },
      { string: 4, fret: 0, noteName: 'D3',  root: false },
      { string: 4, fret: 2, noteName: 'E3',  root: true  },
      { string: 3, fret: 0, noteName: 'G3',  root: false },
    ],
  },
  {
    id: 'b-minor', name: 'B Minor', subtitle: 'Open Position',
    category: 'minor', difficulty: 'Intermediate', pro: true,
    notes: [
      { string: 5, fret: 2, noteName: 'B2',  root: true  },
      { string: 5, fret: 4, noteName: 'C#3', root: false },
      { string: 4, fret: 1, noteName: 'D3',  root: false },
      { string: 4, fret: 2, noteName: 'E3',  root: false },
      { string: 4, fret: 4, noteName: 'F#3', root: false },
      { string: 3, fret: 1, noteName: 'G3',  root: false },
      { string: 3, fret: 2, noteName: 'A3',  root: false },
      { string: 2, fret: 0, noteName: 'B3',  root: true  },
    ],
  },
  // ── PRO — Pentatonic ────────────────────────────────────────────────────────
  {
    id: 'a-minor-pent', name: 'A Minor Pentatonic', subtitle: 'Pattern 1',
    category: 'pentatonic', difficulty: 'Intermediate', pro: true,
    notes: [
      { string: 6, fret: 5, noteName: 'A2',  root: true  },
      { string: 6, fret: 8, noteName: 'C3',  root: false },
      { string: 5, fret: 5, noteName: 'D3',  root: false },
      { string: 5, fret: 7, noteName: 'E3',  root: false },
      { string: 4, fret: 5, noteName: 'G3',  root: false },
      { string: 4, fret: 7, noteName: 'A3',  root: true  },
    ],
  },
  {
    id: 'd-minor-pent', name: 'D Minor Pentatonic', subtitle: 'Pattern 1',
    category: 'pentatonic', difficulty: 'Intermediate', pro: true,
    notes: [
      { string: 6, fret: 10, noteName: 'D3', root: true  },
      { string: 6, fret: 13, noteName: 'F3', root: false },
      { string: 5, fret: 10, noteName: 'G3', root: false },
      { string: 5, fret: 12, noteName: 'A3', root: false },
      { string: 4, fret: 10, noteName: 'C4', root: false },
      { string: 4, fret: 12, noteName: 'D4', root: true  },
    ],
  },
  {
    id: 'e-minor-pent', name: 'E Minor Pentatonic', subtitle: 'Pattern 1',
    category: 'pentatonic', difficulty: 'Intermediate', pro: true,
    notes: [
      { string: 6, fret: 0, noteName: 'E2',  root: true  },
      { string: 6, fret: 3, noteName: 'G2',  root: false },
      { string: 5, fret: 0, noteName: 'A2',  root: false },
      { string: 5, fret: 2, noteName: 'B2',  root: false },
      { string: 4, fret: 0, noteName: 'D3',  root: false },
      { string: 4, fret: 2, noteName: 'E3',  root: true  },
    ],
  },
  {
    id: 'b-minor-pent', name: 'B Minor Pentatonic', subtitle: 'Pattern 1',
    category: 'pentatonic', difficulty: 'Advanced', pro: true,
    notes: [
      { string: 5, fret: 2, noteName: 'B2',  root: true  },
      { string: 5, fret: 5, noteName: 'D3',  root: false },
      { string: 4, fret: 2, noteName: 'E3',  root: false },
      { string: 4, fret: 4, noteName: 'F#3', root: false },
      { string: 3, fret: 2, noteName: 'A3',  root: false },
      { string: 3, fret: 4, noteName: 'B3',  root: true  },
    ],
  },
  {
    id: 'c-minor-pent', name: 'C Minor Pentatonic', subtitle: 'Pattern 1',
    category: 'pentatonic', difficulty: 'Advanced', pro: true,
    notes: [
      { string: 5, fret: 3, noteName: 'C3',  root: true  },
      { string: 5, fret: 6, noteName: 'Eb3', root: false },
      { string: 4, fret: 3, noteName: 'F3',  root: false },
      { string: 4, fret: 5, noteName: 'G3',  root: false },
      { string: 3, fret: 3, noteName: 'Bb3', root: false },
      { string: 3, fret: 5, noteName: 'C4',  root: true  },
    ],
  },
];

const CATEGORIES = ['major', 'minor', 'pentatonic'];
const CATEGORY_LABELS = { major: 'Major', minor: 'Minor', pentatonic: 'Pentatonic' };
const DIFFICULTY_COLOR = {
  Beginner:     { bg: 'rgba(123,158,107,0.15)', border: 'rgba(123,158,107,0.45)', color: '#7B9E6B' },
  Intermediate: { bg: 'rgba(232,131,58,0.15)',  border: 'rgba(232,131,58,0.45)',  color: '#E8833A' },
  Advanced:     { bg: 'rgba(196,60,40,0.18)',   border: 'rgba(196,60,40,0.5)',    color: '#E06040' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uniquePositions(notes) {
  const seen = new Map();
  for (const n of notes) {
    const key = `${n.string}-${n.fret}`;
    if (!seen.has(key)) seen.set(key, { ...n });
    else if (n.root) seen.get(key).root = true;
  }
  return Array.from(seen.values());
}

function getScaleNotes(scale, levelIdx) {
  return scale.levels ? (scale.levels[levelIdx] ?? scale.levels[0]).notes : scale.notes;
}

// ─── Fretboard diagram ────────────────────────────────────────────────────────
// activeFret: { string, fret } — highlights that position in green
function FretboardDiagram({ notes, activeFret = null }) {
  const uniq    = uniquePositions(notes);
  const allFrets = uniq.map(n => n.fret);
  const minFret  = Math.min(...allFrets.filter(f => f > 0), 1);
  const maxFret  = Math.max(...allFrets, 5);
  const startFret = allFrets.some(f => f === 0) ? 0 : Math.max(0, minFret - 1);
  const endFret   = maxFret + 1;
  const numFrets  = endFret - startFret;

  const W = 320, H = 130;
  const padL = 28, padR = 16, padT = 14, padB = 14;
  const gridW = W - padL - padR;
  const gridH = H - padT - padB;
  const strGap  = gridH / 5;
  const fretGap = gridW / numFrets;

  function strY(s)  { return padT + (s - 1) * strGap; }
  function fretX(f) { return padL + (f - startFret) * fretGap; }
  function midX(f)  { return fretX(f) - fretGap / 2; }

  const dotR = 9;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: 320 }}>
      {startFret === 0 && (
        <rect x={padL} y={padT - 2} width={3} height={gridH + 4} fill={M.hi} rx={1} />
      )}
      {startFret > 0 && (
        <text x={padL - 6} y={padT + gridH / 2 + 4}
          fill={M.muted} fontSize={9} textAnchor="middle"
          fontFamily="Georgia, serif">{startFret}fr</text>
      )}
      {[1,2,3,4,5,6].map(s => (
        <line key={s}
          x1={padL} y1={strY(s)} x2={padL + gridW} y2={strY(s)}
          stroke="rgba(196,100,40,0.35)" strokeWidth={s === 6 ? 1.8 : 1} />
      ))}
      {Array.from({ length: numFrets + 1 }, (_, i) => startFret + i).map(f => (
        <line key={f}
          x1={fretX(f)} y1={padT} x2={fretX(f)} y2={padT + gridH}
          stroke="rgba(196,100,40,0.22)" strokeWidth={1} />
      ))}
      {[1,2,3,4,5,6].map(s => (
        <text key={s} x={padL - 10} y={strY(s) + 4}
          fill={M.muted} fontSize={8} textAnchor="middle"
          fontFamily="Georgia, serif">{STRING_LABELS[s]}</text>
      ))}
      {uniq.map((n, i) => {
        const cx = n.fret === 0 ? padL - 12 : midX(n.fret);
        const cy = strY(n.string);
        const isActive = activeFret &&
          n.string === activeFret.string && n.fret === activeFret.fret;
        const fill = isActive ? M.greenHi : n.root ? M.accent : M.text;
        const stroke = isActive ? 'rgba(74,222,128,0.6)'
          : n.root ? M.hi : 'rgba(245,232,216,0.3)';
        const textFill = isActive ? '#0a1a0a'
          : n.root ? '#120A04' : '#2A1208';
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={isActive ? dotR + 2 : dotR}
              fill={fill} stroke={stroke} strokeWidth={isActive ? 2 : 1}
              style={{ transition: 'all 0.1s' }} />
            <text x={cx} y={cy + 3.5} textAnchor="middle"
              fill={textFill} fontSize={7} fontWeight="700"
              fontFamily="Georgia, serif">
              {n.noteName.replace('#','♯').replace('b','♭')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Note position card ───────────────────────────────────────────────────────
function NotePositionCard({ note, active }) {
  const strLabel = STRING_LABELS[note.string];
  const strFull  = ['high e','B','G','D','A','low E'][note.string - 1];
  return (
    <div style={{
      background: M.surface, borderRadius: 16,
      border: `1px solid ${active ? M.borderHi : M.border}`,
      padding: '22px 20px', textAlign: 'center',
      boxShadow: active ? '0 0 20px rgba(232,131,58,0.18)' : 'none',
      transition: 'all 0.2s',
    }}>
      <div style={{
        fontSize: 44, fontWeight: 900, lineHeight: 1,
        background: `linear-gradient(135deg, ${M.accent}, ${M.hi})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 10,
      }}>
        {note.noteName.replace('#','♯').replace('b','♭')}
      </div>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: M.text }}>{note.fret}</div>
          <div style={{ fontSize: 10, color: M.muted, textTransform: 'uppercase',
            letterSpacing: '0.1em' }}>Fret</div>
        </div>
        <div style={{ width: 1, background: M.border }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: M.text }}>{strLabel}</div>
          <div style={{ fontSize: 10, color: M.muted, textTransform: 'uppercase',
            letterSpacing: '0.1em' }}>String</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: M.muted }}>{strFull} string · fret {note.fret}</div>
      {note.root && (
        <div style={{
          display: 'inline-block', marginTop: 10,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
          background: 'rgba(232,131,58,0.18)', border: `1px solid ${M.borderHi}`,
          color: M.accent,
        }}>Root Note</div>
      )}
    </div>
  );
}

// ─── Button style ─────────────────────────────────────────────────────────────
function btnStyle(active = false, disabled = false) {
  return {
    padding: '10px 18px', borderRadius: 12,
    border: `1px solid ${active ? M.borderHi : M.border}`,
    background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.1)',
    color: disabled ? M.muted : (active ? M.hi : M.text),
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s', userSelect: 'none',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScalePlay() {
  const [category,   setCategory]  = useState('major');
  const [scaleId,    setScaleId]   = useState('g-major');
  const [levelIdx,   setLevelIdx]  = useState(0);
  const [mode,       setMode]      = useState('landing');
  const [noteIdx,    setNoteIdx]   = useState(0);
  const [bpm,        setBpm]       = useState(80);
  const [loop,       setLoop]      = useState(false);
  const [loopTick,   setLoopTick]  = useState(0);
  const [activeNote,     setActiveNote]     = useState(null); // null or noteIdx when playing
  const [hearActiveFret, setHearActiveFret] = useState(null); // {string,fret} during Hear the Scale

  const noteTimersRef = useRef([]);
  const loopTimerRef  = useRef(null);

  const scale      = SCALES.find(s => s.id === scaleId) ?? SCALES[0];
  const catScales  = SCALES.filter(s => s.category === category);
  const notes      = getScaleNotes(scale, levelIdx);
  const total      = notes.length;
  const currentNote = notes[noteIdx] ?? notes[0];

  // ── Audio helpers ───────────────────────────────────────────────────────────
  function clearNoteTimers() {
    noteTimersRef.current.forEach(t => clearTimeout(t));
    noteTimersRef.current = [];
    setActiveNote(null);
  }

  function hearScale() {
    clearNoteTimers();
    setHearActiveFret(null);
    guitarSampler.resume();
    const beatMs = 60_000 / bpm;
    notes.forEach((note, i) => {
      // Light up dot + play audio
      const tOn = setTimeout(() => {
        guitarSampler.playNote(note.noteName);
        setHearActiveFret({ string: note.string, fret: note.fret });
      }, Math.round(i * beatMs));
      // Clear dot 80% through the beat (before the next note lights up)
      const tOff = setTimeout(() => setHearActiveFret(null),
        Math.round(i * beatMs + beatMs * 0.8));
      noteTimersRef.current.push(tOn, tOff);
    });
  }

  function playDrillNote(note) {
    clearNoteTimers();
    guitarSampler.resume();
    guitarSampler.playNote(note.noteName);
    setActiveNote(noteIdx);
    const t = setTimeout(() => setActiveNote(null), Math.round(60_000 / bpm));
    noteTimersRef.current.push(t);
  }

  // ── Loop effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'drill') return;
    if (!loop) { clearTimeout(loopTimerRef.current); return; }
    playDrillNote(currentNote);
    const dur = Math.round(60_000 / bpm) + 200;
    loopTimerRef.current = setTimeout(() => setLoopTick(t => t + 1), dur);
    return () => clearTimeout(loopTimerRef.current);
  }, [loop, noteIdx, bpm, loopTick, mode]); // eslint-disable-line

  // ── Navigate → play ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'drill' || loop) return;
    playDrillNote(currentNote);
    return () => clearNoteTimers();
  }, [noteIdx, mode]); // eslint-disable-line

  // ── Enter drill ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'drill') { setNoteIdx(0); setLoop(false); }
  }, [mode]); // eslint-disable-line

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(loopTimerRef.current);
    clearNoteTimers();
  }, []);

  // ── Drill controls ──────────────────────────────────────────────────────────
  function handlePrev()   { setLoop(false); setNoteIdx(i => Math.max(i - 1, 0)); }
  function handleNext()   { setLoop(false); setNoteIdx(i => Math.min(i + 1, total - 1)); }
  function handleRepeat() { setLoop(false); playDrillNote(currentNote); }

  // ── Scale selection ─────────────────────────────────────────────────────────
  function selectScale(s) {
    if (s.pro) return;
    setScaleId(s.id);
    setLevelIdx(0);
    setNoteIdx(0);
    setLoop(false);
    setMode('landing');
  }

  // ── Render: Landing ─────────────────────────────────────────────────────────
  if (mode === 'landing') {
    const dc = DIFFICULTY_COLOR[scale.difficulty] ?? DIFFICULTY_COLOR.Beginner;
    const levelNotes = notes; // already derived from levelIdx
    return (
      <div style={{
        minHeight: '100vh', background: M.bg, color: M.text,
        fontFamily: "Georgia, 'Times New Roman', serif", padding: '24px 16px',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 6,
              filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
            <h1 style={{
              fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Scale Play</h1>
            <p style={{ fontSize: 13, color: M.muted, maxWidth: 280, margin: '0 auto' }}>
              Learn scales step by step. The app plays each note — follow along on your guitar.
            </p>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: '7px 16px', borderRadius: 20,
                border: `1px solid ${category === cat ? M.borderHi : M.border}`,
                background: category === cat ? 'rgba(232,131,58,0.2)' : 'rgba(196,100,40,0.07)',
                color: category === cat ? M.hi : M.muted,
                fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              }}>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Scale pills */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
            marginBottom: 20, scrollbarWidth: 'none',
          }}>
            {catScales.map(s => {
              const isSel = s.id === scaleId;
              return (
                <button key={s.id} onClick={() => selectScale(s)} style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                  border: `1px solid ${isSel ? M.borderHi : s.pro ? 'rgba(160,120,90,0.3)' : M.border}`,
                  background: isSel ? 'rgba(232,131,58,0.2)'
                    : s.pro ? 'rgba(160,120,90,0.06)' : 'rgba(196,100,40,0.08)',
                  color: isSel ? M.hi : s.pro ? 'rgba(160,120,90,0.6)' : M.text,
                  fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 12,
                  cursor: s.pro ? 'default' : 'pointer',
                  transition: 'all 0.15s', userSelect: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {s.pro && <span style={{ fontSize: 10 }}>🔒</span>}
                  {s.name}
                  {!s.pro && (
                    <span style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: '0.08em',
                      textTransform: 'uppercase', padding: '1px 5px', borderRadius: 10,
                      background: 'rgba(123,158,107,0.15)', border: '1px solid rgba(123,158,107,0.4)',
                      color: M.green,
                    }}>FREE</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected scale card */}
          <div style={{
            background: M.surface, borderRadius: 16,
            border: `1px solid ${M.border}`, padding: '18px 16px', marginBottom: 16,
          }}>
            {/* Name + difficulty */}
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: M.text,
                  marginBottom: 2 }}>{scale.name}</div>
                <div style={{ fontSize: 12, color: M.muted }}>{scale.subtitle}</div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
                background: dc.bg, border: `1px solid ${dc.border}`, color: dc.color,
                marginTop: 2, flexShrink: 0,
              }}>{scale.difficulty}</span>
            </div>

            {/* Level selector (FREE scales only) */}
            {scale.levels && (
              <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
                {scale.levels.map((lv, i) => (
                  <button key={i} onClick={() => { setLevelIdx(i); setNoteIdx(0); }} style={{
                    padding: '6px 18px', borderRadius: 20,
                    border: `1px solid ${levelIdx === i ? M.borderHi : M.border}`,
                    background: levelIdx === i ? 'rgba(232,131,58,0.2)' : 'transparent',
                    color: levelIdx === i ? M.hi : M.muted,
                    fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 12,
                    cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                  }}>
                    {lv.label}
                    <span style={{ fontSize: 10, color: levelIdx === i ? M.accent : 'rgba(160,120,90,0.6)',
                      marginLeft: 5 }}>{lv.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, color: M.muted, marginBottom: 14 }}>
              {uniquePositions(levelNotes).length} positions · {levelNotes.length} notes up &amp; down
            </div>

            {/* Fretboard diagram */}
            <div style={{ marginBottom: 16, overflowX: 'auto' }}>
              <FretboardDiagram notes={levelNotes} activeFret={hearActiveFret} />
            </div>

            {/* Hear the Scale */}
            <button onClick={hearScale} style={{
              width: '100%', padding: '12px', borderRadius: 12,
              border: `1px solid ${M.border}`, background: 'rgba(196,100,40,0.1)',
              color: M.text, fontFamily: "Georgia, serif",
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              ♪ Hear the Scale
            </button>
          </div>

          {/* BPM */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            padding: '12px 20px', background: M.panel,
            border: `1px solid ${M.border}`, borderRadius: 14, marginBottom: 20,
          }}>
            <button onClick={() => setBpm(b => Math.max(40, b - 10))} disabled={bpm <= 40}
              style={{ ...btnStyle(false, bpm <= 40), padding: '6px 14px', fontSize: 18, lineHeight: 1 }}>−</button>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: M.accent, lineHeight: 1 }}>{bpm}</div>
              <div style={{ fontSize: 9, color: M.muted, textTransform: 'uppercase',
                letterSpacing: '0.12em', marginTop: 2 }}>BPM</div>
            </div>
            <button onClick={() => setBpm(b => Math.min(200, b + 10))} disabled={bpm >= 200}
              style={{ ...btnStyle(false, bpm >= 200), padding: '6px 14px', fontSize: 18, lineHeight: 1 }}>+</button>
          </div>

          {/* Start Drill */}
          <button onClick={() => setMode('drill')} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: `1px solid ${M.borderHi}`, background: 'rgba(232,131,58,0.18)',
            color: M.hi, fontFamily: "Georgia, serif",
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            marginBottom: 28, transition: 'all 0.15s',
          }}>
            Start Drill →
          </button>

          {/* Back */}
          <div style={{ textAlign: 'center', paddingBottom: 40 }}>
            <a href="#" style={{ color: M.muted, fontSize: 13, textDecoration: 'none' }}>
              ← Back to home
            </a>
          </div>

        </div>
      </div>
    );
  }

  // ── Render: Drill ────────────────────────────────────────────────────────────
  const atStart = noteIdx === 0;
  const atEnd   = noteIdx >= total - 1;
  const pct     = total > 1 ? (noteIdx / (total - 1)) * 100 : 100;

  // Build single-note array for TabNotationDisplay
  const drillTabNote = [{ string: currentNote.string, fret: currentNote.fret,
    beat: 1, noteName: currentNote.noteName }];

  // Active fret position for diagram highlight
  const activeFretPos = activeNote !== null ? currentNote : null;

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif", padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 4,
            filter: 'drop-shadow(0 2px 8px rgba(196,100,40,0.4))' }}>🎸</div>
          <h1 style={{
            fontSize: 16, fontWeight: 800, marginBottom: 2, letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {scale.name}
            {scale.levels && (
              <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 8,
                WebkitTextFillColor: M.muted }}>
                {scale.levels[levelIdx]?.label} · {scale.levels[levelIdx]?.desc}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 12, color: M.muted, marginBottom: 8 }}>
            Note <strong style={{ color: M.hi }}>{noteIdx + 1}</strong> of {total}
          </p>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
            {notes.map((n, i) => (
              <button key={i} onClick={() => { setLoop(false); setNoteIdx(i); }}
                title={n.noteName} style={{
                  width: i === noteIdx ? 20 : 8, height: 8, borderRadius: 4,
                  border: 'none', padding: 0, cursor: 'pointer',
                  background: i === noteIdx ? (n.root ? M.accent : M.hi)
                    : i < noteIdx ? M.primary : M.surface,
                  transition: 'all 0.2s ease',
                }} />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: M.surface, borderRadius: 3,
          marginBottom: 14, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${M.primary}, ${M.accent})`,
            width: `${pct}%`, transition: 'width 0.35s ease',
          }} />
        </div>

        {/* Fretboard diagram with active highlight */}
        <div style={{
          background: M.surface, borderRadius: 12,
          border: `1px solid ${activeFretPos ? 'rgba(74,222,128,0.25)' : M.border}`,
          padding: '12px 10px', marginBottom: 14,
          transition: 'border-color 0.15s',
        }}>
          <FretboardDiagram notes={notes} activeFret={activeFretPos} />
        </div>

        {/* Note position card */}
        <div style={{ marginBottom: 14 }}>
          <NotePositionCard note={currentNote} active={activeNote !== null} />
        </div>

        {/* Notation + Tab */}
        <div style={{
          background: M.surface, borderRadius: 12,
          border: `1px solid ${M.border}`, padding: '12px 10px', marginBottom: 14,
        }}>
          <TabNotationDisplay notes={drillTabNote} currentNote={0} />
        </div>

        {/* Prev / Repeat / Next */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
          <button onClick={handlePrev} disabled={atStart} style={btnStyle(false, atStart)}>← Prev</button>
          <button onClick={handleRepeat} style={btnStyle(false, false)}>↺ Repeat</button>
          <button onClick={handleNext} disabled={atEnd} style={btnStyle(false, atEnd)}>Next →</button>
        </div>

        {/* Loop */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          <button onClick={() => setLoop(l => !l)} style={btnStyle(loop, false)}>
            🔁 {loop ? 'Loop On' : 'Loop Off'}
          </button>
        </div>

        {/* BPM */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: '12px 20px', background: M.panel,
          border: `1px solid ${M.border}`, borderRadius: 14, marginBottom: 24,
        }}>
          <button onClick={() => setBpm(b => Math.max(40, b - 10))} disabled={bpm <= 40}
            style={{ ...btnStyle(false, bpm <= 40), padding: '7px 16px', fontSize: 18, lineHeight: 1 }}>−</button>
          <div style={{ textAlign: 'center', minWidth: 72 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: M.accent, lineHeight: 1 }}>{bpm}</div>
            <div style={{ fontSize: 10, color: M.muted, textTransform: 'uppercase',
              letterSpacing: '0.12em', marginTop: 2 }}>BPM</div>
          </div>
          <button onClick={() => setBpm(b => Math.min(200, b + 10))} disabled={bpm >= 200}
            style={{ ...btnStyle(false, bpm >= 200), padding: '7px 16px', fontSize: 18, lineHeight: 1 }}>+</button>
        </div>

        {/* Back to landing */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <button onClick={() => { setLoop(false); setMode('landing'); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: M.muted, fontSize: 13, fontFamily: "Georgia, serif",
            }}>
            ← Back to Scale Select
          </button>
        </div>

      </div>
    </div>
  );
}
