/**
 * ProgressTracker.jsx
 *
 * Exports:
 *   useProgressTracker()  — hook: session timer + localStorage persistence
 *   StreakBanner          — compact banner for home screen
 *   ProgressTracker       — full dashboard (route #progress)
 *
 * localStorage keys:
 *   guitar_daily_goal         number (minutes)
 *   guitar_session_YYYY-MM-DD number (total minutes that day)
 */

import React, { useState, useEffect, useRef } from 'react';

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
  green:   '#4ade80',
  amber:   '#F5A65B',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayKey() {
  const d = new Date();
  return `guitar_session_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateKey(date) {
  return `guitar_session_${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getGoal() {
  return parseInt(localStorage.getItem('guitar_daily_goal') || '15', 10);
}

function getMinutesForKey(key) {
  return parseFloat(localStorage.getItem(key) || '0');
}

function saveMinutes(key, minutes) {
  localStorage.setItem(key, String(Math.round(minutes * 10) / 10));
}

// Consecutive days (backwards from today) where goal was met
function calcStreak(goal) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const mins = getMinutesForKey(dateKey(d));
    if (mins >= goal) streak++;
    else if (i > 0) break; // today partial is OK, gap breaks streak
  }
  return streak;
}

// Days in current month with practice data
function getMonthData(year, month, goal) {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const mins = getMinutesForKey(dateKey(d));
    return { day: i + 1, mins, status: mins >= goal ? 'met' : mins > 0 ? 'partial' : 'none' };
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgressTracker() {
  const startRef  = useRef(null);   // when current visible session started
  const savedRef  = useRef(0);      // minutes already saved today before this session
  const rafRef    = useRef(null);

  // Load minutes already saved today
  useEffect(() => {
    savedRef.current = getMinutesForKey(todayKey());
  }, []);

  // Page Visibility API — pause/resume timer
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        startRef.current = Date.now();
      } else {
        flush();
      }
    }
    startRef.current = Date.now();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('beforeunload', flush);
    return () => {
      flush();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('beforeunload', flush);
    };
  }, []); // eslint-disable-line

  function flush() {
    if (!startRef.current) return;
    const elapsed = (Date.now() - startRef.current) / 60000; // minutes
    startRef.current = Date.now();
    const key = todayKey();
    const prev = getMinutesForKey(key);
    saveMinutes(key, prev + elapsed);
    savedRef.current = prev + elapsed;
  }

  function getTodayMinutes() {
    const inSession = startRef.current ? (Date.now() - startRef.current) / 60000 : 0;
    return getMinutesForKey(todayKey()) + inSession;
  }

  return { getTodayMinutes, flush };
}

// ── Daily ring SVG ────────────────────────────────────────────────────────────

function DailyRing({ minutes, goal, size = 80, strokeWidth = 7 }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(minutes / goal, 1);
  const met = minutes >= goal;
  const color = met ? M.green : pct > 0 ? M.amber : 'rgba(255,255,255,0.08)';
  const center = size / 2;

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* Track */}
      <circle cx={center} cy={center} r={r}
        fill="none" stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeWidth} />
      {/* Fill */}
      {pct > 0 && (
        <circle cx={center} cy={center} r={r}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      )}
      {/* Center text */}
      <text x={center} y={center - 4} textAnchor="middle"
        fill={met ? M.green : pct > 0 ? M.amber : M.muted}
        fontSize={size * 0.22} fontWeight="800"
        fontFamily="Georgia, serif">
        {Math.floor(minutes)}
      </text>
      <text x={center} y={center + 12} textAnchor="middle"
        fill={M.muted} fontSize={size * 0.14}
        fontFamily="Georgia, serif">
        min
      </text>
    </svg>
  );
}

// ── Streak Banner (for home screen) ──────────────────────────────────────────

