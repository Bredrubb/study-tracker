import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../lib/supabase';

interface Props {
  currentUsername?: string;
  myUserId?: string;
}

interface RankedEntry extends LeaderboardEntry {
  rank: RankInfo;
}

interface RankInfo {
  label: string;
  color: string;
  icon: string;
}

function getRank(totalScoreMinutes: number): RankInfo {
  const h = totalScoreMinutes / 60;
  if (h >= 100) return { label: 'Diamond', color: '#67e8f9', icon: '💎' };
  if (h >= 50)  return { label: 'Gold',    color: '#fbbf24', icon: '🥇' };
  if (h >= 30)  return { label: 'Silver',  color: '#c0c0c0', icon: '🥈' };
  if (h >= 20)  return { label: 'Bronze',  color: '#cd7f32', icon: '🥉' };
  return { label: '', color: '#94a3b8', icon: '' };
}

function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function daysUntilReset(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
}

function currentMonthName(): string {
  return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function aggregateSessions(
  data: { username: string; score: number; score_percent: number }[]
): RankedEntry[] {
  const map = new Map<string, { total: number; scoreSum: number; count: number }>();
  for (const row of data) {
    const e = map.get(row.username) ?? { total: 0, scoreSum: 0, count: 0 };
    e.total    += row.score;
    e.scoreSum += row.score_percent;
    e.count    += 1;
    map.set(row.username, e);
  }
  return Array.from(map.entries())
    .map(([username, { total, scoreSum, count }]) => {
      const rounded = Math.round(total);
      return {
        username,
        total_score:       rounded,
        avg_score_percent: scoreSum / count,
        session_count:     count,
        rank:              getRank(rounded),
      };
    })
    .sort((a, b) => b.total_score - a.total_score);
}

const RANK_LEGEND = [
  { icon: '💎', label: 'Diamond', color: '#67e8f9', req: '100h' },
  { icon: '🥇', label: 'Gold',    color: '#fbbf24', req: '50h'  },
  { icon: '🥈', label: 'Silver',  color: '#c0c0c0', req: '30h'  },
  { icon: '🥉', label: 'Bronze',  color: '#cd7f32', req: '20h'  },
];

export function Leaderboard({ currentUsername, myUserId }: Props) {
  const [tab,     setTab]     = useState<'global' | 'friends'>('global');
  const [entries, setEntries] = useState<RankedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const loadGlobal = async () => {
    const { data, error: err } = await supabase
      .from('study_sessions')
      .select('username, score, score_percent')
      .gte('started_at', monthStart());
    if (err) { setError(err.message); return; }
    setEntries(aggregateSessions(data ?? []));
  };

  const loadFriends = async () => {
    if (!myUserId) { setEntries([]); return; }

    const { data: fs } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`)
      .eq('status', 'accepted');

    const friendIds = (fs ?? []).map(f =>
      f.requester_id === myUserId ? f.addressee_id : f.requester_id
    );
    const allIds = [myUserId, ...friendIds];

    const { data, error: err } = await supabase
      .from('study_sessions')
      .select('username, score, score_percent, user_id')
      .in('user_id', allIds)
      .gte('started_at', monthStart());

    if (err) { setError(err.message); return; }
    setEntries(aggregateSessions(data ?? []));
  };

  const load = async () => {
    setLoading(true);
    setError('');
    if (tab === 'global') await loadGlobal();
    else await loadFriends();
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab, myUserId]);  // eslint-disable-line react-hooks/exhaustive-deps

  const posLabel = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem 6rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            🏆 Leaderboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            {currentMonthName()} · resets in {daysUntilReset()} day{daysUntilReset() !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Rank legend */}
        <div style={{
          display: 'flex', gap: '0.4rem', justifyContent: 'center',
          marginBottom: '1.5rem', flexWrap: 'wrap',
        }}>
          {RANK_LEGEND.map(r => (
            <div key={r.label} style={{
              background: '#13131a', border: `1px solid ${r.color}35`,
              borderRadius: '0.75rem', padding: '0.3rem 0.7rem',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              <span style={{ fontSize: '0.85rem' }}>{r.icon}</span>
              <span style={{ color: r.color, fontSize: '0.72rem', fontWeight: 700 }}>{r.label}</span>
              <span style={{ color: '#475569', fontSize: '0.68rem' }}>{r.req}+</span>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', background: '#13131a',
          border: '1px solid #1e1e2e', borderRadius: '0.875rem',
          padding: '0.3rem', marginBottom: '1.25rem',
        }}>
          {(['global', 'friends'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '0.55rem',
                background: tab === t ? '#7c3aed' : 'transparent',
                border: 'none', borderRadius: '0.625rem',
                color: tab === t ? '#fff' : '#94a3b8',
                fontWeight: tab === t ? 700 : 400,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {t === 'global' ? '🌍 Global' : '👥 Friends'}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={load}
          style={{
            display: 'block', margin: '0 auto 1.5rem',
            background: '#13131a', border: '1px solid #1e1e2e',
            borderRadius: '0.625rem', padding: '0.5rem 1.25rem',
            color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>

        {/* States */}
        {loading && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{
            background: '#ef444415', border: '1px solid #ef444440',
            borderRadius: '0.75rem', padding: '0.75rem', color: '#fca5a5',
            fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem', fontSize: '0.9rem' }}>
            {tab === 'friends'
              ? 'No friend sessions this month yet. Add friends via the Friends tab!'
              : 'No sessions this month yet — be the first on the board!'}
          </div>
        )}

        {/* Entries */}
        {!loading && entries.map((entry, i) => {
          const isMe = entry.username === currentUsername;
          const rankColor = entry.rank.color;
          const hasRank = !!entry.rank.icon;

          return (
            <div
              key={entry.username}
              style={{
                background: isMe ? '#7c3aed12' : '#13131a',
                border: `1px solid ${isMe ? '#7c3aed55' : hasRank ? `${rankColor}25` : '#1e1e2e'}`,
                borderRadius: '0.875rem',
                padding: '1rem 1.25rem',
                marginBottom: '0.75rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
              }}
            >
              {/* Position */}
              <div style={{
                fontSize: i < 3 ? '1.4rem' : '0.95rem',
                fontWeight: 700, color: '#64748b',
                minWidth: '2.25rem', textAlign: 'center',
              }}>
                {posLabel(i)}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {entry.rank.icon && (
                    <span style={{ fontSize: '0.85rem' }}>{entry.rank.icon}</span>
                  )}
                  <span style={{ color: rankColor, fontWeight: 700, fontSize: '1rem' }}>
                    {entry.username}
                  </span>
                  {isMe && (
                    <span style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 600 }}>(you)</span>
                  )}
                </div>
                <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                  {entry.session_count} session{entry.session_count !== 1 ? 's' : ''}
                  {' · '}avg {Math.round(entry.avg_score_percent * 100)}% score
                  {entry.rank.label && (
                    <span style={{ color: rankColor, marginLeft: '0.4rem' }}>
                      · {entry.rank.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#a78bfa', fontWeight: 800, fontSize: '1.1rem' }}>
                  {fmtMins(entry.total_score)}
                </div>
                <div style={{ color: '#475569', fontSize: '0.68rem' }}>this month</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
