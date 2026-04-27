/**
 * SongBackingTracks.jsx — Practice backing track tool with chord chart
 *
 * FREE feature. Drums, bass, metronome click, full BPM control,
 * and a live chord chart that strums the current measure's chord
 * in sync with the backing track beat scheduler.
 */

import React, { useState, useRef, useEffect } from 'react';
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

function selStyle(active) {
  return {
    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
    border: `1px solid ${active ? M.borderHi : M.border}`,
    background: active ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
    color: active ? M.hi : M.text,
    cursor: 'pointer', fontFamily: "Georgia, serif", transition: 'all 0.12s',
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GENRES        = ['Blues', 'Country', 'Rock', 'Folk'];
const GENRE_MAP     = { Blues:'blues', Country:'country', Rock:'rock', Folk:'blues' };
const TIME_SIGS     = ['2/4', '3/4', '4/4', '6/8'];
const KEYS          = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const SECTION_PRESETS = ['Intro','Verse','Pre-Chorus','Chorus','Bridge','Outro','Solo'];
const DEGREES       = ['I','II','III','IV','V','VI','VII'];
const NOTE_SEMI     = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };

const CHORD_NOTES = {
  C:  ['C3','E3','G3','C4','E4'],
  D:  ['D3','F#3','A3','D4'],
  E:  ['E2','B2','E3','G#3','B3','E4'],
  F:  ['F2','C3','F3','A3','C4'],
  G:  ['G2','B2','D3','G3','B3','G4'],
  A:  ['A2','E3','A3','C#4','E4'],
  B:  ['B2','F#3','B3','D#4','F#4'],
  Am: ['A2','E3','A3','C4','E4'],
  Em: ['E2','B2','E3','G3','B3','E4'],
  Dm: ['D3','F3','A3','D4'],
  Bm: ['B2','F#3','B3','D4','F#4'],
  Cm: ['C3','G3','C4','Eb4','G4'],
  G7: ['G2','B2','D3','F3','B3','G4'],
  D7: ['D3','F#3','A3','C4'],
  A7: ['A2','E3','G3','C#4','E4'],
  E7: ['E2','B2','E3','G#3','D4','E4'],
  C7: ['C3','E3','G3','Bb3','E4'],
  F7: ['F2','C3','F3','A3','Eb4','F4'],
};

const ROMAN_TO_IDX = { VII:6, VI:5, V:4, IV:3, III:2, II:1, I:0 };

// ── Helper functions ──────────────────────────────────────────────────────────
function majorScaleDegrees(root) {
  const base = NOTE_SEMI[root] ?? 0;
  return [0,2,4,5,7,9,11].map(i => {
    const semi = (base + i) % 12;
    return Object.keys(NOTE_SEMI).find(k => NOTE_SEMI[k] === semi && !k.includes('b')) ?? '?';
  });
}

function nashvilleToChord(num, key) {
  const match = num.match(/^(VII|VI|V|IV|III|II|I)(.*)/);
  if (!match) return null;
  const idx = ROMAN_TO_IDX[match[1]];
  if (idx === undefined) return null;
  const root = majorScaleDegrees(key)[idx];
  if (!root) return null;
  const suffix = match[2] || ([1,2,5].includes(idx) ? 'm' : '');
  return root + suffix;
}

function chordToNashville(chord, key) {
  if (!chord.trim()) return chord;
  const match = chord.trim().match(/^([A-G][b#]?)(.*)/);
  if (!match) return chord;
  const root = match[1];
  const degrees = majorScaleDegrees(key);
  const idx = degrees.findIndex(d => d === root || NOTE_SEMI[d] === NOTE_SEMI[root]);
  if (idx === -1) return chord;
  return DEGREES[idx] + match[2];
}

function resolveChordNotes(chordName, key) {
  if (!chordName) return [];
  let resolved = chordName;
  if (/^(VII|VI|V|IV|III|II|I)/.test(resolved)) {
    resolved = nashvilleToChord(resolved, key) || resolved;
  }
  const root = resolved.match(/^([A-G][#b]?)/)?.[1];
  return CHORD_NOTES[resolved] || (root && CHORD_NOTES[root]) || CHORD_NOTES.G;
}

function calcTapBpm(taps) {
  if (taps.length < 2) return null;
  const recent = taps.slice(-8);
  const gaps   = recent.slice(1).map((t, i) => t - recent[i]);
  const avg    = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return Math.round(60000 / avg);
}

const PRESETS_KEY = 'songBackingPresets';
const CHART_KEY   = 'songBackingChart';

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch { return []; }
}
function savePresets(p) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); } catch {}
}
function loadChart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHART_KEY) || 'null');
    return saved || {
      key: 'G',
      sections: [
        { label: 'Verse',  measures: ['G', 'G', 'C', 'D'] },
        { label: 'Chorus', measures: ['G', 'G', 'C', 'D'] },
      ],
    };
  } catch {
    return {
      key: 'G',
      sections: [
        { label: 'Verse',  measures: ['G', 'G', 'C', 'D'] },
        { label: 'Chorus', measures: ['G', 'G', 'C', 'D'] },
      ],
    };
  }
}
function saveChart(c) {
  try { localStorage.setItem(CHART_KEY, JSON.stringify(c)); } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SongBackingTracks() {
  // playback state
  const [started,  setStarted]  = useState(false);
  const [playing,  setPlaying]  = useState(false);
  const [genre,    setGenre]    = useState('Blues');
  const [timeSig,  setTimeSig]  = useState('4/4');
  const [bpm,      setBpm]      = useState(100);
  const [drumsOn,  setDrumsOn]  = useState(true);
  const [bassOn,   setBassOn]   = useState(true);
  const [metOn,    setMetOn]    = useState(false);
  const [chordOn,  setChordOn]  = useState(false);

  // presets
  const [presets,    setPresets]    = useState(loadPresets);
  const [saving,     setSaving]     = useState(false);
  const [presetName, setPresetName] = useState('');

  // chord chart
  const [chart,       setChart]       = useState(loadChart);
  const [nashville,   setNashville]   = useState(false);
  const [currentChordKey, setCurrentChordKey] = useState(null);

  // chord chart editing
  const [editingMeasure, setEditingMeasure] = useState(null);
  const [editVal,        setEditVal]        = useState('');
  const [editingLabel,   setEditingLabel]   = useState(null);
  const [labelVal,       setLabelVal]       = useState('');
  const [labelDropdown,  setLabelDropdown]  = useState(null);

  // refs
  const tapsRef          = useRef([]);
  const bpmRef           = useRef(bpm);
  const timeSigRef       = useRef(timeSig);
  const chordTimerRef    = useRef(null);
  const chordNextMeasure = useRef(0);
  const chordMeasureIdx  = useRef(0);
  const chartRef         = useRef(chart);   // non-stale copy for scheduler

  useEffect(() => { bpmRef.current   = bpm;     }, [bpm]);
  useEffect(() => { timeSigRef.current = timeSig; }, [timeSig]);
  useEffect(() => { chartRef.current = chart;   }, [chart]);

  const effectiveGenre = playing ? GENRE_MAP[genre] : null;
  const { trackOn, toggleTrack, stopTrack, syncToTime } = useBackingTrack(effectiveGenre, bpm, drumsOn, bassOn);
  const { clickOn, toggleClick, stopClick, syncToTime: metSync } = useMetronome(bpm);

  // ── Chord scheduler (Web Audio lookahead, measure-based) ─────────────────
  function startChordScheduler(fromTime) {
    clearInterval(chordTimerRef.current);
    chordNextMeasure.current = fromTime;
    chordMeasureIdx.current  = 0;
    const ctx = getAudioContext();

    function tick() {
      const now   = ctx.currentTime;
      const beats = parseInt(timeSigRef.current.split('/')[0] || '4');
      const mDur  = (beats * 60) / bpmRef.current;
      const { sections, key } = chartRef.current;
      const allMeasures = sections.flatMap(s => s.measures);
      if (allMeasures.length === 0) return;

      while (chordNextMeasure.current < now + 0.12) {
        const t   = chordNextMeasure.current;
        const idx = chordMeasureIdx.current % allMeasures.length;
        const chord = allMeasures[idx];
        const ms  = (t - ctx.currentTime) * 1000;

        // Determine section/measure indices for highlight
        let flatCount = 0;
        let secI = 0, mI = 0;
        outer: for (let si = 0; si < sections.length; si++) {
          for (let mi = 0; mi < sections[si].measures.length; mi++) {
            if (flatCount === idx) { secI = si; mI = mi; break outer; }
            flatCount++;
          }
        }
        const key2 = `${secI}-${mI}`;
        setTimeout(() => setCurrentChordKey(key2), Math.max(0, ms));

        if (chord) {
          const notes = resolveChordNotes(chord, key);
          notes.forEach((note, i) => {
            setTimeout(() => {
              try { guitarSampler.playNote(note); } catch (_) {}
            }, Math.max(0, ms + i * 14));
          });
        }

        chordNextMeasure.current += mDur;
        chordMeasureIdx.current++;
      }
    }

    tick();
    chordTimerRef.current = setInterval(tick, 30);
  }

  function stopChordScheduler() {
    clearInterval(chordTimerRef.current);
    chordTimerRef.current = null;
    setCurrentChordKey(null);
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      stopTrack();
      stopClick();
      stopChordScheduler();
    }
  }, [playing]); // eslint-disable-line

  useEffect(() => () => {
    stopTrack();
    stopClick();
    clearInterval(chordTimerRef.current);
  }, []); // eslint-disable-line

  // ── Chart helpers ─────────────────────────────────────────────────────────
  function updateChart(next) {
    setChart(next);
    saveChart(next);
  }

  function updateKey(k) { updateChart({ ...chart, key: k }); }

  function updateSections(sections) { updateChart({ ...chart, sections }); }

  function addSection() {
    updateSections([...chart.sections, { label: 'Verse', measures: ['', '', '', ''] }]);
  }

  function removeSection(si) {
    if (chart.sections.length <= 1) return;
    updateSections(chart.sections.filter((_, i) => i !== si));
  }

  function addMeasure(si) {
    updateSections(chart.sections.map((s, i) =>
      i === si ? { ...s, measures: [...s.measures, ''] } : s
    ));
  }

  function removeMeasure(si) {
    updateSections(chart.sections.map((s, i) => {
      if (i !== si || s.measures.length <= 1) return s;
      return { ...s, measures: s.measures.slice(0, -1) };
    }));
  }

  function setMeasure(si, mi, val) {
    updateSections(chart.sections.map((s, i) => {
      if (i !== si) return s;
      const m = [...s.measures]; m[mi] = val;
      return { ...s, measures: m };
    }));
  }

  function setLabel(si, label) {
    updateSections(chart.sections.map((s, i) => i === si ? { ...s, label } : s));
  }

  function startEditMeasure(si, mi) {
    setEditingMeasure({ si, mi });
    setEditVal(chart.sections[si].measures[mi]);
  }

  function commitMeasure() {
    if (editingMeasure) setMeasure(editingMeasure.si, editingMeasure.mi, editVal);
    setEditingMeasure(null);
    setEditVal('');
  }

  function startEditLabel(si) {
    setEditingLabel(si);
    setLabelVal(chart.sections[si].label);
    setLabelDropdown(null);
  }

  function commitLabel() {
    if (editingLabel !== null) setLabel(editingLabel, labelVal);
    setEditingLabel(null);
    setLabelVal('');
  }

  const displayChord = (chord) =>
    nashville && chord ? chordToNashville(chord, chart.key) : chord;

  // ── Preset helpers ────────────────────────────────────────────────────────
  function handleLoadPreset(p) {
    setGenre(p.genre); setTimeSig(p.timeSig); setBpm(p.bpm);
    setDrumsOn(p.drumsOn); setBassOn(p.bassOn); setMetOn(p.metOn);
  }

  function handleDeletePreset(idx) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next); savePresets(next);
  }

  function handleSavePreset() {
    const name = presetName.trim() || `${genre} ${bpm} BPM`;
    const next = [...presets, { name, genre, timeSig, bpm, drumsOn, bassOn, metOn }];
    setPresets(next); savePresets(next);
    setPresetName(''); setSaving(false);
  }

  // ── Playback handlers ─────────────────────────────────────────────────────
  function handleStart() {
    if (playing) { setPlaying(false); return; }
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.05;

    if (drumsOn || bassOn) setTimeout(() => syncToTime(t), 50);
    if (metOn)   metSync(t);
    if (chordOn) startChordScheduler(t);

    setPlaying(true);
  }

  function handleDrumsToggle()  { setDrumsOn(d => !d); }
  function handleBassToggle()   { setBassOn(b => !b); }

  function handleChordToggle() {
    const next = !chordOn;
    setChordOn(next);
    if (playing) {
      if (next) startChordScheduler(getAudioContext().currentTime + 0.05);
      else      stopChordScheduler();
    }
  }

  function handleMetToggle() {
    const next = !metOn;
    setMetOn(next);
    if (playing) {
      toggleClick();
      if (next) metSync(getAudioContext().currentTime + 0.05);
    }
  }

  function handleTap() {
    const now = Date.now();
    tapsRef.current.push(now);
    if (tapsRef.current.length > 8) tapsRef.current = tapsRef.current.slice(-8);
    const calc = calcTapBpm(tapsRef.current);
    if (calc && calc >= 40 && calc <= 200) setBpm(calc);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!started) return (
    <LandingPage
      emoji="🎛"
      title="Song Backing Tracks"
      description="Full band in your pocket. Choose your genre, set your tempo, and play along with drums, bass, and your own chord chart."
      difficulty="Beginner"
      features={[
        'Blues, Country, Rock & Folk patterns',
        'Drums, bass and chord strum — toggle each',
        'Chord chart with sections and Nashville numbers',
        'Tap tempo + ±1 BPM fine control',
      ]}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  const beatsPerMeasure = parseInt(timeSig.split('/')[0] || '4');

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 60px',
    }}>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '16px 20px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <a href="#" onClick={() => { stopTrack(); stopClick(); stopChordScheduler(); }}
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
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, serif",
                background: g === genre ? M.accent : 'rgba(255,255,255,0.06)',
                color: g === genre ? '#fff' : M.muted, transition: 'background 0.15s',
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
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, serif",
                background: ts === timeSig ? M.accent : 'rgba(255,255,255,0.06)',
                color: ts === timeSig ? '#fff' : M.muted, transition: 'background 0.15s',
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
              <div style={{ fontSize: 9, color: M.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 3 }}>BPM</div>
            </div>
            <button onClick={() => setBpm(b => Math.min(200, b + 1))} disabled={bpm >= 200}
              style={{ ...btnStyle(false, bpm >= 200), padding: '8px 16px', fontSize: 20, lineHeight: 1 }}>+</button>
          </div>
          <input type="range" min="40" max="200" value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            style={{ width: '100%', accentColor: M.accent, marginBottom: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleTap} style={{
              padding: '10px 28px', borderRadius: 12, border: `1px solid ${M.borderHi}`,
              background: 'rgba(232,131,58,0.12)', color: M.accent, fontFamily: "Georgia, serif",
              fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.12s',
            }}>👆 Tap Tempo</button>
          </div>
        </div>

        {/* Track toggles */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 20,
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

        {/* ── Chord Chart ───────────────────────────────────────────────────── */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 20,
        }}>
          {/* Chord chart header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: M.muted }}>
              Chord Chart — {timeSig}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setNashville(n => !n)} style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                border: `1px solid ${nashville ? M.borderHi : M.border}`,
                background: nashville ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
                color: nashville ? M.hi : M.muted, cursor: 'pointer', fontFamily: "Georgia, serif",
              }}>{nashville ? 'Numbers' : 'Chords'}</button>
              <button onClick={addSection} style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                border: `1px solid ${M.border}`, background: 'rgba(196,100,40,0.08)',
                color: M.muted, cursor: 'pointer', fontFamily: "Georgia, serif",
              }}>+ Section</button>
            </div>
          </div>

          {/* Key selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: M.muted }}>Key</span>
            <select value={chart.key} onChange={e => updateKey(e.target.value)}
              style={{ ...selStyle(false), appearance: 'none', paddingRight: 8 }}>
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            {nashville && (
              <span style={{ fontSize: 10, color: M.muted, fontStyle: 'italic' }}>
                Nashville in {chart.key}
              </span>
            )}
          </div>

          {/* Sections */}
          {chart.sections.map((section, si) => (
            <div key={si} style={{ marginBottom: 16 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                {editingLabel === si ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      value={labelVal}
                      onChange={e => setLabelVal(e.target.value)}
                      onBlur={commitLabel}
                      onKeyDown={e => e.key === 'Enter' && commitLabel()}
                      autoFocus
                      style={{
                        background: 'transparent', border: 'none',
                        borderBottom: `1px solid ${M.borderHi}`,
                        color: M.accent, fontFamily: "Georgia, serif",
                        fontSize: 11, fontWeight: 800, outline: 'none', width: 80,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}
                    />
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setLabelDropdown(labelDropdown === si ? null : si)}
                        style={{
                          padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                          border: `1px solid ${M.border}`, background: 'rgba(196,100,40,0.1)',
                          color: M.muted, cursor: 'pointer', fontFamily: "Georgia, serif",
                        }}>▾</button>
                      {labelDropdown === si && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, zIndex: 10, marginTop: 2,
                          background: M.panel, border: `1px solid ${M.border}`,
                          borderRadius: 8, overflow: 'hidden', minWidth: 110,
                        }}>
                          {SECTION_PRESETS.map(p => (
                            <button key={p} onClick={() => { setLabelVal(p); setLabelDropdown(null); }}
                              style={{
                                display: 'block', width: '100%', padding: '7px 12px',
                                textAlign: 'left', background: 'none', border: 'none',
                                color: M.text, fontFamily: "Georgia, serif",
                                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              }}>{p}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startEditLabel(si)} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    border: `1px solid ${M.border}`, background: 'rgba(232,131,58,0.08)',
                    color: M.accent, cursor: 'pointer', fontFamily: "Georgia, serif",
                  }}>{section.label || `Section ${si + 1}`} ✎</button>
                )}
                <button onClick={() => removeMeasure(si)} style={{
                  width: 22, height: 22, borderRadius: 6, border: `1px solid ${M.border}`,
                  background: 'rgba(196,100,40,0.08)', color: M.muted, cursor: 'pointer',
                  fontSize: 13, lineHeight: 1,
                }}>−</button>
                <button onClick={() => addMeasure(si)} style={{
                  width: 22, height: 22, borderRadius: 6, border: `1px solid ${M.border}`,
                  background: 'rgba(196,100,40,0.08)', color: M.text, cursor: 'pointer',
                  fontSize: 13, lineHeight: 1,
                }}>+</button>
                {chart.sections.length > 1 && (
                  <button onClick={() => removeSection(si)} style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: '1px solid rgba(210,50,50,0.3)', background: 'rgba(210,50,50,0.08)',
                    color: 'rgba(248,113,113,0.7)', cursor: 'pointer', fontSize: 11, lineHeight: 1,
                  }}>✕</button>
                )}
              </div>

              {/* Measures grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(beatsPerMeasure, 4)}, 1fr)`,
                gap: 6,
              }}>
                {section.measures.map((chord, mi) => {
                  const isEditing = editingMeasure?.si === si && editingMeasure?.mi === mi;
                  const isCurrent = chordOn && playing && currentChordKey === `${si}-${mi}`;
                  return (
                    <div key={mi}>
                      {isEditing ? (
                        <input
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={commitMeasure}
                          onKeyDown={e => (e.key === 'Enter' || e.key === 'Tab') && commitMeasure()}
                          autoFocus
                          placeholder="e.g. Am7"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '10px 6px', borderRadius: 10, textAlign: 'center',
                            border: `1px solid ${M.borderHi}`, background: '#1A0C05',
                            color: M.text, fontFamily: "Georgia, serif",
                            fontSize: 16, fontWeight: 800, outline: 'none',
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => startEditMeasure(si, mi)}
                          style={{
                            width: '100%', padding: '10px 6px', borderRadius: 10,
                            border: `1px solid ${isCurrent ? M.hi : chord ? M.border : 'rgba(196,100,40,0.12)'}`,
                            background: isCurrent
                              ? 'rgba(245,166,91,0.18)'
                              : chord ? 'rgba(196,100,40,0.10)' : 'rgba(196,100,40,0.04)',
                            color: chord ? M.text : M.muted,
                            fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 800,
                            cursor: 'pointer', textAlign: 'center', minHeight: 44,
                            boxShadow: isCurrent ? '0 0 8px rgba(245,166,91,0.25)' : 'none',
                            transition: 'all 0.12s',
                          }}>
                          <div>{displayChord(chord) || <span style={{ fontSize: 20, opacity: 0.3 }}>+</span>}</div>
                          <div style={{ fontSize: 8, color: M.muted, marginTop: 2 }}>m{mi + 1}</div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
            }}>{saving ? 'Cancel' : '+ Save'}</button>
          </div>
          {saving && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                placeholder={`${genre} ${bpm} BPM`}
                style={{
                  flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, fontSize: 12,
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

        {/* Start / Stop */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <button onClick={handleStart} style={{
            padding: '18px 64px', borderRadius: 20,
            border: `2px solid ${playing ? M.borderHi : M.border}`,
            background: playing
              ? `linear-gradient(135deg,${M.accent},${M.hi})`
              : `linear-gradient(135deg,#C46428,${M.accent})`,
            color: '#fff', fontFamily: "Georgia, serif",
            fontWeight: 900, fontSize: 20, cursor: 'pointer',
            boxShadow: playing ? '0 6px 32px rgba(232,131,58,0.55)' : '0 4px 20px rgba(232,131,58,0.30)',
            transition: 'all 0.15s', letterSpacing: '-0.01em',
          }}>{playing ? '⏹ Stop' : '▶ Start'}</button>
        </div>

        {/* Status */}
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
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>

      </div>
    </div>
  );
}
