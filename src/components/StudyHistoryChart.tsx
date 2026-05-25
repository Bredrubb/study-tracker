import { useState } from 'react';

interface SessionRow {
  score: number;
  score_percent: number;
  started_at: string;
}

type ViewMode = 'daily' | 'monthly' | 'yearly';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtShort(mins: number): string {
  const h = mins / 60;
  return h >= 1 ? `${h.toFixed(1)}h` : `${Math.round(mins)}m`;
}

function getRank(mins: number) {
  const h = mins / 60;
  if (h >= 100) return { label: 'Diamond', color: '#67e8f9', icon: '💎' };
  if (h >= 50)  return { label: 'Gold',    color: '#fbbf24', icon: '🥇' };
  if (h >= 30)  return { label: 'Silver',  color: '#c0c0c0', icon: '🥈' };
  if (h >= 20)  return { label: 'Bronze',  color: '#cd7f32', icon: '🥉' };
  return { label: '', color: '#7c3aed', icon: '' };
}

interface Bar {
  label: string;
  value: number;        // minutes
  isCurrent: boolean;   // highlight today / this month / this year
}

function getDailyBars(sessions: SessionRow[], year: number, month: number): Bar[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totals = new Array<number>(daysInMonth).fill(0);
  for (const s of sessions) {
    const d = new Date(s.started_at);
    if (d.getFullYear() === year && d.getMonth() === month)
      totals[d.getDate() - 1] += s.score;
  }
  const today = new Date();
  return totals.map((value, i) => ({
    label:     String(i + 1),
    value,
    isCurrent: today.getFullYear() === year && today.getMonth() === month && today.getDate() === i + 1,
  }));
}

function getMonthlyBars(sessions: SessionRow[], year: number): Bar[] {
  const totals = new Array<number>(12).fill(0);
  for (const s of sessions) {
    const d = new Date(s.started_at);
    if (d.getFullYear() === year) totals[d.getMonth()] += s.score;
  }
  const today = new Date();
  return totals.map((value, i) => ({
    label:     MONTH_ABBR[i],
    value,
    isCurrent: today.getFullYear() === year && today.getMonth() === i,
  }));
}

function getYearlyBars(sessions: SessionRow[]): Bar[] {
  if (sessions.length === 0) return [];
  const map = new Map<number, number>();
  for (const s of sessions) {
    const yr = new Date(s.started_at).getFullYear();
    map.set(yr, (map.get(yr) ?? 0) + s.score);
  }
  const min = Math.min(...map.keys());
  const max = Math.max(...map.keys());
  const thisYear = new Date().getFullYear();
  return Array.from({ length: max - min + 1 }, (_, i) => ({
    label:     String(min + i),
    value:     map.get(min + i) ?? 0,
    isCurrent: min + i === thisYear,
  }));
}

const MAX_H = 110; // px, max bar height
const LABEL_H = 20;
const TOP_H = 20; // space for value label above bar

interface Props {
  sessions: SessionRow[];
}

