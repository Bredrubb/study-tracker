import { useState } from 'react';
import type { UseFriendsReturn } from '../hooks/useFriends';

type Props = UseFriendsReturn & {
  onViewProfile?: (userId: string) => void;
};

export function Friends({
  friends, pending, loading,
  sendRequest, acceptRequest, declineRequest, removeFriend,
  onViewProfile,
}: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [sendMsg, setSendMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  const incoming = pending.filter(p => p.direction === 'incoming');
  const outgoing = pending.filter(p => p.direction === 'outgoing');

  const handleSend = async () => {
    const username = searchInput.trim();
    if (!username) return;
    setSending(true);
    setSendMsg(null);
    const err = await sendRequest(username);
    if (err) {
      setSendMsg({ text: err, isError: true });
    } else {
      setSendMsg({ text: `Friend request sent to ${username}!`, isError: false });
      setSearchInput('');
    }
    setSending(false);
  };

  const sectionHeader = (text: string, color = '#94a3b8') => (
    <h2 style={{
      color, fontSize: '0.8rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: '0.75rem', marginTop: 0,
    }}>
      {text}
    </h2>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem 6rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            👥 Friends
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            Add friends to compete on the friends leaderboard
          </p>
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            {sectionHeader(`⏳ Friend Requests (${incoming.length})`, '#f59e0b')}
            {incoming.map(req => (
              <div key={req.friendship_id} style={{
                background: '#13131a',
                border: '1px solid #f59e0b40',
                borderRadius: '0.875rem',
                padding: '0.875rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '0.5rem',
              }}>
                <span style={{ flex: 1, color: '#f1f5f9', fontWeight: 600 }}>
                  👤 {req.username}
                </span>
                <button
                  onClick={() => acceptRequest(req.friendship_id)}
                  style={{
                    background: '#10b981', border: 'none', borderRadius: '0.5rem',
                    padding: '0.4rem 0.875rem', color: '#fff',
                    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => declineRequest(req.friendship_id)}
                  style={{
                    background: '#ef444415', border: '1px solid #ef444440',
                    borderRadius: '0.5rem', padding: '0.4rem 0.875rem',
                    color: '#fca5a5', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  ✕ Decline
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Add friend */}
        <section style={{ marginBottom: '1.75rem' }}>
          {sectionHeader('➕ Add Friend')}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Enter their username…"
              style={{
                flex: 1, background: '#0d0d14', border: '1px solid #1e1e2e',
                borderRadius: '0.625rem', padding: '0.75rem 1rem',
                color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !searchInput.trim()}
              style={{
                background: sending || !searchInput.trim()
                  ? '#4c1d95'
                  : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: 'none', borderRadius: '0.625rem',
                padding: '0.75rem 1.25rem', color: '#fff',
                fontWeight: 700, fontSize: '0.9rem',
                cursor: sending ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                opacity: !searchInput.trim() && !sending ? 0.6 : 1,
              }}
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
          {sendMsg && (
            <div style={{
              marginTop: '0.5rem', padding: '0.5rem 0.875rem',
              background: sendMsg.isError ? '#ef444415' : '#10b98115',
              border: `1px solid ${sendMsg.isError ? '#ef444440' : '#10b98140'}`,
              borderRadius: '0.5rem',
              color: sendMsg.isError ? '#fca5a5' : '#6ee7b7',
              fontSize: '0.8rem',
            }}>
              {sendMsg.text}
            </div>
          )}
        </section>

        {/* Current friends */}
        <section style={{ marginBottom: '1.75rem' }}>
          {sectionHeader(`✅ Friends (${friends.length})`)}
          {loading && (
            <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '0.75rem 0' }}>
              Loading…
            </div>
          )}
          {!loading && friends.length === 0 && (
            <div style={{
              background: '#13131a', border: '1px solid #1e1e2e',
              borderRadius: '0.875rem', padding: '1.25rem',
              color: '#64748b', fontSize: '0.85rem', textAlign: 'center',
            }}>
              No friends yet. Send a request above to get started!
            </div>
          )}
          {friends.map(f => (
            <div key={f.friendship_id} style={{
              background: '#13131a', border: '1px solid #1e1e2e',
              borderRadius: '0.875rem', padding: '0.875rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              marginBottom: '0.5rem',
            }}>
              <span
                onClick={() => onViewProfile?.(f.user_id)}
                style={{ flex: 1, color: '#f1f5f9', fontWeight: 600, cursor: onViewProfile ? 'pointer' : 'default', textDecoration: onViewProfile ? 'underline' : 'none', textDecorationColor: '#ffffff30' }}
              >
                👤 {f.username}
              </span>
              <button
                onClick={() => removeFriend(f.friendship_id)}
                style={{
                  background: 'transparent', border: '1px solid #2e2e3e',
                  borderRadius: '0.5rem', padding: '0.4rem 0.75rem',
                  color: '#64748b', fontSize: '0.75rem', cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </section>

        {/* Outgoing pending */}
        {outgoing.length > 0 && (
          <section>
            {sectionHeader('📤 Sent Requests')}
            {outgoing.map(req => (
              <div key={req.friendship_id} style={{
                background: '#13131a', border: '1px solid #1e1e2e',
                borderRadius: '0.875rem', padding: '0.875rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '0.5rem',
              }}>
                <span style={{ flex: 1, color: '#94a3b8' }}>{req.username}</span>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Pending…</span>
                <button
                  onClick={() => declineRequest(req.friendship_id)}
                  style={{
                    background: 'transparent', border: '1px solid #2e2e3e',
                    borderRadius: '0.5rem', padding: '0.4rem 0.75rem',
                    color: '#64748b', fontSize: '0.75rem', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
