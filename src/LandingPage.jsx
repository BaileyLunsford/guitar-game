import React from 'react';

const BADGE = {
  Beginner:     { bg: 'rgba(123,158,107,0.15)', border: 'rgba(123,158,107,0.45)', color: '#7B9E6B' },
  Intermediate: { bg: 'rgba(232,160,80,0.15)',  border: 'rgba(232,160,80,0.45)',  color: '#E8A050' },
  Advanced:     { bg: 'rgba(196,96,58,0.15)',   border: 'rgba(196,96,58,0.5)',    color: '#C4603A' },
};

export default function LandingPage({ emoji, title, description, difficulty, onStart, onBack, features }) {
  const badge = BADGE[difficulty] || BADGE.Beginner;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#120A04',
      color: '#F5E8D8',
      fontFamily: "Georgia, 'Times New Roman', serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>

      {/* Emoji */}
      <div style={{
        fontSize: 72,
        lineHeight: 1,
        marginBottom: 24,
        filter: 'drop-shadow(0 4px 24px rgba(196,100,40,0.55))',
      }}>
        {emoji}
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        marginBottom: 20,
        textAlign: 'center',
        background: 'linear-gradient(135deg,#E8833A,#F5A65B,#C46428,#F5A65B)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {title}
      </h1>

      {/* Description panel */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: '#2A1208',
        border: '1px solid rgba(196,100,40,0.22)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: features && features.length ? 16 : 20,
        fontSize: 14,
        lineHeight: 1.75,
        color: '#D4B896',
        textAlign: 'center',
      }}>
        {description}
      </div>

      {/* Optional feature bullets */}
      {features && features.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: 360,
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: '#A0785A',
            }}>
              <span style={{ color: '#C46428', fontWeight: 800, fontSize: 16 }}>✦</span>
              {f}
            </div>
          ))}
        </div>
      )}

      {/* Difficulty badge */}
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '5px 14px',
        borderRadius: 20,
        marginBottom: 32,
        background: badge.bg,
        border: `1px solid ${badge.border}`,
        color: badge.color,
      }}>
        {difficulty}
      </div>

      {/* Get Started button */}
      <button
        onClick={onStart}
        style={{
          width: '100%',
          maxWidth: 360,
          padding: '16px',
          borderRadius: 14,
          border: 'none',
          background: 'linear-gradient(135deg,#C46428,#E8833A)',
          color: '#fff',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 17,
          fontWeight: 800,
          cursor: 'pointer',
          marginBottom: 20,
          boxShadow: '0 4px 20px rgba(196,100,40,0.4)',
          letterSpacing: '-0.01em',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Get Started →
      </button>

      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 13,
          cursor: 'pointer',
          padding: '8px 0',
          letterSpacing: '0.02em',
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}
