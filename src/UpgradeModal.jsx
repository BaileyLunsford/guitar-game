/**
 * UpgradeModal.jsx — PRO upgrade prompt
 *
 * Props:
 *   isOpen     boolean
 *   onClose    () => void
 *   onPurchase (productId: string) => Promise<void>
 *   onRestore  () => void
 *   feature    string  e.g. "Key of D — PRO Feature"
 */

import React, { useState } from 'react';

const M = {
  bg:       '#120A04',
  surface:  '#2A1208',
  panel:    '#1E0D06',
  accent:   '#E8833A',
  hi:       '#F5A65B',
  muted:    '#A0785A',
  text:     '#F5E8D8',
  border:   'rgba(196,100,40,0.25)',
  borderHi: 'rgba(232,131,58,0.55)',
};

const PRO_BULLETS = [
  'All chord keys (D, A, E, C)',
  'All scales & pentatonic patterns',
  'Full song library',
  'Lick Play & Lead Play (coming soon)',
];

export default function UpgradeModal({ isOpen, onClose, onPurchase, onRestore, feature }) {
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);

  if (!isOpen) return null;

  async function handlePurchase() {
    if (loading) return;
    setLoading(true);
    try {
      await onPurchase('pro_lifetime');
      // onClose fires naturally because isPro flips true and parent re-renders
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleRestore() {
    if (loading) return;
    const had = onRestore();
    if (had) {
      onClose();
    } else {
      setRestored(true);
      setTimeout(() => setRestored(false), 2500);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '24px 16px',
      }}
    >
      {/* Card — stop propagation so tapping inside doesn't dismiss */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340,
          background: M.panel,
          border: `1px solid ${M.borderHi}`,
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 8px 48px rgba(196,100,40,0.35)',
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: M.text,
        }}
      >
        {/* Lock icon + feature name */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 10, color: M.accent }}>🔒</div>
          <div style={{
            fontSize: 16, fontWeight: 800, marginBottom: 6,
            background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {feature ?? 'PRO Feature'}
          </div>
          <div style={{ fontSize: 12, color: M.muted, lineHeight: 1.6 }}>
            Unlock full access to everything in<br />Guitar Audition Game
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(196,100,40,0.2)', marginBottom: 18 }} />

        {/* What's included */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: M.muted, marginBottom: 10 }}>
            What's included
          </div>
          {PRO_BULLETS.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7,
              alignItems: 'flex-start' }}>
              <span style={{ color: M.accent, fontSize: 11, lineHeight: '1.6', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: 13, color: M.text, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Price callout */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontSize: 32, fontWeight: 900, lineHeight: 1,
            background: 'linear-gradient(135deg,#E8833A,#F5A65B)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>$4.99</div>
          <div style={{ fontSize: 11, color: M.muted, marginTop: 4 }}>
            one-time purchase · no subscription
          </div>
        </div>

        {/* Unlock button */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          style={{
            width: '100%', padding: '13px', borderRadius: 12,
            border: `1px solid ${M.borderHi}`,
            background: loading ? 'rgba(232,131,58,0.1)' : 'rgba(232,131,58,0.22)',
            color: loading ? M.muted : M.hi,
            fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: 10, transition: 'all 0.15s',
          }}
        >
          {loading ? 'Processing…' : 'Unlock PRO — $4.99'}
        </button>

        {/* Restore button */}
        <button
          onClick={handleRestore}
          disabled={loading}
          style={{
            width: '100%', padding: '11px', borderRadius: 12,
            border: `1px solid ${M.border}`,
            background: 'transparent',
            color: restored ? '#4ade80' : M.muted,
            fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 10, transition: 'all 0.15s',
          }}
        >
          {restored ? 'No purchase found' : 'Restore Purchase'}
        </button>

        {/* Maybe Later */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: M.muted, fontSize: 12,
              fontFamily: "Georgia, serif",
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