export function StreakBanner({ getTodayMinutes, onClick }) {
  const [todayMins, setTodayMins] = useState(0);
  const goal = getGoal();
  const streak = calcStreak(goal);

  useEffect(() => {
    setTodayMins(getTodayMinutes());
    const id = setInterval(() => setTodayMins(getTodayMinutes()), 15000);
    return () => clearInterval(id);
  }, [getTodayMinutes]);

  const mins = Math.floor(todayMins);
  const met  = todayMins >= goal;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '9px 18px', borderRadius: 20,
        background: met ? 'rgba(74,222,128,0.10)' : 'rgba(232,131,58,0.10)',
        border: `1px solid ${met ? 'rgba(74,222,128,0.35)' : M.border}`,
        color: M.text, fontFamily: "Georgia, serif",
        fontSize: 13, cursor: 'pointer',
        margin: '0 auto 20px',
        maxWidth: 280,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 16 }}>{met ? '✅' : '🔥'}</span>
      <span>
        <span style={{ fontWeight: 700, color: met ? M.green : M.hi }}>
          {streak} day streak
        </span>
        <span style={{ color: M.muted }}>  ·  Today: {mins} min</span>
      </span>
      <span style={{ color: M.muted, fontSize: 11 }}>›</span>
    </button>
  );
}

// ── Full dashboard ────────────────────────────────────────────────────────────

