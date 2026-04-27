/**
 * SongLibrary.jsx — song list → detail → Listen / Learn / Play
 *
 * Free:  Ode to Joy, Twinkle Twinkle, Amazing Grace
 * Pro:   all others
 */

import React, { useState, useRef, useEffect } from 'react';
import SongLearnEngine from './SongLearnEngine';
import { guitarSampler } from './guitarSampler';
import useBackingTrack from './useBackingTrack';
import useMetronome from './useMetronome';
import { getAudioContext } from './audioContext';

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

// Duration codes: q=quarter(1), h=half(2), w=whole(4), dq=dotted-quarter(1.5),
//                 e=eighth(0.5), de=dotted-eighth(0.75), qr=quarter-rest, hr=half-rest, er=eighth-rest
const BEAT_MAP  = { q:1, h:2, w:4, dq:1.5, e:0.5, de:0.75, qr:1, hr:2, er:0.5 };
const REST_CODES = new Set(['qr','hr','er']);

const GENRE_TO_TRACK = {
  Classical:           'blues',
  Children:            'blues',
  Hymn:                'blues',
  Folk:                'blues',
  Bluegrass:           'country',
  'Gospel / Bluegrass':'country',
  Blues:               'blues',
  Rock:                'rock',
};

function beatDur(d) {
  if (!d) return 1;
  if (typeof d === 'number') return d;
  return BEAT_MAP[d] || 1;
}

