/**
 * OnboardingTour.jsx — 5-slide animated onboarding tour
 *
 * Props:
 *   onComplete    () — mark tour seen, return to app
 *   onUpgrade     () — close tour and open PRO upgrade modal
 *   startSlide    int (default 0) — slide to begin on (3 for post-PRO-upgrade flow)
 */

import React, { useState } from 'react';

const M = {
  bg:       '#120A04',
  surface:  '#2A1208',
  primary:  '#C46428',
  accent:   '#E8833A',
  hi:       '#F5A65B',
  muted:    '#A0785A',
  text:     '#F5E8D8',
  border:   'rgba(196,100,40,0.25)',
  borderHi: 'rgba(232,131,58,0.55)',
};

const SLIDES = [
  {
    id: 'welcome',
    icon: '🎸',
    title: 'TuneWise: Guitar Lessons',
    subtitle: 'LEARN · TUNE · PLAY',
    subtitleColor: M.muted,
    body: 'Everything you need to go from beginner to confident guitarist — in one app.',
    btn: "Let's Go →",
  },
  {
    id: 'beginner',
    icon: '🎵',
    title: 'Start Completely Free',
    subtitle: 'BEGINNER',
    subtitleColor: '#7B9E6B',
    features: [
      'Music Reading Game — sight-read notes in real time',
      'Song Learn — learn songs measure by measure',
      "Tab & Notation — read music the guitarist's way",
      'Tuner & Metronome — always free',
    ],
    tag: 'No credit card. No catch. Just play.',
    btn: 'Next →',
  },
  {
    id: 'intermediate',
    icon: '🤘',
    title: 'Level Up Your Playing',
    subtitle: 'INTERMEDIATE',
    subtitleColor: '#E8A050',
    features: [
      'Chord Play — open position chords in every key',
      'Barre Chords — moveable E and A shapes',
      'Scale Play — patterns across the fretboard',
      'Lick Play — classic riffs phrase by phrase',
    ],
    btn: 'Next →',
  },
  {
    id: 'pro',
    icon: '🏆',
    title: 'Go Pro',
    subtitle: 'ADVANCED',
    subtitleColor: '#C4603A',
    features: [
      'CAGED System — 5 shapes, whole neck',
      'Triads & Arpeggios — lead playing essentials',
      'Backing Tracks — full band for every genre',
      'Progress Tracker — streaks, goals, and charts',
    ],
    btn: 'Next →',
  },
  {
    id: 'cta',
    icon: '🎸',
    title: 'Get Started Free Today',
    body: "Dive in with everything in the Beginner level — no limits, no timer, no pressure. Unlock more when you're ready.",
    cta: 'Start Playing Free →',
    proLink: 'See PRO features',
  },
];

export default function OnboardingTour({ onComplete, onUpgrade, startSlide = 0 }) {
  const [slideIdx, setSlideIdx] = useState(startSlide);
  const [fading,   setFading]   = useState(false);

  function advance(next) {
    if (next >= SLIDES.length) { onComplete(); return; }
    setFading(true);
    setTimeout(() => { setSlideIdx(next); setFading(false); }, 210);
  }

  const slide = SLIDES[slideIdx];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 28px',
      overflowY: 'auto',
    }}>

      {/* Skip */}
      <button onClick={onComplete} style={{
        position: 'absolute', top: 20, right: 20,
        background: 'none', border: 'none',
        color: M.muted, fontSize: 13,
        fontFamily: "Georgia, serif", cursor: 'pointer',
        padding: '4px 8px',
      }}>Skip</button>

      {/* Slide content */}
      <div style={{
        maxWidth: 360, width: '100%', textAlign: 'center',
        opacity:   fading ? 0 : 1,
        transform: fading ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.21s ease, transform 0.21s ease',
      }}>

        {/* Icon */}
        <div style={{
          fontSize: 72, lineHeight: 1, marginBottom: 22,
          filter: 'drop-shadow(0 4px 24px rgba(196,100,40,0.55))',
        }}>{slide.icon}</div>

        {/* Title */}
        <h1 style={{
          fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em',
          marginBottom: 10, lineHeight: 1.2,
          background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428,#F5A65B)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>{slide.title}</h1>

        {/* Subtitle */}
        {slide.subtitle && (
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 22,
            color: slide.subtitleColor,
          }}>{slide.subtitle}</div>
        )}

        {/* Body */}
        {slide.body && (
          <p style={{ fontSize: 15, color: M.text, lineHeight: 1.75, marginBottom: 28 }}>
            {slide.body}
          </p>
        )}

        {/* Feature list */}
        {slide.features && (
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20, textAlign: 'left' }}>
            {slide.features.map((f, i) => (
              <li key={i} style={{
                fontSize: 14, color: M.text, lineHeight: 1.6,
                padding: '7px 0',
                borderBottom: `1px solid ${M.border}`,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ color: M.accent, flexShrink: 0, marginTop: 2 }}>✦</span>
                {f}
              </li>
            ))}
          </ul>
        )}

        {/* Tag line */}
        {slide.tag && (
          <p style={{ fontSize: 12, color: M.muted, fontStyle: 'italic', marginBottom: 28 }}>
            {slide.tag}
          </p>
        )}

        {/* CTA slide buttons */}
        {slide.cta ? (
          <>
            <button onClick={onComplete} style={{
              display: 'block', width: '100%',
              padding: '16px 24px', borderRadius: 14,
              border: `1px solid ${M.borderHi}`,
              background: 'linear-gradient(135deg,#C46428,#E8833A)',
              color: '#fff', fontFamily: "Georgia, serif",
              fontWeight: 800, fontSize: 17, cursor: 'pointer',
              marginBottom: 14, letterSpacing: '-0.01em',
              boxShadow: '0 4px 20px rgba(232,131,58,0.35)',
            }}>{slide.cta}</button>
            <button onClick={onUpgrade} style={{
              background: 'none', border: 'none',
              color: M.muted, fontSize: 13,
              fontFamily: "Georgia, serif", cursor: 'pointer',
              textDecoration: 'underline',
            }}>{slide.proLink}</button>
          </>
        ) : (
          <button onClick={() => advance(slideIdx + 1)} style={{
            padding: '14px 36px', borderRadius: 14,
            border: `1px solid ${M.borderHi}`,
            background: 'rgba(232,131,58,0.18)',
            color: M.hi, fontFamily: "Georgia, serif",
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>{slide.btn}</button>
        )}
      </div>

      {/* Dot progress */}
      <div style={{ position: 'absolute', bottom: 32, display: 'flex', gap: 8 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            width:  i === slideIdx ? 20 : 8,
            height: 8, borderRadius: 4,
            background: i === slideIdx ? M.accent
              : i < slideIdx ? M.primary : M.surface,
            transition: 'all 0.2s ease',
          }} />
        ))}
      </div>
    </div>
  );
}
