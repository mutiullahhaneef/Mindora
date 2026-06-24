import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  FlaskConical,
  GraduationCap,
  Target,
  TrendingUp,
  Clock,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { studyApi } from '../../lib/api/study';
import { authApi } from '../../lib/api/auth';
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

function formatTimeAgo(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DashboardPage() {
  const navigate = useNavigate();

  // Fetch user profile
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    retry: 1,
  });

  // Fetch real documents for recent activity
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: studyApi.getDocuments,
    retry: 1,
  });

  // Fetch flashcard decks for stats
  const { data: decks = [] } = useQuery({
    queryKey: ['decks'],
    queryFn: studyApi.getDecks,
    retry: 1,
  });

  const greeting = getGreeting();
  const userName = user?.full_name?.split(' ')[0] || 'Learner';
  const totalCards = decks.reduce((acc, d) => acc + d.card_count, 0);
  const totalDue = decks.reduce((acc, d) => acc + d.due_count, 0);

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
            {greeting}, <span className="text-primary">{userName}</span>
          </h1>
          <p className="hero-subtitle">
            Ready to continue your learning journey? You have <strong>{documents.length} document{documents.length !== 1 ? 's' : ''}</strong> uploaded.
          </p>
        </div>
      </motion.section>

      {/* ── Stats Grid ── */}
      <motion.section className="stats-grid" variants={item}>
        <div className="stat-card stat-xp">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #58CC02, #89E219)' }}>
            <FileText size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{documents.length}</span>
            <span className="stat-label">Documents</span>
          </div>
          <div className="stat-badge">Uploaded</div>
        </div>

        <div className="stat-card stat-streak">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #1CB0F6, #7BD5F9)' }}>
            <Brain size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{decks.length}</span>
            <span className="stat-label">Flashcard Decks</span>
          </div>
          <div className="stat-badge">{totalCards} cards</div>
        </div>

        <div className="stat-card stat-goal">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #FF9600, #FFC800)' }}>
            <Target size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalDue}</span>
            <span className="stat-label">Cards Due</span>
          </div>
          <div className="stat-badge">To review</div>
        </div>

        <div className="stat-card stat-badges">
          <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #A855F7, #C084FC)' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{documents.filter(d => d.status === 'processed').length}</span>
            <span className="stat-label">Ready for Study</span>
          </div>
          <div className="stat-badge">Processed</div>
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
            <motion.div
              key={action.label}
              className="quick-action-card"
              whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.3 }}
              onClick={() => navigate(action.to)}
              style={{ cursor: 'pointer' }}
            >
              <div className="quick-action-icon" style={{ background: action.gradient }}>
                <action.icon size={24} color="white" />
              </div>
              <div className="quick-action-info">
                <span className="quick-action-label">{action.label}</span>
                <span className="quick-action-desc">{action.description}</span>
              </div>
              <ArrowRight size={18} className="quick-action-arrow" />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Recent Activity (Real documents) ── */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <Clock size={20} className="text-primary" />
          Recent Activity
        </h2>
        <div className="activity-list">
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p>No activity yet — upload your first PDF in Study Hub to get started!</p>
            </div>
          ) : (
            documents.slice(0, 5).map((doc, index) => (
              <motion.div
                key={doc.id}
                className="activity-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index + 0.5 }}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/study')}
              >
                <div className="activity-icon">
                  <FileText size={16} />
                </div>
                <div className="activity-content">
                  <span className="activity-label">Uploaded "{doc.title}"</span>
                  <span className="activity-time">{formatTimeAgo(doc.created_at)}</span>
                </div>
                <div className={`document-status ${doc.status}`} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px' }}>
                  {doc.status === 'processed' ? 'Ready' : doc.status === 'processing' ? 'Processing' : 'Error'}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.section>

      {/* ── Learning Overview ── */}
      <motion.section className="insights-section" variants={item}>
        <h2 className="section-title">
          <TrendingUp size={20} className="text-primary" />
          Learning Overview
        </h2>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-label">Documents by Status</span>
            </div>
            <div className="subject-list">
              {[
                { name: 'Processed', progress: documents.length > 0 ? Math.round((documents.filter(d => d.status === 'processed').length / documents.length) * 100) : 0, color: '#58CC02' },
                { name: 'Processing', progress: documents.length > 0 ? Math.round((documents.filter(d => d.status === 'processing').length / documents.length) * 100) : 0, color: '#1CB0F6' },
                { name: 'Error', progress: documents.length > 0 ? Math.round((documents.filter(d => d.status === 'error').length / documents.length) * 100) : 0, color: '#FF4B4B' },
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

          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-label">Study Stats</span>
            </div>
            <div className="subject-list">
              <div className="subject-row">
                <span className="subject-name">Total Docs</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-heading)', fontSize: '18px', marginLeft: 'auto' }}>{documents.length}</span>
              </div>
              <div className="subject-row">
                <span className="subject-name">Total Decks</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-heading)', fontSize: '18px', marginLeft: 'auto' }}>{decks.length}</span>
              </div>
              <div className="subject-row">
                <span className="subject-name">Total Cards</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-heading)', fontSize: '18px', marginLeft: 'auto' }}>{totalCards}</span>
              </div>
              <div className="subject-row">
                <span className="subject-name">Due Today</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '18px', marginLeft: 'auto' }}>{totalDue}</span>
              </div>
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
