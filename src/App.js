// Guitar Audition Game — App.js
// Bundle ID: com.orchestraaudition.guitar
// Theme: warm wood / mahogany

import React from 'react';
import TabNotationDisplay from './TabNotationDisplay';
import SongLearnEngine from './SongLearnEngine';

// ─── Colour palette ─────────────────────────────────────────────────────────
// #120A04  very dark mahogany  (background)
// #2A1208  dark wood panel     (surface / card)
// #C46428  warm mahogany       (primary)
// #E8833A  bright wood         (accent)
// #F5A65B  light grain         (highlight)
// #A0785A  worn wood           (muted text)
// #7B9E6B  sage green          (correct feedback)
// #C4603A  ember               (wrong feedback)

// ─── Song-learn data: Twinkle Twinkle — 6 measures, strings 1-2 ─────────────
// String 1 = high E (E4 open): fret0=E4, fret1=F4, fret3=G4, fret5=A4
// String 2 = B (B3 open):      fret1=C4, fret3=D4
const TWINKLE_SONG = {
  title: 'Twinkle Twinkle Little Star',
  bpm: 80,
  measures: [
    // M1: C C G G
    [
      { string: 2, fret: 1, beat: 1, noteName: 'C4' },
      { string: 2, fret: 1, beat: 2, noteName: 'C4' },
      { string: 1, fret: 3, beat: 3, noteName: 'G4' },
      { string: 1, fret: 3, beat: 4, noteName: 'G4' },
    ],
    // M2: A A G (half note)
    [
      { string: 1, fret: 5, beat: 1, noteName: 'A4' },
      { string: 1, fret: 5, beat: 2, noteName: 'A4' },
      { string: 1, fret: 3, beat: 3, noteName: 'G4' },
    ],
    // M3: F F E E
    [
      { string: 1, fret: 1, beat: 1, noteName: 'F4' },
      { string: 1, fret: 1, beat: 2, noteName: 'F4' },
      { string: 1, fret: 0, beat: 3, noteName: 'E4' },
      { string: 1, fret: 0, beat: 4, noteName: 'E4' },
    ],
    // M4: D D C (half note)
    [
      { string: 2, fret: 3, beat: 1, noteName: 'D4' },
      { string: 2, fret: 3, beat: 2, noteName: 'D4' },
      { string: 2, fret: 1, beat: 3, noteName: 'C4' },
    ],
    // M5: G G F F
    [
      { string: 1, fret: 3, beat: 1, noteName: 'G4' },
      { string: 1, fret: 3, beat: 2, noteName: 'G4' },
      { string: 1, fret: 1, beat: 3, noteName: 'F4' },
      { string: 1, fret: 1, beat: 4, noteName: 'F4' },
    ],
    // M6: E E D (half note)
    [
      { string: 1, fret: 0, beat: 1, noteName: 'E4' },
      { string: 1, fret: 0, beat: 2, noteName: 'E4' },
      { string: 2, fret: 3, beat: 3, noteName: 'D4' },
    ],
  ],
};

// ─── Tab-test data: Twinkle Twinkle — 8 notes on low E string (string 6) ───
// Guitar written pitch: sounds one octave lower than written.
// Open string 6 (E2 sounding) → written as E3 on treble clef.
// Frets 12–21 keep written pitches on the staff in a comfortable range.
const TWINKLE_LOW_E = [
  { string: 6, fret: 12, beat: 1, noteName: 'E4' },   // Twin-
  { string: 6, fret: 12, beat: 2, noteName: 'E4' },   // -kle
  { string: 6, fret: 19, beat: 3, noteName: 'B4' },   // Lit-
  { string: 6, fret: 19, beat: 4, noteName: 'B4' },   // -tle
  { string: 6, fret: 21, beat: 5, noteName: 'C#5' },  // Star
  { string: 6, fret: 21, beat: 6, noteName: 'C#5' },  // How
  { string: 6, fret: 19, beat: 7, noteName: 'B4' },   // I
  { string: 6, fret: 17, beat: 8, noteName: 'A4' },   // Won-
];

