/**
 * Songwriter.jsx — Chord chart + lyrics editor
 *
 * Features:
 *   - Key / BPM / Time Signature settings
 *   - Chord chart with named sections (Verse/Chorus/Bridge/etc.)
 *   - Toggle between chord names and Nashville numbers
 *   - Play button that cycles through measures at tempo
 *   - Lyrics textarea
 *   - Save/load multiple songs via localStorage
 *   - Inline title and section label editing
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  muted:   '#A0785A',
  text:    '#F5E8D8',
  border:  'rgba(196,100,40,0.25)',
  borderHi:'rgba(232,131,58,0.55)',
  green:   '#7B9E6B',
};

const KEYS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const TIME_SIGS = ['2/4','3/4','4/4','6/8'];
const GENRES = ['Blues', 'Country', 'Rock', 'Folk'];
const GENRE_MAP = { Blues:'blues', Country:'country', Rock:'rock', Folk:'blues' };
const STORAGE_KEY = 'songwriterSongs';
const SECTION_PRESETS = ['Intro','Verse','Pre-Chorus','Chorus','Bridge','Outro','Solo','Turnaround'];

// Strum patterns — subset mirroring StrumPatterns.jsx PATTERNS
const STRUM_PATTERNS = [
  { id: 'off',        name: 'Single Strum', sub: 'measure', steps: ['D'] },
  { id: 'all-down',   name: 'All Down',     sub: 'quarter', steps: ['D','D','D','D'] },
  { id: 'down-up',    name: 'Down-Up',      sub: 'eighth',  steps: ['D','U','D','U','D','U','D','U'] },
  { id: 'folk',       name: 'Folk',         sub: 'eighth',  steps: ['D','-','D','U','-','U','D','U'] },
  { id: 'country',    name: 'Country',      sub: 'eighth',  steps: ['D','D','U','-','U','D','U','-'] },
  { id: 'waltz',      name: 'Waltz (3/4)',  sub: 'quarter', steps: ['D','D','U'] },
  { id: 'slow-rock',  name: 'Slow Rock',    sub: 'eighth',  steps: ['D','-','-','U','-','-','D','-'] },
];

// Nashville number degrees (major scale Roman numerals)
const DEGREES = ['I','II','III','IV','V','VI','VII'];

// Chord → note arrays for strum playback
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
};

const ROMAN_TO_IDX = { VII:6, VI:5, V:4, IV:3, III:2, II:1, I:0 };

// Chromatic semitones from C
const NOTE_SEMI = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };

function majorScaleDegrees(root) {
  const base = NOTE_SEMI[root] ?? 0;
  const intervals = [0, 2, 4, 5, 7, 9, 11];
  return intervals.map(i => {
    const semi = (base + i) % 12;
    return Object.keys(NOTE_SEMI).find(k => NOTE_SEMI[k] === semi && !k.includes('b') || NOTE_SEMI[k] === semi) ?? '?';
  });
}

function nashvilleToChord(num, key) {
  const match = num.match(/^(VII|VI|V|IV|III|II|I)(.*)/);
  if (!match) return null;
  const idx = ROMAN_TO_IDX[match[1]];
  if (idx === undefined) return null;
  const degrees = majorScaleDegrees(key);
  const root = degrees[idx];
  if (!root) return null;
  const suffix = match[2] || ([1,2,5].includes(idx) ? 'm' : '');
  return root + suffix;
}

function chordToNashville(chord, key) {
  if (!chord.trim()) return chord;
  const match = chord.trim().match(/^([A-G][b#]?)(.*)/);
  if (!match) return chord;
  const root = match[1];
  const suffix = match[2];
  const degrees = majorScaleDegrees(key);
  const idx = degrees.findIndex(d => d === root || NOTE_SEMI[d] === NOTE_SEMI[root]);
  if (idx === -1) return chord;
  return DEGREES[idx] + suffix;
}

function loadSongs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveSongs(songs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(songs)); } catch {}
}

// Migrate old flat-measures songs to sections format
function normalizeSong(song) {
  if (!song.sections) {
    return {
      ...song,
      sections: [{ label: 'Verse', measures: song.measures || [] }],
      measures: undefined,
    };
  }
  return song;
}

function defaultSong() {
  return {
    id: Date.now(),
    title: 'New Song',
    key: 'G',
    bpm: 120,
    timeSig: '4/4',
    sections: [
      { label: 'Verse',  measures: ['G', 'G', 'C', 'D'] },
      { label: 'Chorus', measures: ['G', 'G', 'C', 'D'] },
    ],
    lyrics: '',
  };
}

// Returns a flat array of { secIdx, mIdx, chord } for play cursor
function flatMeasures(sections) {
  const out = [];
  (sections || []).forEach((sec, si) => {
    (sec.measures || []).forEach((chord, mi) => {
      out.push({ secIdx: si, mIdx: mi, chord });
    });
  });
  return out;
}

// ── MIDI export ──────────────────────────────────────────────────────────────
// Builds a Standard MIDI File (Format 1) with one chord track. Each chord
// becomes a held block chord lasting one full measure at the song's tempo.
// User can open the .mid in GarageBand / Logic / any DAW and add strums,
// drums, melody, etc. on top.

function noteNameToMidi(name) {
  const m = String(name).match(/^([A-G][#b]?)(\d+)$/);
  if (!m) return null;
  const SEMI = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
  const semi = SEMI[m[1]];
  if (semi === undefined) return null;
  return (parseInt(m[2]) + 1) * 12 + semi;
}

// Variable-length quantity (used for MIDI delta-times)
function vlq(n) {
  if (n < 0) n = 0;
  const bytes = [n & 0x7F];
  n >>= 7;
  while (n > 0) { bytes.unshift((n & 0x7F) | 0x80); n >>= 7; }
  return bytes;
}

// Big-endian uint32 / uint16 as byte arrays
function be32(n) { return [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]; }
function be16(n) { return [(n >>> 8) & 0xFF, n & 0xFF]; }

// chordResolver: (chordName) => string[] like ['C3','E3','G3'] (or [] if unknown)
function buildSongMidi(song, chordResolver) {
  const TPQ = 480; // ticks per quarter
  const bpm = Math.max(40, Math.min(240, song.bpm || 120));
  const usPerQ = Math.round(60_000_000 / bpm);

  const [num, den] = String(song.timeSig || '4/4').split('/').map(s => parseInt(s) || 4);
  const ticksPerMeasure = Math.round(TPQ * num * (4 / den));

  // ── Track 0: meta (title, tempo, time signature) ──
  const t0 = [];
  const titleBytes = Array.from(new TextEncoder().encode((song.title || 'Untitled').slice(0, 64)));
  t0.push(0, 0xFF, 0x03, titleBytes.length, ...titleBytes);             // sequence/track name
  t0.push(0, 0xFF, 0x51, 0x03, (usPerQ >> 16) & 0xFF, (usPerQ >> 8) & 0xFF, usPerQ & 0xFF); // tempo
  const dd = Math.max(0, Math.round(Math.log2(den)));
  t0.push(0, 0xFF, 0x58, 0x04, num, dd, 24, 8);                          // time signature
  t0.push(0, 0xFF, 0x2F, 0x00);                                          // end of track

  // ── Track 1: chords ──
  const t1 = [];
  const trkName = Array.from(new TextEncoder().encode('Chords'));
  t1.push(0, 0xFF, 0x03, trkName.length, ...trkName);
  t1.push(0, 0xC0, 24);  // program change → acoustic guitar (steel)

  let prevTick = 0;
  let measureIdx = 0;
  for (const sec of (song.sections || [])) {
    for (const chordName of (sec.measures || [])) {
      const startTick = measureIdx * ticksPerMeasure;
      const endTick = startTick + ticksPerMeasure;

      const noteNames = chordResolver(chordName) || [];
      const midis = noteNames.map(noteNameToMidi).filter(n => n != null);

      if (midis.length > 0) {
        // Note ON (first event has the gap as delta, rest delta=0)
        midis.forEach((m, i) => {
          const delta = i === 0 ? Math.max(0, startTick - prevTick) : 0;
          t1.push(...vlq(delta), 0x90, m, 80);
        });
        prevTick = startTick;

        // Note OFF at end of measure
        midis.forEach((m, i) => {
          const delta = i === 0 ? endTick - startTick : 0;
          t1.push(...vlq(delta), 0x80, m, 0);
        });
        prevTick = endTick;
      }

      measureIdx++;
    }
  }

  t1.push(0, 0xFF, 0x2F, 0x00); // end of track

  // ── Header + assembled file ──
  const header = [
    0x4D, 0x54, 0x68, 0x64,  // "MThd"
    ...be32(6),
    ...be16(1),              // format 1
    ...be16(2),              // 2 tracks
    ...be16(TPQ),
  ];
  const trk0Hdr = [0x4D, 0x54, 0x72, 0x6B, ...be32(t0.length)];
  const trk1Hdr = [0x4D, 0x54, 0x72, 0x6B, ...be32(t1.length)];

  return new Uint8Array([...header, ...trk0Hdr, ...t0, ...trk1Hdr, ...t1]);
}

function downloadBlob(bytes, filename, mime = 'audio/midi') {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// ── Small input helper ────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: M.muted }}>{label}</div>
      {children}
    </div>
  );
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

// ── Main component ────────────────────────────────────────────────────────────
export default function Songwriter({ isPro = true, onUpgrade } = {}) {
  const [songs,      setSongs]      = useState(() => loadSongs().map(normalizeSong));
  const [activeSong, setActiveSong] = useState(() => {
    const saved = loadSongs().map(normalizeSong);
    return saved.length > 0 ? { ...saved[0] } : defaultSong();
  });
  const [nashville,  setNashville]  = useState(false);
  const [genre,      setGenre]      = useState('Blues');
  const [drumsOn,       setDrumsOn]       = useState(true);
  const [bassOn,        setBassOn]        = useState(true);
  const [metOn,         setMetOn]         = useState(false);
  const [strumPatternId, setStrumPatternId] = useState('off');

  // Measure editing
  const [editingMeasure, setEditingMeasure] = useState(null); // {secIdx, mIdx}
  const [editVal,        setEditVal]        = useState('');

  // Section label editing
  const [editingLabel,   setEditingLabel]   = useState(null); // secIdx
  const [labelVal,       setLabelVal]       = useState('');
  const [labelDropdown,  setLabelDropdown]  = useState(null); // secIdx for preset picker

  // Title editing
  const [nameEdit, setNameEdit] = useState(false);

  // Chip name editing
  const [editingChipId, setEditingChipId] = useState(null);
  const [chipNameVal,   setChipNameVal]   = useState('');

  // Save feedback
  const [savedFlash,  setSavedFlash]  = useState(false);
  const savedTimerRef = useRef(null);

  // Play state
  const [playing,           setPlaying]           = useState(false);
  const [currentMeasureKey, setCurrentMeasureKey] = useState(null);
  const playIntervalRef = useRef(null);
  const playIdxRef      = useRef(0);
  const playMeasuresRef = useRef([]);

  const songKeyRef        = useRef(activeSong.key);
  const strumPatternIdRef = useRef(strumPatternId);
  const bpmRef            = useRef(activeSong.bpm);
  useEffect(() => { songKeyRef.current        = activeSong.key;  }, [activeSong.key]);
  useEffect(() => { strumPatternIdRef.current = strumPatternId;  }, [strumPatternId]);
  useEffect(() => { bpmRef.current            = activeSong.bpm;  }, [activeSong.bpm]);

  const effectiveGenre = playing ? GENRE_MAP[genre] : null;
  const { stopTrack, syncToTime }          = useBackingTrack(effectiveGenre, activeSong.bpm, drumsOn, bassOn);
  const { stopClick, syncToTime: metSync } = useMetronome(activeSong.bpm);

  useEffect(() => {
    if (!playing) { stopTrack(); stopClick(); }
  }, [playing]); // eslint-disable-line

  const persist = useCallback((song) => {
    setSongs(prev => {
      const updated = prev.find(s => s.id === song.id)
        ? prev.map(s => s.id === song.id ? song : s)
        : [...prev, song];
      saveSongs(updated);
      return updated;
    });
  }, []);

  function update(field, value) {
    const next = { ...activeSong, [field]: value };
    setActiveSong(next);
    persist(next);
  }

  function updateSections(sections) {
    update('sections', sections);
  }

  // ── Section operations ────────────────────────────────────────────────────
  function updateSectionLabel(secIdx, label) {
    const next = activeSong.sections.map((sec, si) =>
      si === secIdx ? { ...sec, label } : sec
    );
    updateSections(next);
  }

  function addMeasureToSection(secIdx) {
    const next = activeSong.sections.map((sec, si) =>
      si === secIdx ? { ...sec, measures: [...sec.measures, ''] } : sec
    );
    updateSections(next);
  }

  function removeMeasureFromSection(secIdx) {
    const next = activeSong.sections.map((sec, si) => {
      if (si !== secIdx || sec.measures.length <= 1) return sec;
      return { ...sec, measures: sec.measures.slice(0, -1) };
    });
    updateSections(next);
  }

  function addSection() {
    const next = [...activeSong.sections, { label: 'Verse', measures: ['', '', '', ''] }];
    updateSections(next);
  }

  function removeSection(secIdx) {
    if (activeSong.sections.length <= 1) return;
    updateSections(activeSong.sections.filter((_, si) => si !== secIdx));
  }

  function setMeasureInSection(secIdx, mIdx, val) {
    const next = activeSong.sections.map((sec, si) => {
      if (si !== secIdx) return sec;
      const m = [...sec.measures];
      m[mIdx] = val;
      return { ...sec, measures: m };
    });
    updateSections(next);
  }

  // ── Measure editing ───────────────────────────────────────────────────────
  function startEditMeasure(secIdx, mIdx) {
    setEditingMeasure({ secIdx, mIdx });
    setEditVal(activeSong.sections[secIdx].measures[mIdx]);
  }

  function commitEditMeasure() {
    if (editingMeasure) {
      setMeasureInSection(editingMeasure.secIdx, editingMeasure.mIdx, editVal);
    }
    setEditingMeasure(null);
    setEditVal('');
  }

  // ── Label editing ─────────────────────────────────────────────────────────
  function startEditLabel(secIdx) {
    setEditingLabel(secIdx);
    setLabelVal(activeSong.sections[secIdx].label);
    setLabelDropdown(null);
  }

  function commitEditLabel() {
    if (editingLabel !== null) updateSectionLabel(editingLabel, labelVal);
    setEditingLabel(null);
    setLabelVal('');
  }

  // ── Song management ───────────────────────────────────────────────────────
  function newSong() {
    const s = defaultSong();
    setSongs(prev => {
      const updated = [...prev, s];
      saveSongs(updated);
      return updated;
    });
    setActiveSong(s);
  }

  function deleteSong(id) {
    setSongs(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSongs(updated);
      if (activeSong.id === id) {
        setActiveSong(updated.length > 0 ? { ...updated[0] } : defaultSong());
      }
      return updated;
    });
  }

  function handleSave() {
    persist(activeSong);
    setSavedFlash(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedFlash(false), 1500);
  }

  // ── Export MIDI ───────────────────────────────────────────────────────────
  // Builds a Standard MIDI File from the current song and downloads it.
  // Each chord = held block notes spanning one full measure at song.bpm /
  // song.timeSig. The user opens the .mid in GarageBand / Logic / etc and
  // adds strums, drums, melody on top. Reuses the in-component resolveNotes
  // (which handles Nashville numerals + slash chords) for chord lookup.
  function handleExportMidi() {
    const bytes = buildSongMidi(activeSong, (chord) => resolveNotes(chord));
    const safeName = (activeSong.title || 'untitled')
      .replace(/[^a-z0-9 ._-]/gi, '')
      .trim() || 'untitled';
    downloadBlob(bytes, safeName + '.mid');
  }

  // ── Chip name editing ─────────────────────────────────────────────────────
  function startEditChip(id, name) {
    setEditingChipId(id);
    setChipNameVal(name);
  }

  function commitChipName() {
    if (editingChipId !== null) {
      setSongs(prev => {
        const updated = prev.map(s =>
          s.id === editingChipId ? { ...s, title: chipNameVal } : s
        );
        saveSongs(updated);
        return updated;
      });
      if (activeSong.id === editingChipId) {
        setActiveSong(a => ({ ...a, title: chipNameVal }));
      }
    }
    setEditingChipId(null);
    setChipNameVal('');
  }

  function handleMetToggle() {
    const next = !metOn;
    setMetOn(next);
  }

  function resolveNotes(chordName) {
    if (!chordName) return [];
    let resolved = chordName;
    if (/^(VII|VI|V|IV|III|II|I)/.test(resolved)) {
      resolved = nashvilleToChord(resolved, songKeyRef.current) || resolved;
    }
    const root = resolved.match(/^([A-G][#b]?)/)?.[1];
    return CHORD_NOTES[resolved] || (root && CHORD_NOTES[root]) || CHORD_NOTES.G;
  }

  function playStrumNotes(notes, direction) {
    const src = direction === 'U' ? [...notes].reverse() : notes;
    src.forEach((note, i) => {
      setTimeout(() => { try { guitarSampler.playNote(note); } catch (_) {} }, i * 14);
    });
  }

  function strumChord(chordName) {
    if (!chordName) return;
    const notes   = resolveNotes(chordName);
    const pat     = STRUM_PATTERNS.find(p => p.id === strumPatternIdRef.current) || STRUM_PATTERNS[0];
    const bpm     = bpmRef.current;
    const beats   = pat.sub === 'eighth' ? 0.5 : pat.sub === 'measure' ? 4 : 1;
    const stepMs  = (60000 / bpm) * beats;

    pat.steps.forEach((step, i) => {
      if (step === '-') return;
      setTimeout(() => {
        try { playStrumNotes(notes, step); } catch (_) {}
      }, Math.round(i * stepMs));
    });
  }

  // ── Play / Stop ───────────────────────────────────────────────────────────
  function handlePlay() {
    if (playing) {
      clearInterval(playIntervalRef.current);
      stopTrack();
      stopClick();
      setPlaying(false);
      setCurrentMeasureKey(null);
      playIdxRef.current = 0;
      return;
    }
    const all = flatMeasures(activeSong.sections);
    if (all.length === 0) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.05;
    if (drumsOn || bassOn) syncToTime(t);
    if (metOn) metSync(t);

    playMeasuresRef.current = all;
    playIdxRef.current = 0;
    const beatsPerMeasure = parseInt(activeSong.timeSig?.split('/')[0] || '4');
    const msPerMeasure    = (60000 / activeSong.bpm) * beatsPerMeasure;
    const firstKey = `${all[0].secIdx}-${all[0].mIdx}`;
    setCurrentMeasureKey(firstKey);
    strumChord(all[0].chord);
    setPlaying(true);
    playIntervalRef.current = setInterval(() => {
      playIdxRef.current = (playIdxRef.current + 1) % playMeasuresRef.current.length;
      const m = playMeasuresRef.current[playIdxRef.current];
      setCurrentMeasureKey(`${m.secIdx}-${m.mIdx}`);
      strumChord(m.chord);
    }, msPerMeasure);
  }

  // Stop play when BPM or timeSig changes while playing
  useEffect(() => {
    if (playing) {
      clearInterval(playIntervalRef.current);
      const all = flatMeasures(activeSong.sections);
      playMeasuresRef.current = all;
      const beatsPerMeasure = parseInt(activeSong.timeSig?.split('/')[0] || '4');
      const msPerMeasure    = (60000 / activeSong.bpm) * beatsPerMeasure;
      playIntervalRef.current = setInterval(() => {
        playIdxRef.current = (playIdxRef.current + 1) % playMeasuresRef.current.length;
        const m = playMeasuresRef.current[playIdxRef.current];
        setCurrentMeasureKey(`${m.secIdx}-${m.mIdx}`);
      }, msPerMeasure);
    }
  }, [activeSong.bpm, activeSong.timeSig]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(playIntervalRef.current);
    clearTimeout(savedTimerRef.current);
    stopTrack();
    stopClick();
  }, []); // eslint-disable-line

  const displayChord = (chord) =>
    nashville && chord ? chordToNashville(chord, activeSong.key) : chord;

  const beatsPerMeasure = parseInt(activeSong.timeSig?.split('/')[0] || '4');
  const cols = Math.min(beatsPerMeasure, 4);

  // ── PRO gate (free users see overlay only) ────────────────────────────────
  if (!isPro) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(18,10,4,0.96)',
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
          Songwriter is part of the PRO subscription.
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
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif", padding: '0 0 60px',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: M.panel, borderBottom: `1px solid ${M.border}`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <div style={{ flex: 1, minWidth: 0 }}>
          {nameEdit ? (
            <input
              value={activeSong.title}
              onChange={e => update('title', e.target.value)}
              onBlur={() => setNameEdit(false)}
              onKeyDown={e => e.key === 'Enter' && setNameEdit(false)}
              autoFocus
              style={{
                background: 'transparent', border: 'none',
                borderBottom: `1px solid ${M.borderHi}`,
                color: M.text, fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 800,
                outline: 'none', width: '100%',
              }}
            />
          ) : (
            <div onClick={() => setNameEdit(true)} style={{
              fontSize: 16, fontWeight: 800, cursor: 'text',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                background: `linear-gradient(135deg,${M.accent},${M.hi})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{activeSong.title || 'Untitled'}</span>
              <span style={{ fontSize: 11, color: M.muted, opacity: 0.65, lineHeight: 1 }}>✎</span>
            </div>
          )}
          <div style={{ fontSize: 10, color: M.muted, marginTop: 1 }}>✏️ Songwriter</div>
        </div>

        {/* Save button */}
        <button onClick={handleSave} style={{
          padding: '5px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          border: `1px solid ${savedFlash ? 'rgba(74,222,128,0.5)' : M.border}`,
          background: savedFlash ? 'rgba(74,222,128,0.10)' : 'rgba(196,100,40,0.06)',
          color: savedFlash ? '#4ade80' : M.muted,
          cursor: 'pointer', fontFamily: "Georgia, serif", transition: 'all 0.2s', flexShrink: 0,
        }}>
          {savedFlash ? '✓ Saved' : '💾 Save'}
        </button>

        {/* Export MIDI — opens in GarageBand / Logic / any DAW */}
        <button onClick={handleExportMidi}
          title="Download a MIDI file you can open in GarageBand or Logic Pro"
          style={{
            padding: '5px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            border: `1px solid ${M.border}`,
            background: 'rgba(196,100,40,0.06)',
            color: M.muted,
            cursor: 'pointer', fontFamily: "Georgia, serif", flexShrink: 0,
          }}>
          🎹 MIDI
        </button>

        {/* Chords / Numbers toggle */}
        <button onClick={() => setNashville(n => !n)} style={{
          padding: '5px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          border: `1px solid ${nashville ? M.borderHi : M.border}`,
          background: nashville ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
          color: nashville ? M.hi : M.muted,
          cursor: 'pointer', fontFamily: "Georgia, serif", flexShrink: 0,
        }}>
          {nashville ? 'Numbers' : 'Chords'}
        </button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px' }}>

        {/* ── Song tabs ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {songs.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '4px 10px 4px 12px', borderRadius: 20,
              background: s.id === activeSong.id ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
              border: `1px solid ${s.id === activeSong.id ? M.borderHi : M.border}`,
            }}>
              {editingChipId === s.id ? (
                <input
                  value={chipNameVal}
                  onChange={e => setChipNameVal(e.target.value)}
                  onBlur={commitChipName}
                  onKeyDown={e => e.key === 'Enter' && commitChipName()}
                  autoFocus
                  style={{
                    background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${M.borderHi}`,
                    color: M.hi, fontFamily: "Georgia, serif",
                    fontSize: 12, fontWeight: 600, outline: 'none', width: 80,
                  }}
                />
              ) : (
                <button
                  onClick={() => setActiveSong({ ...s })}
                  onDoubleClick={() => startEditChip(s.id, s.title || '')}
                  title="Double-tap to rename"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: s.id === activeSong.id ? M.hi : M.text,
                    fontFamily: "Georgia, serif", fontSize: 12, fontWeight: 600, padding: 0,
                  }}>{s.title || 'Untitled'}</button>
              )}
              <button onClick={() => deleteSong(s.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: M.muted, fontSize: 14, lineHeight: 1, padding: '0 0 0 2px',
              }}>×</button>
            </div>
          ))}
          <button onClick={newSong} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            border: `1px solid ${M.border}`, background: 'rgba(196,100,40,0.06)',
            color: M.muted, cursor: 'pointer', fontFamily: "Georgia, serif",
          }}>+ New</button>
        </div>

        {/* ── Settings row ── */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 18,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12,
        }}>
          <Field label="Key">
            <select value={activeSong.key} onChange={e => update('key', e.target.value)}
              style={{ ...selStyle(false), appearance: 'none', paddingRight: 8 }}>
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="BPM">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => update('bpm', Math.max(40, activeSong.bpm - 1))}
                style={{ ...selStyle(false), padding: '4px 9px', fontSize: 16, lineHeight: 1 }}>−</button>
              <span style={{ ...selStyle(false), flex: 1, textAlign: 'center',
                padding: '5px 4px', minWidth: 34 }}>{activeSong.bpm}</span>
              <button onClick={() => update('bpm', Math.min(240, activeSong.bpm + 1))}
                style={{ ...selStyle(false), padding: '4px 9px', fontSize: 16, lineHeight: 1 }}>+</button>
            </div>
          </Field>
          <Field label="Time">
            <select value={activeSong.timeSig} onChange={e => update('timeSig', e.target.value)}
              style={{ ...selStyle(false), appearance: 'none' }}>
              {TIME_SIGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        {/* ── Genre ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 6 }}>Genre</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenre(g)} style={{
                padding: '6px 14px', borderRadius: 20, border: 'none',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "Georgia, serif",
                background: g === genre ? M.accent : 'rgba(255,255,255,0.06)',
                color: g === genre ? '#fff' : M.muted,
                transition: 'background 0.15s, color 0.15s',
              }}>{g}</button>
            ))}
          </div>
        </div>

        {/* ── BPM slider ── */}
        <div style={{ marginBottom: 14 }}>
          <input type="range" min="40" max="240" value={activeSong.bpm}
            onChange={e => update('bpm', Number(e.target.value))}
            style={{ width: '100%', accentColor: M.accent }} />
        </div>

        {/* ── Tracks ── */}
        <div style={{
          background: M.surface, borderRadius: 12, border: `1px solid ${M.border}`,
          padding: '10px 12px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Tracks</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setDrumsOn(d => !d)} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              border: `1px solid ${drumsOn ? M.borderHi : M.border}`,
              background: drumsOn ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.10)',
              color: drumsOn ? M.hi : M.text, cursor: 'pointer', fontFamily: "Georgia, serif",
              transition: 'all 0.12s',
            }}>🥁 {drumsOn ? 'Drums On' : 'Drums Off'}</button>
            <button onClick={() => setBassOn(b => !b)} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              border: `1px solid ${bassOn ? M.borderHi : M.border}`,
              background: bassOn ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.10)',
              color: bassOn ? M.hi : M.text, cursor: 'pointer', fontFamily: "Georgia, serif",
              transition: 'all 0.12s',
            }}>🎸 {bassOn ? 'Bass On' : 'Bass Off'}</button>
            <button onClick={handleMetToggle} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              border: `1px solid ${metOn ? M.borderHi : M.border}`,
              background: metOn ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.10)',
              color: metOn ? M.hi : M.text, cursor: 'pointer', fontFamily: "Georgia, serif",
              transition: 'all 0.12s',
            }}>🎵 {metOn ? 'Click On' : 'Click Off'}</button>
          </div>
        </div>

        {/* ── Strum Pattern ── */}
        <div style={{
          background: M.surface, borderRadius: 12, border: `1px solid ${M.border}`,
          padding: '10px 12px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Strum Pattern</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STRUM_PATTERNS.map(p => (
              <button key={p.id} onClick={() => setStrumPatternId(p.id)} style={{
                padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                border: `1px solid ${strumPatternId === p.id ? M.borderHi : M.border}`,
                background: strumPatternId === p.id ? 'rgba(232,131,58,0.22)' : 'rgba(196,100,40,0.10)',
                color: strumPatternId === p.id ? M.hi : M.text,
                cursor: 'pointer', fontFamily: "Georgia, serif", transition: 'all 0.12s',
              }}>{p.name}</button>
            ))}
          </div>
        </div>

        {/* ── Start / Stop ── */}
        <button onClick={handlePlay} style={{
          width: '100%', padding: '14px', borderRadius: 14, marginBottom: 18,
          border: `1px solid ${playing ? 'rgba(248,113,113,0.5)' : M.borderHi}`,
          background: playing ? 'rgba(248,113,113,0.12)' : 'rgba(232,131,58,0.18)',
          color: playing ? '#fca5a5' : M.hi,
          fontSize: 15, fontWeight: 800, cursor: 'pointer',
          fontFamily: "Georgia, serif", transition: 'all 0.15s',
        }}>
          {playing ? '⏹ Stop' : '▶ Start Playing'}
        </button>

        {/* ── Chord chart ── */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 18,
        }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: M.muted }}>
              Chord Chart — {activeSong.timeSig}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Add section */}
              <button onClick={addSection} style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                border: `1px solid ${M.border}`, background: 'rgba(196,100,40,0.08)',
                color: M.muted, cursor: 'pointer', fontFamily: "Georgia, serif",
              }}>+ Section</button>
            </div>
          </div>

          {/* Sections */}
          {activeSong.sections.map((section, secIdx) => (
            <div key={secIdx} style={{ marginBottom: 18 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                {editingLabel === secIdx ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      value={labelVal}
                      onChange={e => setLabelVal(e.target.value)}
                      onBlur={commitEditLabel}
                      onKeyDown={e => e.key === 'Enter' && commitEditLabel()}
                      autoFocus
                      style={{
                        background: 'transparent', border: 'none',
                        borderBottom: `1px solid ${M.borderHi}`,
                        color: M.accent, fontFamily: "Georgia, serif",
                        fontSize: 11, fontWeight: 800, outline: 'none', width: 80,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}
                    />
                    {/* Preset dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setLabelDropdown(labelDropdown === secIdx ? null : secIdx)}
                        style={{
                          padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                          border: `1px solid ${M.border}`, background: 'rgba(196,100,40,0.1)',
                          color: M.muted, cursor: 'pointer', fontFamily: "Georgia, serif",
                        }}>▾</button>
                      {labelDropdown === secIdx && (
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
                  <button onClick={() => startEditLabel(secIdx)} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    border: `1px solid ${M.border}`, background: 'rgba(232,131,58,0.08)',
                    color: M.accent, cursor: 'pointer', fontFamily: "Georgia, serif",
                  }}>
                    {section.label || `Section ${secIdx + 1}`} ✎
                  </button>
                )}
                <button onClick={() => removeMeasureFromSection(secIdx)} style={{
                  width: 22, height: 22, borderRadius: 6, border: `1px solid ${M.border}`,
                  background: 'rgba(196,100,40,0.08)', color: M.muted,
                  cursor: 'pointer', fontSize: 13, lineHeight: 1,
                }}>−</button>
                <button onClick={() => addMeasureToSection(secIdx)} style={{
                  width: 22, height: 22, borderRadius: 6, border: `1px solid ${M.border}`,
                  background: 'rgba(196,100,40,0.08)', color: M.text,
                  cursor: 'pointer', fontSize: 13, lineHeight: 1,
                }}>+</button>
                {activeSong.sections.length > 1 && (
                  <button onClick={() => removeSection(secIdx)} style={{
                    width: 22, height: 22, borderRadius: 6, border: `1px solid rgba(210,50,50,0.3)`,
                    background: 'rgba(210,50,50,0.08)', color: 'rgba(248,113,113,0.7)',
                    cursor: 'pointer', fontSize: 11, lineHeight: 1,
                  }}>✕</button>
                )}
              </div>

              {/* Measures grid */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
                {section.measures.map((chord, mIdx) => {
                  const isEditing  = editingMeasure?.secIdx === secIdx && editingMeasure?.mIdx === mIdx;
                  const isCurrent  = currentMeasureKey === `${secIdx}-${mIdx}`;
                  return (
                    <div key={mIdx} style={{ position: 'relative' }}>
                      {isEditing ? (
                        <input
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={commitEditMeasure}
                          onKeyDown={e => (e.key === 'Enter' || e.key === 'Tab') && commitEditMeasure()}
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
                          onClick={() => startEditMeasure(secIdx, mIdx)}
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
                          <div style={{ fontSize: 8, color: M.muted, marginTop: 2 }}>m{mIdx + 1}</div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {nashville && (
            <div style={{ fontSize: 10, color: M.muted, marginTop: 4, textAlign: 'center', fontStyle: 'italic' }}>
              Nashville numbers in key of {activeSong.key}
            </div>
          )}
        </div>

        {/* ── Lyrics ── */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 18,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 10 }}>
            Lyrics
          </div>
          <textarea
            value={activeSong.lyrics}
            onChange={e => update('lyrics', e.target.value)}
            placeholder="Type your lyrics here..."
            rows={8}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px', borderRadius: 10, resize: 'vertical',
              border: `1px solid ${M.border}`, background: '#1A0C05',
              color: M.text, fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 14, lineHeight: 1.7, outline: 'none',
            }}
          />
        </div>

      </div>
    </div>
  );
}
