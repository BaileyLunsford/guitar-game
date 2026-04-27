/**
 * SongBackingTracks.jsx — Practice backing track tool
 *
 * FREE feature. Drums, bass, and metronome click with full BPM control.
 *
 * Props: none
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import LandingPage from './LandingPage';
import useBackingTrack from './useBackingTrack';
import useMetronome from './useMetronome';
import { getAudioContext } from './audioContext';
import { guitarSampler } from './guitarSampler';

// ── Theme ─────────────────────────────────────────────────────────────────────
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

function btnStyle(active = false, disabled = false) {
  return {
    padding: '10px 18px', borderRadius: 12,
    border: `1px solid ${active ? M.borderHi : M.border}`,
    background: active ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.10)',
    color: disabled ? M.muted : (active ? M.hi : M.text),
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700, fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s', userSelect: 'none',
  };
}

const GENRES = ['Blues', 'Country', 'Rock', 'Folk'];
const GENRE_MAP = { Blues:'blues', Country:'country', Rock:'rock', Folk:'blues' };
const TIME_SIGS = ['2/4', '3/4', '4/4', '6/8'];

const CHORD_G_NOTES = ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'];

// Tap tempo — returns BPM from an array of tap timestamps
function calcTapBpm(taps) {
  if (taps.length < 2) return null;
  const recent = taps.slice(-8);
  const gaps   = recent.slice(1).map((t, i) => t - recent[i]);
  const avg    = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return Math.round(60000 / avg);
}

const PRESETS_KEY = 'songBackingPresets';

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch { return []; }
}
function savePresets(presets) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch {}
}

export default function SongBackingTracks() {
  const [started,  setStarted]  = useState(false);
  const [playing,  setPlaying]  = useState(false);
  const [genre,    setGenre]    = useState('Blues');
  const [timeSig,  setTimeSig]  = useState('4/4');
  const [bpm,      setBpm]      = useState(100);
  const [drumsOn,  setDrumsOn]  = useState(true);
  const [bassOn,   setBassOn]   = useState(true);
  const [metOn,    setMetOn]    = useState(false);
  const [chordOn,  setChordOn]  = useState(false);
  const [presets,  setPresets]  = useState(loadPresets);
  const [saving,   setSaving]   = useState(false);
  const [presetName, setPresetName] = useState('');
  const tapsRef        = useRef([]);
  const bpmRef         = useRef(bpm);
  const chordTimerRef  = useRef(null);
  const chordNextBeat  = useRef(0);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const effectiveGenre = playing ? GENRE_MAP[genre] : null;
  const { trackOn, toggleTrack, stopTrack, syncToTime } = useBackingTrack(effectiveGenre, bpm, drumsOn, bassOn);
  const { clickOn, toggleClick, stopClick, syncToTime: metSync } = useMetronome(bpm);

  function startChordScheduler(fromTime) {
    clearInterval(chordTimerRef.current);
    chordNextBeat.current = fromTime;
    const ctx = getAudioContext();
    function tick() {
      const now = ctx.currentTime;
      while (chordNextBeat.current < now + 0.12) {
        const t  = chordNextBeat.current;
        const ms = (t - now) * 1000;
        CHORD_G_NOTES.forEach((note, i) => {
          setTimeout(() => { try { guitarSampler.playNote(note); } catch (_) {} }, Math.max(0, ms + i * 14));
        });
        chordNextBeat.current += 60 / bpmRef.current;
      }
    }
    tick();
    chordTimerRef.current = setInterval(tick, 30);
  }

  // Sync external playing state with hook state
  useEffect(() => {
    if (!playing) {
      stopTrack();
      stopClick();
      clearInterval(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, [playing]); // eslint-disable-line

  useEffect(() => () => {
    stopTrack();
    stopClick();
    clearInterval(chordTimerRef.current);
  }, []); // eslint-disable-line

  function handleLoadPreset(p) {
    setGenre(p.genre);
    setTimeSig(p.timeSig);
    setBpm(p.bpm);
    setDrumsOn(p.drumsOn);
    setBassOn(p.bassOn);
    setMetOn(p.metOn);
  }

  function handleDeletePreset(idx) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next);
    savePresets(next);
  }

  function handleSavePreset() {
    const name = presetName.trim() || `${genre} ${bpm} BPM`;
    const p = { name, genre, timeSig, bpm, drumsOn, bassOn, metOn };
    const next = [...presets, p];
    setPresets(next);
    savePresets(next);
    setPresetName('');
    setSaving(false);
  }

  function handleStart() {
    if (playing) {
      setPlaying(false);
      return;
    }
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const t   = ctx.currentTime + 0.05;

    if (drumsOn || bassOn) {
      // useBackingTrack starts via its own effect when effectiveGenre becomes non-null
      // We call syncToTime on next tick once the hook has processed the genre change
      setTimeout(() => syncToTime(t), 50);
    }
    if (metOn) {
      metSync(t);
    }
    if (chordOn) {
      startChordScheduler(t);
    }

    setPlaying(true);
  }

  // Drum/bass toggle while playing — immediately stop/restart track
  function handleDrumsToggle() {
    const next = !drumsOn;
    setDrumsOn(next);
  }

  function handleBassToggle() {
    setBassOn(b => !b);
  }

  function handleChordToggle() {
    const next = !chordOn;
    setChordOn(next);
    if (playing) {
      if (next) {
        startChordScheduler(getAudioContext().currentTime + 0.05);
      } else {
        clearInterval(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    }
  }

  function handleMetToggle() {
    const next = !metOn;
    setMetOn(next);
    if (playing) {
      toggleClick();
      if (next) {
        const t = getAudioContext().currentTime + 0.05;
        metSync(t);
      }
    }
  }

  function handleTap() {
    const now = Date.now();
    tapsRef.current.push(now);
    // Keep last 8 taps
    if (tapsRef.current.length > 8) tapsRef.current = tapsRef.current.slice(-8);
    const calc = calcTapBpm(tapsRef.current);
    if (calc && calc >= 40 && calc <= 200) setBpm(calc);
  }

  if (!started) return (
    <LandingPage
      emoji="🎛"
      title="Song Backing Tracks"
      description="Full band in your pocket. Choose your genre, set your tempo, and play along with drums and bass."
      difficulty="Beginner"
      features={[
        'Blues, Country, Rock & Folk patterns',
        'Drums and bass line — toggle each on/off',
        'Metronome click track',
        'Tap tempo + ±1 BPM fine control',
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
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '16px 20px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <a href="#" onClick={() => { stopTrack(); stopClick(); }}
            style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
          <div>
            <h1 style={{
              fontSize: 18, fontWeight: 800, margin: 0,
              background: `linear-gradient(135deg,${M.accent},${M.hi})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Song Backing Tracks</h1>
            <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
              FREE · FULL BAND PRACTICE
            </div>
          </div>
        </div>

        {/* Genre */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Genre</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenre(g)} style={{
                padding: '8px 16px', borderRadius: 20, border: 'none',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "Georgia, serif",
                background: g === genre ? M.accent : 'rgba(255,255,255,0.06)',
                color: g === genre ? '#fff' : M.muted,
                transition: 'background 0.15s, color 0.15s',
              }}>{g}</button>
            ))}
          </div>
        </div>

        {/* Time signature */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Time Signature</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TIME_SIGS.map(ts => (
              <button key={ts} onClick={() => setTimeSig(ts)} style={{
                padding: '8px 14px', borderRadius: 20, border: 'none',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "Georgia, serif",
                background: ts === timeSig ? M.accent : 'rgba(255,255,255,0.06)',
                color: ts === timeSig ? '#fff' : M.muted,
                transition: 'background 0.15s, color 0.15s',
              }}>{ts}</button>
            ))}
          </div>
        </div>

        {/* BPM */}
        <div style={{
          background: M.panel, borderRadius: 16, border: `1px solid ${M.border}`,
          padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
            <button onClick={() => setBpm(b => Math.max(40, b - 1))} disabled={bpm <= 40}
              style={{ ...btnStyle(false, bpm <= 40), padding: '8px 16px', fontSize: 20, lineHeight: 1 }}>−</button>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: M.accent, lineHeight: 1 }}>{bpm}</div>
              <div style={{ fontSize: 9, color: M.muted, textTransform: 'uppercase',
                letterSpacing: '0.14em', marginTop: 3 }}>BPM</div>
            </div>
            <button onClick={() => setBpm(b => Math.min(200, b + 1))} disabled={bpm >= 200}
              style={{ ...btnStyle(false, bpm >= 200), padding: '8px 16px', fontSize: 20, lineHeight: 1 }}>+</button>
          </div>
          <input
            type="range" min="40" max="200" value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            style={{ width: '100%', accentColor: M.accent, marginBottom: 12 }}
          />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleTap} style={{
              padding: '10px 28px', borderRadius: 12,
              border: `1px solid ${M.borderHi}`,
              background: 'rgba(232,131,58,0.12)',
              color: M.accent, fontFamily: "Georgia, serif",
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.12s',
            }}>
              👆 Tap Tempo
            </button>
          </div>
        </div>

        {/* Track toggles */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 12 }}>Tracks</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleDrumsToggle} style={btnStyle(drumsOn)}>
              🥁 {drumsOn ? 'Drums On' : 'Drums Off'}
            </button>
            <button onClick={handleBassToggle} style={btnStyle(bassOn)}>
              🎸 {bassOn ? 'Bass On' : 'Bass Off'}
            </button>
            <button onClick={handleChordToggle} style={btnStyle(chordOn)}>
              🎼 {chordOn ? 'Chord On' : 'Chord Off'}
            </button>
            <button onClick={handleMetToggle} style={btnStyle(metOn)}>
              🎵 {metOn ? 'Click On' : 'Click Off'}
            </button>
          </div>
        </div>

        {/* Presets */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: M.muted }}>Presets</div>
            <button onClick={() => setSaving(s => !s)} style={{
              padding: '4px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              border: `1px solid ${M.borderHi}`, background: 'rgba(232,131,58,0.12)',
              color: M.accent, cursor: 'pointer', fontFamily: "Georgia, serif",
            }}>
              {saving ? 'Cancel' : '+ Save'}
            </button>
          </div>
          {saving && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                placeholder={`${genre} ${bpm} BPM`}
                style={{
                  flex: 1, minWidth: 0, width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12,
                  border: `1px solid ${M.border}`, background: '#1A0C05',
                  color: M.text, fontFamily: "Georgia, serif", outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button onClick={handleSavePreset} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: 'none', background: M.accent, color: '#fff',
                cursor: 'pointer', fontFamily: "Georgia, serif",
              }}>Save</button>
            </div>
          )}
          {presets.length === 0 ? (
            <div style={{ fontSize: 11, color: 'rgba(160,120,90,0.4)', fontStyle: 'italic' }}>
              No presets saved yet
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {presets.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px 5px 12px', borderRadius: 20,
                  background: 'rgba(196,100,40,0.12)', border: `1px solid ${M.border}`,
                }}>
                  <button onClick={() => handleLoadPreset(p)} style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: M.text, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: 600,
                  }}>{p.name}</button>
                  <button onClick={() => handleDeletePreset(i)} style={{
                    background: 'none', border: 'none', padding: '0 0 0 4px', cursor: 'pointer',
                    color: M.muted, fontSize: 14, lineHeight: 1,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Big START / STOP */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <button onClick={handleStart} style={{
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
            transition: 'all 0.15s', letterSpacing: '-0.01em',
          }}>
            {playing ? '⏹ Stop' : '▶ Start'}
          </button>
        </div>

        {/* Status indicator */}
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
                {genre} · {bpm} BPM
                {drumsOn ? ' · Drums' : ''}{bassOn ? ' · Bass' : ''}{chordOn ? ' · Chord' : ''}{metOn ? ' · Click' : ''}
              </span>
            </div>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>

      </div>
    </div>
  );
}
