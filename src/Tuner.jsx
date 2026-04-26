/**
 * Tuner.jsx — Shared reusable chromatic tuner component
 *
 * Props:
 *   strings  Array<{ label: string, freq: number }>
 *            Open-string targets, low → high.
 *            e.g. guitar EADGBE: [
 *              { label:'E', freq:82.41 }, { label:'A', freq:110.00 },
 *              { label:'D', freq:146.83 }, { label:'G', freq:196.00 },
 *              { label:'B', freq:246.94 }, { label:'e', freq:329.63 }
 *            ]
 *
 *   theme    { bg, card, amber, accent }
 *            Colour tokens for the instrument's visual theme.
 *            e.g. guitar: { bg:'#120A04', card:'#2A1208', amber:'#E8A050', accent:'#C4603A' }
 *
 * Architecture: DOM-based (document.getElementById + useEffect), matching the
 * mandolin/violin implementations. No React state — all updates go directly
 * to the DOM inside the RAF loop.
 */

import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';

// Fixed palette for string indicator circles (cycles if > 6 strings)
const STR_COLORS = ['#C46428','#E8833A','#F5A65B','#A0785A','#86efac','#c4b5fd'];

// Chromatic scale from E2 (82 Hz) to C6 — covers guitar, mandolin, and violin
const CHROM_FREQS = [
  {note:'E2', freq:82.41},  {note:'F2', freq:87.31},  {note:'F#2',freq:92.50},
  {note:'G2', freq:98.00},  {note:'G#2',freq:103.83}, {note:'A2', freq:110.00},
  {note:'A#2',freq:116.54}, {note:'B2', freq:123.47}, {note:'C3', freq:130.81},
  {note:'C#3',freq:138.59}, {note:'D3', freq:146.83}, {note:'D#3',freq:155.56},
  {note:'E3', freq:164.81}, {note:'F3', freq:174.61}, {note:'F#3',freq:185.00},
  {note:'G3', freq:196.00}, {note:'G#3',freq:207.65}, {note:'A3', freq:220.00},
  {note:'A#3',freq:233.08}, {note:'B3', freq:246.94}, {note:'C4', freq:261.63},
  {note:'C#4',freq:277.18}, {note:'D4', freq:293.66}, {note:'D#4',freq:311.13},
  {note:'E4', freq:329.63}, {note:'F4', freq:349.23}, {note:'F#4',freq:369.99},
  {note:'G4', freq:392.00}, {note:'G#4',freq:415.30}, {note:'A4', freq:440.00},
  {note:'A#4',freq:466.16}, {note:'B4', freq:493.88}, {note:'C5', freq:523.25},
  {note:'C#5',freq:554.37}, {note:'D5', freq:587.33}, {note:'D#5',freq:622.25},
  {note:'E5', freq:659.25}, {note:'F5', freq:698.46}, {note:'F#5',freq:739.99},
  {note:'G5', freq:784.00}, {note:'G#5',freq:830.61}, {note:'A5', freq:880.00},
  {note:'A#5',freq:932.33}, {note:'B5', freq:987.77}, {note:'C6', freq:1046.50},
];

