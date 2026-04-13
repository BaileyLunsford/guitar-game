/**
 * UpgradeModal.jsx — PRO upgrade paywall
 *
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   onPurchase  (plan: 'monthly'|'yearly') => Promise<void>
 *   onRestore   () => boolean
 *   feature     string  optional — e.g. "CAGED System — PRO Feature"
 */

import React, { useState } from 'react';

const M = {
  bg:         '#120A04',
  surface:    '#2A1208',
  panel:      '#1A0C05',
  accent:     '#E8833A',
  hi:         '#F5A65B',
  gold:       '#F5C842',
  muted:      '#A0785A',
  text:       '#F5E8D8',
  border:     'rgba(196,100,40,0.25)',
  borderHi:   'rgba(232,131,58,0.55)',
  borderGold: 'rgba(245,200,66,0.7)',
};

const PRO_FEATURES = [
  'CAGED System — 5 shapes, whole neck',
  'Chord Play — all keys and progressions',
  'Barre Chords — Bb, Cm, Ab, C#m shapes',
  'Lick Play — Rock and Country packs',
  'Triads & Arpeggios (coming soon)',
  'Progress Tracker — charts and history (coming soon)',
];

export default function UpgradeModal({ isOpen, onClose, onPurchase, onRestore, feature }) {
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [noRestore, setNoRestore] = useState(false);
  const [restored,  setRestored]  = useState(false);
  const [selected,  setSelected]  = useState('yearly');

  if (!isOpen) return null;

  async function handlePurchase(plan) {
    if (loading || success) return;
    setSelected(plan);
    setLoading(true);
    try {
      await onPurchase(plan);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setLoading(false); onClose(); }, 1800);
    } catch {
      setLoading(false);
    }
  }

  function handleRestore() {
    if (loading) return;
    const had = onRestore();
    if (had) {
      setRestored(true);
      setTimeout(() => { setRestored(false); onClose(); }, 1000);
    } else {
      setNoRestore(true);
      setTimeout(() => setNoRestore(false), 2500);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '16px',
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: M.panel,
          border: `1px solid ${M.borderHi}`,
          borderRadius: 22,
          padding: '24px 20px 20px',
          boxShadow: '0 12px 60px rgba(196,100,40,0.4)',
          color: M.text,
          maxHeight: '92vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* ✕ close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none',
            color: M.muted, fontSize: 13, cursor: 'pointer',
            fontFamily: "Georgia, serif",
          }}
        >✕ Maybe Later</button>

        {/* Success flash — full-card takeover */}
        {success ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 80, marginBottom: 24,
              filter: 'drop-shadow(0 4px 24px rgba(245,200,66,0.6))',
              animation: 'none',
            }}>🎸</div>
            <div style={{
              fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em',
              marginBottom: 10,
              background: 'linear-gradient(135deg,#F5C842,#E8A838)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>PRO Unlocked!</div>
            <div style={{ fontSize: 14, color: M.muted, marginTop: 4 }}>
              All features are now available.
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 18, paddingTop: 4 }}>
              <div style={{ fontSize: 40, marginBottom: 8,
                filter: 'drop-shadow(0 2px 12px rgba(232,131,58,0.5))' }}>🎸</div>
              <h2 style={{
                fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Go PRO</h2>
              {feature && (
                <div style={{ fontSize: 11, color: M.muted, marginTop: 6, fontStyle: 'italic' }}>
                  {feature}
                </div>
              )}
            </div>

            {/* Plan cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: loading ? 10 : 18 }}>
              {/* Monthly */}
              <button
                onClick={() => handlePurchase('monthly')}
                disabled={loading}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: `1px solid ${selected === 'monthly' ? M.borderHi : M.border}`,
                  background: selected === 'monthly'
                    ? 'rgba(232,131,58,0.14)' : 'rgba(42,18,8,0.6)',
                  color: M.text, textAlign: 'center',
                  transition: 'all 0.15s',
                  fontFamily: "Georgia, serif",
                }}
              >
                <div style={{ fontSize: 10, color: M.muted, marginBottom: 4,
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>Monthly</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: M.hi, lineHeight: 1 }}>$4.99</div>
                <div style={{ fontSize: 9, color: M.muted, marginTop: 5, lineHeight: 1.5 }}>
                  Billed monthly<br/>cancel anytime
                </div>
              </button>

              {/* Yearly — gold highlight */}
              <button
                onClick={() => handlePurchase('yearly')}
                disabled={loading}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: `2px solid ${M.borderGold}`,
                  background: 'rgba(245,200,66,0.07)',
                  color: M.text, textAlign: 'center',
                  transition: 'all 0.15s',
                  fontFamily: "Georgia, serif",
                  boxShadow: '0 0 18px rgba(245,200,66,0.15)',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', top: -10, left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg,#F5C842,#E8A838)',
                  color: '#120A04', fontSize: 9, fontWeight: 900,
                  padding: '2px 9px', borderRadius: 20,
                  letterSpacing: '0.06em', whiteSpace: 'nowrap',
                }}>BEST VALUE</div>
                <div style={{ fontSize: 10, color: M.gold, marginBottom: 4,
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>Yearly</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: M.gold, lineHeight: 1 }}>$49.99</div>
                <div style={{ fontSize: 9, color: M.muted, marginTop: 5, lineHeight: 1.5 }}>
                  Save 17%<br/>Best value
                </div>
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', fontSize: 12, color: M.muted, marginBottom: 14 }}>
                Processing…
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(196,100,40,0.18)', marginBottom: 14 }} />

            {/* PRO features */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: M.muted, marginBottom: 10 }}>
                Everything in PRO
              </div>
              {PRO_FEATURES.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start',
                }}>
                  <span style={{ color: M.accent, fontSize: 10, lineHeight: '1.7', flexShrink: 0 }}>✦</span>
                  <span style={{
                    fontSize: 12, lineHeight: 1.55,
                    color: f.includes('coming soon') ? M.muted : M.text,
                    fontStyle: f.includes('coming soon') ? 'italic' : 'normal',
                  }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Restore */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handleRestore}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: noRestore ? '#f87171' : restored ? '#4ade80' : M.muted,
                  fontSize: 12, fontFamily: "Georgia, serif",
                  transition: 'color 0.2s',
                }}
              >
                {noRestore ? 'No purchase found' : restored ? 'Restored!' : 'Restore Purchases'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
