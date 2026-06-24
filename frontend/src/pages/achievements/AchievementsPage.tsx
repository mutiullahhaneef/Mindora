import { motion } from 'framer-motion';
import { Trophy, Star, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../../lib/api/gamification';

const CATEGORY_ORDER = ['Study', 'Research', 'Engagement', 'Special'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1 },
};

export function AchievementsPage() {
  const { data: profile } = useQuery({
    queryKey: ['gamification-profile'],
    queryFn: gamificationApi.getProfile,
    retry: 1,
  });

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: gamificationApi.getBadges,
    retry: 1,
  });

  const totalXp = profile?.total_xp ?? 0;
  const level = profile?.level ?? 1;
  const currentStreak = profile?.current_streak ?? 0;
  const earnedCount = badges.filter(b => b.earned).length;

  // Group badges by category
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    badges: badges.filter(b => b.category === cat),
  })).filter(g => g.badges.length > 0);

  return (
    <motion.div
      style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1100px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div>
        <h1>Achievements</h1>
        <p className="text-muted">Track your progress and unlock rewards</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <Trophy size={28} style={{ color: 'var(--color-xp)', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-heading)' }}>
            {isLoading ? '—' : `${earnedCount}/${badges.length}`}
          </div>
          <div className="text-sm text-muted">Badges Earned</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <Star size={28} style={{ color: 'var(--color-xp)', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-heading)' }}>
            Level {level}
          </div>
          <div className="text-sm text-muted">{totalXp.toLocaleString()} XP Total</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <Flame size={28} style={{ color: 'var(--color-streak)', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-heading)' }}>
            {currentStreak} Days
          </div>
          <div className="text-sm text-muted">Current Streak</div>
        </div>
      </div>

      {/* Badges by Category */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card skeleton" style={{ height: '140px' }} />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Trophy size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No badges yet — start studying to earn your first badge!</p>
        </div>
      ) : (
        grouped.map(group => (
          <motion.div key={group.category} variants={container} initial="hidden" animate="show">
            <h2 className="section-title" style={{ marginBottom: '16px' }}>
              <Trophy size={20} className="text-primary" />
              {group.category}
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {group.badges.map((badge) => (
                <motion.div
                  key={badge.id}
                  variants={item}
                  className="card"
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    opacity: badge.earned ? 1 : 0.5,
                    filter: badge.earned ? 'none' : 'grayscale(0.6)',
                    cursor: 'default',
                    transition: 'box-shadow 0.2s',
                  }}
                  whileHover={{ y: badge.earned ? -4 : 0 }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{badge.icon_url}</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-heading)', marginBottom: '4px' }}>
                    {badge.name}
                  </div>
                  <div className="text-xs text-muted">{badge.description}</div>
                  <div
                    className="badge"
                    style={{
                      marginTop: '8px',
                      background: badge.earned ? 'var(--color-primary-subtle)' : 'var(--color-bg-secondary)',
                      color: badge.earned ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    {badge.earned ? '✓ Earned' : '🔒 Locked'}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