// ── Song data ─────────────────────────────────────────────────────────────────
// String: 1=high e, 2=B, 3=G, 4=D, 5=A, 6=low E
const SONGS = [
  // ─────────────────────────── FREE ───────────────────────────────────────
  {
    id: 'ode', title: 'Ode to Joy', genre: 'Classical',
    difficulty: 'Beginner', durationEst: '1:00', pro: false, bpm: 88,
    measures: [
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'dq' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'dq' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'h' },
      ],
    ],
  },

  {
    id: 'twinkle', title: 'Twinkle Twinkle Little Star', genre: 'Children',
    difficulty: 'Beginner', durationEst: '1:20', pro: false, bpm: 80,
    measures: [
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'h' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'h' },
      ],
    ],
  },

  // Amazing Grace — 3/4, key of G
  {
    id: 'amazing', title: 'Amazing Grace', genre: 'Hymn',
    difficulty: 'Beginner', durationEst: '1:20', pro: false, bpm: 66,
    measures: [
      // pickup: G4
      [{ string:1, fret:3, beat:3, noteName:'G4', duration:'q' }],
      // "Amazing grace, how sweet the sound"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'dq' },
        { string:3, fret:2, beat:2, noteName:'D4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'dq' },
        { string:3, fret:2, beat:2, noteName:'D4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      // "That saved a wretch like me"
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'dq' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      // "I once was lost but now am found"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'dq' },
        { string:3, fret:2, beat:2, noteName:'D4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'dq' },
        { string:3, fret:2, beat:2, noteName:'D4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      // "Was blind but now I see"
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'dq' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'qr', duration:'q' },
      ],
    ],
  },

  // ─────────────────────────── PRO ────────────────────────────────────────
  // Happy Birthday — 3/4, key of G
  {
    id: 'happy_birthday', title: 'Happy Birthday', genre: 'Children',
    difficulty: 'Beginner', durationEst: '0:45', pro: true, bpm: 88,
    measures: [
      // pickup: G G
      [
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
      ],
      // "Happy birthday to you"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
      ],
      // "Happy birthday to you"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
      ],
      // "Happy birthday dear [name]"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      // "Happy birthday to you"
      [
        { string:1, fret:3, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'e' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'e' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
      ],
    ],
  },

  // Jingle Bells — 4/4, key of G
  {
    id: 'jingle_bells', title: 'Jingle Bells', genre: 'Children',
    difficulty: 'Beginner', durationEst: '1:10', pro: true, bpm: 120,
    measures: [
      // Chorus
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'h' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'h' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'w' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      // Verse
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:4, fret:0, beat:1, noteName:'D3', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
    ],
  },

  // Silent Night — 3/4, key of G
  {
    id: 'silent_night', title: 'Silent Night', genre: 'Hymn',
    difficulty: 'Beginner', durationEst: '1:30', pro: true, bpm: 60,
    measures: [
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'dq' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'dq' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h.' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'dq' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'dq' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h.' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'dq' },
        { string:3, fret:2, beat:2, noteName:'D4', duration:'e' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'D4', duration:'h.' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'dq' },
        { string:2, fret:0, beat:2, noteName:'B3', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h.' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'dq' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'h.' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'dq' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'h.' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'h.' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'h.' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h.' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'h.' },
      ],
    ],
  },

  // Mary Had a Little Lamb — 4/4, key of E
  {
    id: 'mary_lamb', title: 'Mary Had a Little Lamb', genre: 'Children',
    difficulty: 'Beginner', durationEst: '0:50', pro: true, bpm: 100,
    measures: [
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'h' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'w' },
      ],
    ],
  },

  // Scarborough Fair — 3/4, key of Am (natural minor)
  {
    id: 'scarborough', title: 'Scarborough Fair', genre: 'Folk',
    difficulty: 'Intermediate', durationEst: '1:30', pro: true, bpm: 72,
    measures: [
      // "Are you going to Scarborough Fair"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      // "Parsley sage rosemary and thyme"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h.' },
      ],
      // "Remember me to one who lives there"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:8, beat:1, noteName:'C5', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:8, beat:1, noteName:'C5', duration:'q' },
        { string:1, fret:7, beat:2, noteName:'B4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      // "She once was a true love of mine"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h.' },
      ],
    ],
  },

  // House of the Rising Sun — 6/8 feel, key of Am, played as 4/4 arpeggios
  {
    id: 'rising_sun', title: 'House of the Rising Sun', genre: 'Blues',
    difficulty: 'Intermediate', durationEst: '1:30', pro: true, bpm: 76,
    measures: [
      // Am chord arpeggio
      [
        { string:5, fret:0, beat:1, noteName:'A2', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'e' },
        { string:5, fret:0, beat:3, noteName:'A2', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'e' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'e' },
      ],
      // C chord
      [
        { string:5, fret:3, beat:1, noteName:'C3', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:3, fret:0, beat:2, noteName:'G3', duration:'e' },
        { string:5, fret:3, beat:3, noteName:'C3', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'e' },
        { string:3, fret:0, beat:4, noteName:'G3', duration:'e' },
      ],
      // D chord
      [
        { string:4, fret:0, beat:1, noteName:'D3', duration:'e' },
        { string:2, fret:3, beat:1, noteName:'D4', duration:'e' },
        { string:1, fret:2, beat:2, noteName:'F#4', duration:'e' },
        { string:3, fret:2, beat:2, noteName:'A3', duration:'e' },
        { string:4, fret:0, beat:3, noteName:'D3', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'e' },
        { string:1, fret:2, beat:4, noteName:'F#4', duration:'e' },
        { string:3, fret:2, beat:4, noteName:'A3', duration:'e' },
      ],
      // F chord
      [
        { string:4, fret:3, beat:1, noteName:'F3', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'e' },
        { string:3, fret:2, beat:2, noteName:'A3', duration:'e' },
        { string:4, fret:3, beat:3, noteName:'F3', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'e' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'e' },
        { string:3, fret:2, beat:4, noteName:'A3', duration:'e' },
      ],
      // Am
      [
        { string:5, fret:0, beat:1, noteName:'A2', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'e' },
        { string:5, fret:0, beat:3, noteName:'A2', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'e' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'e' },
      ],
      // E
      [
        { string:6, fret:0, beat:1, noteName:'E2', duration:'e' },
        { string:1, fret:0, beat:1, noteName:'E4', duration:'e' },
        { string:2, fret:0, beat:2, noteName:'B3', duration:'e' },
        { string:3, fret:1, beat:2, noteName:'G#3', duration:'e' },
        { string:6, fret:0, beat:3, noteName:'E2', duration:'e' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'e' },
        { string:2, fret:0, beat:4, noteName:'B3', duration:'e' },
        { string:3, fret:1, beat:4, noteName:'G#3', duration:'e' },
      ],
      // Am
      [
        { string:5, fret:0, beat:1, noteName:'A2', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'e' },
        { string:5, fret:0, beat:3, noteName:'A2', duration:'e' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'e' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'e' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'e' },
      ],
      // E
      [
        { string:6, fret:0, beat:1, noteName:'E2', duration:'e' },
        { string:1, fret:0, beat:1, noteName:'E4', duration:'e' },
        { string:2, fret:0, beat:2, noteName:'B3', duration:'e' },
        { string:3, fret:1, beat:2, noteName:'G#3', duration:'e' },
        { string:6, fret:0, beat:3, noteName:'E2', duration:'e' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'e' },
        { string:2, fret:0, beat:4, noteName:'B3', duration:'e' },
        { string:3, fret:1, beat:4, noteName:'G#3', duration:'e' },
      ],
    ],
  },

  // Greensleeves — 3/4, key of Am
  {
    id: 'greensleeves', title: 'Greensleeves', genre: 'Folk',
    difficulty: 'Intermediate', durationEst: '1:30', pro: true, bpm: 72,
    measures: [
      // "Alas my love"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'dq' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'e' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      // "you do me wrong"
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'dq' },
        { string:2, fret:0, beat:2, noteName:'B3', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      // "to cast me off discourteously"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'dq' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'e' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      // "for I have loved you so long"
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'dq' },
        { string:3, fret:1, beat:2, noteName:'G#3', duration:'e' },
        { string:3, fret:1, beat:3, noteName:'G#3', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      // "delighting in your company" — chorus approach
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'dq' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'e' },
      ],
      [
        { string:3, fret:2, beat:1, noteName:'A3', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'dq' },
        { string:3, fret:1, beat:2, noteName:'G#3', duration:'e' },
        { string:3, fret:1, beat:3, noteName:'G#3', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      // Chorus: "Greensleeves was all my joy"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'dq' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'e' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'dq' },
        { string:2, fret:0, beat:2, noteName:'B3', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      // "Greensleeves was my delight"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'dq' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'e' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'dq' },
        { string:3, fret:1, beat:2, noteName:'G#3', duration:'e' },
        { string:3, fret:1, beat:3, noteName:'G#3', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h.' },
      ],
    ],
  },

  // When the Saints Go Marching In — 4/4, key of G
  {
    id: 'saints', title: 'When the Saints Go Marching In', genre: 'Hymn',
    difficulty: 'Beginner', durationEst: '1:00', pro: true, bpm: 110,
    measures: [
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'qr' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'w' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'qr' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'w' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'h' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:4, noteName:'F4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'w' },
      ],
    ],
  },

  // Danny Boy — 4/4, key of G
  {
    id: 'danny_boy', title: 'Danny Boy', genre: 'Folk',
    difficulty: 'Intermediate', durationEst: '1:45', pro: true, bpm: 66,
    measures: [
      // "Oh Danny boy the pipes are calling"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:7, beat:1, noteName:'B4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      // "from glen to glen and down the mountainside"
      [
        { string:3, fret:2, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:7, beat:4, noteName:'B4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      // "the summer's gone and all the flowers are dying"
      [
        { string:1, fret:7, beat:1, noteName:'B4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'w' },
      ],
    ],
  },

  // Wildwood Flower — 4/4, key of G (Carter Family style)
  {
    id: 'wildwood', title: 'Wildwood Flower', genre: 'Folk',
    difficulty: 'Intermediate', durationEst: '1:10', pro: true, bpm: 112,
    measures: [
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'e' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'e' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'e' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'e' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'h' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'w' },
      ],
    ],
  },

  // Blackbird (simplified) — 3/4 feel, key of G
  {
    id: 'blackbird', title: 'Blackbird (simplified)', genre: 'Folk',
    difficulty: 'Intermediate', durationEst: '1:30', pro: true, bpm: 80,
    measures: [
      // G fingerpicking intro melody
      [
        { string:3, fret:0, beat:1, noteName:'G3', duration:'e' },
        { string:2, fret:3, beat:1, noteName:'D4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'e' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'e' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      // "Blackbird singing in the dead of night"
      [
        { string:1, fret:7, beat:1, noteName:'B4', duration:'q' },
        { string:1, fret:7, beat:2, noteName:'B4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:7, beat:1, noteName:'B4', duration:'h' },
        { string:1, fret:7, beat:3, noteName:'B4', duration:'q' },
        { string:1, fret:7, beat:4, noteName:'B4', duration:'q' },
      ],
      // "Take these broken wings and learn to fly"
      [
        { string:1, fret:7, beat:1, noteName:'B4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:0, beat:1, noteName:'B3', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'w' },
      ],
    ],
  },

  // Simple Gifts (Shaker Hymn) — 4/4, key of G
  {
    id: 'simple_gifts', title: 'Simple Gifts', genre: 'Hymn',
    difficulty: 'Beginner', durationEst: '1:00', pro: true, bpm: 92,
    measures: [
      // "'Tis the gift to be simple"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      // "'Tis the gift to be free"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:3, fret:2, beat:3, noteName:'D4', duration:'q' },
        { string:3, fret:2, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'w' },
      ],
      // "'Tis the gift to come down where we ought to be"
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:3, fret:2, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:1, beat:2, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'w' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'w' },
      ],
    ],
  },

  // Skip to My Lou — 4/4, key of G
  {
    id: 'skip_lou', title: 'Skip to My Lou', genre: 'Folk',
    difficulty: 'Beginner', durationEst: '0:50', pro: true, bpm: 116,
    measures: [
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:0, beat:4, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'h' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'w' },
      ],
    ],
  },

  // Red River Valley — 4/4, key of G
  {
    id: 'red_river', title: 'Red River Valley', genre: 'Folk',
    difficulty: 'Beginner', durationEst: '1:15', pro: true, bpm: 82,
    measures: [
      // "From this valley they say you are going"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      // "We will miss your bright eyes and sweet smile"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:1, beat:3, noteName:'F4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'w' },
      ],
      // Chorus: "Come and sit by my side if you love me"
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'h' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:1, beat:1, noteName:'F4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'w' },
      ],
    ],
  },

  // Cripple Creek — Bluegrass 4/4, key of A
  {
    id: 'cripple', title: 'Cripple Creek', genre: 'Bluegrass',
    difficulty: 'Intermediate', durationEst: '0:55', pro: true, bpm: 132,
    measures: [
      // A-part
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'e' },
        { string:1, fret:5, beat:1, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'e' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'e' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'e' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'e' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'e' },
        { string:1, fret:0, beat:1, noteName:'E4', duration:'e' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:3, beat:4, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'e' },
        { string:1, fret:5, beat:1, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'e' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'e' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'e' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'e' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:4, noteName:'A4', duration:'q' },
      ],
      // B-part
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'e' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:1, noteName:'G4', duration:'e' },
        { string:1, fret:1, beat:2, noteName:'F4', duration:'e' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'e' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:4, noteName:'C4', duration:'h' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:2, fret:1, beat:1, noteName:'C4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'e' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'e' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'e' },
        { string:1, fret:3, beat:4, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'h' },
      ],
    ],
  },

  // Shady Grove — 3/4, key of Am/Dorian
  {
    id: 'shady', title: 'Shady Grove', genre: 'Bluegrass',
    difficulty: 'Intermediate', durationEst: '1:05', pro: true, bpm: 100,
    measures: [
      // Verse
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:2, fret:0, beat:3, noteName:'B3', duration:'q' },
      ],
      [
        { string:2, fret:1, beat:1, noteName:'C4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h.' },
      ],
      // Chorus
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h.' },
      ],
    ],
  },

  // Will the Circle Be Unbroken — 3/4, key of G
  {
    id: 'circle', title: 'Will the Circle Be Unbroken', genre: 'Gospel / Bluegrass',
    difficulty: 'Intermediate', durationEst: '1:15', pro: true, bpm: 96,
    measures: [
      // Verse: "Will the circle be unbroken"
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:5, beat:2, noteName:'A4', duration:'q' },
        { string:1, fret:5, beat:3, noteName:'A4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h' },
        { string:1, fret:0, beat:3, noteName:'E4', duration:'q' },
      ],
      // "by and by Lord by and by"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'q' },
        { string:1, fret:0, beat:2, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'h' },
        { string:2, fret:3, beat:3, noteName:'D4', duration:'q' },
      ],
      // "In the sky Lord in the sky"
      [
        { string:2, fret:3, beat:1, noteName:'D4', duration:'q' },
        { string:1, fret:3, beat:2, noteName:'G4', duration:'q' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:5, beat:1, noteName:'A4', duration:'h' },
        { string:1, fret:3, beat:3, noteName:'G4', duration:'q' },
      ],
      [
        { string:1, fret:0, beat:1, noteName:'E4', duration:'q' },
        { string:2, fret:3, beat:2, noteName:'D4', duration:'q' },
        { string:2, fret:1, beat:3, noteName:'C4', duration:'q' },
      ],
      [
        { string:1, fret:3, beat:1, noteName:'G4', duration:'h.' },
      ],
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function DiffBadge({ level }) {
  const color = level === 'Beginner' ? '#7B9E6B' : '#E8A050';
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
      background: `${color}22`, border: `1px solid ${color}88`, color,
    }}>{level}</span>
  );
}

