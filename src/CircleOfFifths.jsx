/**
 * CircleOfFifths.jsx — Interactive circle of fifths
 * PRO feature.
 *
 * Props:
 *   isPro      boolean
 *   onUpgrade  () => void
 */

import React, { useState } from 'react';
import LandingPage from './LandingPage';

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
  sharp:   '#E8833A',
  flat:    '#60a5fa',
};

// Circle of fifths — 12 positions clockwise from C
const COF = [
  { key:'C',  rel:'Am',  sharps:0, roman:['C','Dm','Em','F','G','Am','Bdim'] },
  { key:'G',  rel:'Em',  sharps:1, roman:['G','Am','Bm','C','D','Em','F#dim'] },
  { key:'D',  rel:'Bm',  sharps:2, roman:['D','Em','F#m','G','A','Bm','C#dim'] },
  { key:'A',  rel:'F#m', sharps:3, roman:['A','Bm','C#m','D','E','F#m','G#dim'] },
  { key:'E',  rel:'C#m', sharps:4, roman:['E','F#m','G#m','A','B','C#m','D#dim'] },
  { key:'B',  rel:'G#m', sharps:5, roman:['B','C#m','D#m','E','F#','G#m','A#dim'] },
  { key:'F#', rel:'D#m', sharps:6, roman:['F#','G#m','A#m','B','C#','D#m','E#dim'] },
  { key:'Db', rel:'Bbm', sharps:-5,roman:['Db','Ebm','Fm','Gb','Ab','Bbm','Cdim'] },
  { key:'Ab', rel:'Fm',  sharps:-4,roman:['Ab','Bbm','Cm','Db','Eb','Fm','Gdim'] },
  { key:'Eb', rel:'Cm',  sharps:-3,roman:['Eb','Fm','Gm','Ab','Bb','Cm','Ddim'] },
  { key:'Bb', rel:'Gm',  sharps:-2,roman:['Bb','Cm','Dm','Eb','F','Gm','Adim'] },
  { key:'F',  rel:'Dm',  sharps:-1,roman:['F','Gm','Am','Bb','C','Dm','Edim'] },
];
const NUMERALS = ['I','ii','iii','IV','V','vi','vii°'];

function keyColor(sharps) {
  if (sharps === 0) return M.text;
  return sharps > 0 ? M.sharp : M.flat;
}

function sigLabel(sharps) {
  if (sharps === 0) return 'No sharps or flats';
  return sharps > 0
    ? `${sharps} sharp${sharps > 1 ? 's' : ''}`
    : `${Math.abs(sharps)} flat${Math.abs(sharps) > 1 ? 's' : ''}`;
}

