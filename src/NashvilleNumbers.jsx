/**
 * NashvilleNumbers.jsx — Nashville Number System reference
 * PRO feature.
 *
 * Props:
 *   isPro      boolean
 *   onUpgrade  () => void
 */

import React, { useState } from 'react';
import LandingPage from './LandingPage';
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

const KEYS = ['C','G','D','A','E','B','F'];
const NUMERALS = ['1','2','3','4','5','6','7'];
const NUMERAL_ROMAN = ['I','ii','iii','IV','V','vi','vii°'];
const QUALITIES = ['maj','min','min','maj','maj','min','dim'];

// Semitone offsets for diatonic chords (major scale)
const SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ROOT_SEMI  = { C:0, G:7, D:2, A:9, E:4, B:11, F:5 };

// Root + major third + perfect fifth (semitones above root)
// major: [0,4,7]  minor: [0,3,7]  dim: [0,3,6]
const CHORD_INTERVALS = {
  maj: [0,4,7], min: [0,3,7], dim: [0,3,6],
};

// Guitar open-string semitones from C0
const OPEN = [28,33,38,43,47,52]; // E2 A2 D3 G3 B3 E4

function semToName(semi) {
  return NOTE_NAMES[semi % 12] + Math.floor(semi / 12);
}

function buildChordNotes(rootNote, quality) {
  const rootSemi = ROOT_SEMI[rootNote.replace(/m$/,'').replace(/#.*/,'')];
  if (rootSemi === undefined) return [];
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS.maj;
  return intervals.map(i => {
    // Find this note on guitar (in playable range, starting from E2)
    const targetClass = (rootSemi + i) % 12;
    for (let si = 0; si <= 5; si++) {
      for (let f = 0; f <= 12; f++) {
        if ((OPEN[si] + f) % 12 === targetClass) {
          return semToName(OPEN[si] + f);
        }
      }
    }
    return null;
  }).filter(Boolean);
}

function getChordName(keyRoot, degree) {
  const rootSemi = ROOT_SEMI[keyRoot];
  const offset   = SCALE_OFFSETS[degree];
  const chordRoot = NOTE_NAMES[(rootSemi + offset) % 12];
  const quality   = QUALITIES[degree];
  if (quality === 'maj') return chordRoot;
  if (quality === 'min') return chordRoot + 'm';
  return chordRoot + 'dim';
}

export default function NashvilleNumbers({ isPro, onUpgrade }) {
  const [started,  setStarted]  = useState(false);
  const [key,      setKey]      = useState('G');
  const [playing,  setPlaying]  = useState(null); // chord index being played

  if (!started) return (
    <LandingPage
      emoji="🎼"
      title="Nashville Numbers"
      description="The language of country & bluegrass sessions. Learn to read chord charts by number in any key."
      difficulty="Advanced"
      features={[
        'All 7 diatonic chords for keys C G D A E B F',
        'Nashville numbers with Roman numerals',
        'Tap any chord to hear it on guitar',
        'Understand why the 1-4-5 sounds so good',
      ]}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  function playChord(degree) {
    const chordName = getChordName(key, degree);
    const quality   = QUALITIES[degree];
    const notes     = buildChordNotes(chordName, quality);
    if (!notes.length) return;
    guitarSampler.resume?.();
    notes.forEach((n, i) => {
      setTimeout(() => guitarSampler.playNote(n), i * 18);
    });
    setPlaying(degree);
    setTimeout(() => setPlaying(null), 1200);
  }

  const chords = NUMERALS.map((_, i) => ({
    num: NUMERALS[i],
    roman: NUMERAL_ROMAN[i],
    name: getChordName(key, i),
    quality: QUALITIES[i],
    isPrimary: [0,3,4].includes(i),
  }));

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
            Nashville Numbers is part of the PRO subscription.
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
          }}>Nashville Number System</h1>
          <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            ADVANCED · PRO
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 20px' }}>

        {/* Key selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Key</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KEYS.map(k => (
              <button key={k} onClick={() => setKey(k)} style={{
                padding: '8px 16px', borderRadius: 20, border: 'none',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                fontFamily: "Georgia, serif",
                background: k === key ? M.accent : 'rgba(255,255,255,0.06)',
                color: k === key ? '#fff' : M.muted,
                transition: 'background 0.15s',
              }}>{k}</button>
            ))}
          </div>
        </div>

        {/* Intro blurb */}
        <div style={{
          background: M.panel, borderRadius: 12, border: `1px solid ${M.border}`,
          padding: '12px 14px', marginBottom: 20, fontSize: 12, color: M.muted, lineHeight: 1.6,
        }}>
          In the key of <strong style={{ color: M.hi }}>{key}</strong>, every chord has a number.
          The <strong style={{ color: M.accent }}>1, 4, and 5</strong> are the power chords —
          nearly every country and bluegrass song is built on them.
        </div>

        {/* Chord grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {chords.map((c, i) => (
            <button
              key={i}
              onClick={() => playChord(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 0,
                padding: 0, borderRadius: 14, overflow: 'hidden',
                border: `1px solid ${playing === i ? M.borderHi : c.isPrimary ? 'rgba(232,131,58,0.40)' : M.border}`,
                background: playing === i
                  ? `linear-gradient(135deg,${M.accent},${M.hi})`
                  : c.isPrimary ? 'rgba(232,131,58,0.10)' : 'rgba(255,255,255,0.04)',
                cursor: 'pointer', transition: 'all 0.12s',
                boxShadow: playing === i ? '0 2px 16px rgba(232,131,58,0.4)' : 'none',
              }}
            >
              {/* Number badge */}
              <div style={{
                width: 52, flexShrink: 0, textAlign: 'center',
                padding: '16px 0',
                background: c.isPrimary ? 'rgba(232,131,58,0.18)' : 'rgba(255,255,255,0.04)',
                borderRight: `1px solid ${M.border}`,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 900,
                  color: playing === i ? '#fff' : c.isPrimary ? M.accent : M.muted,
                }}>{c.num}</div>
                <div style={{ fontSize: 9, color: playing === i ? 'rgba(255,255,255,0.7)' : M.muted,
                  marginTop: 1 }}>{c.roman}</div>
              </div>

              {/* Chord name + quality */}
              <div style={{ flex: 1, padding: '14px 16px', textAlign: 'left' }}>
                <div style={{
                  fontSize: 18, fontWeight: 900,
                  color: playing === i ? '#fff' : M.text,
                }}>{c.name}</div>
                <div style={{ fontSize: 10, color: playing === i ? 'rgba(255,255,255,0.7)' : M.muted,
                  marginTop: 2 }}>
                  {c.quality === 'maj' ? 'Major' : c.quality === 'min' ? 'Minor' : 'Diminished'}
                  {c.isPrimary ? ' · Primary' : ''}
                </div>
              </div>

              {/* Tap hint */}
              <div style={{ padding: '0 14px', color: playing === i ? 'rgba(255,255,255,0.6)' : M.muted, fontSize: 16 }}>
                {playing === i ? '♪' : '▷'}
              </div>
            </button>
          ))}
        </div>

        {/* 1-4-5 callout */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 24, fontSize: 12, color: M.muted, lineHeight: 1.7,
        }}>
          <strong style={{ color: M.hi }}>The 1-4-5 Rule:</strong> Most songs in
          key of {key} use <strong style={{ color: M.accent }}>{getChordName(key,0)}</strong> (1),{' '}
          <strong style={{ color: M.accent }}>{getChordName(key,3)}</strong> (4), and{' '}
          <strong style={{ color: M.accent }}>{getChordName(key,4)}</strong> (5).
          That's all you need to play hundreds of songs.
        </div>

      </div>
    </div>
  );
}