// ── Fretboard position diagram ────────────────────────────────────────────────
function NotePositionDiagram({ string, fret }) {
  const W = 220, H = 80, NUT_X = 28, FRET_W = 34, FRETS = 5;
  const TOP = 14, BOT = H - 16, STR_H = (BOT - TOP) / 5;
  const strY = (s) => TOP + (s - 1) * STR_H;
  const fretX = (f) => NUT_X + f * FRET_W;
  const dotX  = (f) => f === 0 ? NUT_X - 12 : NUT_X + (f - 0.5) * FRET_W;
  const LABELS = ['e','B','G','D','A','E'];
  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {[1,2,3,4,5,6].map(s => (
        <line key={s} x1={NUT_X} y1={strY(s)} x2={fretX(FRETS)} y2={strY(s)}
          stroke={s === string ? M.hi : 'rgba(255,255,255,0.18)'}
          strokeWidth={s === string ? 1.5 : 0.8} />
      ))}
      <line x1={NUT_X} y1={TOP-2} x2={NUT_X} y2={BOT+2} stroke={M.accent} strokeWidth={4} strokeLinecap="round" />
      {[1,2,3,4,5].map(f => (
        <line key={f} x1={fretX(f)} y1={TOP-2} x2={fretX(f)} y2={BOT+2}
          stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
      ))}
      {[1,2,3,4,5].map(f => (
        <text key={f} x={dotX(f)} y={H-3} textAnchor="middle" fontSize={7}
          fill="rgba(160,120,90,0.55)" fontFamily="Georgia,serif">{f}</text>
      ))}
      {LABELS.map((l, i) => (
        <text key={i} x={fretX(FRETS)+5} y={strY(i+1)+3} fontSize={7}
          fill="rgba(160,120,90,0.55)" fontFamily="Georgia,serif">{l}</text>
      ))}
      {fret === 0
        ? <circle cx={NUT_X-12} cy={strY(string)} r={5} fill="none" stroke={M.accent} strokeWidth={2} />
        : fret <= FRETS
          ? <circle cx={dotX(fret)} cy={strY(string)} r={7} fill={M.accent} opacity={0.9} />
          : null}
    </svg>
  );
}

