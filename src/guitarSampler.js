// guitarSampler.js
// Lazy-loading acoustic steel-string guitar sampler backed by the Gleitz MIDI.js soundfont CDN.
// Files are named like A4.mp3, Bb4.mp3 (flat notation — no sharp filenames).
// Sharp notes (e.g. F#4) are handled via enharmonic fallback: Fs4 → Gb4.
//
// API (same as violinSampler):
//   guitarSampler.resume()           — call inside first user gesture (iOS/Safari)
//   guitarSampler.preload(['E2',…])  — warm the cache in parallel
//   guitarSampler.playNote('A4')     — returns BufferSourceNode (or null on error)

import { getAudioContext } from './audioContext';

// Enharmonic map — sharps → flat equivalents (Gleitz CDN uses flat filenames)
const ENHARMONICS = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

function enharmonic(note) {
  const m = note.match(/^([A-G][#b]?)(\d)$/);
  if (!m) return null;
  const alt = ENHARMONICS[m[1]];
  return alt ? alt + m[2] : null;
}

export class InstrumentSampler {
  constructor({ basePath, extension = 'mp3', polyphonic = false }) {
    this.basePath       = basePath.replace(/\/$/, '');
    this.extension      = extension;
    this.polyphonic     = polyphonic;
    this._ctx           = null;
    this._cache         = new Map(); // note → AudioBuffer
    this._inflight      = new Map(); // note → Promise<AudioBuffer>
    this._activeSources = new Map(); // note → { source, gain }
  }

  _getCtx() {
    if (!this._ctx) this._ctx = getAudioContext();
    return this._ctx;
  }

  // Fetch + decode, caching the result. Dedupes concurrent requests.
  // Gleitz CDN uses flat notation (Bb4.mp3). Sharp notes (#) are handled by:
  //   1. Try the sharp-as-s filename (Fs4.mp3) — will 404 on Gleitz
  //   2. Fall back to the flat enharmonic (Gb4.mp3) — will succeed
  // Natural notes and flat notes are fetched directly.
  _load(note) {
    if (this._cache.has(note))    return Promise.resolve(this._cache.get(note));
    if (this._inflight.has(note)) return this._inflight.get(note);

    const toFilename = (n) => n.replace('#', 's'); // F#4 → Fs4 (URL-safe)

    const tryFetch = (filename) => {
      const url = `${this.basePath}/${filename}.${this.extension}`;
      return fetch(url).then(r => {
        if (!r.ok) throw new Error(`[GuitarSampler] Missing sample: ${filename}.${this.extension}`);
        return r.arrayBuffer();
      });
    };

    // Try primary filename, then enharmonic fallback
    const primary = toFilename(note);
    const alt     = enharmonic(note);

    const fetchChain = tryFetch(primary).catch(() => {
      if (!alt) throw new Error(`[GuitarSampler] No sample for ${note}`);
      return tryFetch(toFilename(alt));
    });

    const promise = fetchChain
      .then(buf => this._getCtx().decodeAudioData(buf))
      .then(decoded => {
        this._cache.set(note, decoded);
        this._inflight.delete(note);
        return decoded;
      })
      .catch(err => {
        this._inflight.delete(note);
        throw err;
      });

    this._inflight.set(note, promise);
    return promise;
  }

  // ── Humanization helpers ─────────────────────────────────────────────────
  // Applied when volume/detune are not explicitly overridden by the caller.
  // Keeps playback feeling "played" rather than mechanical:
  //   velocity : ±15 % gain variation
  //   pitch    : ±3 cents random detune
  static _humanVol()    { return 1.20 + Math.random() * 0.30; }   // 1.20–1.50
  static _humanDetune() { return (Math.random() - 0.5) * 6; }     // –3 … +3 cents

  async playNote(note, { volume = null, detune = null } = {}) {
    const ctx = this._getCtx();
    // Resume AudioContext if browser suspended it (tab switch, iOS autoplay policy, etc.)
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (_) {} }

    let buffer;
    try {
      buffer = await this._load(note);
    } catch (err) {
      console.warn(err.message);
      return null;
    }

    const now       = ctx.currentTime;
    // null → apply humanization; explicit value → use as-is
    const targetVol = Math.max(0, Math.min(2,
      volume  ?? InstrumentSampler._humanVol()
    ));
    const detuneVal = detune ?? InstrumentSampler._humanDetune();

    console.log(
      '[GuitarSampler] playNote ' + note +
      ' | wall=' + performance.now().toFixed(1) + 'ms' +
      ' | activeSources=' + this._activeSources.size +
      ' | cacheSize=' + this._cache.size
    );

    // Guitar is polyphonic — strings ring simultaneously. No stop-before-play.
    // For monophonic mode (polyphonic=false), fade out all active notes first.
    const GAP = this.polyphonic ? 0 : 0.020;
    if (!this.polyphonic && this._activeSources.size > 0) {
      this._activeSources.forEach((prev, key) => {
        try {
          prev.gain.gain.cancelScheduledValues(now);
          prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
          prev.gain.gain.linearRampToValueAtTime(0, now + 0.005);
          prev.source.stop(now + 0.005);
        } catch (_) { /* already stopped */ }
      });
      this._activeSources.clear();
    }

    const startAt = now + GAP;

    const source = ctx.createBufferSource();
    source.buffer       = buffer;
    source.detune.value = detuneVal;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(targetVol, startAt + 0.010); // 10ms attack

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(startAt);

    this._activeSources.set(note, { source, gain });

    source.onended = () => {
      if (this._activeSources.get(note)?.source === source) {
        this._activeSources.delete(note);
      }
    };

    return source;
  }

  preload(notes) {
    const unique   = [...new Set(notes)];
    const promises = unique.map(n => this._load(n).catch(() => {}));
    Promise.all(promises).then(() => {
      const cached  = unique.filter(n => this._cache.has(n));
      const missing = unique.filter(n => !this._cache.has(n));
      console.log(
        '[GuitarSampler] preload complete — ' +
        cached.length + '/' + unique.length + ' notes cached: ' + cached.join(' ') +
        (missing.length ? ' | MISSING: ' + missing.join(' ') : '')
      );
    });
  }

  resume() {
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
  }

  get cacheSize() {
    return this._cache.size;
  }
}

// ── Default export ────────────────────────────────────────────────────────────

export const guitarSampler = new InstrumentSampler({
  basePath:   'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_guitar_steel-mp3',
  polyphonic: true, // guitar strings ring independently
});

// Resume AudioContext when user returns to the tab (handles browser suspension)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) guitarSampler.resume();
});

// Warm the chromatic E2–G5 range on load so first play is instant.
// Includes naturals + flats (Gleitz uses flat filenames). Sharps fetch and
// fall back to enharmonic flat. Without this, the first play of any sharp
// note (e.g. F#3 in Amazing Grace, F#4 in Greensleeves) hits the network
// before sounding — which is heard as a "missing" or "delayed" attack and
// makes melodic playback feel robotic or broken.
guitarSampler.preload([
  // Octave 2 (low E to B)
  'E2', 'F2', 'Gb2', 'G2', 'Ab2', 'A2', 'Bb2', 'B2',
  // Octave 3 (C3 to B3)
  'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3',
  // Octave 4 (middle C to B4 — most melody notes live here)
  'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
  // Octave 5 (C5 to G5 — chorus high notes for Greensleeves etc.)
  'C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5', 'Gb5', 'G5',
]);
