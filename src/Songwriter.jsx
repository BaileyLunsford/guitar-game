/**
 * Songwriter.jsx — Chord chart + lyrics editor
 *
 * Features:
 *   - Key / BPM / Time Signature settings
 *   - Chord chart grid (each cell = one measure)
 *   - Toggle between chord names and Nashville numbers
 *   - Lyrics textarea
 *   - Save/load multiple songs via localStorage
 *   - Add/remove measures
 */

import React, { useState, useCallback } from 'react';

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
const STORAGE_KEY = 'songwriterSongs';

// Nashville number degrees (major scale Roman numerals)
const DEGREES = ['I','II','III','IV','V','VI','VII'];

// Chromatic semitones from C
const NOTE_SEMI = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };

// Given a key root, the major scale degree notes (Roman numeral ↔ chord root)
function majorScaleDegrees(root) {
  const base = NOTE_SEMI[root] ?? 0;
  const intervals = [0, 2, 4, 5, 7, 9, 11];
  return intervals.map(i => {
    const semi = (base + i) % 12;
    return Object.keys(NOTE_SEMI).find(k => NOTE_SEMI[k] === semi && !k.includes('b') || NOTE_SEMI[k] === semi) ?? '?';
  });
}

// Try to convert a chord like "G", "Am", "F#m7" to a Nashville number given a key
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