// ── Listen mode ───────────────────────────────────────────────────────────────
function ListenMode({ song, onBack }) {
  const [playing,  setPlaying]  = useState(false);
  const [noteIdx,  setNoteIdx]  = useState(-1);

  const allNotes     = song.measures.flat();
  const displayNotes = allNotes
    .map((n, i) => ({ ...n, allIdx: i }))
    .filter(n => !REST_CODES.has(n.duration));

  const timerRef = useRef(null);
  const beatMs   = 60000 / song.bpm;

  const trackGenre = GENRE_TO_TRACK[song.genre] || 'blues';
  const { trackOn, toggleTrack, stopTrack, syncToTime } = useBackingTrack(trackGenre, song.bpm);
  const { clickOn, toggleClick, stopClick }              = useMetronome(song.bpm);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    stopTrack();
    stopClick();
  }, []); // eslint-disable-line

  function play() {
    if (playing) return;
    guitarSampler.resume?.();
    const ctx = getAudioContext();
    const startTime = ctx.currentTime + 0.05;
    if (!trackOn) toggleTrack();
    syncToTime(startTime);
    setPlaying(true);
    playNote(0);
  }

  function playNote(idx) {
    if (idx >= allNotes.length) {
      setPlaying(false);
      setNoteIdx(-1);
      stopTrack();
      return;
    }
    setNoteIdx(idx);
    const note = allNotes[idx];
    if (!REST_CODES.has(note.duration)) {
      guitarSampler.playNote(note.noteName);
    }
    timerRef.current = setTimeout(() => playNote(idx + 1), beatDur(note.duration) * beatMs);
  }

  function stop() {
    clearTimeout(timerRef.current);
    setPlaying(false);
    setNoteIdx(-1);
    stopTrack();
    stopClick();
  }

  const currentNote = noteIdx >= 0 ? allNotes[noteIdx] : null;

  return (
    <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => { stop(); onBack(); }} style={backBtn}>‹ Back</button>
        <div style={{ fontSize: 13, color: M.muted, marginBottom: 4 }}>{song.genre}</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px',
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {song.title}
        </h2>
        <div style={{ fontSize: 12, color: M.muted }}>Listen · {song.durationEst} · {song.bpm} BPM</div>
      </div>

      {/* Note pills */}
      <div style={{
        background: M.surface, borderRadius: 16, border: `1px solid ${M.border}`,
        padding: '16px 12px', marginBottom: 14, minHeight: 60,
        display: 'flex', flexWrap: 'wrap', gap: 5, alignContent: 'flex-start',
      }}>
        {displayNotes.map((n, i) => (
          <span key={i} style={{
            padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: n.allIdx === noteIdx ? M.accent : 'rgba(255,255,255,0.05)',
            color: n.allIdx === noteIdx ? '#fff' : M.muted,
            border: `1px solid ${n.allIdx === noteIdx ? M.accent : M.border}`,
            transition: 'background 0.1s, color 0.1s',
          }}>{n.noteName}</span>
        ))}
      </div>

      {/* Fretboard diagram */}
      {currentNote && !REST_CODES.has(currentNote.duration) && (
        <div style={{
          background: M.surface, borderRadius: 12, border: `1px solid ${M.border}`,
          padding: '10px 8px 6px', marginBottom: 16,
        }}>
          <NotePositionDiagram string={currentNote.string} fret={currentNote.fret} />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {!playing
          ? <button onClick={play} style={primaryBtn}>▶ Play</button>
          : <button onClick={stop} style={primaryBtn}>⏹ Stop</button>
        }
        <button onClick={toggleTrack} style={{
          padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
          border: `1px solid ${trackOn ? M.borderHi : M.border}`,
          background: trackOn ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
          color: trackOn ? M.hi : M.muted,
          fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
        }}>🥁 {trackOn ? 'Track On' : 'Track Off'}</button>
        <button onClick={toggleClick} style={{
          padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
          border: `1px solid ${clickOn ? M.borderHi : M.border}`,
          background: clickOn ? 'rgba(232,131,58,0.18)' : 'rgba(196,100,40,0.08)',
          color: clickOn ? M.hi : M.muted,
          fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
        }}>🎵 {clickOn ? 'Met On' : 'Met Off'}</button>
      </div>
    </div>
  );
}