export default function Tuner({ strings = [], theme = {}, title = 'Tune Your Instrument' }) {
  const [started, setStarted] = useState(false);
  const [airpodsWarning, setAirpodsWarning] = useState(false);
  const setAirpodsWarningRef = React.useRef(setAirpodsWarning);
  React.useEffect(() => { setAirpodsWarningRef.current = setAirpodsWarning; });
  const T = {
    bg:     theme.bg     || '#120A04',
    card:   theme.card   || '#2A1208',
    amber:  theme.amber  || '#E8A050',
    accent: theme.accent || '#C4603A',
  };

  useEffect(() => {
    if (!started) return;

    // Capture prop values at mount time for the DOM-based logic
    var strArr = strings;  // [{ label, freq }]

    // Build indexed colour list matching strArr
    var strColors = strArr.map(function (_, i) { return STR_COLORS[i % STR_COLORS.length]; });

    // ── Audio context ──────────────────────────────────────
    var sharedCtx = null;
    function getCtx() {
      if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (sharedCtx.state === 'suspended') sharedCtx.resume();
      return sharedCtx;
    }

    // ── Mic / analyser state ───────────────────────────────
    var IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var RMS_THRESHOLD = IS_IOS ? 0.010 : 0.015;
    var analyser = null, micStream = null, micGranted = false;
    var tunerActive = false, tunerAnalyser = null, tunerFrame = null;

    // ── Build string indicator circles ─────────────────────
    function buildTunerStrings() {
      var row = document.getElementById('gt-strings');
      if (!row) return;
      row.innerHTML = '';
      strArr.forEach(function (s, i) {
        var div = document.createElement('div');
        div.className = 'gt-str';
        div.id = 'gtstr-' + i;
        var freqStr = s.freq < 100 ? s.freq.toFixed(2) : s.freq.toFixed(0);
        div.innerHTML =
          '<span class="gt-ts-letter" style="color:' + strColors[i] + '">' + s.label + '</span>' +
          '<span class="gt-ts-freq">' + freqStr + 'Hz</span>';
        row.appendChild(div);
      });
    }

    // ── Pitch detection (autocorrelation) ──────────────────
    // Range derived from the lowest/highest string frequencies
    function detectPitch(buf, sr) {
      var SIZE = buf.length, MAX = Math.floor(SIZE / 2), rms = 0;
      for (var i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / SIZE);
      if (rms < RMS_THRESHOLD) return { freq: -1, rms: rms };

      var minFreq = strArr.reduce(function (m, s) { return Math.min(m, s.freq); }, 80);
      var maxFreq = Math.max(strArr.reduce(function (m, s) { return Math.max(m, s.freq); }, 1400) * 4, 1400);
      var minOff = Math.floor(sr / maxFreq);
      var maxOff = Math.floor(sr / (minFreq * 0.85)); // 15% headroom below lowest string
      var best = -1, bestCorr = 0.70, lastCorr = 1;
      for (var off = minOff; off < maxOff && off + MAX < buf.length; off++) {
        var c = 0;
        for (var j = 0; j < MAX; j++) c += Math.abs(buf[j] - buf[j + off]);
        c = 1 - c / MAX;
        if (c > bestCorr && c > lastCorr) { bestCorr = c; best = off; }
        lastCorr = c;
      }
      return { freq: best !== -1 ? sr / best : -1, rms: rms };
    }

    // ── Mic access ─────────────────────────────────────────
    function startMic() {
      if (micGranted) return Promise.resolve();
      var iosExtra = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 };
      var firstConstraints = IS_IOS ? { audio: iosExtra } : { audio: true };

      function doConnect(stream) {
        micStream = stream;
        var ctx = getCtx();
        analyser = ctx.createAnalyser();
        analyser.fftSize = IS_IOS ? 8192 : 4096;
        analyser.smoothingTimeConstant = 0.0;
        ctx.createMediaStreamSource(stream).connect(analyser);
        micGranted = true;
        tunerAnalyser = analyser;
        var micBtn = document.getElementById('gt-mic-btn');
        if (micBtn) micBtn.style.display = 'none';
      }

      return navigator.mediaDevices.getUserMedia(firstConstraints)
        .then(doConnect)
        .catch(function (e) {
          console.warn('Tuner mic error:', e);
          if (e.name === 'NotReadableError' || e.name === 'AbortError') {
            // AirPods/Bluetooth mic busy — show warning and try explicit default device
            setAirpodsWarningRef.current(true);
            var fallbackConstraints = IS_IOS
              ? { audio: Object.assign({ deviceId: 'default' }, iosExtra) }
              : { audio: { deviceId: 'default' } };
            return navigator.mediaDevices.getUserMedia(fallbackConstraints)
              .then(doConnect)
              .catch(function (e2) { console.warn('Tuner mic fallback error:', e2); });
          }
        });
    }

    // ── Needle colour zones ────────────────────────────────
    function tunerColor(cents) {
      var a = Math.abs(cents);
      if (a <= 5)  return { col: '#7B9E6B', zone: 'In Tune!' };
      if (a <= 10) return { col: '#86efac', zone: cents < 0 ? 'Slightly Flat' : 'Slightly Sharp' };
      if (a <= 20) return { col: '#fbbf24', zone: cents < 0 ? 'Tune Up' : 'Tune Down' };
      if (a <= 35) return { col: '#C4603A', zone: cents < 0 ? 'Too Flat' : 'Too Sharp' };
      return { col: '#C4603A', zone: cents < 0 ? 'Very Flat' : 'Very Sharp' };
    }

    // ── Update gauge / needle / arc ────────────────────────
    function setNeedle(clamp, best, freq, cents, faded) {
      var cc = tunerColor(cents !== null ? cents : clamp);
      var col = faded ? 'rgba(255,255,255,0.3)' : cc.col;
      var deg = clamp / 50 * 90;
      var needle     = document.getElementById('gt-needle');
      var needlePoly = document.getElementById('gt-needle-poly');
      var centerNote = document.getElementById('gt-center-note');
      var activeArc  = document.getElementById('gt-active-arc');
      var status     = document.getElementById('gt-status');
      var targetEl   = document.getElementById('gt-target');
      var detectedEl = document.getElementById('gt-detected');

      if (needle)     needle.style.transform = 'rotate(' + deg + 'deg)';
      if (needlePoly) needlePoly.style.fill = col;
      if (centerNote) { centerNote.textContent = best.note; centerNote.style.fill = col; }

      var cx = 150, cy = 165, r = 132;
      function p2c(a) {
        var rad = (a - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
      }
      var s = p2c(0), e = p2c(deg), sw = deg >= 0 ? 1 : 0;
      if (activeArc) {
        activeArc.setAttribute('d',
          'M ' + s.x.toFixed(1) + ' ' + s.y.toFixed(1) +
          ' A ' + r + ' ' + r + ' 0 0 ' + sw + ' ' +
          e.x.toFixed(1) + ' ' + e.y.toFixed(1));
        activeArc.setAttribute('stroke', col);
        activeArc.setAttribute('opacity', faded ? '0.4' : '1');
      }
      if (!faded) {
        if (targetEl)   targetEl.textContent   = 'Target: ' + best.freq.toFixed(2) + ' Hz';
        if (detectedEl) detectedEl.textContent = 'Detected: ' + freq.toFixed(1) + ' Hz';
        if (status)     { status.textContent = cc.zone; status.style.color = col; }
      }
      // Highlight whichever string is nearest to the detected pitch
      strArr.forEach(function (s, i) {
        var el = document.getElementById('gtstr-' + i);
        if (!el) return;
        var on = !faded && freq >= s.freq * 0.90 && freq <= s.freq * 1.35;
        el.classList.toggle('active', on);
        el.style.background = on ? strColors[i] + '33' : 'rgba(0,0,0,0.25)';
      });
    }

    // ── Reset to idle ──────────────────────────────────────
    function resetTuner() {
      var needle     = document.getElementById('gt-needle');
      var centerNote = document.getElementById('gt-center-note');
      var activeArc  = document.getElementById('gt-active-arc');
      var needlePoly = document.getElementById('gt-needle-poly');
      var status     = document.getElementById('gt-status');
      var targetEl   = document.getElementById('gt-target');
      var detectedEl = document.getElementById('gt-detected');

      if (needle)     needle.style.transform = 'rotate(0deg)';
      if (centerNote) { centerNote.textContent = '--'; centerNote.style.fill = 'rgba(255,255,255,0.25)'; }
      if (activeArc)  activeArc.setAttribute('opacity', '0');
      if (needlePoly) needlePoly.style.fill = 'rgba(255,255,255,0.5)';
      if (targetEl)   targetEl.textContent   = 'Target: --';
      if (detectedEl) detectedEl.textContent = 'Detected: --';
      if (status)     { status.textContent = 'Play a string to begin tuning'; status.style.color = '#fff'; }
      strArr.forEach(function (_, i) {
        var el = document.getElementById('gtstr-' + i);
        if (el) { el.classList.remove('active'); el.style.background = 'rgba(0,0,0,0.25)'; }
      });
    }

    // ── RAF pitch-detection loop ───────────────────────────
    function startTunerLoop() {
      if (!tunerAnalyser && analyser) tunerAnalyser = analyser;
      if (!tunerAnalyser) return;
      tunerActive = true;
      var buf = new Float32Array(tunerAnalyser.fftSize);

      var freqBuf = [], displayClamp = 0, signalTs = 0;
      var holdClamp = 0, holdBest = null, holdFreq = 0, prevActive = false;
      var HOLD_MS = 2500, DECAY_MS = 2000;
      var minDetect = strArr.reduce(function (m, s) { return Math.min(m, s.freq); }, 80) * 0.85;

      function loop() {
        if (!tunerActive) { tunerFrame = null; return; }
        tunerFrame = requestAnimationFrame(loop);
        tunerAnalyser.getFloatTimeDomainData(buf);
        var result = detectPitch(buf, getCtx().sampleRate);
        var freq = result.freq, rms = result.rms;
        var now = performance.now();
        var active = freq > minDetect && rms > RMS_THRESHOLD;

        if (active) {
          if (!prevActive) freqBuf = [];
          prevActive = true;
          signalTs = now;
          freqBuf.push([freq, now]);
          while (freqBuf.length > 1 && now - freqBuf[0][1] > 180) freqBuf.shift();
          var ws = 0, wt = 0;
          freqBuf.forEach(function (e) {
            var w = Math.exp(-(now - e[1]) / 80); ws += e[0] * w; wt += w;
          });
          var sf = wt > 0 ? ws / wt : freq;
          var best = null, minD = Infinity;
          CHROM_FREQS.forEach(function (n) {
            var d = Math.abs(sf - n.freq); if (d < minD) { minD = d; best = n; }
          });
          if (!best) return;
          var cents = 1200 * Math.log2(sf / best.freq);
          var target = Math.max(-50, Math.min(50, cents));
          displayClamp += (target - displayClamp) * 0.18;
          holdClamp = displayClamp; holdBest = best; holdFreq = sf;
          setNeedle(displayClamp, best, sf, Math.round(cents), false);
        } else {
          prevActive = false;
          var elapsed = now - signalTs;
          if (elapsed < HOLD_MS) {
            if (holdBest) setNeedle(displayClamp, holdBest, holdFreq, null, false);
          } else if (elapsed < HOLD_MS + DECAY_MS) {
            var t = (elapsed - HOLD_MS) / DECAY_MS;
            displayClamp = holdClamp * (1 - t);
            if (holdBest) setNeedle(displayClamp, holdBest, holdFreq, null, true);
          } else {
            if (holdBest) resetTuner();
          }
        }
      }
      loop();
    }

    function stopTunerLoop() {
      tunerActive = false;
      if (tunerFrame) { cancelAnimationFrame(tunerFrame); tunerFrame = null; }
    }

    // ── Init ──────────────────────────────────────────────
    buildTunerStrings();

    var micBtn = document.getElementById('gt-mic-btn');
    if (micBtn) micBtn.addEventListener('click', function () {
      startMic().then(function () { startTunerLoop(); });
    });
    var closeBtn = document.getElementById('gt-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      window.location.hash = '';
    });

    // ── Cleanup ────────────────────────────────────────────
    return function () {
      stopTunerLoop();
      if (micStream) micStream.getTracks().forEach(function (t) { t.stop(); });
      if (sharedCtx) sharedCtx.close().catch(function () {});
    };
  }, [started]); // eslint-disable-line

  if (!started) return (
    <LandingPage
      emoji="🎸"
      title="Guitar Tuner"
      description="Keep your guitar in perfect pitch. Chromatic tuner detects all 6 strings in real time. Essential before every practice session."
      difficulty="Beginner"
      features={['Detects all 6 strings (EADGBE)', 'Real-time chromatic pitch detection', 'Visual needle + sharp/flat indicator']}
      onStart={() => setStarted(true)}
      onBack={() => { window.location.hash = ''; }}
    />
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: '#F5E8D8',
      fontFamily: "Georgia, 'Times New Roman', serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 16px 40px', overflowY: 'auto',
    }}>
      <style>{`
        .gt-str {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; border: 2px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.25); transition: all 0.15s;
        }
        .gt-str.active { transform: scale(1.15); border-color: rgba(255,255,255,0.4); }
        .gt-ts-letter  { font-size: 15px; font-weight: 700; line-height: 1; }
        .gt-ts-freq    { font-size: 7px; color: rgba(255,255,255,0.4); margin-top: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 390, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <button
          onClick={() => { window.location.hash = ''; }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 11px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, serif",
          }}
        >← Back</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, color: T.amber }}>
          🎸 Tuner
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 15, fontWeight: 900, textAlign: 'center', marginBottom: 4, color: '#F5E8D8' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 14, lineHeight: 1.6, fontWeight: 600 }}>
        Play each string and watch the needle.<br />Green means you are in tune.
      </div>

      {/* String circles */}
      <div id="gt-strings" style={{ display: 'flex', gap: 7, justifyContent: 'center', margin: '0 0 14px', flexWrap: 'wrap' }} />

      {/* Gauge SVG */}
      <div style={{ position: 'relative', width: 300, height: 180, margin: '0 auto' }}>
        <svg width="300" height="175" viewBox="0 0 300 175" xmlns="http://www.w3.org/2000/svg">
          <path d="M 18 165 A 132 132 0 0 1 282 165" fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth="20" strokeLinecap="round"/>
          <path id="gt-active-arc" d="M 150 13 A 132 132 0 0 1 182 13" fill="none"
            stroke={T.accent} strokeWidth="20" strokeLinecap="round" opacity="0"/>
          <line x1="150" y1="12"  x2="150" y2="30"  stroke="rgba(255,255,255,0.6)"  strokeWidth="2.5"/>
          <line x1="83"  y1="33"  x2="91"  y2="45"  stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
          <line x1="217" y1="33"  x2="209" y2="45"  stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
          <line x1="52"  y1="65"  x2="62"  y2="74"  stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
          <line x1="248" y1="65"  x2="238" y2="74"  stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
          <text x="8"   y="148" fontSize="22" fill={T.accent} fontFamily="Georgia" fontStyle="italic" textAnchor="middle">b</text>
          <text x="8"   y="168" fontSize="9"  fill="rgba(255,255,255,0.3)" fontFamily="Georgia" textAnchor="middle">FLAT</text>
          <text x="292" y="148" fontSize="22" fill={T.accent} fontFamily="Georgia" textAnchor="middle">#</text>
          <text x="292" y="168" fontSize="9"  fill="rgba(255,255,255,0.3)" fontFamily="Georgia" textAnchor="middle">SHARP</text>
          <g id="gt-needle" style={{ transformOrigin:'150px 165px', transform:'rotate(0deg)', transition:'transform 0.1s ease-out' }}>
            <polygon points="150,85 142,158 158,158" fill="white" id="gt-needle-poly" opacity="0.95"/>
            <circle cx="150" cy="165" r="10" fill={T.bg} stroke="white" strokeWidth="2.5"/>
            <circle cx="150" cy="165" r="4"  fill="white"/>
          </g>
          <text id="gt-center-note" x="150" y="138" fontSize="44" fontWeight="900"
            fill="rgba(255,255,255,0.25)" fontFamily="Georgia" textAnchor="middle">--</text>
        </svg>
      </div>

      {/* Hz readout */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 4, marginBottom: 8 }}>
        <span id="gt-target"   style={{ fontSize: 12, color: '#fff' }}>Target: --</span>
        <span id="gt-detected" style={{ fontSize: 12, color: '#fff' }}>Detected: --</span>
      </div>

      {/* Status */}
      <div id="gt-status" style={{ fontSize: 14, fontWeight: 800, textAlign: 'center',
        minHeight: 22, color: '#fff', letterSpacing: '0.03em', marginBottom: 14,
        transition: 'color 0.15s' }}>
        Play a string to begin tuning
      </div>

      {/* AirPods warning */}
      {airpodsWarning && (
        <div style={{
          width: '100%', maxWidth: 360, padding: '10px 14px', borderRadius: 10, marginBottom: 10,
          background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)',
          color: '#fca5a5', fontSize: 12, fontWeight: 700, textAlign: 'center',
        }}>
          🎧 For best results with AirPods, use the built-in microphone.<br />
          <span style={{ fontWeight: 400, opacity: 0.85 }}>
            Settings → Bluetooth → [your AirPods] → Microphone → Always Left AirPod or Always Right AirPod, then return here.
          </span><br />
          <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 11 }}>
            This is a Bluetooth hardware limitation — AirPods mics are optimized for calls, not tuning.
          </span>
        </div>
      )}

      {/* Mic button */}
      <button id="gt-mic-btn" style={{
        width: '100%', maxWidth: 360, padding: 10, borderRadius: 12,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
        fontFamily: "Georgia, serif", marginBottom: 8,
      }}>Enable Microphone</button>

      {/* Done */}
      <button id="gt-close-btn" style={{
        width: '100%', maxWidth: 360, padding: 12, borderRadius: 14,
        background: 'rgba(123,158,107,0.15)', border: '1px solid rgba(123,158,107,0.4)',
        color: '#7B9E6B', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', fontFamily: "Georgia, serif",
      }}>Done — Back to Home</button>
    </div>
  );
}
