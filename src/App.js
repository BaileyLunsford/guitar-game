// Guitar Audition Game — App.js
// Bundle ID: com.orchestraaudition.guitar
// Theme: warm wood / mahogany

import React from 'react';

// ─── Colour palette ────────────────────────────────────────────────────────
// Background:   #120A04  very dark mahogany
// Surface:      #2A1208  dark wood panel
// Border:       rgba(196,100,40,0.2)  mahogany edge
// Primary:      #C46428  warm mahogany
// Accent:       #E8833A  bright wood
// Highlight:    #F5A65B  light grain
// Muted text:   #A0785A  worn wood
// Green ok:     #7B9E6B  same as mandolin
// Red fail:     #C4603A  same as mandolin

function App() {
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
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: env(safe-area-inset-top) env(safe-area-inset-right)
                   env(safe-area-inset-bottom) env(safe-area-inset-left);
        }

        .home-logo {
          font-size: 72px;
          margin-bottom: 16px;
          filter: drop-shadow(0 4px 16px rgba(196,100,40,0.5));
        }

        .home-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #E8833A, #F5A65B, #C46428, #F5A65B);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 6px;
          text-align: center;
        }

        .home-subtitle {
          font-size: 14px;
          color: #A0785A;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 48px;
          text-align: center;
        }

        .coming-soon-card {
          background: rgba(42,18,8,0.9);
          border: 1px solid rgba(196,100,40,0.25);
          border-radius: 20px;
          padding: 28px 32px;
          max-width: 320px;
          text-align: center;
        }

        .coming-soon-card h2 {
          font-size: 18px;
          color: #E8833A;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .coming-soon-card p {
          font-size: 14px;
          color: #A0785A;
          line-height: 1.6;
        }

        .badge-row {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 20px;
        }

        .badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .badge-guitar  { background: rgba(196,100,40,0.18); border: 1px solid rgba(196,100,40,0.5); color: #C46428; }
        .badge-sight   { background: rgba(232,131,58,0.18); border: 1px solid rgba(232,131,58,0.5); color: #E8833A; }
        .badge-tuner   { background: rgba(123,158,107,0.18); border: 1px solid rgba(123,158,107,0.5); color: #7B9E6B; }
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
    </div>
  );
}

export default App;
