/**
 * StrumPatterns.jsx
 *
 * Visual + audio strum pattern practice.
 * FREE: first 6 patterns. PRO: all 12.
 *
 * Audio: G major chord (G2 B2 D3 G3 B3 G4) via guitarSampler.
 * Timing: setInterval per step; backing track + metronome via existing hooks.
 */

import React, { useState, useEffect, useRef } from 'react';
import LandingPage     from './LandingPage';
import useBackingTrack from './useBackingTrack';
import { guitarSampler } from './guitarSampler';
import { getAudioContext } from './audioContext';

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

// ── Audio ─────────────────────────────────────────────────────────────────────
// G major open chord: low E fret 3, A fret 2, D open, G open, B open, e fret 3
const G_DOWN = ['G2','B2','D3','G3','B3','G4'];
const G_UP   = ['G4','B3','G3','D3'];

function playStrum(direction) {
  guitarSampler.resume?.();
  const notes = direction === 'D' ? G_DOWN : G_UP;
  notes.forEach((n, i) => setTimeout(() => guitarSampler.playNote(n), i * 14));
}

// Web Audio synthesized click — scheduled ahead of time so it fires precisely
function scheduleClick(ctx, t) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type            = 'sine';
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.045);
}

// ── Pattern data ──────────────────────────────────────────────────────────────
const PATTERNS = [
  // FREE
  {
    id: 'all-down', name: 'All Down', timeSig: '4/4', sub: 'quarter', bpm: 80, pro: false,
    steps: ['D','D','D','D'],
    desc: 'The foundation. Four solid down strokes per bar.',
  },
  {
    id: 'down-up', name: 'Down-Up', timeSig: '4/4', sub: 'eighth', bpm: 90, pro: false,
    steps: ['D','U','D','U','D','U','D','U'],
    desc: 'Alternate down-up on every 8th note. The essential strum.',
  },
  {
    id: 'folk', name: 'Folk Strum', timeSig: '4/4', sub: 'eighth', bpm: 80, pro: false,
    steps: ['D','-','D','U','-','U','D','U'],
    desc: 'Classic acoustic folk pattern. Slightly syncopated, very musical.',
  },
  {
    id: 'country', name: 'Country', timeSig: '4/4', sub: 'eighth', bpm: 100, pro: false,
    steps: ['D','D','U','-','U','D','U','-'],
    desc: 'Boom-chick country feel. Works for most 4/4 country songs.',
  },
  {
    id: 'waltz', name: 'Waltz', timeSig: '3/4', sub: 'quarter', bpm: 80, pro: false,
    steps: ['D','D','U'],
    desc: 'Three beats per bar. Down on 1, down-up to feel the lilt.',
  },
  {
    id: 'slow-rock', name: 'Slow Rock', timeSig: '4/4', sub: 'eighth', bpm: 70, pro: false,
    steps: ['D','-','-','U','-','-','D','-'],
    desc: 'Spacious ballad feel. Let each strum ring out.',
  },
  // PRO
  {
    id: 'reggae', name: 'Reggae', timeSig: '4/4', sub: 'eighth', bpm: 80, pro: true,
    steps: ['-','U','-','U','-','U','-','U'],
    desc: 'Off-beat up-strum skank. Mute the strings between hits.',
  },
  {
    id: 'bossa-nova', name: 'Bossa Nova', timeSig: '4/4', sub: 'eighth', bpm: 90, pro: true,
    steps: ['D','-','U','-','D','-','U','-'],
    desc: 'Smooth Brazilian groove. Subtle and sophisticated.',
  },
  {
    id: 'funk', name: 'Funk', timeSig: '4/4', sub: 'eighth', bpm: 100, pro: true,
    steps: ['D','U','D','U','-','U','D','U'],
    desc: 'Syncopated funk chop. Tight rhythm, accent the up strums.',
  },
  {
    id: 'blues-shuffle', name: 'Blues Shuffle', timeSig: '4/4', sub: 'eighth', bpm: 80, pro: true,
    steps: ['D','D','-','U','D','U','-','-'],
    desc: 'Swinging blues pattern. Think: "shuf-fle, shuf-fle".',
  },
  {
    id: 'latin', name: 'Latin', timeSig: '4/4', sub: 'eighth', bpm: 95, pro: true,
    steps: ['D','-','U','U','-','U','-','U'],
    desc: 'Son clave-influenced pattern. Energetic and rhythmic.',
  },
  {
    id: 'rock-drive', name: 'Rock Drive', timeSig: '4/4', sub: 'eighth', bpm: 110, pro: true,
    steps: ['D','U','-','U','D','U','-','U'],
    desc: 'Driving rock energy. Missing beats 3 & 7 keep it punchy.',
  },
];

