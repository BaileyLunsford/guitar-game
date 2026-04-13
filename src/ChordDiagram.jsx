/**
 * ChordDiagram.jsx — Shared SVG chord diagram component
 *
 * Props:
 *   frets      [6]   — [str6…str1], -1=muted, 0=open, n=fret (relative to baseFret)
 *   baseFret   int   — default 1; >1 shows "Nfr" label and thin top line
 *   barre      obj?  — { fret, from, to } string indices 0–5; renders thick bar
 *   playing    bool  — dots highlighted amber→gold when true
 */

import React from 'react';

const M = {
  accent: '#E8833A',
  hi:     '#F5A65B',
  muted:  '#A0785A',
};

const STR_GAP  = 30;
const FRET_GAP = 32;
const LEFT     = 20;
const TOP      = 46;
const FRETS    = 5;
const RIGHT    = LEFT + 5 * STR_GAP;      // 170
const BOTTOM   = TOP  + FRETS * FRET_GAP; // 206
const SVG_W    = RIGHT + LEFT;            // 190
const SVG_H    = BOTTOM + 24;             // 230

const strX = (si)  => LEFT + si * STR_GAP;
const fretY = (fi) => TOP  + fi * FRET_GAP;
const dotY  = (rel) => TOP + (rel - 0.5) * FRET_GAP; // rel is 1-indexed

export default function ChordDiagram({ frets, baseFret = 1, barre, playing }) {
  const isOpenPos = baseFret === 1;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}
    >
      {/* String lines */}
      {[0,1,2,3,4,5].map(si => (
        <line key={`s${si}`}
          x1={strX(si)} y1={TOP} x2={strX(si)} y2={BOTTOM}
          stroke="rgba(245,232,216,0.35)" strokeWidth={1.5} />
      ))}

      {/* Fret lines — nut thick only in open position */}
      {[0,1,2,3,4,5].map(fi => (
        <line key={`f${fi}`}
          x1={LEFT} y1={fretY(fi)} x2={RIGHT} y2={fretY(fi)}
          stroke={fi === 0 && isOpenPos ? 'rgba(245,232,216,0.85)' : 'rgba(245,232,216,0.3)'}
          strokeWidth={fi === 0 && isOpenPos ? 4 : 1.5} />
      ))}

      {/* baseFret label */}
      {!isOpenPos && (
        <text x={RIGHT + 8} y={TOP + 4}
          fill={M.muted} fontSize={10}
          fontFamily="Georgia,'Times New Roman',serif"
          fontWeight="700">{baseFret}fr</text>
      )}

      {/* X / O labels above nut */}
      {isOpenPos && frets.map((f, si) => {
        if (f === 0)  return <text key={`lbl${si}`} x={strX(si)} y={TOP - 10}
          textAnchor="middle" fill="rgba(245,232,216,0.75)"
          fontSize={13} fontFamily="Georgia,'Times New Roman',serif" fontWeight="700">O</text>;
        if (f === -1) return <text key={`lbl${si}`} x={strX(si)} y={TOP - 10}
          textAnchor="middle" fill={M.muted}
          fontSize={14} fontFamily="Georgia,'Times New Roman',serif" fontWeight="700">×</text>;
        return null;
      })}

      {/* Muted strings for higher-position chords */}
      {!isOpenPos && frets.map((f, si) => {
        if (f === -1) return <text key={`lbl${si}`} x={strX(si)} y={TOP - 10}
          textAnchor="middle" fill={M.muted}
          fontSize={14} fontFamily="Georgia,'Times New Roman',serif" fontWeight="700">×</text>;
        return null;
      })}

      {/* Barre bar — drawn before dots so dots render on top */}
      {barre && (
        <rect
          x={strX(barre.from) - 10}
          y={dotY(barre.fret) - 10}
          width={strX(barre.to) - strX(barre.from) + 20}
          height={20}
          rx={10}
          fill={playing ? M.hi : M.accent}
          opacity={0.85}
          style={{ transition: 'fill 0.1s' }}
        />
      )}

      {/* Finger dots (skip barre fret — bar covers it) */}
      {frets.map((f, si) => {
        if (f <= 0) return null;
        if (barre && f === barre.fret && si >= barre.from && si <= barre.to) return null;
        return (
          <circle key={`d${si}`}
            cx={strX(si)} cy={dotY(f)} r={10}
            fill={playing ? M.hi : M.accent}
            style={{ transition: 'fill 0.1s' }} />
        );
      })}

      {/* String labels below */}
      {['E','A','D','G','B','e'].map((label, si) => (
        <text key={`sl${si}`} x={strX(si)} y={BOTTOM + 16}
          textAnchor="middle" fill={M.muted}
          fontSize={10} fontFamily="Georgia,'Times New Roman',serif">{label}</text>
      ))}
    </svg>
  );
}