// ── Detail screen ─────────────────────────────────────────────────────────────
function SongDetail({ song, isPro, onUpgrade, onBack }) {
  const [mode, setMode] = useState(null);
  if (mode === 'listen') return <ListenMode song={song} onBack={() => setMode(null)} />;
  if (mode === 'learn')  return <SongLearnEngine song={song} />;
  const locked = song.pro && !isPro;
  return (
    <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto' }}>
      <button onClick={onBack} style={backBtn}>‹ All Songs</button>
      <div style={{ textAlign: 'center', padding: '20px 0 28px' }}>
        <div style={{ fontSize: 56, marginBottom: 12,
          filter: 'drop-shadow(0 4px 16px rgba(196,100,40,0.45))' }}>🎵</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px',
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {song.title}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <DiffBadge level={song.difficulty} />
          {song.pro && (
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
              background: 'rgba(232,131,58,0.18)', border: '1px solid rgba(232,131,58,0.5)',
              color: M.accent,
            }}>PRO</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: M.muted }}>
          {song.genre} · {song.durationEst} · {song.bpm} BPM
        </div>
      </div>
      {locked ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 13, color: M.muted, marginBottom: 20 }}>
            Unlock all PRO songs with a PRO subscription.
          </div>
          <button onClick={onUpgrade} style={primaryBtn}>Unlock PRO →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setMode('listen')} style={modeBtn}>
            <span style={{ fontSize: 22 }}>🎧</span>
            <div>
              <div style={{ fontWeight: 700 }}>Listen</div>
              <div style={{ fontSize: 11, color: M.muted }}>Hear the full song with highlighted notes</div>
            </div>
          </button>
          <button onClick={() => setMode('learn')} style={modeBtn}>
            <span style={{ fontSize: 22 }}>📖</span>
            <div>
              <div style={{ fontWeight: 700 }}>Song Learn</div>
              <div style={{ fontSize: 11, color: M.muted }}>Measure-by-measure with notation & tab</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Library list ──────────────────────────────────────────────────────────────