export function StudyHistoryChart({ sessions }: Props) {
  const [mode,    setMode]    = useState<ViewMode>('monthly');
  const [navDate, setNavDate] = useState(new Date());

  // ── Navigation ────────────────────────────────────────────────────────────
  const now = new Date();
  const atCurrent =
    mode === 'daily'   ? navDate.getFullYear() === now.getFullYear() && navDate.getMonth() === now.getMonth() :
    mode === 'monthly' ? navDate.getFullYear() === now.getFullYear() :
    true;

  const navigate = (dir: -1 | 1) => {
    if (dir === 1 && atCurrent) return;
    setNavDate(prev => {
      const d = new Date(prev);
      if (mode === 'daily')   d.setMonth(d.getMonth() + dir);
      if (mode === 'monthly') d.setFullYear(d.getFullYear() + dir);
      return d;
    });
  };

  const resetToNow = () => setNavDate(new Date());

  // ── Compute bars & meta ───────────────────────────────────────────────────
  let bars: Bar[] = [];
  let periodLabel = '';
  let showNav = true;

  if (mode === 'daily') {
    bars        = getDailyBars(sessions, navDate.getFullYear(), navDate.getMonth());
    periodLabel = `${MONTH_FULL[navDate.getMonth()]} ${navDate.getFullYear()}`;
  } else if (mode === 'monthly') {
    bars        = getMonthlyBars(sessions, navDate.getFullYear());
    periodLabel = String(navDate.getFullYear());
  } else {
    bars        = getYearlyBars(sessions);
    periodLabel = 'All Time';
    showNav     = false;
  }

  const periodMins = bars.reduce((s, b) => s + b.value, 0);
  const periodSessions = sessions.filter(s => {
    const d = new Date(s.started_at);
    if (mode === 'daily')   return d.getFullYear() === navDate.getFullYear() && d.getMonth() === navDate.getMonth();
    if (mode === 'monthly') return d.getFullYear() === navDate.getFullYear();
    return true;
  }).length;

  const monthRank = mode === 'daily' ? getRank(periodMins) : null;
  const maxVal    = Math.max(...bars.map(b => b.value), 1);
  const isEmpty   = bars.every(b => b.value === 0);

  // For daily view: only show label for every 5th day to avoid crowding
  const showLabel = (i: number) =>
    mode !== 'daily' || (i + 1) === 1 || (i + 1) % 5 === 0 || (i + 1) === bars.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1rem' }}>

      {/* Section label */}
      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
        Study History
      </div>

      {/* View mode toggle */}
      <div style={{ display: 'flex', background: '#0d0d14', borderRadius: '0.625rem', padding: '0.25rem', marginBottom: '1rem', gap: '2px' }}>
        {(['daily', 'monthly', 'yearly'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); resetToNow(); }}
            style={{
              flex: 1, padding: '0.4rem 0', border: 'none',
              borderRadius: '0.4rem',
              background: mode === m ? '#7c3aed' : 'transparent',
              color:      mode === m ? '#fff'    : '#64748b',
              fontSize: '0.78rem', fontWeight: mode === m ? 700 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: '0 0.5rem', flexShrink: 0 }}
        >
          ‹
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem' }}>{periodLabel}</div>
          <div style={{ color: '#475569', fontSize: '0.7rem', marginTop: '0.1rem' }}>
            {periodSessions} session{periodSessions !== 1 ? 's' : ''} · {fmtMins(Math.round(periodMins))}
            {monthRank?.icon && (
              <span style={{ color: monthRank.color, marginLeft: '0.4rem' }}>
                {monthRank.icon} {monthRank.label}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate(1)}
          disabled={atCurrent || !showNav}
          style={{ background: 'none', border: 'none', color: atCurrent || !showNav ? '#2e2e3e' : '#94a3b8', cursor: atCurrent || !showNav ? 'default' : 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: '0 0.5rem', flexShrink: 0 }}
        >
          ›
        </button>
      </div>

      {/* Chart */}
      {isEmpty ? (
        <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.82rem', padding: '2.5rem 0', background: '#0d0d14', borderRadius: '0.625rem' }}>
          No study sessions in this period
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: mode === 'daily' ? '2px' : '5px', height: TOP_H + MAX_H + LABEL_H, userSelect: 'none' }}>
          {bars.map((bar, i) => {
            const barH    = bar.value > 0 ? Math.max((bar.value / maxVal) * MAX_H, 4) : 0;
            const barCol  = bar.isCurrent ? '#a78bfa' : '#7c3aed';
            const showVal = bar.value > 0 && mode !== 'daily';

            return (
              <div
                key={`${bar.label}-${i}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
              >
                {/* Value label above bar (monthly / yearly only) */}
                <div style={{ height: TOP_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2, flexShrink: 0 }}>
                  {showVal && (
                    <span style={{ fontSize: '0.55rem', color: bar.isCurrent ? '#a78bfa' : '#64748b', whiteSpace: 'nowrap', fontWeight: bar.isCurrent ? 700 : 400 }}>
                      {fmtShort(bar.value)}
                    </span>
                  )}
                </div>

                {/* Bar */}
                <div style={{ width: '100%', height: MAX_H, display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
                  <div
                    title={`${bar.label}: ${fmtMins(Math.round(bar.value))}`}
                    style={{
                      width: '100%',
                      height: barH,
                      background: bar.value > 0
                        ? `linear-gradient(to top, ${barCol}bb, ${barCol})`
                        : '#0d0d14',
                      borderRadius: mode === 'daily' ? '2px 2px 0 0' : '3px 3px 0 0',
                      minHeight: bar.value > 0 ? 3 : 0,
                      boxShadow: bar.isCurrent && bar.value > 0 ? `0 0 8px ${barCol}60` : 'none',
                      transition: 'height 0.3s ease',
                    }}
                  />
                </div>

                {/* X-axis label */}
                <div style={{ height: LABEL_H, display: 'flex', alignItems: 'flex-start', paddingTop: 3, flexShrink: 0, visibility: showLabel(i) ? 'visible' : 'hidden' }}>
                  <span style={{ fontSize: mode === 'daily' ? '0.5rem' : '0.6rem', color: bar.isCurrent ? '#a78bfa' : '#475569', fontWeight: bar.isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {bar.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rank badges row for monthly view */}
      {mode === 'monthly' && !isEmpty && (
        <div style={{ marginTop: '0.875rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {bars.map((bar, i) => {
            const r = getRank(bar.value);
            if (!r.icon || bar.value === 0) return null;
            return (
              <div key={MONTH_ABBR[i]} style={{ background: '#0d0d14', border: `1px solid ${r.color}30`, borderRadius: '0.5rem', padding: '0.2rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem' }}>{r.icon}</span>
                <span style={{ color: r.color, fontSize: '0.68rem', fontWeight: 600 }}>{MONTH_ABBR[i]}</span>
              </div>
            );
          })}
          {bars.every(b => getRank(b.value).icon === '' || b.value === 0) && (
            <span style={{ color: '#475569', fontSize: '0.72rem' }}>No ranks reached this year yet</span>
          )}
        </div>
      )}
    </div>
  );
}
