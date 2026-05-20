import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../lib/supabase';

interface Props {
  currentUsername?: string;
}

export function Leaderboard({ currentUsername }: Props) {
  const [entries,   setEntries]   = useState<LeaderboardEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('study_sessions')
      .select('username, score, score_percent');

    if (err) { setError(err.message); setLoading(false); return; }

    // Aggregate per user
    const map = new Map<string, { total: number; scoreSum: number; count: number }>();
    for (const row of (data ?? [])) {
      const e = map.get(row.username) ?? { total: 0, scoreSum: 0, count: 0 };
      e.total    += row.score;
      e.scoreSum += row.score_percent;
      e.count    += 1;
      map.set(row.username, e);
    }

    const board: LeaderboardEntry[] = Array.from(map.entries())
      .map(([username, { total, scoreSum, count }]) => ({
        username,
        total_score:       Math.round(total),
        avg_score_percent: scoreSum / count,
        session_count:     count,
      }))
      .sort((a, b) => b.total_score - a.total_score);

    setEntries(board);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;
  const fmtMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem 6rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            🏆 Global Leaderboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            Ranked by total effective study time
          </p>
        </div>

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

        {loading && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
            Loading leaderboard…
          </div>
        )}

        {error && (
          <div style={{
            background: '#ef444420', border: '1px solid #ef444440',
            borderRadius: '0.75rem', padding: '0.75rem 1rem',
            color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
            No sessions yet — be the first on the board!
          </div>
        )}

        {entries.map((entry, i) => {
          const isMe = entry.username === currentUsername;
          return (
            <div
              key={entry.username}
              style={{
                background: isMe ? '#7c3aed15' : '#13131a',
                border: `1px solid ${isMe ? '#7c3aed60' : '#1e1e2e'}`,
                borderRadius: '0.875rem',
                padding: '1rem 1.25rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              {/* Rank */}
              <div style={{ fontSize: i < 3 ? '1.5rem' : '1rem', fontWeight: 700, color: '#94a3b8', minWidth: '2rem', textAlign: 'center' }}>
                {medal(i)}
              </div>

              {/* Name */}
              <div style={{ flex: 1 }}>
                <div style={{ color: isMe ? '#a78bfa' : '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>
                  {entry.username} {isMe && <span style={{ fontSize: '0.7rem', color: '#7c3aed' }}>(you)</span>}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  {entry.session_count} session{entry.session_count !== 1 ? 's' : ''} · avg {Math.round(entry.avg_score_percent * 100)}% score
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#a78bfa', fontWeight: 800, fontSize: '1.1rem' }}>
                  {fmtMins(entry.total_score)}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>effective study</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