export default function ProgressTracker({ isPro, getTodayMinutes }) {
  const goal = getGoal();
  const [todayMins,  setTodayMins]  = useState(0);
  const [dailyGoal,  setDailyGoalS] = useState(goal);
  const [calMonth,   setCalMonth]   = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setTodayMins(getTodayMinutes());
    const id = setInterval(() => setTodayMins(getTodayMinutes()), 10000);
    return () => clearInterval(id);
  }, [getTodayMinutes]);

  function setGoal(val) {
    const clamped = Math.max(15, Math.min(90, val));
    localStorage.setItem('guitar_daily_goal', String(clamped));
    setDailyGoalS(clamped);
  }

  const streak    = calcStreak(dailyGoal);
  const monthData = getMonthData(calMonth.year, calMonth.month, dailyGoal);
  const today     = new Date();

  // Weekly data for PRO bar chart (last 7 days)
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i));
    const mins = getMinutesForKey(dateKey(d));
    const label = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];
    return { label, mins, met: mins >= dailyGoal };
  });
  const maxWeekMins = Math.max(...weekData.map(d => d.mins), dailyGoal);

  // Month nav
  function prevMonth() {
    setCalMonth(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  }
  function nextMonth() {
    const now = new Date();
    setCalMonth(prev => {
      if (prev.year === now.getFullYear() && prev.month === now.getMonth()) return prev;
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, color: M.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      padding: 'env(safe-area-inset-top,16px) 0 40px',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#" style={{ color: M.muted, fontSize: 22, textDecoration: 'none', lineHeight: 1 }}>‹</a>
        <h1 style={{
          fontSize: 20, fontWeight: 800, margin: 0,
          background: `linear-gradient(135deg,${M.accent},${M.hi})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Progress Tracker</h1>
      </div>

      <div style={{ padding: '20px 20px 0', maxWidth: 480, margin: '0 auto' }}>

        {/* Today ring + goal */}
        <div style={{
          background: M.surface, borderRadius: 18, border: `1px solid ${M.border}`,
          padding: '22px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <DailyRing minutes={todayMins} goal={dailyGoal} size={88} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: M.muted, marginBottom: 10 }}>Daily Goal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setGoal(dailyGoal - 5)} style={stepBtn}>−</button>
              <span style={{ fontSize: 20, fontWeight: 800, color: M.hi, minWidth: 64, textAlign: 'center' }}>
                {dailyGoal} min
              </span>
              <button onClick={() => setGoal(dailyGoal + 5)} style={stepBtn}>+</button>
            </div>
            <div style={{ fontSize: 11, color: M.muted, marginTop: 8 }}>
              Today: {Math.floor(todayMins)} / {dailyGoal} min
            </div>
          </div>
        </div>

        {/* Streak */}
        <div style={{
          background: M.surface, borderRadius: 18, border: `1px solid ${M.border}`,
          padding: '16px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 36 }}>🔥</span>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: M.hi, lineHeight: 1 }}>{streak}</div>
            <div style={{ fontSize: 12, color: M.muted, marginTop: 2 }}>day streak</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: M.muted, textAlign: 'right' }}>
            Play every day<br />to keep it going
          </div>
        </div>

        {/* PRO: Weekly bar chart */}
        {isPro && (
          <div style={{
            background: M.surface, borderRadius: 18, border: `1px solid ${M.border}`,
            padding: '16px 20px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: M.muted, marginBottom: 14 }}>
              This Week
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {weekData.map((d, i) => {
                const h = maxWeekMins > 0 ? Math.max((d.mins / maxWeekMins) * 72, d.mins > 0 ? 4 : 0) : 0;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: '100%', height: h,
                      background: d.met ? M.green : d.mins > 0 ? M.amber : 'rgba(255,255,255,0.06)',
                      borderRadius: 4, transition: 'height 0.4s ease',
                    }} />
                    <span style={{ fontSize: 9, color: M.muted }}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div style={{
          background: M.surface, borderRadius: 18, border: `1px solid ${M.border}`,
          padding: '16px 20px', marginBottom: 16,
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <button onClick={prevMonth} style={navBtn}>‹</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
              {MONTH_NAMES[calMonth.month]} {calMonth.year}
            </div>
            <button onClick={nextMonth} style={navBtn}>›</button>
          </div>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, color: M.muted }}>{d}</div>
            ))}
          </div>
          {/* Days grid — offset first day */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {Array.from({ length: new Date(calMonth.year, calMonth.month, 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {monthData.map(({ day, mins, status }) => {
              const isToday = today.getFullYear() === calMonth.year
                && today.getMonth() === calMonth.month
                && today.getDate() === day;
              const dot = status === 'met' ? M.green : status === 'partial' ? M.amber : 'rgba(255,255,255,0.07)';
              return (
                <button key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 2, padding: '4px 2px', borderRadius: 6,
                    background: isToday ? 'rgba(232,131,58,0.15)' : 'none',
                    border: isToday ? `1px solid ${M.borderHi}` : '1px solid transparent',
                    cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 11, color: isToday ? M.hi : M.text }}>{day}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                </button>
              );
            })}
          </div>
          {/* Selected day breakdown */}
          {selectedDay !== null && (() => {
            const entry = monthData.find(d => d.day === selectedDay);
            return entry ? (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 10,
                background: M.panel, border: `1px solid ${M.border}`,
                fontSize: 12, color: M.text,
              }}>
                <strong>{MONTH_NAMES[calMonth.month]} {selectedDay}:</strong>
                {' '}{Math.round(entry.mins * 10) / 10} min practised
                {entry.status === 'met' && <span style={{ color: M.green }}> — Goal met ✓</span>}
                {entry.status === 'partial' && <span style={{ color: M.amber }}> — Partial</span>}
                {entry.status === 'none' && <span style={{ color: M.muted }}> — No practice</span>}
              </div>
            ) : null;
          })()}
        </div>

        {!isPro && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <span style={{ fontSize: 12, color: M.muted, fontStyle: 'italic' }}>
              Weekly chart available with PRO
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const stepBtn = {
  width: 32, height: 32, borderRadius: '50%',
  border: `1px solid rgba(232,131,58,0.4)`,
  background: 'rgba(232,131,58,0.12)',
  color: '#F5A65B', fontSize: 18, fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'Georgia, serif', lineHeight: 1,
};

const navBtn = {
  background: 'none', border: 'none',
  color: M.muted, fontSize: 18, cursor: 'pointer', padding: '0 8px',
  fontFamily: 'Georgia, serif',
};