// ─── Tab test screen ────────────────────────────────────────────────────────
function TabTest() {
  const [active, setActive] = React.useState(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#120A04',
      color: '#F5E8D8',
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎸</div>
          <h1 style={{
            fontSize: 20, fontWeight: 800, marginBottom: 4,
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Tab Notation — Test
          </h1>
          <p style={{ fontSize: 12, color: '#A0785A' }}>
            Twinkle Twinkle · 8 notes · low E string
          </p>
        </div>

        {/* Both staves */}
        <section style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: '#A0785A', letterSpacing: '0.1em',
            textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Notation + Tab
          </label>
          <div style={{ background: '#2A1208', borderRadius: 14, padding: '16px 12px',
            border: '1px solid rgba(196,100,40,0.2)' }}>
            <TabNotationDisplay
              notes={TWINKLE_LOW_E}
              currentNote={active}
            />
          </div>
        </section>

        {/* Notation only */}
        <section style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: '#A0785A', letterSpacing: '0.1em',
            textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Notation only
          </label>
          <div style={{ background: '#2A1208', borderRadius: 14, padding: '16px 12px',
            border: '1px solid rgba(196,100,40,0.2)' }}>
            <TabNotationDisplay
              notes={TWINKLE_LOW_E}
              showTab={false}
              currentNote={active}
            />
          </div>
        </section>

        {/* Tab only */}
        <section style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 11, color: '#A0785A', letterSpacing: '0.1em',
            textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Tab only
          </label>
          <div style={{ background: '#2A1208', borderRadius: 14, padding: '16px 12px',
            border: '1px solid rgba(196,100,40,0.2)' }}>
            <TabNotationDisplay
              notes={TWINKLE_LOW_E}
              showNotation={false}
              currentNote={active}
            />
          </div>
        </section>

        {/* Beat selector — tap to highlight */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: '#A0785A', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Tap a note to highlight
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TWINKLE_LOW_E.map((note, idx) => (
              <button
                key={idx}
                onClick={() => setActive(active === idx ? null : idx)}
                style={{
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "Georgia, serif",
                  background: active === idx
                    ? 'rgba(232,131,58,0.25)'
                    : 'rgba(196,100,40,0.1)',
                  border: `1px solid ${active === idx
                    ? 'rgba(232,131,58,0.7)'
                    : 'rgba(196,100,40,0.35)'}`,
                  color: active === idx ? '#F5A65B' : '#A0785A',
                  transition: 'all 0.15s',
                }}
              >
                {note.noteName}
                <span style={{ display: 'block', fontSize: 10, opacity: 0.7 }}>
                  fr.{note.fret}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4-string example */}
        <section style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: '#A0785A', letterSpacing: '0.1em',
            textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            4-string (bass / mandolin tuning EADG)
          </label>
          <div style={{ background: '#2A1208', borderRadius: 14, padding: '16px 12px',
            border: '1px solid rgba(196,100,40,0.2)' }}>
            <TabNotationDisplay
              notes={[
                { string: 1, fret: 0,  beat: 1, noteName: 'G3' },
                { string: 2, fret: 2,  beat: 2, noteName: 'B3' },
                { string: 3, fret: 2,  beat: 3, noteName: 'B3' },
                { string: 4, fret: 0,  beat: 4, noteName: 'E3' },
              ]}
              strings={4}
              tuning={['E', 'A', 'D', 'G']}
            />
          </div>
        </section>

        {/* Back link */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <a
            href="#home"
            onClick={() => window.history.back()}
            style={{ color: '#A0785A', fontSize: 13, textDecoration: 'none' }}
          >
            ← Back to home
          </a>
        </div>

      </div>
    </div>
  );
}

// ─── Home screen ────────────────────────────────────────────────────────────
function Home() {
  return (
    <div id="oa-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #oa-root {
          height: 100%;
          background: #120A04;
          color: #F5E8D8;
          font-family: Georgia, 'Times New Roman', serif;
          overflow: hidden;
        }
        #oa-root {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 100vh;
          padding: env(safe-area-inset-top) env(safe-area-inset-right)
                   env(safe-area-inset-bottom) env(safe-area-inset-left);
        }
        .home-logo { font-size: 72px; margin-bottom: 16px;
          filter: drop-shadow(0 4px 16px rgba(196,100,40,0.5)); }
        .home-title {
          font-size: 28px; font-weight: 800; letter-spacing: -0.02em;
          background: linear-gradient(135deg,#E8833A,#F5A65B,#C46428,#F5A65B);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; margin-bottom: 6px; text-align: center; }
        .home-subtitle { font-size: 14px; color: #A0785A; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 48px; text-align: center; }
        .coming-soon-card { background: rgba(42,18,8,0.9);
          border: 1px solid rgba(196,100,40,0.25); border-radius: 20px;
          padding: 28px 32px; max-width: 320px; text-align: center; }
        .coming-soon-card h2 { font-size: 18px; color: #E8833A;
          margin-bottom: 10px; font-weight: 700; }
        .coming-soon-card p { font-size: 14px; color: #A0785A; line-height: 1.6; }
        .badge-row { display: flex; gap: 8px; justify-content: center; margin-top: 20px; }
        .badge { font-size: 11px; font-weight: 700; padding: 4px 10px;
          border-radius: 20px; letter-spacing: 0.05em; text-transform: uppercase; }
        .badge-guitar { background: rgba(196,100,40,0.18);
          border: 1px solid rgba(196,100,40,0.5); color: #C46428; }
        .badge-sight  { background: rgba(232,131,58,0.18);
          border: 1px solid rgba(232,131,58,0.5); color: #E8833A; }
        .badge-tuner  { background: rgba(123,158,107,0.18);
          border: 1px solid rgba(123,158,107,0.5); color: #7B9E6B; }
        .dev-link { margin-top: 32px; font-size: 12px; color: rgba(160,120,90,0.6);
          text-decoration: none; }
        .dev-link:hover { color: #A0785A; }
      `}</style>

      <div className="home-logo">🎸</div>
      <h1 className="home-title">Guitar Audition Game</h1>
      <p className="home-subtitle">Learn · Tune · Play</p>

      <div className="coming-soon-card">
        <h2>Coming Soon</h2>
        <p>
          Sight-read standard notation on guitar.
          Real-time pitch detection, chromatic tuner,
          metronome, and fingerboard diagrams —
          built for EADGBE standard tuning.
        </p>
        <div className="badge-row">
          <span className="badge badge-guitar">Guitar</span>
          <span className="badge badge-sight">Sight-Read</span>
          <span className="badge badge-tuner">Tuner</span>
        </div>
      </div>

      <a className="dev-link" href="#song-learn" style={{ display: 'block', marginBottom: 6 }}>
        🎵 Song learn engine →
      </a>
      <a className="dev-link" href="#tab-test">
        🛠 Tab notation test →
      </a>
    </div>
  );
}

// ─── Root — hash-based routing ───────────────────────────────────────────────
export default function App() {
  const [hash, setHash] = React.useState(window.location.hash);

  React.useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (hash === '#tab-test')   return <TabTest />;
  if (hash === '#song-learn') return <SongLearnEngine song={TWINKLE_SONG} />;
  return <Home />;
}