function defaultSong() {
  return {
    id: Date.now(),
    title: 'New Song',
    key: 'G',
    bpm: 120,
    timeSig: '4/4',
    measures: ['G', 'G', 'C', 'D', 'G', 'G', 'C', 'D'],
    lyrics: '',
  };
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
export default function Songwriter() {
  const [songs,      setSongs]      = useState(loadSongs);
  const [activeSong, setActiveSong] = useState(() => {
    const saved = loadSongs();
    return saved.length > 0 ? { ...saved[0] } : defaultSong();
  });
  const [nashville,  setNashville]  = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editVal,    setEditVal]    = useState('');
  const [nameEdit,   setNameEdit]   = useState(false);

  const persist = useCallback((song) => {
    const updated = songs.find(s => s.id === song.id)
      ? songs.map(s => s.id === song.id ? song : s)
      : [...songs, song];
    setSongs(updated);
    saveSongs(updated);
  }, [songs]);

  function update(field, value) {
    const next = { ...activeSong, [field]: value };
    setActiveSong(next);
    persist(next);
  }

  function newSong() {
    const s = defaultSong();
    const updated = [...songs, s];
    setSongs(updated);
    saveSongs(updated);
    setActiveSong(s);
  }

  function deleteSong(id) {
    const updated = songs.filter(s => s.id !== id);
    setSongs(updated);
    saveSongs(updated);
    if (activeSong.id === id) {
      setActiveSong(updated.length > 0 ? { ...updated[0] } : defaultSong());
    }
  }

  function addMeasure() {
    update('measures', [...activeSong.measures, '']);
  }

  function removeMeasure() {
    if (activeSong.measures.length <= 1) return;
    update('measures', activeSong.measures.slice(0, -1));
  }

  function setMeasure(idx, val) {
    const m = [...activeSong.measures];
    m[idx] = val;
    update('measures', m);
  }

  function startEdit(idx) {
    setEditingIdx(idx);
    setEditVal(activeSong.measures[idx]);
  }

  function commitEdit() {
    if (editingIdx !== null) setMeasure(editingIdx, editVal);
    setEditingIdx(null);
    setEditVal('');
  }

  const displayChord = (chord) =>
    nashville && chord ? chordToNashville(chord, activeSong.key) : chord;

  // Beats per measure from time sig
  const beatsPerMeasure = parseInt(activeSong.timeSig?.split('/')[0] || '4');

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif", padding: '0 0 60px',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: M.panel, borderBottom: `1px solid ${M.border}`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <div style={{ flex: 1 }}>
          {nameEdit ? (
            <input
              value={activeSong.title}
              onChange={e => update('title', e.target.value)}
              onBlur={() => setNameEdit(false)}
              onKeyDown={e => e.key === 'Enter' && setNameEdit(false)}
              autoFocus
              style={{
                background: 'transparent', border: 'none', borderBottom: `1px solid ${M.borderHi}`,
                color: M.text, fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 800,
                outline: 'none', width: '100%',
              }}
            />
          ) : (
            <div
              onClick={() => setNameEdit(true)}
              style={{ fontSize: 16, fontWeight: 800, cursor: 'text',
                background: `linear-gradient(135deg,${M.accent},${M.hi})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {activeSong.title || 'Untitled'}
            </div>
          )}
          <div style={{ fontSize: 10, color: M.muted, marginTop: 1 }}>
            ✏️ Songwriter
          </div>
        </div>
        <button onClick={() => setNashville(n => !n)} style={{
          padding: '5px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
          border: `1px solid ${nashville ? M.borderHi : M.border}`,
          background: nashville ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
          color: nashville ? M.hi : M.muted,
          cursor: 'pointer', fontFamily: "Georgia, serif",
        }}>
          {nashville ? '1–4–5' : 'A–G'}
        </button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px' }}>

        {/* ── Song list chips ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {songs.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '4px 10px 4px 12px', borderRadius: 20,
              background: s.id === activeSong.id ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
              border: `1px solid ${s.id === activeSong.id ? M.borderHi : M.border}`,
            }}>
              <button onClick={() => setActiveSong({ ...s })} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: s.id === activeSong.id ? M.hi : M.text,
                fontFamily: "Georgia, serif", fontSize: 12, fontWeight: 600, padding: 0,
              }}>{s.title || 'Untitled'}</button>
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
            <input
              type="number" min="40" max="240" value={activeSong.bpm}
              onChange={e => update('bpm', Math.min(240, Math.max(40, +e.target.value)))}
              style={{
                ...selStyle(false), width: '100%', boxSizing: 'border-box',
                textAlign: 'center', appearance: 'none',
                MozAppearance: 'textfield',
              }}
            />
          </Field>
          <Field label="Time">
            <select value={activeSong.timeSig} onChange={e => update('timeSig', e.target.value)}
              style={{ ...selStyle(false), appearance: 'none' }}>
              {TIME_SIGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        {/* ── Chord chart ── */}
        <div style={{
          background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
          padding: '14px 16px', marginBottom: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: M.muted }}>
              Chord Chart — {activeSong.timeSig}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={removeMeasure} style={{
                width: 28, height: 28, borderRadius: 8, border: `1px solid ${M.border}`,
                background: 'rgba(196,100,40,0.1)', color: M.muted,
                cursor: 'pointer', fontSize: 16, lineHeight: 1,
              }}>−</button>
              <button onClick={addMeasure} style={{
                width: 28, height: 28, borderRadius: 8, border: `1px solid ${M.border}`,
                background: 'rgba(196,100,40,0.1)', color: M.text,
                cursor: 'pointer', fontSize: 16, lineHeight: 1,
              }}>+</button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(beatsPerMeasure, 4)}, 1fr)`,
            gap: 6,
          }}>
            {activeSong.measures.map((chord, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                {editingIdx === idx ? (
                  <input
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => (e.key === 'Enter' || e.key === 'Tab') && commitEdit()}
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
                    onClick={() => startEdit(idx)}
                    style={{
                      width: '100%', padding: '10px 6px', borderRadius: 10,
                      border: `1px solid ${chord ? M.border : 'rgba(196,100,40,0.12)'}`,
                      background: chord ? 'rgba(196,100,40,0.10)' : 'rgba(196,100,40,0.04)',
                      color: chord ? M.text : M.muted,
                      fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 800,
                      cursor: 'pointer', textAlign: 'center', minHeight: 44,
                    }}>
                    <div>{displayChord(chord) || <span style={{ fontSize: 20, opacity: 0.3 }}>+</span>}</div>
                    <div style={{ fontSize: 8, color: M.muted, marginTop: 2 }}>m{idx + 1}</div>
                  </button>
                )}
              </div>
            ))}
          </div>

          {nashville && (
            <div style={{ fontSize: 10, color: M.muted, marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
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
