import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  FlaskConical,
  GraduationCap,
  Flame,
  Target,
  Trophy,
  Zap,
  TrendingUp,
  Clock,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../../lib/api/gamification';
import './DashboardPage.css';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const quickActions = [
  {
    icon: BookOpen,
    label: 'Study Hub',
    description: 'Upload PDFs & study with AI',
    color: '#58CC02',
    gradient: 'linear-gradient(135deg, #58CC02, #89E219)',
    to: '/study',
  },
  {
    icon: Brain,
    label: 'Flashcards',
    description: 'Review & memorize faster',
    color: '#1CB0F6',
    gradient: 'linear-gradient(135deg, #1CB0F6, #7BD5F9)',
    to: '/flashcards',
  },
  {
    icon: GraduationCap,
    label: 'Quiz Arena',
    description: 'Test your knowledge',
    color: '#FF9600',
    gradient: 'linear-gradient(135deg, #FF9600, #FFC800)',
    to: '/quiz',
  },
  {
    icon: FlaskConical,
    label: 'Research',
    description: 'Write & cite papers',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #C084FC)',
    to: '/research',
  },
];

const recentActivities = [
  { icon: FileText, label: 'Uploaded "Machine Learning Basics.pdf"', time: '2 hours ago', xp: 10 },
  { icon: Brain, label: 'Reviewed 25 flashcards', time: '3 hours ago', xp: 25 },
  { icon: GraduationCap, label: 'Scored 85% on Neural Networks quiz', time: 'Yesterday', xp: 75 },
  { icon: FlaskConical, label: 'Generated APA citations for research', time: 'Yesterday', xp: 15 },
  { icon: BookOpen, label: 'Completed Chapter 3 study session', time: '2 days ago', xp: 40 },
];

