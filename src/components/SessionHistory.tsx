import type { SessionData } from '../types';
import { formatScore, getScoreLabel } from '../utils/scoring';

interface Props {
  sessions: SessionData[];
  onClear: () => void;
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(ts));
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function SessionHistory({ sessions, onClear }: Props) {
  if (sessions.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 700, margin: '0 0 0.5rem' }}>No sessions yet</h2>
        <p style={{ color: '#64748b' }}>Complete your first study session to see your history here.</p>
      </div>
    );
  }

  // Summary stats
  const totalSessions = sessions.length;
  const totalMinutes = Math.round(sessions.reduce((acc, s) => acc + s.duration / 60, 0));
  const avgScore = Math.round(sessions.reduce((acc, s) => acc + s.scorePercent, 0) / sessions.length * 100);
  const bestScore = Math.round(Math.max(...sessions.map(s => s.scorePercent)) * 100);

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem 6rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        📊 Session History
      </h1>

      {/* Summary stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem', marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Total Sessions', value: String(totalSessions), icon: '🎯' },
          { label: 'Total Minutes', value: String(totalMinutes), icon: '⏱' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: '📈' },
          { label: 'Best Score', value: `${bestScore}%`, icon: '🏆' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#13131a', border: '1px solid #1e1e2e',
            borderRadius: '1rem', padding: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.1rem' }}>{s.value}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.map((session, i) => {
          const scoreLabel = getScoreLabel(session.scorePercent);
          const tabCount = session.distractions.filter(d => d.type === 'tab_switch').length;
          const phoneCount = session.distractions.filter(d => d.type === 'phone_detected').length;
          return (
            <div key={session.id} style={{
              background: '#13131a',
              border: '1px solid #1e1e2e',
              borderRadius: '1rem',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              {/* Score badge */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: `2px solid ${scoreLabel.color}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: scoreLabel.color, fontWeight: 700, fontSize: '0.9rem' }}>
                  {Math.round(session.scorePercent * 100)}%
                </span>
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: '0.2rem',
                }}>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>
                    {formatDuration(session.duration)}
                  </span>
                  <span style={{ color: scoreLabel.color, fontSize: '0.75rem', fontWeight: 600 }}>
                    {scoreLabel.label}
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                  {formatDate(session.startTime)}
                  {i === 0 && (
                    <span style={{
                      marginLeft: '0.5rem', background: '#7c3aed30',
                      color: '#a78bfa', padding: '0 0.4rem', borderRadius: '0.25rem',
                      fontSize: '0.7rem',
                    }}>Latest</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Score: {formatScore(session.score)}
                  </span>
                  {tabCount > 0 && (
                    <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>
                      · {tabCount} tab switch{tabCount !== 1 ? 'es' : ''}
                    </span>
                  )}
                  {phoneCount > 0 && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>
                      · {phoneCount} phone detect{phoneCount !== 1 ? 'ions' : 'ion'}
                    </span>
                  )}
                  {!session.cameraEnabled && (
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>· no camera</span>
                  )}
                  {tabCount === 0 && phoneCount === 0 && session.cameraEnabled && (
                    <span style={{ color: '#10b981', fontSize: '0.72rem' }}>· zero distractions 🎉</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear button */}
      <button
        onClick={() => {
          if (window.confirm('Delete all session history? This cannot be undone.')) {
            onClear();
          }
        }}
        style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '0.75rem',
          borderRadius: '0.875rem',
          border: '1px solid #1e1e2e',
          background: 'transparent',
          color: '#64748b',
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        🗑 Clear history
      </button>
    </div>
  );
}
