import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../lib/api/auth';
import {
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  Brain,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/study', icon: BookOpen, label: 'Study Hub' },
  { to: '/flashcards', icon: Brain, label: 'Flashcards' },
  { to: '/quiz', icon: GraduationCap, label: 'Quiz Arena' },
  { to: '/research', icon: FlaskConical, label: 'Research' },
];

const bottomNavItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    retry: 1,
  });

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Sparkles size={24} />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  className="logo-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Mindora
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button className="sidebar-toggle btn-icon" onClick={onToggle} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* User profile card */}
        <AnimatePresence>
          {!collapsed && user && (
            <motion.div
              className="sidebar-profile-card"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px', margin: '0 16px 16px 16px', border: '1px solid var(--border-color)',
                textAlign: 'left'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--primary)' }}>
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary), #89E219)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-color)', fontWeight: 'bold' }}>
                  {user.full_name}
                </span>
                <span className="text-muted" style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && user && (
          <div 
            style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', margin: '12px auto', border: '2px solid var(--primary)', cursor: 'pointer' }}
            data-tooltip={user.full_name}
          >
            {user.avatar_url ? (
              <img 
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary), #89E219)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive || (item.to !== '/' && location.pathname.startsWith(item.to)) ? 'active' : ''}`
                }
                end={item.to === '/'}
              >
                <item.icon size={20} className="nav-icon" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      className="nav-label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="sidebar-bottom">
          <div className="divider" />
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={20} className="nav-icon" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    className="nav-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="sidebar-overlay hide-desktop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>
    </>
  );
}
