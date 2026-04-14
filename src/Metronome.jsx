/**
 * Metronome.jsx — Shared reusable metronome component
 *
 * Props:
 *   theme  { bg, card, amber, accent }
 *          Colour tokens for the instrument's visual theme.
 *          e.g. guitar: { bg:'#120A04', card:'#2A1208', amber:'#E8A050', accent:'#C4603A' }
 *
 * Architecture: DOM-based (document.getElementById + useEffect), matching the
 * mandolin/violin implementations. No React state — all updates go directly to the DOM.
 *
 * Features:
 *   - BPM slider (30–200) + large display
 *   - BPM presets: 40 / 60 / 80 / 100 / 120 / 160
 *   - Time signature: 4/4 / 3/4 / 6/8
 *   - Tap tempo (up to 8 taps, 3 s window)
 *   - Visual beat circles (accent beat 1)
 *   - AudioContext sine-click (high pitch on beat 1)
 *   - Link to Tuner screen (#tuner)
 *   - Exit → home (#)
 */

import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';

export default function Metronome({ theme = {}, title = 'Metronome' }) {
  const [started, setStarted] = useState(false);
  const T = {
    bg:     theme.bg     || '#120A04',
    card:   theme.card   || '#2A1208',
    amber:  theme.amber  || '#E8A050',
    accent: theme.accent || '#C4603A',
  };

  if (!started) return (
    <LandingPage
      emoji="⏱"
      title="Metronome"
      description="Build rock-solid timing and rhythm. Set your BPM, tap tempo, and practice with subdivisions. The foundation of all great playing."
      difficulty="Beginner"
      features={['Tap tempo with 3-second window', 'Time signatures: 4/4, 3/4, 6/8', 'Visual beat circles with accent on beat 1']}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  useEffect(() => {

    // ── Audio context ──────────────────────────────────────
    var sharedCtx = null;
    function getCtx() {
      if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (sharedCtx.state === 'suspended') sharedCtx.resume();
      return sharedCtx;
    }

    // ── State ──────────────────────────────────────────────
    var smBpm = 60, smBeats = 4, smBeat = 0, smPlaying = false, smInterval = null;
    var tapTimes = [], smLastTap = 0;

    // ── Build beat circles ─────────────────────────────────
    function smBuildBeats() {
      var display = document.getElementById('gm-beat-display');
      if (!display) return;
      display.innerHTML = '';
      for (var i = 0; i < smBeats; i++) {
        var d = document.createElement('div');
        d.className = 'gm-circle ' + (i === 0 ? 'beat1' : 'beat-other');
        d.id = 'gm-circle-' + i;
        display.appendChild(d);
      }
    }

    // ── BPM update ─────────────────────────────────────────
    function smUpdateBpm(val) {
      smBpm = Math.max(30, Math.min(200, parseInt(val)));
      var disp = document.getElementById('gm-bpm-display');
      var slider = document.getElementById('gm-slider');
      if (disp)   disp.textContent = smBpm;
      if (slider) slider.value = smBpm;
      if (smPlaying) { smStop(); smStart(); }
    }

    // ── Click sound ────────────────────────────────────────
    function playClick(isHigh) {
      var ctx = getCtx();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = isHigh ? 1200 : 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(isHigh ? 0.5 : 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.07);
    }

    // ── Animate + click one beat ───────────────────────────
    function smFireBeat() {
      playClick(smBeat === 0);
      for (var i = 0; i < smBeats; i++) {
        var c = document.getElementById('gm-circle-' + i);
        if (!c) continue;
        if (i === smBeat) {
          c.classList.add('active');
          (function (el) {
            setTimeout(function () { el.classList.remove('active'); }, (60 / smBpm) * 800);
          }(c));
        } else {
          c.classList.remove('active');
        }
      }
    }

    // ── Start / Stop ───────────────────────────────────────
    function smStart() {
      smPlaying = true; smBeat = 0;
      var btn = document.getElementById('gm-start-btn');
      if (btn) { btn.textContent = '⏹ Stop'; btn.className = 'gm-start-btn gm-playing'; }
      smBuildBeats();
      smFireBeat();
      smInterval = setInterval(function () {
        smBeat = (smBeat + 1) % smBeats;
        smFireBeat();
      }, (60 / smBpm) * 1000);
    }

    function smStop() {
      smPlaying = false;
      if (smInterval) { clearInterval(smInterval); smInterval = null; }
      var btn = document.getElementById('gm-start-btn');
      if (btn) { btn.textContent = '▶ Start'; btn.className = 'gm-start-btn gm-stopped'; }
      for (var i = 0; i < smBeats; i++) {
        var c = document.getElementById('gm-circle-' + i);
        if (c) c.classList.remove('active');
      }
    }

    // ── Init ──────────────────────────────────────────────
    smBuildBeats();

    // Time signature
    document.querySelectorAll('.gm-timesig-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        smBeats = parseInt(btn.dataset.beats);
        document.querySelectorAll('.gm-timesig-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        smBuildBeats();
        if (smPlaying) { smStop(); smStart(); }
      });
    });

    // Slider
    var slider = document.getElementById('gm-slider');
    if (slider) slider.addEventListener('input', function (e) { smUpdateBpm(e.target.value); });

    // Presets
    document.querySelectorAll('.gm-preset').forEach(function (btn) {
      btn.addEventListener('click', function () { smUpdateBpm(btn.dataset.bpm); });
    });

    // Start / stop button
    var startBtn = document.getElementById('gm-start-btn');
    if (startBtn) startBtn.addEventListener('click', function () {
      if (smPlaying) smStop(); else smStart();
    });

    // Tap tempo
    var tapBtn = document.getElementById('gm-tap-btn');
    if (tapBtn) tapBtn.addEventListener('click', function () {
      var now = Date.now();
      if (now - smLastTap > 3000) tapTimes = [];
      smLastTap = now;
      tapTimes.push(now);
      if (tapTimes.length > 4) tapTimes = tapTimes.slice(-4);
      if (tapTimes.length >= 2) {
        var intervals = [];
        for (var i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
        var avg = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
        smUpdateBpm(Math.round(60000 / avg));
      }
      this.style.background = 'rgba(199,125,255,0.35)';
      var self = this;
      setTimeout(function () { self.style.background = 'rgba(199,125,255,0.12)'; }, 100);
    });

    // BPM ±1 buttons
    var minusBtn = document.getElementById('gm-bpm-minus');
    var plusBtn  = document.getElementById('gm-bpm-plus');
    if (minusBtn) minusBtn.addEventListener('click', function () { smUpdateBpm(smBpm - 1); });
    if (plusBtn)  plusBtn.addEventListener('click',  function () { smUpdateBpm(smBpm + 1); });

    // Tuner link
    var tunerLink = document.getElementById('gm-tuner-link');
    if (tunerLink) tunerLink.addEventListener('click', function () {
      if (smPlaying) smStop();
      window.location.hash = '#tuner';
    });

    // Exit
    var exitBtn = document.getElementById('gm-exit-btn');
    if (exitBtn) exitBtn.addEventListener('click', function () {
      if (smPlaying) smStop();
      window.location.hash = '';
    });

    // ── Cleanup ────────────────────────────────────────────
    return function () {
      if (smPlaying) smStop();
      if (sharedCtx) sharedCtx.close().catch(function () {});
    };
  }, [started]); // eslint-disable-line

  // ── CSS vars derived from theme ────────────────────────────
  const css = `
    .gm-circle {
      border-radius: 50%; transition: transform 0.05s, background 0.05s, box-shadow 0.05s;
    }
    .gm-circle.beat1 {
      width: 64px; height: 64px;
      background: rgba(196,100,40,0.15); border: 2px solid ${T.accent}66;
    }
    .gm-circle.beat-other {
      width: 44px; height: 44px;
      background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.14);
    }
    .gm-circle.active.beat1 {
      background: ${T.accent}; box-shadow: 0 0 30px ${T.accent}bb; transform: scale(1.15);
    }
    .gm-circle.active.beat-other {
      background: rgba(255,255,255,0.75); box-shadow: 0 0 15px rgba(255,255,255,0.4); transform: scale(1.1);
    }
    .gm-start-btn {
      width: 100%; max-width: 390px; padding: 18px; border-radius: 18px;
      font-size: 18px; font-weight: 900; cursor: pointer;
      font-family: Georgia, serif; border: none; transition: all 0.2s;
      letter-spacing: 0.05em;
    }
    .gm-playing { background: linear-gradient(135deg, ${T.accent}, ${T.accent}); color: #fff; box-shadow: 0 0 30px ${T.accent}66; }
    .gm-stopped { background: linear-gradient(135deg, #7B9E6B, ${T.amber}); color: #000; box-shadow: 0 0 20px rgba(123,158,107,0.3); }
    .gm-timesig-btn {
      padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: Georgia, serif;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.5); transition: all 0.15s;
    }
    .gm-timesig-btn.selected { background: ${T.amber}26; border-color: ${T.amber}; color: ${T.amber}; }
    .gm-preset {
      padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: Georgia, serif; border: 1px solid; transition: all 0.15s;
    }
    .gm-slider {
      width: 100%; -webkit-appearance: none; appearance: none; height: 10px; border-radius: 5px;
      background: linear-gradient(90deg, #7B9E6B, #fbbf24, ${T.accent}, ${T.accent}); outline: none; cursor: pointer;
    }
    .gm-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%;
      background: #fff; cursor: pointer; border: 3px solid ${T.card};
      box-shadow: 0 0 10px rgba(255,255,255,0.5);
    }
    .gm-tap-btn {
      width: 100%; max-width: 390px; padding: 14px; border-radius: 14px;
      background: rgba(199,125,255,0.12); border: 2px solid rgba(199,125,255,0.4);
      color: #c77dff; font-size: 15px; font-weight: 800; cursor: pointer;
      font-family: Georgia, serif; transition: all 0.1s;
    }
    .gm-tap-btn:active { transform: scale(0.96); }
    .gm-tuner-link {
      width: 100%; max-width: 390px; padding: 11px; border-radius: 12px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      color: ${T.amber}; font-size: 13px; font-weight: 700; cursor: pointer;
      font-family: Georgia, serif; display: flex; align-items: center;
      justify-content: center; gap: 8px;
    }
  `;

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: '#F5E8D8',
      fontFamily: "Georgia, 'Times New Roman', serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 16px 40px', overflowY: 'auto',
    }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 390, display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button id="gm-exit-btn" style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 11px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, serif",
        }}>Exit</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, color: T.accent }}>
          🥁 {title}
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Beat circles */}
      <div id="gm-beat-display" style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', margin: '8px 0 16px' }} />

      {/* BPM display with ±1 buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
        <button id="gm-bpm-minus" style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.7)', fontSize: 22, fontWeight: 900,
          cursor: 'pointer', fontFamily: 'Georgia, serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, flexShrink: 0,
        }}>−</button>
        <div style={{ textAlign: 'center' }}>
          <div id="gm-bpm-display" style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>
            60
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginTop: -8 }}>BPM</div>
        </div>
        <button id="gm-bpm-plus" style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.7)', fontSize: 22, fontWeight: 900,
          cursor: 'pointer', fontFamily: 'Georgia, serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, flexShrink: 0,
        }}>+</button>
      </div>

      {/* Slider */}
      <div style={{ width: '100%', maxWidth: 390, marginBottom: 16 }}>
        <input type="range" id="gm-slider" className="gm-slider" min="30" max="200" defaultValue="60" />
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16, width: '100%', maxWidth: 390 }}>
        {[
          { bpm: 40,  bg: 'rgba(123,158,107,0.12)', bc: 'rgba(123,158,107,0.4)', col: '#7B9E6B' },
          { bpm: 60,  bg: `rgba(232,160,80,0.12)`,  bc: `rgba(232,160,80,0.4)`,  col: T.amber },
          { bpm: 80,  bg: 'rgba(251,191,36,0.12)',   bc: 'rgba(251,191,36,0.4)',  col: '#fbbf24' },
          { bpm: 100, bg: `rgba(196,96,58,0.12)`,   bc: `rgba(196,96,58,0.4)`,   col: T.accent },
          { bpm: 120, bg: `rgba(196,96,58,0.12)`,   bc: `rgba(196,96,58,0.4)`,   col: T.accent },
          { bpm: 160, bg: `rgba(196,96,58,0.18)`,   bc: `rgba(196,96,58,0.6)`,   col: T.accent },
        ].map(p => (
          <button key={p.bpm} className="gm-preset" data-bpm={p.bpm}
            style={{ background: p.bg, borderColor: p.bc, color: p.col }}>
            {p.bpm}
          </button>
        ))}
      </div>

      {/* Time signature */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textAlign: 'center', marginBottom: 8 }}>
        TIME SIGNATURE
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
        <button className="gm-timesig-btn selected" data-beats="4">4/4</button>
        <button className="gm-timesig-btn" data-beats="3">3/4</button>
        <button className="gm-timesig-btn" data-beats="6">6/8</button>
      </div>

      {/* Tap tempo */}
      <button id="gm-tap-btn" className="gm-tap-btn" style={{ marginBottom: 12 }}>
        👆 Tap Tempo
      </button>

      {/* Start / Stop */}
      <button id="gm-start-btn" className="gm-start-btn gm-stopped" style={{ marginBottom: 16 }}>
        ▶ Start
      </button>

      {/* Tuner link */}
      <button id="gm-tuner-link" className="gm-tuner-link">
        <span>🎚</span><span>Open Tuner</span><span>→</span>
      </button>
    </div>
  );
}
