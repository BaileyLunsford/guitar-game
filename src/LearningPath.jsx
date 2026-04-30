/**
 * LearningPath.jsx — checklist of skills users tick off as they learn.
 *
 * Categories: Open Chords, Barre Chords, Strum Patterns, CAGED Shapes,
 * Major Scales, Songs, Theory, Tab & Notation Reading. Each item can
 * optionally link to a relevant screen so the user can jump straight
 * to practice.
 *
 * Completion state persists in localStorage. No PRO gate — the checklist
 * itself is free engagement; individual practice screens stay gated.
 */

import React, { useState } from 'react';
import LandingPage from './LandingPage';

// ── Theme ─────────────────────────────────────────────────────────────────────
const M = {
  bg:       '#120A04',
  surface:  '#2A1208',
  panel:    '#1A0C05',
  accent:   '#E8833A',
  hi:       '#F5A65B',
  gold:     '#F5C842',
  green:    '#7B9E6B',
  muted:    '#A0785A',
  text:     '#F5E8D8',
  border:   'rgba(196,100,40,0.25)',
  borderHi: 'rgba(232,131,58,0.55)',
};

// ── Curriculum data ──────────────────────────────────────────────────────────
// Item ids are stable strings; never rename once in production or you
// orphan users' completion state.
const PATH_DATA = [
  {
    id: 'open-chords', icon: '🎸', label: 'Open Chords', hash: '#chord-play',
    items: [
      { id: 'oc-em',  label: 'E minor (Em) — easiest, 2 fingers' },
      { id: 'oc-am',  label: 'A minor (Am)' },
      { id: 'oc-e',   label: 'E major' },
      { id: 'oc-a',   label: 'A major' },
      { id: 'oc-d',   label: 'D major' },
      { id: 'oc-g',   label: 'G major' },
      { id: 'oc-c',   label: 'C major' },
      { id: 'oc-dm',  label: 'D minor (Dm)' },
    ],
  },
  {
    id: 'barre-chords', icon: '🤘', label: 'Barre Chords', hash: '#barre-chords',
    items: [
      { id: 'bc-f',     label: 'F major — E-shape barre, fret 1' },
      { id: 'bc-bb',    label: 'B♭ major — A-shape barre, fret 1' },
      { id: 'bc-fsharpm', label: 'F# minor — E-shape minor barre' },
      { id: 'bc-bm',    label: 'B minor — A-shape minor barre' },
    ],
  },
  {
    id: 'strum-patterns', icon: '🎶', label: 'Strum Patterns', hash: '#strum-patterns',
    items: [
      { id: 'sp-all-down', label: 'All Down — quarter notes' },
      { id: 'sp-down-up',  label: 'Down-Up — eighth notes' },
      { id: 'sp-folk',     label: 'Folk — D-D-U-U-D-U' },
      { id: 'sp-country',  label: 'Country — boom-chuck' },
      { id: 'sp-waltz',    label: 'Waltz — 3/4 time' },
      { id: 'sp-slow-rock',label: 'Slow Rock — ballad feel' },
    ],
  },
  {
    id: 'caged', icon: '🎸', label: 'CAGED System', hash: '#caged',
    items: [
      { id: 'caged-c', label: 'C-shape — open and moveable' },
      { id: 'caged-a', label: 'A-shape — moveable barre' },
      { id: 'caged-g', label: 'G-shape — wide stretch' },
      { id: 'caged-e', label: 'E-shape — root-6 barre' },
      { id: 'caged-d', label: 'D-shape — root-4 voicing' },
    ],
  },
  {
    id: 'scales', icon: '🎹', label: 'Major Scale Positions', hash: '#scale-play',
    items: [
      { id: 'scale-c-pos1', label: 'C major — open / first position' },
      { id: 'scale-c-pos2', label: 'C major — A-shape position' },
      { id: 'scale-c-pos3', label: 'C major — G-shape position' },
      { id: 'scale-c-pos4', label: 'C major — E-shape position' },
      { id: 'scale-c-pos5', label: 'C major — D-shape position' },
      { id: 'scale-pent',   label: 'Minor pentatonic — box 1' },
      { id: 'scale-blues',  label: 'Blues scale — added ♭5' },
    ],
  },
  {
    id: 'songs', icon: '📚', label: 'Songs', hash: '#song-library',
    items: [
      // Beginner
      { id: 'song-ode',         label: 'Ode to Joy', tag: 'Beginner' },
      { id: 'song-twinkle',     label: 'Twinkle Twinkle Little Star', tag: 'Beginner' },
      { id: 'song-mary',        label: 'Mary Had a Little Lamb', tag: 'Beginner' },
      { id: 'song-saints',      label: 'When the Saints Go Marching In', tag: 'Beginner' },
      { id: 'song-skip-lou',    label: 'Skip to My Lou', tag: 'Beginner' },
      { id: 'song-amazing',     label: 'Amazing Grace', tag: 'Beginner' },
      { id: 'song-jingle',      label: 'Jingle Bells', tag: 'Beginner' },
      { id: 'song-silent',      label: 'Silent Night', tag: 'Beginner' },
      { id: 'song-happy-bday',  label: 'Happy Birthday', tag: 'Beginner' },
      { id: 'song-simple-gifts',label: 'Simple Gifts', tag: 'Beginner' },
      // Intermediate
      { id: 'song-red-river',   label: 'Red River Valley', tag: 'Intermediate' },
      { id: 'song-shady',       label: 'Shady Grove', tag: 'Intermediate' },
      { id: 'song-circle',      label: 'Will the Circle Be Unbroken', tag: 'Intermediate' },
      { id: 'song-wildwood',    label: 'Wildwood Flower', tag: 'Intermediate' },
      { id: 'song-cripple',     label: 'Cripple Creek', tag: 'Intermediate' },
      { id: 'song-rising-sun',  label: 'House of the Rising Sun', tag: 'Intermediate' },
      // Advanced
      { id: 'song-scarborough', label: 'Scarborough Fair', tag: 'Advanced' },
      { id: 'song-greensleeves',label: 'Greensleeves', tag: 'Advanced' },
      { id: 'song-danny-boy',   label: 'Danny Boy', tag: 'Advanced' },
      { id: 'song-blackbird',   label: 'Blackbird (simplified)', tag: 'Advanced' },
    ],
  },
  {
    id: 'theory', icon: '📐', label: 'Theory', hash: '#fretboard-theory',
    items: [
      { id: 'th-half-whole', label: 'Half steps and whole steps' },
      { id: 'th-major-formula', label: 'Major scale formula (W-W-H-W-W-W-H)' },
      { id: 'th-minor-natural', label: 'Natural minor scale' },
      { id: 'th-intervals', label: 'Intervals — 3rds, 5ths, octaves' },
      { id: 'th-major-triad', label: 'Major triad — root, 3rd, 5th' },
      { id: 'th-minor-triad', label: 'Minor triad — flat 3rd' },
      { id: 'th-i-iv-v', label: 'I–IV–V chord progression' },
      { id: 'th-key-sigs', label: 'Key signatures — sharps & flats' },
      { id: 'th-nashville', label: 'Nashville numbers — transpose any song' },
    ],
  },
  {
    id: 'reading', icon: '🎼', label: 'Tab & Notation Reading', hash: '#tab-test',
    items: [
      { id: 'rd-tab-basics', label: 'Read tab — string and fret numbers' },
      { id: 'rd-rhythm', label: 'Read rhythm values — quarter, half, eighth' },
      { id: 'rd-treble-lines', label: 'Treble clef lines — E G B D F' },
      { id: 'rd-treble-spaces', label: 'Treble clef spaces — F A C E' },
      { id: 'rd-sight-measure', label: 'Sight-read a measure cold' },
    ],
  },
  {
    id: 'fretboard-notes', icon: '🎯', label: 'Notes on the Fretboard', hash: '#fretboard-notes',
    items: [
      { id: 'fb-low-e', label: 'Low E string — naturals up to 12' },
      { id: 'fb-a',     label: 'A string — naturals up to 12' },
      { id: 'fb-d',     label: 'D string — naturals up to 12' },
      { id: 'fb-g',     label: 'G string — naturals up to 12' },
      { id: 'fb-b',     label: 'B string — naturals up to 12' },
      { id: 'fb-high-e',label: 'High e string — naturals up to 12' },
      { id: 'fb-octaves',label: 'Octave shapes across strings' },
    ],
  },
];

// ── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'tunewise-learning-path';

function loadCompleted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveCompleted(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch {}
}

// ── Category section ─────────────────────────────────────────────────────────
function CategorySection({ category, completed, onToggle, collapsed, onToggleCollapsed }) {
  const done = category.items.filter(i => completed.has(i.id)).length;
  const total = category.items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const isComplete = done === total && total > 0;

  return (
    <div style={{
      background: M.surface, borderRadius: 14,
      border: `1px solid ${isComplete ? 'rgba(123,158,107,0.45)' : M.border}`,
      marginBottom: 14, overflow: 'hidden',
    }}>
      {/* Category header — tap to collapse/expand */}
      <button onClick={onToggleCollapsed} style={{
        width: '100%', padding: '14px 16px', background: 'transparent',
        border: 'none', cursor: 'pointer', display: 'flex',
        alignItems: 'center', gap: 10, color: M.text,
        fontFamily: "Georgia, 'Times New Roman', serif", textAlign: 'left',
      }}>
        <span style={{ fontSize: 22 }}>{category.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800,
            color: isComplete ? M.green : M.hi }}>
            {category.label}
            {isComplete && <span style={{ marginLeft: 6 }}>✓</span>}
          </div>
          <div style={{ fontSize: 11, color: M.muted, marginTop: 2 }}>
            {done} of {total} complete · {pct}%
          </div>
        </div>
        <span style={{ fontSize: 14, color: M.muted, transition: 'transform 0.15s',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
      </button>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(0,0,0,0.3)' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${isComplete ? M.green : M.accent}, ${isComplete ? M.green : M.hi})`,
          transition: 'width 0.3s',
        }} />
      </div>

      {/* Items */}
      {!collapsed && (
        <div style={{ padding: '8px 12px 12px' }}>
          {category.items.map(item => {
            const isDone = completed.has(item.id);
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 6px', borderRadius: 8,
                background: isDone ? 'rgba(123,158,107,0.10)' : 'transparent',
                marginBottom: 2,
              }}>
                {/* Checkbox */}
                <button onClick={() => onToggle(item.id)} style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: `1.5px solid ${isDone ? M.green : M.border}`,
                  background: isDone ? M.green : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, padding: 0,
                  fontSize: 13, color: '#0a1a0a', fontWeight: 900,
                }}>
                  {isDone && '✓'}
                </button>

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: isDone ? M.muted : M.text,
                    textDecoration: isDone ? 'line-through' : 'none',
                    fontFamily: "Georgia, serif",
                  }}>{item.label}</div>
                  {item.tag && (
                    <span style={{
                      display: 'inline-block', fontSize: 9, fontWeight: 800,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '1px 7px', borderRadius: 10,
                      background: item.tag === 'Beginner' ? 'rgba(123,158,107,0.18)'
                        : item.tag === 'Intermediate' ? 'rgba(232,168,80,0.18)'
                        : 'rgba(196,100,40,0.18)',
                      color: item.tag === 'Beginner' ? M.green
                        : item.tag === 'Intermediate' ? '#E8A050'
                        : M.accent,
                      marginTop: 2,
                    }}>{item.tag}</span>
                  )}
                </div>

                {/* Optional link */}
                {category.hash && (
                  <a href={category.hash} style={{
                    color: M.muted, fontSize: 16, lineHeight: 1, padding: '0 4px',
                    textDecoration: 'none', flexShrink: 0,
                  }} title="Practice this">→</a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function LearningPath() {
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(loadCompleted);
  const [collapsed, setCollapsed] = useState(() => new Set());

  if (!started) return (
    <LandingPage
      emoji="🗺"
      title="Learning Path"
      description="A self-paced checklist of every skill in TuneWise. Tick items off as you learn them — chords, scales, songs, theory, sight-reading. Track your progress and pick up wherever you left off."
      difficulty="Any Level"
      features={[
        'Chords, scales, strum patterns, songs & more',
        'Tap any item to jump straight to practice',
        'Progress saved automatically on this device',
        'Build mastery one step at a time',
      ]}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  function toggle(id) {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompleted(next);
    saveCompleted(next);
  }

  function toggleCollapsed(catId) {
    const next = new Set(collapsed);
    if (next.has(catId)) next.delete(catId);
    else next.add(catId);
    setCollapsed(next);
  }

  const totalItems = PATH_DATA.reduce((a, c) => a + c.items.length, 0);
  const totalDone = PATH_DATA.reduce(
    (a, c) => a + c.items.filter(i => completed.has(i.id)).length, 0);
  const pct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0;

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 60px',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: 18, fontWeight: 800, margin: 0,
              background: `linear-gradient(135deg,${M.accent},${M.hi})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Learning Path</h1>
            <div style={{ fontSize: 10, color: M.muted, letterSpacing: '0.06em', marginTop: 2 }}>
              YOUR GUITAR JOURNEY
            </div>
          </div>
        </div>

        {/* Overall progress card */}
        <div style={{
          background: `linear-gradient(135deg, rgba(232,131,58,0.10), rgba(245,166,91,0.06))`,
          border: `1px solid ${M.borderHi}`,
          borderRadius: 16, padding: '16px 18px', marginBottom: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: M.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase' }}>Overall Progress</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: M.gold }}>
              {pct}<span style={{ fontSize: 14 }}>%</span>
            </span>
          </div>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${M.accent}, ${M.gold})`,
              transition: 'width 0.4s', borderRadius: 4,
            }} />
          </div>
          <div style={{ fontSize: 12, color: M.muted, marginTop: 8 }}>
            <span style={{ color: M.text, fontWeight: 700 }}>{totalDone}</span> of{' '}
            <span style={{ color: M.text, fontWeight: 700 }}>{totalItems}</span> milestones complete
          </div>
        </div>

        {/* Categories */}
        {PATH_DATA.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            completed={completed}
            onToggle={toggle}
            collapsed={collapsed.has(cat.id)}
            onToggleCollapsed={() => toggleCollapsed(cat.id)}
          />
        ))}

        {/* Footer hint */}
        <div style={{
          fontSize: 11, color: M.muted, textAlign: 'center',
          marginTop: 20, padding: '12px 16px', fontStyle: 'italic',
        }}>
          Progress saved on this device · Tap → on any item to jump to practice
        </div>

      </div>
    </div>
  );
}
