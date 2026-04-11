/**
 * TabNotationDisplay.jsx
 * Renders standard music notation (treble clef) above guitar tablature,
 * both sharing the same horizontal beat columns.
 *
 * Props:
 *   notes        {Array}   [{string, fret, beat, noteName}]
 *                           string: 1=high E … 6=low E
 *                           beat:   1-indexed column position
 *                           noteName: 'C4', 'F#5', etc.
 *   strings      {number}  Default 6; accepts 4 or 5 for other instruments
 *   tuning       {Array}   String names low→high. Default EADGBE guitar.
 *   showNotation {bool}    Show treble-clef staff. Default true.
 *   showTab      {bool}    Show tablature staff.   Default true.
 *   currentNote  {number}  Index into notes[] to highlight. Default null.
 */

import React from 'react';

// ─── Mahogany theme ─────────────────────────────────────────────────────────
const C = {
  bg:        '#120A04',
  surface:   '#2A1208',
  primary:   '#C46428',
  accent:    '#E8833A',
  highlight: '#F5A65B',
  muted:     '#A0785A',
  line:      'rgba(196,100,40,0.45)',
  text:      '#F5E8D8',
  correct:   '#7B9E6B',
  wrong:     '#C4603A',
};

// ─── Music theory helpers ───────────────────────────────────────────────────

// Diatonic step within octave (C=0 … B=6)
const DIA = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/**
 * Convert a note name like "G4", "C#5", "Bb3" to a staff position integer.
 * Reference: C4 = 0.  Each integer = one diatonic step.
 * Treble clef lines sit at positions 2(E4), 4(G4), 6(B4), 8(D5), 10(F5).
 */