const GENRES     = ['Blues', 'Country', 'Rock', 'Folk'];
const GENRE_MAP  = { Blues: 'blues', Country: 'country', Rock: 'rock', Folk: 'blues' };

// ── Step cell ─────────────────────────────────────────────────────────────────
function StepCell({ step, active, stepNum }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 4, flexShrink: 0,
    }}>
      <div style={{
        width: 38, height: 50, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(232,131,58,0.28)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? M.accent : M.border}`,
        transform: active ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.08s',
        boxShadow: active ? '0 2px 12px rgba(232,131,58,0.35)' : 'none',
      }}>
        {step === 'D' && (
          <span style={{ fontSize: 22, color: active ? M.hi : M.accent, lineHeight: 1 }}>↓</span>
        )}
        {step === 'U' && (
          <span style={{ fontSize: 22, color: active ? '#a8d4ff' : '#60a5fa', lineHeight: 1 }}>↑</span>
        )}
        {step === '-' && (
          <span style={{ fontSize: 18, color: M.muted, lineHeight: 1 }}>—</span>
        )}
      </div>
      <div style={{ fontSize: 8, color: M.muted }}>{stepNum}</div>
    </div>
  );
}

// ── Scheduler constants ───────────────────────────────────────────────────────
const LOOKAHEAD_S = 0.12;  // seconds ahead to schedule audio
const POLL_MS     = 30;    // scheduler poll interval

// ── Pattern player ────────────────────────────────────────────────────────────
function PatternPlayer({ pattern, isPro, onUpgrade, onBack }) {
  const [playing,     setPlaying]     = useState(false);
  const [bpm,         setBpm]         = useState(pattern.bpm);
  const [genre,       setGenre]       = useState('Blues');
  const [drumsOn,     setDrumsOn]     = useState(true);
  const [bassOn,      setBassOn]      = useState(true);
  const [metOn,       setMetOn]       = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

  // All mutable scheduler state lives in a ref — no stale closure issues
  const schedRef = useRef({
    timerId:     null,
    nextTime:    0,
    nextIdx:     0,
    playing:     false,
    stepDur:     0,
    stepsPerBeat: 2,
    metOn:        false,
  });

  const effectiveGenre = playing && (drumsOn || bassOn) ? GENRE_MAP[genre] : null;
  const { trackOn, toggleTrack, stopTrack, syncToTime } = useBackingTrack(effectiveGenre, bpm);

  // Keep metOn flag in sync so the running scheduler picks it up immediately
  useEffect(() => { schedRef.current.metOn = metOn; }, [metOn]);

  // ── Web Audio lookahead scheduler ─────────────────────────────────────────
  // Strum samples:   scheduled via setTimeout derived from ctx.currentTime
  // Click:           synthesized in Web Audio — scheduled precisely ahead of time
  // Visual step:     setTimeout aligned to the same strum time
  // All three share the same clock (ctx.currentTime), so they can't drift apart.
  function startStrumScheduler(fromTime) {
    const ref = schedRef.current;
    clearInterval(ref.timerId);
    ref.nextTime = fromTime;
    ref.nextIdx  = 0;
    ref.playing  = true;

    const ctx = getAudioContext();

    function tick() {
      const now = ctx.currentTime;
      while (ref.nextTime < now + LOOKAHEAD_S) {
        const idx       = ref.nextIdx % pattern.steps.length;
        const t         = ref.nextTime;
        const msFromNow = Math.max(0, (t - now) * 1000);

        // Strum: setTimeout so the sample plays at Web Audio time t
        if (pattern.steps[idx] !== '-') {
          const dir = pattern.steps[idx];
          setTimeout(() => { if (schedRef.current.playing) playStrum(dir); }, msFromNow);
        }

        // Click: synthesized and scheduled precisely in Web Audio time
        if (ref.metOn && ref.nextIdx % ref.stepsPerBeat === 0) {
          scheduleClick(ctx, t);
        }

        // Visual: update step indicator at the same moment as the strum
        setTimeout(() => { if (schedRef.current.playing) setCurrentStep(idx); }, msFromNow);

        ref.nextTime += ref.stepDur;
        ref.nextIdx++;
      }
    }

    tick();
    ref.timerId = setInterval(tick, POLL_MS);
  }

  function stopStrumScheduler() {
    clearInterval(schedRef.current.timerId);
    schedRef.current.timerId = null;
    schedRef.current.playing = false;
    setCurrentStep(null);
  }

  // BPM change while playing → restart strum scheduler + re-anchor backing track
  useEffect(() => {
    if (!playing) return;
    const ctx      = getAudioContext();
    const t0       = ctx.currentTime + 0.05;
    schedRef.current.stepDur = pattern.sub === 'eighth' ? 30 / bpm : 60 / bpm;
    startStrumScheduler(t0);
    syncToTime(t0);
  }, [bpm]); // eslint-disable-line

  // Stop everything when playing goes false
  useEffect(() => {
    if (!playing) {
      stopStrumScheduler();
      stopTrack();
    }
  }, [playing]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => {
    stopStrumScheduler();
    stopTrack();
  }, []); // eslint-disable-line

  function handlePlayToggle() {
    if (playing) {
      setPlaying(false);
      return;
    }

    const ctx  = getAudioContext();
    const t0   = ctx.currentTime + 0.05;

    // ── Backing track ──────────────────────────────────────────────────────
    // Must call toggleTrack() to set on=true — useBackingTrack only runs when
    // on===true. syncToTime re-anchors beat 1 after the React effect has run.
    if (drumsOn || bassOn) {
      if (!trackOn) toggleTrack();
      setTimeout(() => syncToTime(t0), 50);
    }

    // ── Strum + click scheduler ────────────────────────────────────────────
    const ref         = schedRef.current;
    ref.stepDur       = pattern.sub === 'eighth' ? 30 / bpm : 60 / bpm;
    ref.stepsPerBeat  = pattern.sub === 'eighth' ? 2 : 1;
    ref.metOn         = metOn;

    startStrumScheduler(t0);
    setPlaying(true);
  }

  function handleMetToggle() {
    setMetOn(prev => !prev);
    // schedRef.current.metOn is updated via useEffect — scheduler picks it up on next tick
  }

  if (!isPro && pattern.pro) return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px' }}>
      <div style={{
        textAlign: 'center', padding: '36px 16px',
        background: M.panel, borderRadius: 16, border: `1px solid ${M.border}`,
        marginTop: 8,
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: M.accent, marginBottom: 8 }}>
          PRO Pattern
        </div>
        <div style={{ fontSize: 13, color: M.muted, marginBottom: 22, lineHeight: 1.6 }}>
          {pattern.name} is part of PRO.
        </div>
        <button onClick={onUpgrade} style={{
          padding: '12px 28px', borderRadius: 12,
          background: `linear-gradient(135deg,#C46428,${M.accent})`,
          border: `1px solid ${M.borderHi}`,
          color: '#fff', fontWeight: 800, fontSize: 15,
          fontFamily: "Georgia, serif", cursor: 'pointer',
        }}>Unlock PRO →</button>
      </div>
    </div>
  );

  const stepLabels = pattern.sub === 'eighth'
    ? ['1','+','2','+','3','+','4','+']
    : pattern.steps.map((_, i) => String(i + 1));

  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px' }}>

      {/* Pattern description */}
      <div style={{
        background: M.panel, borderRadius: 12, border: `1px solid ${M.border}`,
        padding: '12px 14px', marginBottom: 18, fontSize: 12, color: M.muted, lineHeight: 1.65,
      }}>
        <strong style={{ color: M.hi }}>{pattern.timeSig}</strong> · {pattern.desc}
      </div>

      {/* Step visualizer */}
      <div style={{
        background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
        padding: '16px 14px', marginBottom: 18, overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
          {pattern.steps.map((step, i) => (
            <StepCell key={i} step={step} active={currentStep === i}
              stepNum={stepLabels[i]} />
          ))}
        </div>
        {/* Legend */}
        <div style={{
          display: 'flex', gap: 14, marginTop: 12,
          fontSize: 10, color: M.muted,
        }}>
          <span><span style={{ color: M.accent }}>↓</span> Down</span>
          <span><span style={{ color: '#60a5fa' }}>↑</span> Up</span>
          <span><span style={{ color: M.muted }}>—</span> Rest</span>
        </div>
      </div>

      {/* Genre selector */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Backing Track</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)} style={{
              padding: '7px 14px', borderRadius: 20, border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "Georgia, serif",
              background: g === genre ? M.accent : 'rgba(255,255,255,0.06)',
              color: g === genre ? '#fff' : M.muted,
              transition: 'background 0.15s',
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* BPM control */}
      <div style={{
        background: M.panel, borderRadius: 14, border: `1px solid ${M.border}`,
        padding: '16px 18px', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
          <button
            onClick={() => setBpm(b => Math.max(40, b - 1))}
            disabled={bpm <= 40}
            style={{
              padding: '8px 16px', borderRadius: 10, border: `1px solid ${M.border}`,
              background: 'rgba(196,100,40,0.10)', color: bpm <= 40 ? M.muted : M.text,
              fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 20,
              cursor: bpm <= 40 ? 'not-allowed' : 'pointer', opacity: bpm <= 40 ? 0.45 : 1,
            }}>−</button>
          <div style={{ textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: M.accent, lineHeight: 1 }}>{bpm}</div>
            <div style={{ fontSize: 9, color: M.muted, letterSpacing: '0.14em', marginTop: 3 }}>BPM</div>
          </div>
          <button
            onClick={() => setBpm(b => Math.min(220, b + 1))}
            disabled={bpm >= 220}
            style={{
              padding: '8px 16px', borderRadius: 10, border: `1px solid ${M.border}`,
              background: 'rgba(196,100,40,0.10)', color: bpm >= 220 ? M.muted : M.text,
              fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 20,
              cursor: bpm >= 220 ? 'not-allowed' : 'pointer', opacity: bpm >= 220 ? 0.45 : 1,
            }}>+</button>
        </div>
        <input type="range" min="40" max="220" value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          style={{ width: '100%', accentColor: M.accent }} />
      </div>

      {/* Track toggles */}
      <div style={{
        background: M.surface, borderRadius: 12, border: `1px solid ${M.border}`,
        padding: '12px 14px', marginBottom: 22,
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {[
          { label: drumsOn ? '🥁 Drums On' : '🥁 Drums Off', active: drumsOn, fn: () => setDrumsOn(v => !v) },
          { label: bassOn  ? '🎸 Bass On'  : '🎸 Bass Off',  active: bassOn,  fn: () => setBassOn(v => !v) },
          { label: metOn   ? '🎵 Click On' : '🎵 Click Off', active: metOn,   fn: handleMetToggle },
        ].map(({ label, active, fn }) => (
          <button key={label} onClick={fn} style={{
            padding: '9px 16px', borderRadius: 10,
            border: `1px solid ${active ? M.borderHi : M.border}`,
            background: active ? 'rgba(232,131,58,0.20)' : 'rgba(196,100,40,0.08)',
            color: active ? M.hi : M.text,
            fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 12,
            cursor: 'pointer', transition: 'all 0.14s',
          }}>{label}</button>
        ))}
      </div>

      {/* Play / Stop */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <button onClick={handlePlayToggle} style={{
          padding: '18px 64px', borderRadius: 20,
          border: `2px solid ${playing ? M.borderHi : M.border}`,
          background: playing
            ? `linear-gradient(135deg,${M.accent},${M.hi})`
            : `linear-gradient(135deg,#C46428,${M.accent})`,
          color: '#fff', fontFamily: "Georgia, serif",
          fontWeight: 900, fontSize: 20, cursor: 'pointer',
          boxShadow: playing
            ? '0 6px 32px rgba(232,131,58,0.55)'
            : '0 4px 20px rgba(232,131,58,0.30)',
          transition: 'all 0.15s',
        }}>
          {playing ? '⏹ Stop' : '▶ Start'}
        </button>
      </div>

      {/* Playing status */}
      {playing && (
        <div style={{
          textAlign: 'center', padding: '10px 20px', borderRadius: 12,
          background: 'rgba(232,131,58,0.10)', border: `1px solid ${M.border}`,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: M.accent,
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: M.muted }}>
              {pattern.name} · {bpm} BPM
              {drumsOn ? ' · Drums' : ''}{bassOn ? ' · Bass' : ''}{metOn ? ' · Click' : ''}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

// ── Pattern list card ─────────────────────────────────────────────────────────
function PatternCard({ pattern, onSelect }) {
  const preview = pattern.steps.slice(0, 8);
  return (
    <button onClick={onSelect} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${M.border}`,
      borderRadius: 14, padding: '14px 16px', marginBottom: 8,
      cursor: 'pointer', textAlign: 'left', transition: 'border 0.12s',
    }}>
      {/* Arrows preview */}
      <div style={{
        display: 'flex', gap: 2, flexShrink: 0, width: 88, flexWrap: 'wrap',
      }}>
        {preview.map((s, i) => (
          <span key={i} style={{
            fontSize: 12, lineHeight: 1, fontWeight: 700,
            color: s === 'D' ? M.accent : s === 'U' ? '#60a5fa' : M.muted,
          }}>
            {s === 'D' ? '↓' : s === 'U' ? '↑' : '—'}
          </span>
        ))}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: M.text }}>{pattern.name}</div>
        <div style={{ fontSize: 10, color: M.muted, marginTop: 2 }}>
          {pattern.timeSig} · {pattern.bpm} BPM
        </div>
      </div>

      {/* Badge */}
      <span style={{
        fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, flexShrink: 0,
        background: pattern.pro ? 'rgba(232,131,58,0.18)' : 'rgba(100,180,100,0.15)',
        border: `1px solid ${pattern.pro ? 'rgba(232,131,58,0.5)' : 'rgba(100,180,100,0.4)'}`,
        color: pattern.pro ? M.accent : '#7BC47B',
      }}>{pattern.pro ? 'PRO' : 'FREE'}</span>

      <span style={{ color: M.muted, fontSize: 16, marginLeft: 2 }}>›</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StrumPatterns({ isPro, onUpgrade, initialPatternId = null }) {
  // Deep-link target: jump to a specific pattern by id (e.g. 'folk', 'waltz')
  const initialPattern = React.useMemo(() => {
    if (!initialPatternId) return null;
    return PATTERNS.find(p => p.id === initialPatternId) || null;
  }, [initialPatternId]);

  const [started,  setStarted]  = useState(initialPattern != null);
  const [selected, setSelected] = useState(initialPattern); // pattern object or null

  if (!started) return (
    <LandingPage
      emoji="🎶"
      title="Strum Patterns"
      description="Great rhythm starts with great strumming. Learn the patterns behind every genre — from folk and country to reggae and bossa nova."
      difficulty="Beginner"
      features={[
        '6 FREE patterns: All Down, Folk, Country, Waltz + more',
        '6 PRO patterns: Reggae, Bossa Nova, Funk, Latin + more',
        'Animated arrows + audio playback on a G chord',
        'BPM control, drums, bass & click track',
      ]}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  // Pattern play screen
  if (selected) return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 60px',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: 'none', border: 'none', color: M.muted, fontSize: 22,
            cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <div>
          <h1 style={{
            fontSize: 18, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{selected.name}</h1>
          <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            STRUM PATTERN · {selected.pro ? 'PRO' : 'FREE'}
          </div>
        </div>
      </div>
      <PatternPlayer
        pattern={selected}
        isPro={isPro}
        onUpgrade={onUpgrade}
        onBack={() => setSelected(null)}
      />
    </div>
  );

  // Pattern list
  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 60px',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => { window.location.hash = ''; }}
          style={{ background: 'none', border: 'none', color: M.muted, fontSize: 22,
            cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
        <div>
          <h1 style={{
            fontSize: 18, fontWeight: 800, margin: 0,
            background: `linear-gradient(135deg,${M.accent},${M.hi})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Strum Patterns</h1>
          <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            BEGINNER · RHYTHM
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px' }}>

        {/* Section: FREE */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, marginBottom: 10 }}>
          Free Patterns
        </div>
        {PATTERNS.filter(p => !p.pro).map(p => (
          <PatternCard key={p.id} pattern={p} onSelect={() => setSelected(p)} />
        ))}

        {/* Section: PRO */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, marginTop: 20, marginBottom: 10 }}>
          PRO Patterns
        </div>
        {PATTERNS.filter(p => p.pro).map(p => (
          <PatternCard
            key={p.id}
            pattern={p}
            onSelect={() => { if (!isPro) onUpgrade(); else setSelected(p); }}
          />
        ))}

      </div>
    </div>
  );
}