export default function SongLibrary({ isPro, onUpgrade }) {
  const [selected, setSelected] = useState(null);
  const freeSongs = SONGS.filter(s => !s.pro);
  const proSongs  = SONGS.filter(s => s.pro);

  if (selected) {
    return (
      <div style={{
        minHeight: '100vh', background: M.bg, color: M.text,
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: 'env(safe-area-inset-top,16px) 0 40px',
      }}>
        <SongDetail song={selected} isPro={isPro} onUpgrade={onUpgrade}
          onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 40px',
    }}>
      <div style={{ padding: '16px 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <h1 style={{
          fontSize: 20, fontWeight: 800, margin: 0,
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Song Library</h1>
        <span style={{ fontSize: 11, color: M.muted, marginLeft: 'auto' }}>{SONGS.length} songs</span>
      </div>

      <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, marginBottom: 8 }}>Free</div>
        {freeSongs.map(song => (
          <SongRow key={song.id} song={song} locked={false} onSelect={() => setSelected(song)} />
        ))}

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: M.muted, margin: '20px 0 8px' }}>PRO</div>
        {proSongs.map(song => (
          <SongRow key={song.id} song={song} locked={!isPro}
            onSelect={() => !isPro ? onUpgrade() : setSelected(song)} />
        ))}
      </div>
    </div>
  );
}

