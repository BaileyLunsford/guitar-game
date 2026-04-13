/**
 * SettingsModal.jsx — app settings
 *
 * Props:
 *   isOpen           boolean
 *   onClose          () => void
 *   ambOn            boolean
 *   ambToggle        () => void
 *   isPro            boolean
 *   onRestorePurchases () => boolean
 *   onUpgrade        () => void
 *   onReplayTour     () => void   — clears guitar_tour_seen + triggers tour
 */

import React, { useState } from 'react';

const M = {
  bg:       '#120A04',
  surface:  '#2A1208',
  panel:    '#1A0C05',
  accent:   '#E8833A',
  hi:       '#F5A65B',
  gold:     '#F5C842',
  muted:    '#A0785A',
  text:     '#F5E8D8',
  border:   'rgba(196,100,40,0.25)',
  borderHi: 'rgba(232,131,58,0.55)',
};

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: M.muted, marginBottom: 10,
      }}>{label}</div>
      <div style={{
        background: M.surface, borderRadius: 14,
        border: `1px solid ${M.border}`, overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, onPress, chevron = true, valueColor }) {
  return (
    <button
      onClick={onPress}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '14px 16px',
        background: 'none', border: 'none', borderBottom: `1px solid ${M.border}`,
        color: M.text, fontFamily: "Georgia, serif", fontSize: 14,
        cursor: onPress ? 'pointer' : 'default', textAlign: 'left',
      }}
    >
      <span>{label}</span>
      <span style={{ color: valueColor || M.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        {value}
        {chevron && onPress && <span style={{ color: M.border, fontSize: 12 }}>›</span>}
      </span>
    </button>
  );
}

function ToggleRow({ label, on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '14px 16px',
        background: 'none', border: 'none', borderBottom: `1px solid ${M.border}`,
        color: M.text, fontFamily: "Georgia, serif", fontSize: 14,
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span>{label}</span>
      <div style={{
        width: 42, height: 24, borderRadius: 12,
        background: on ? M.accent : 'rgba(255,255,255,0.08)',
        border: `1px solid ${on ? M.accent : M.border}`,
        position: 'relative', transition: 'background 0.2s, border-color 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: 3,
          width: 16, height: 16, borderRadius: '50%',
          background: on ? '#fff' : 'rgba(255,255,255,0.4)',
          transition: 'transform 0.2s, background 0.2s',
          transform: on ? 'translateX(18px)' : 'translateX(0)',
        }} />
      </div>
    </button>
  );
}

export default function SettingsModal({
  isOpen, onClose,
  ambOn, ambToggle,
  isPro, onRestorePurchases, onUpgrade,
  onReplayTour,
}) {
  const [restoreMsg, setRestoreMsg] = useState(null);

  if (!isOpen) return null;

  function handleRestore() {
    const had = onRestorePurchases();
    setRestoreMsg(had ? 'Purchases restored!' : 'No purchase found');
    setTimeout(() => setRestoreMsg(null), 2500);
  }

  function handleUpgrade() {
    onClose();
    setTimeout(onUpgrade, 100);
  }

  function handleReplayTour() {
    onClose();
    setTimeout(onReplayTour, 100);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 2100, padding: '0 0 env(safe-area-inset-bottom,0px)',
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: M.panel,
          borderRadius: '22px 22px 0 0',
          border: `1px solid ${M.borderHi}`,
          borderBottom: 'none',
          padding: '20px 16px 32px',
          boxShadow: '0 -8px 40px rgba(196,100,40,0.3)',
          color: M.text,
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle + title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: M.border, margin: '0 auto 16px',
          }} />
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Settings
          </div>
        </div>

        {/* SOUND */}
        <Section label="Sound">
          <ToggleRow label="🎵 Ambience" on={ambOn} onToggle={ambToggle} />
        </Section>

        {/* ACCOUNT */}
        <Section label="Account">
          {isPro ? (
            <Row label="✅ PRO Active" value="" chevron={false} valueColor={M.gold} />
          ) : (
            <Row
              label="Upgrade to PRO →"
              value=""
              onPress={handleUpgrade}
              valueColor={M.accent}
            />
          )}
          <Row
            label="Restore Purchases"
            value={restoreMsg || ''}
            onPress={handleRestore}
            valueColor={restoreMsg === 'Purchases restored!' ? '#4ade80' : restoreMsg ? '#f87171' : M.muted}
          />
        </Section>

        {/* TOUR */}
        <Section label="Tour">
          <Row label="Replay Tour →" value="" onPress={handleReplayTour} />
        </Section>

        {/* ABOUT */}
        <Section label="About">
          <Row label="Version" value="v1.0" chevron={false} />
          <Row
            label="Privacy Policy"
            value=""
            onPress={() => window.open('https://orchestraaudition.com/privacy', '_blank')}
          />
        </Section>

        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%', marginTop: 8,
            padding: '14px', borderRadius: 14,
            border: `1px solid ${M.border}`,
            background: 'rgba(196,100,40,0.08)',
            color: M.muted, fontFamily: "Georgia, serif",
            fontSize: 15, cursor: 'pointer',
          }}
        >Done</button>
      </div>
    </div>
  );
}