export default function CircleOfFifths({ isPro, onUpgrade }) {
  const [started,  setStarted]  = useState(false);
  const [selected, setSelected] = useState(null); // index into COF

  if (!started) return (
    <LandingPage
      emoji="🔵"
      title="Circle of Fifths"
      description="The map of all musical keys. Tap any key to see its scale, chords, and key signature."
      difficulty="Advanced"
      features={[
        'All 12 major keys and relative minors',
        'Key signatures — sharps and flats',
        'I–IV–V and full diatonic chord set',
        'Color-coded: sharps vs flats',
      ]}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  const entry = selected !== null ? COF[selected] : null;
  const CX = 160, CY = 160, R_OUTER = 130, R_INNER = 80;

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 60px',
      position: 'relative',
    }}>
      {/* PRO gate */}
      {!isPro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(18,10,4,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, marginBottom: 10,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>PRO Feature</h2>
          <p style={{ fontSize: 14, color: M.muted, textAlign: 'center',
            maxWidth: 260, lineHeight: 1.6, marginBottom: 28 }}>
            Circle of Fifths is part of the PRO subscription.
          </p>
          <button onClick={onUpgrade} style={{
            padding: '14px 36px', borderRadius: 14,
            border: `1px solid ${M.borderHi}`,
            background: `linear-gradient(135deg,#C46428,${M.accent})`,
            color: '#fff', fontFamily: "Georgia, serif",
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(232,131,58,0.3)', marginBottom: 16,
          }}>Unlock PRO →</button>
          <a href="#" style={{ fontSize: 13, color: M.muted, textDecoration: 'none' }}>← Back</a>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <div>
          <h1 style={{
            fontSize: 18, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Circle of Fifths</h1>
          <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            ADVANCED · PRO
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px' }}>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: M.sharp }}>● Sharps</span>
          <span style={{ fontSize: 11, color: M.flat  }}>● Flats</span>
          <span style={{ fontSize: 11, color: M.text  }}>● C (no accidentals)</span>
        </div>

        {/* SVG Circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <svg viewBox="0 0 320 320" width={320} height={320}>
            {COF.map((item, i) => {
              const angleDeg = (i * 30) - 90;
              const angleRad = (angleDeg * Math.PI) / 180;
              const midR     = (R_OUTER + R_INNER) / 2;
              const tx       = CX + midR * Math.cos(angleRad);
              const ty       = CY + midR * Math.sin(angleRad);
              const isActive = selected === i;
              const color    = keyColor(item.sharps);

              // Wedge path — must use same -90° offset as text positions
              const a1 = ((i * 30 - 90 - 15) * Math.PI) / 180;
              const a2 = ((i * 30 - 90 + 15) * Math.PI) / 180;
              const ox1 = CX + R_OUTER * Math.cos(a1), oy1 = CY + R_OUTER * Math.sin(a1);
              const ox2 = CX + R_OUTER * Math.cos(a2), oy2 = CY + R_OUTER * Math.sin(a2);
              const ix1 = CX + R_INNER * Math.cos(a1), iy1 = CY + R_INNER * Math.sin(a1);
              const ix2 = CX + R_INNER * Math.cos(a2), iy2 = CY + R_INNER * Math.sin(a2);
              const d = `M ${ix1} ${iy1} L ${ox1} ${oy1} A ${R_OUTER} ${R_OUTER} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${R_INNER} ${R_INNER} 0 0 0 ${ix1} ${iy1} Z`;

              // Relative minor position (inside inner ring)
              const relR  = R_INNER - 18;
              const relTx = CX + relR * Math.cos(angleRad);
              const relTy = CY + relR * Math.sin(angleRad);

              return (
                <g key={i} onClick={() => setSelected(isActive ? null : i)} style={{ cursor: 'pointer' }}>
                  <path d={d}
                    fill={isActive ? 'rgba(232,131,58,0.30)' : 'rgba(255,255,255,0.04)'}
                    stroke={isActive ? M.accent : 'rgba(196,100,40,0.20)'}
                    strokeWidth={isActive ? 1.5 : 0.8}
                  />
                  <text x={tx} y={ty + 4.5} textAnchor="middle"
                    fill={isActive ? M.hi : color}
                    fontSize={isActive ? 14 : 12}
                    fontWeight={isActive ? 900 : 700}
                    fontFamily="Georgia, serif"
                  >{item.key}</text>
                  <text x={relTx} y={relTy + 3} textAnchor="middle"
                    fill="rgba(160,120,90,0.7)"
                    fontSize={8} fontFamily="Georgia, serif"
                  >{item.rel}</text>
                </g>
              );
            })}
            {/* Center label */}
            <text x={CX} y={CY - 6} textAnchor="middle" fill={M.muted}
              fontSize={10} fontFamily="Georgia, serif">Tap a</text>
            <text x={CX} y={CY + 8} textAnchor="middle" fill={M.muted}
              fontSize={10} fontFamily="Georgia, serif">key</text>
          </svg>
        </div>

        {/* Detail panel */}
        {entry ? (
          <div style={{
            background: M.surface, borderRadius: 18,
            border: `1px solid ${M.borderHi}`,
            padding: '20px 18px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span style={{
                fontSize: 24, fontWeight: 900,
                background: `linear-gradient(135deg,${M.accent},${M.hi})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{entry.key} Major</span>
              <span style={{ fontSize: 12, color: M.muted }}>· rel. {entry.rel}</span>
            </div>
            <div style={{ fontSize: 12, color: M.muted, marginBottom: 16 }}>
              {sigLabel(entry.sharps)}
            </div>

            {/* Diatonic chords */}
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Diatonic Chords</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entry.roman.map((chord, ci) => (
                <div key={ci} style={{
                  textAlign: 'center',
                  padding: '8px 10px', borderRadius: 10, minWidth: 40,
                  background: [0,3,4].includes(ci)
                    ? 'rgba(232,131,58,0.16)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${[0,3,4].includes(ci) ? M.borderHi : M.border}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: M.text }}>{chord}</div>
                  <div style={{ fontSize: 9, color: M.muted, marginTop: 2 }}>{NUMERALS[ci]}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: M.muted, marginTop: 10 }}>
              Orange = I · IV · V (primary chords)
            </div>
          </div>
        ) : (
          <div style={{
            background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
            padding: '20px', textAlign: 'center', marginBottom: 24,
            color: M.muted, fontSize: 13,
          }}>
            Tap any key in the circle to see its chords and key signature.
          </div>
        )}

      </div>
    </div>
  );
}