function SongRow({ song, locked, onSelect }) {
  return (
    <button onClick={onSelect} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
      padding: '14px 16px', borderRadius: 14, marginBottom: 10,
      background: M.surface, border: `1px solid ${M.border}`,
      color: M.text, fontFamily: "Georgia, serif", textAlign: 'left',
      cursor: 'pointer', opacity: locked ? 0.65 : 1,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <span style={{ fontSize: 28 }}>🎵</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {song.title}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <DiffBadge level={song.difficulty} />
          <span style={{ fontSize: 10, color: M.muted }}>{song.genre}</span>
          <span style={{ fontSize: 10, color: M.muted }}>· {song.durationEst}</span>
        </div>
      </div>
      <span style={{ color: locked ? M.muted : M.accent, fontSize: 16 }}>
        {locked ? '🔒' : '›'}
      </span>
    </button>
  );
}

const primaryBtn = {
  padding: '14px 32px', borderRadius: 14,
  border: `1px solid ${M.borderHi}`,
  background: `linear-gradient(135deg,#C46428,#E8833A)`,
  color: '#fff', fontFamily: "Georgia, serif",
  fontWeight: 800, fontSize: 16, cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(232,131,58,0.3)',
};

const modeBtn = {
  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
  borderRadius: 14, border: `1px solid ${M.border}`,
  background: M.surface, color: M.text,
  fontFamily: "Georgia, serif", fontSize: 14, textAlign: 'left',
  cursor: 'pointer', width: '100%',
  WebkitTapHighlightColor: 'transparent',
};

const backBtn = {
  background: 'none', border: 'none', color: M.muted,
  fontSize: 14, cursor: 'pointer', padding: '0 0 16px',
  fontFamily: "Georgia, serif", display: 'block',
};
