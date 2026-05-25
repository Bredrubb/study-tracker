import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { AppSettings } from '../types';
import type { PendingRequest } from '../hooks/useFriends';

interface SessionRow {
  score: number;
  score_percent: number;
  started_at: string;
}

interface MonthStat {
  monthKey: string;
  monthLabel: string;
  totalMinutes: number;
  sessionCount: number;
  avgScorePercent: number;
  rank: RankInfo;
}

interface RankInfo {
  label: string;
  color: string;
  icon: string;
}

interface Achievement {
  id: string;
  icon: string;
  label: string;
  desc: string;
  unlocked: boolean;
}

interface ProfileData {
  username: string;
  avatar_url: string | null;
}

interface Props {
  viewingUserId: string | null;   // null = own profile
  myUserId: string;
  myUsername: string;
  onSignOut: () => void;
  onBack?: () => void;
  settings: AppSettings;
  onSaveSettings: (s: AppSettings) => void;
  pendingRequests: PendingRequest[];
  onAcceptRequest: (id: string) => Promise<void>;
  onDeclineRequest: (id: string) => Promise<void>;
}

function getRank(mins: number): RankInfo {
  const h = mins / 60;
  if (h >= 100) return { label: 'Diamond', color: '#67e8f9', icon: '💎' };
  if (h >= 50)  return { label: 'Gold',    color: '#fbbf24', icon: '🥇' };
  if (h >= 30)  return { label: 'Silver',  color: '#c0c0c0', icon: '🥈' };
  if (h >= 20)  return { label: 'Bronze',  color: '#cd7f32', icon: '🥉' };
  return { label: '', color: '#64748b', icon: '' };
}

function computeMonthStats(sessions: SessionRow[]): MonthStat[] {
  const map = new Map<string, { total: number; scoreSum: number; count: number }>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const e = map.get(key) ?? { total: 0, scoreSum: 0, count: 0 };
    e.total    += s.score;
    e.scoreSum += s.score_percent;
    e.count    += 1;
    map.set(key, e);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, { total, scoreSum, count }]) => {
      const [yr, mo] = key.split('-').map(Number);
      const rounded  = Math.round(total);
      return {
        monthKey:       key,
        monthLabel:     new Date(yr, mo - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalMinutes:   rounded,
        sessionCount:   count,
        avgScorePercent: scoreSum / count,
        rank:           getRank(rounded),
      };
    });
}