function staffPos(noteName) {
  if (!noteName) return null;
  const m = noteName.match(/^([A-G])(#|b)?(\d+)$/);
  if (!m) return null;
  return (parseInt(m[3]) - 4) * 7 + DIA[m[1]];
}

/** Returns '#', 'b', or null for the accidental in a note name. */
function acc(noteName) {
  const m = noteName && noteName.match(/^[A-G](#|b)/);
  return m ? m[1] : null;
}

/**
 * Returns an array of staff positions that need ledger lines drawn.
 * Only positions that fall on a line (even integers) get ledger lines.
 */
function ledgerPositions(pos) {
  const out = [];
  if (pos <= 0) {                        // C4 and below
    const floor = pos % 2 === 0 ? pos : pos - 1;
    for (let p = 0; p >= floor; p -= 2) out.push(p);
  }
  if (pos >= 12) {                       // A5 and above
    const ceil = pos % 2 === 0 ? pos : pos + 1;
    for (let p = 12; p <= ceil; p += 2) out.push(p);
  }
  return out;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TabNotationDisplay({
  notes        = [],
  strings      = 6,
  tuning       = ['E', 'A', 'D', 'G', 'B', 'E'],  // low → high
  showNotation = true,
  showTab      = true,
  currentNote  = null,
}) {
  // ── Layout constants (viewBox units) ──────────────────────────────────────
  const LABEL_W    = 46;   // left column width (clef / string labels)
  const NOTE_COL   = 54;   // horizontal space per beat column
  const RIGHT_PAD  = 20;
  const STAFF_GAP  = 12;   // px between adjacent staff lines
  const HALF       = STAFF_GAP / 2;   // px per diatonic step = 6

  // Notation section
  const ABOVE_STAFF  = 32;   // breathing room above top staff line for high notes / stems
  const BELOW_STAFF  = 32;   // room below E4 line for ledger lines (C4, B3…)
  const STAFF_TOP_Y  = ABOVE_STAFF;                       // y of F5 line (pos 10)
  const STAFF_BOT_Y  = STAFF_TOP_Y + 4 * STAFF_GAP;      // y of E4 line (pos  2)
  const NOTATION_H   = STAFF_BOT_Y + BELOW_STAFF;

  // Tab section
  const TAB_SEP      = 20;
  const TAB_TOP_Y    = showNotation ? NOTATION_H + TAB_SEP : 14;
  const TAB_LINE_GAP = 14;
  const TAB_BOT_Y    = TAB_TOP_Y + (strings - 1) * TAB_LINE_GAP;

  // Total SVG viewBox dimensions
  const TOTAL_H =
    showTab      ? TAB_BOT_Y + 18
    : showNotation ? NOTATION_H + 10
    : 60;

  const NOTE_START = LABEL_W + 10;   // x where beat columns begin
  const TOTAL_W    = NOTE_START + Math.max(notes.length, 1) * NOTE_COL + RIGHT_PAD;

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /** SVG y for a staff position (pos 10 = F5 = top; pos 2 = E4 = bottom). */
  const sY = (pos) => STAFF_TOP_Y + (10 - pos) * HALF;

  /** SVG x for the center of a beat column (1-indexed). */
  const bX = (beat) => NOTE_START + (beat - 0.5) * NOTE_COL;

  /** SVG y for a tab string (1 = high E = top of tab, strings = low E = bottom). */
  const tY = (str) => TAB_TOP_Y + (str - 1) * TAB_LINE_GAP;

  // Tab labels go high→low (reverse the low→high tuning array)
  const displayTuning = [...tuning].reverse();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
      preserveAspectRatio="xMinYMid meet"
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Music notation and guitar tablature"
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      <rect width={TOTAL_W} height={TOTAL_H} fill={C.bg} rx="10" />

      {/* ════════════════════════════════════════════════════════════════════
          NOTATION STAFF
      ═══════════════════════════════════════════════════════════════════ */}
      {showNotation && (
        <g>
          {/* 5 staff lines at positions F5(10), D5(8), B4(6), G4(4), E4(2) */}
          {[10, 8, 6, 4, 2].map((pos) => (
            <line
              key={`sl${pos}`}
              x1={LABEL_W} x2={TOTAL_W - RIGHT_PAD}
              y1={sY(pos)} y2={sY(pos)}
              stroke={C.line} strokeWidth="1"
            />
          ))}

          {/* Treble clef — Unicode U+1D11E, positioned so G-curl aligns with G4 line */}
          <text
            x={LABEL_W - 2}
            y={sY(2) + STAFF_GAP * 0.6}
            fontSize={STAFF_GAP * 7}
            textAnchor="end"
            dominantBaseline="bottom"
            fontFamily="'Segoe UI Symbol','Apple Symbols','Arial Unicode MS',serif"
            fill={C.primary}
          >
            𝄞
          </text>

          {/* ── Per-note elements ──────────────────────────────────────── */}
          {notes.map((note, idx) => {
            const pos = staffPos(note.noteName);
            if (pos === null) return null;

            const x        = bX(note.beat);
            const y        = sY(pos);
            const accChar  = acc(note.noteName);
            const isActive = idx === currentNote;
            const color    = isActive ? C.highlight : C.text;
            const stemUp   = pos < 6;   // stem up when below middle B4
            const stemX    = stemUp ? x + 5.5 : x - 5.5;
            const stemY2   = stemUp ? y - 30 : y + 30;

            return (
              <g key={`note-${idx}`}>
                {/* Ledger lines */}
                {ledgerPositions(pos).map((lp) => (
                  <line
                    key={`lg${lp}`}
                    x1={x - 11} x2={x + 11}
                    y1={sY(lp)} y2={sY(lp)}
                    stroke={C.line} strokeWidth="1.4"
                  />
                ))}

                {/* Accidental (♯ / ♭) */}
                {accChar && (
                  <text
                    x={x - 14} y={y + 4}
                    fontSize="13" textAnchor="middle"
                    fill={C.muted}
                    fontFamily="'Segoe UI Symbol','Apple Symbols',serif"
                  >
                    {accChar === '#' ? '♯' : '♭'}
                  </text>
                )}

                {/* Stem */}
                <line
                  x1={stemX} x2={stemX}
                  y1={y} y2={stemY2}
                  stroke={color} strokeWidth="1.3"
                />

                {/* Note head — slightly tilted ellipse */}
                <ellipse
                  cx={x} cy={y}
                  rx="5.8" ry="4"
                  fill={color}
                  transform={`rotate(-18, ${x}, ${y})`}
                />

                {/* Active highlight ring */}
                {isActive && (
                  <ellipse
                    cx={x} cy={y}
                    rx="10" ry="8"
                    fill="none"
                    stroke={C.accent}
                    strokeWidth="1.8"
                    opacity="0.75"
                  />
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB STAFF
      ═══════════════════════════════════════════════════════════════════ */}
      {showTab && (
        <g>
          {/* "TAB" label centred on the string block */}
          <text
            x={LABEL_W - 4}
            y={TAB_TOP_Y + ((strings - 1) * TAB_LINE_GAP) / 2 + 4}
            fontSize="9" fontWeight="800" letterSpacing="1.5"
            fill={C.muted} textAnchor="end"
            fontFamily="'Helvetica Neue',Arial,sans-serif"
          >
            TAB
          </text>

          {/* String lines + tuning labels */}
          {Array.from({ length: strings }, (_, i) => {
            const strNum = i + 1;               // 1 = high E (top)
            const label  = displayTuning[i] || '?';
            const y      = tY(strNum);
            const isEdge = i === 0 || i === strings - 1;

            return (
              <g key={`str${i}`}>
                {/* Tuning label */}
                <text
                  x={NOTE_START - 7} y={y + 4}
                  fontSize="9" fontWeight="700"
                  fill={C.muted} textAnchor="end"
                  fontFamily="'Helvetica Neue',Arial,sans-serif"
                >
                  {label}
                </text>
                {/* String line */}
                <line
                  x1={NOTE_START - 3} x2={TOTAL_W - RIGHT_PAD}
                  y1={y} y2={y}
                  stroke={C.line}
                  strokeWidth={isEdge ? 1.3 : 0.8}
                />
              </g>
            );
          })}

          {/* Fret numbers */}
          {notes.map((note, idx) => {
            const x        = bX(note.beat);
            const y        = tY(note.string);
            const isActive = idx === currentNote;
            const label    = String(note.fret);
            const boxW     = label.length >= 2 ? 20 : 15;

            return (
              <g key={`fret-${idx}`}>
                {/* Pill background so text is legible over string line */}
                <rect
                  x={x - boxW / 2} y={y - 7}
                  width={boxW} height={14}
                  rx="3"
                  fill={isActive ? C.accent : C.surface}
                />
                <text
                  x={x} y={y + 4.5}
                  fontSize="10" fontWeight="700"
                  fill={isActive ? '#000' : C.text}
                  textAnchor="middle"
                  fontFamily="'Helvetica Neue',Arial,sans-serif"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