export function DashboardPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['gamification-profile'],
    queryFn: gamificationApi.getProfile,
    retry: 1,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: gamificationApi.getBadges,
    retry: 1,
  });

  const totalXp = profile?.total_xp ?? 0;
  const level = profile?.level ?? 1;
  const currentStreak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const dailyGoalProgress = profile?.daily_goal_progress ?? 0;
  const dailyGoalTarget = profile?.daily_goal_target ?? 3;
  const xpToNext = profile?.xp_to_next_level ?? 500;
  const earnedBadges = badges.filter(b => b.earned).length;
  const progressPct = Math.min(100, ((500 - xpToNext) / 500) * 100);

  const greeting = getGreeting();

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-skeleton">
          <div className="skeleton skeleton-hero" />
          <div className="skeleton-stats">
            {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-stat" />)}
          </div>
          <div className="skeleton skeleton-bar" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="dashboard"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ── Welcome Hero ── */}
      <motion.section className="dashboard-hero" variants={item}>
        <div className="hero-content">
          <h1 className="hero-title">
            {greeting}, <span className="text-primary">Learner</span> 👋
          </h1>
          <p className="hero-subtitle">
            Ready to continue your learning journey? You're on a <strong>{currentStreak}-day streak</strong>!
          </p>
        </div>
        <div className="hero-streak">
          <div className="hero-streak-flame">
            <Flame size={32} />
            <span className="hero-streak-count">{currentStreak}</span>
          </div>
          <span className="hero-streak-label">Day Streak</span>
        </div>
      </motion.section>

      {/* ── Stats Grid ── */}
      <motion.section className="stats-grid" variants={item}>
        <div className="stat-card stat-xp">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #FFC800, #FF9600)' }}>
            <Zap size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalXp.toLocaleString()}</span>
            <span className="stat-label">Total XP</span>
          </div>
          <div className="stat-badge">Level {level}</div>
        </div>

        <div className="stat-card stat-streak">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #FF9600, #FF4B4B)' }}>
            <Flame size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{longestStreak}</span>
            <span className="stat-label">Best Streak</span>
          </div>
          <div className="stat-badge">{currentStreak} active</div>
        </div>

        <div className="stat-card stat-goal">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #58CC02, #89E219)' }}>
            <Target size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{dailyGoalProgress}/{dailyGoalTarget}</span>
            <span className="stat-label">Daily Goals</span>
          </div>
          <div className="stat-progress-ring">
            <svg viewBox="0 0 36 36" className="progress-ring-svg">
              <path className="progress-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path
                className="progress-ring-fill"
                strokeDasharray={`${dailyGoalTarget > 0 ? (dailyGoalProgress / dailyGoalTarget) * 100 : 0}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>

        <div className="stat-card stat-badges">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #A855F7, #C084FC)' }}>
            <Trophy size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{earnedBadges}</span>
            <span className="stat-label">Badges Earned</span>
          </div>
          <div className="stat-badge">View all</div>
        </div>
      </motion.section>

      {/* ── XP Progress Bar ── */}
      <motion.section className="xp-section" variants={item}>
        <div className="xp-header">
          <span className="xp-level-badge">Level {level}</span>
          <span className="xp-progress-text">
            {totalXp.toLocaleString()} XP &bull; {xpToNext} XP to next level
          </span>
          <span className="xp-level-badge">Level {level + 1}</span>
        </div>
        <div className="progress-bar xp-progress-bar">
          <motion.div
            className="progress-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </motion.section>

      {/* ── Quick Actions ── */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <Sparkles size={20} className="text-primary" />
          Quick Actions
        </h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <motion.a
              key={action.label}
              href={action.to}
              className="quick-action-card"
              whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.3 }}
            >
              <div className="quick-action-icon" style={{ background: action.gradient }}>
                <action.icon size={24} color="white" />
              </div>
              <div className="quick-action-info">
                <span className="quick-action-label">{action.label}</span>
                <span className="quick-action-desc">{action.description}</span>
              </div>
              <ArrowRight size={18} className="quick-action-arrow" />
            </motion.a>
          ))}
        </div>
      </motion.section>

      {/* ── Recent Activity ── */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <Clock size={20} className="text-primary" />
          Recent Activity
        </h2>
        <div className="activity-list">
          {recentActivities.map((activity, index) => (
            <motion.div
              key={index}
              className="activity-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index + 0.5 }}
            >
              <div className="activity-icon">
                <activity.icon size={16} />
              </div>
              <div className="activity-content">
                <span className="activity-label">{activity.label}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
              <div className="activity-xp badge badge-xp">+{activity.xp} XP</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Learning Insights ── */}
      <motion.section className="insights-section" variants={item}>
        <h2 className="section-title">
          <TrendingUp size={20} className="text-primary" />
          Learning Insights
        </h2>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-label">Study Time Today</span>
              <span className="insight-value">2h 35m</span>
            </div>
            <div className="insight-chart">
              {[40, 65, 50, 80, 70, 90, 55].map((height, i) => (
                <motion.div
                  key={i}
                  className="insight-bar"
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.1 * i + 0.6, duration: 0.5, ease: 'easeOut' }}
                />
              ))}
            </div>
            <div className="insight-days">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <span key={day} className="insight-day">{day}</span>
              ))}
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-label">Top Subjects</span>
            </div>
            <div className="subject-list">
              {[
                { name: 'Machine Learning', progress: 78, color: '#58CC02' },
                { name: 'Data Structures', progress: 62, color: '#1CB0F6' },
                { name: 'Neural Networks', progress: 45, color: '#FF9600' },
                { name: 'Statistics', progress: 34, color: '#A855F7' },
              ].map((subject, i) => (
                <div key={subject.name} className="subject-row">
                  <span className="subject-name">{subject.name}</span>
                  <div className="subject-bar">
                    <motion.div
                      className="subject-bar-fill"
                      style={{ background: subject.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.progress}%` }}
                      transition={{ delay: 0.1 * i + 0.8, duration: 0.6 }}
                    />
                  </div>
                  <span className="subject-pct">{subject.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