function computeAchievements(sessions: SessionRow[], monthStats: MonthStat[]): Achievement[] {
  const count      = sessions.length;
  const totalHours = sessions.reduce((s, r) => s + r.score, 0) / 60;
  const hasPerfect = sessions.some(s => s.score_percent >= 0.99);
  const ranked     = new Set(monthStats.map(m => m.rank.label).filter(Boolean));

  const hasRankOrHigher = (rank: string) =>
    ['Bronze', 'Silver', 'Gold', 'Diamond']
      .slice(['Bronze', 'Silver', 'Gold', 'Diamond'].indexOf(rank))
      .some(r => ranked.has(r));

  return [
    { id: 'first',    icon: '🎯', label: 'First Step',     desc: 'Complete your first study session',         unlocked: count >= 1         },
    { id: 'ten',      icon: '📚', label: 'Bookworm',        desc: 'Complete 10 study sessions',                unlocked: count >= 10        },
    { id: 'fifty',    icon: '🔥', label: 'On Fire',         desc: 'Complete 50 study sessions',                unlocked: count >= 50        },
    { id: 'perfect',  icon: '⭐', label: 'Perfect Focus',   desc: 'Finish a session with 100% focus score',    unlocked: hasPerfect         },
    { id: 'century',  icon: '💯', label: 'Century Club',    desc: 'Accumulate 100h of effective study time',   unlocked: totalHours >= 100  },
    { id: 'bronze',   icon: '🥉', label: 'Bronze Scholar',  desc: 'Reach Bronze rank in any month (20h)',      unlocked: hasRankOrHigher('Bronze')  },
    { id: 'silver',   icon: '🥈', label: 'Silver Scholar',  desc: 'Reach Silver rank in any month (30h)',      unlocked: hasRankOrHigher('Silver')  },
    { id: 'gold',     icon: '🥇', label: 'Gold Scholar',    desc: 'Reach Gold rank in any month (50h)',        unlocked: hasRankOrHigher('Gold')    },
    { id: 'diamond',  icon: '💎', label: 'Diamond Scholar', desc: 'Reach Diamond rank in any month (100h)',    unlocked: ranked.has('Diamond')      },
  ];
}

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ProfilePage({
  viewingUserId, myUserId, myUsername,
  onSignOut, onBack,
  settings, onSaveSettings,
  pendingRequests, onAcceptRequest, onDeclineRequest,
}: Props) {
  const targetUserId  = viewingUserId ?? myUserId;
  const isOwnProfile  = !viewingUserId || viewingUserId === myUserId;

  const [profileData,  setProfileData]  = useState<ProfileData | null>(null);
  const [sessions,     setSessions]     = useState<SessionRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: prof }, { data: sess }] = await Promise.all([
      supabase.from('profiles').select('username, avatar_url').eq('id', targetUserId).single(),
      supabase.from('study_sessions').select('score, score_percent, started_at').eq('user_id', targetUserId),
    ]);
    setProfileData(prof ?? null);
    setSessions(sess ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [targetUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');

    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `${myUserId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploadError(upErr.message);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', myUserId);
      await load();
    }
    setUploading(false);
    e.target.value = '';
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const monthStats      = computeMonthStats(sessions);
  const achievements    = computeAchievements(sessions, monthStats);
  const curMonthStat    = monthStats.find(m => m.monthKey === currentMonthKey());
  const currentRank     = curMonthStat ? curMonthStat.rank : getRank(0);
  const unlockedCount   = achievements.filter(a => a.unlocked).length;
  const displayName     = profileData?.username ?? (isOwnProfile ? myUsername : '…');
  const incomingReqs    = pendingRequests.filter(p => p.direction === 'incoming');

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1rem', ...style }}>
      {children}
    </div>
  );

  const SectionLabel = ({ text }: { text: string }) => (
    <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
      {text}
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
      Loading profile…
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem 6rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Back button when viewing someone else */}
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1.25rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            ← Back
          </button>
        )}

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => isOwnProfile && fileInputRef.current?.click()}
                style={{
                  width: 76, height: 76, borderRadius: '50%',
                  background: currentRank.icon ? `${currentRank.color}18` : '#1e1e2e',
                  border: `2px solid ${currentRank.icon ? currentRank.color : '#2e2e3e'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: isOwnProfile ? 'pointer' : 'default',
                }}
              >
                {profileData?.avatar_url ? (
                  <img src={profileData.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.9rem', color: currentRank.icon ? currentRank.color : '#64748b', fontWeight: 700 }}>
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.2rem', color: '#fff' }}>⟳</span>
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: '#7c3aed', borderRadius: '50%',
                  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', border: '2px solid #13131a', cursor: 'pointer',
                }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  ✏️
                </div>
              )}
            </div>

            {/* Name + rank */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {currentRank.icon && <span>{currentRank.icon}</span>}
                <span style={{ color: currentRank.icon ? currentRank.color : '#f1f5f9', fontWeight: 800, fontSize: '1.3rem' }}>
                  {displayName}
                </span>
                {isOwnProfile && <span style={{ color: '#64748b', fontSize: '0.7rem' }}>(you)</span>}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.15rem', color: currentRank.icon ? currentRank.color : '#64748b' }}>
                {currentRank.label ? `${currentRank.label} this month` : 'Unranked this month'}
              </div>
              <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                {unlockedCount}/{achievements.length} achievements · {sessions.length} total sessions
              </div>
            </div>
          </div>

          {uploadError && (
            <div style={{ marginTop: '0.75rem', background: '#ef444415', border: '1px solid #ef444440', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#fca5a5', fontSize: '0.78rem' }}>
              Upload failed: {uploadError}
            </div>
          )}
          {isOwnProfile && (
            <div style={{ marginTop: '0.75rem', color: '#475569', fontSize: '0.72rem' }}>
              Tap the avatar to change your profile picture
            </div>
          )}
        </Card>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />

        {/* ── This month ────────────────────────────────────────────────── */}
        <Card>
          <SectionLabel text="This Month" />
          {curMonthStat ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Study Time', value: fmtMins(curMonthStat.totalMinutes) },
                { label: 'Sessions',   value: String(curMonthStat.sessionCount) },
                { label: 'Avg Score',  value: `${Math.round(curMonthStat.avgScorePercent * 100)}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center', background: '#0d0d14', borderRadius: '0.625rem', padding: '0.75rem 0.5rem' }}>
                  <div style={{ color: '#a78bfa', fontWeight: 800, fontSize: '1.1rem' }}>{value}</div>
                  <div style={{ color: '#475569', fontSize: '0.68rem', marginTop: '0.15rem' }}>{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '0.25rem 0' }}>
              No sessions this month yet
            </div>
          )}
        </Card>

        {/* ── Achievements ──────────────────────────────────────────────── */}
        <Card>
          <SectionLabel text={`Achievements · ${unlockedCount} / ${achievements.length}`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {achievements.map(a => (
              <div
                key={a.id}
                title={a.desc}
                style={{
                  background: a.unlocked ? '#1a1a2e' : '#0d0d14',
                  border: `1px solid ${a.unlocked ? '#7c3aed40' : '#1a1a1a'}`,
                  borderRadius: '0.75rem', padding: '0.8rem 0.4rem',
                  textAlign: 'center',
                  opacity: a.unlocked ? 1 : 0.35,
                  filter: a.unlocked ? 'none' : 'grayscale(1)',
                  transition: 'opacity 0.2s',
                  cursor: 'default',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{a.icon}</div>
                <div style={{ color: a.unlocked ? '#e2e8f0' : '#64748b', fontSize: '0.65rem', fontWeight: 600, lineHeight: 1.3 }}>
                  {a.label}
                </div>
              </div>
            ))}
          </div>
        </Card>


        {/* ── Own profile only ─────────────────────────────────────────── */}
        {isOwnProfile && (
          <>
            {/* Friend requests */}
            {incomingReqs.length > 0 && (
              <Card>
                <SectionLabel text={`Friend Requests · ${incomingReqs.length}`} />
                {incomingReqs.map(req => (
                  <div key={req.friendship_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ flex: 1, color: '#f1f5f9', fontSize: '0.88rem' }}>👤 {req.username}</span>
                    <button onClick={() => onAcceptRequest(req.friendship_id)}
                      style={{ background: '#10b981', border: 'none', borderRadius: '0.4rem', padding: '0.35rem 0.75rem', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                      ✓ Accept
                    </button>
                    <button onClick={() => onDeclineRequest(req.friendship_id)}
                      style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: '0.4rem', padding: '0.35rem 0.6rem', color: '#fca5a5', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </Card>
            )}

            {/* App settings */}
            <Card>
              <SectionLabel text="App Settings" />
              {([
                { key: 'cameraEnabled'       as const, label: 'Camera monitoring', desc: 'Face & phone detection during sessions' },
                { key: 'notificationsEnabled' as const, label: 'Notifications',     desc: 'Alerts when distractions are detected'  },
              ] as const).map(({ key, label, desc }, i, arr) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 0', borderBottom: i < arr.length - 1 ? '1px solid #1e1e2e' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>{label}</div>
                    <div style={{ color: '#475569', fontSize: '0.72rem' }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => onSaveSettings({ ...settings, [key]: !settings[key] })}
                    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: settings[key] ? '#7c3aed' : '#2e2e3e', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: settings[key] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
              ))}
            </Card>

            {/* Sign out */}
            <button
              onClick={onSignOut}
              style={{ width: '100%', padding: '0.875rem', background: '#ef444415', border: '1px solid #ef444440', borderRadius: '0.875rem', color: '#fca5a5', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
