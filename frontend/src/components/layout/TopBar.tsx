import { Search, Bell, Sun, Moon, Menu, Check, MailOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../lib/stores/themeStore';
import { authApi } from '../../lib/api/auth';
import './TopBar.css';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { theme, toggleTheme } = useThemeStore();

  // States
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch current user details
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    retry: 1,
  });

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as Element).closest('.topbar-btn')) {
        setShowNotifPanel(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  return (
    <header className="topbar glass" style={{ position: 'relative' }}>
      <div className="topbar-left">
        <button className="btn-icon hide-desktop topbar-menu" onClick={onMenuToggle} aria-label="Menu">
          <Menu size={22} />
        </button>

        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search documents, notes, quizzes..."
            aria-label="Search"
          />
          <kbd className="search-kbd hide-mobile">⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notifications */}
        <button 
          className="btn-icon topbar-btn" 
          aria-label="Notifications"
          onClick={() => setShowNotifPanel(!showNotifPanel)}
          style={{ position: 'relative' }}
        >
          <Bell size={20} />
        </button>

        {/* Theme Toggle */}
        <motion.button
          className="btn-icon topbar-btn theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          whileTap={{ scale: 0.85, rotate: 15 }}
        >
          <motion.div
            key={theme}
            initial={{ rotate: -30, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 30, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25 }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </motion.div>
        </motion.button>

        {/* User Avatar */}
        <button className="topbar-avatar" aria-label="User menu">
          <div className="avatar-circle" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <span>{user?.full_name?.charAt(0).toUpperCase() || 'M'}</span>
            )}
          </div>
        </button>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifPanel && (
          <motion.div 
            ref={panelRef}
            className="notif-dropdown glass"
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', right: '80px', top: '70px', width: '320px',
              borderRadius: '16px', border: '1px solid var(--border-color)',
              zIndex: 1000, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
              maxHeight: '400px', overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span className="font-bold text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                <Bell size={16} className="text-primary" /> Notifications
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <MailOpen size={24} style={{ opacity: 0.3, marginBottom: '8px', marginLeft: 'auto', marginRight: 'auto' }} />
                <p style={{ margin: 0 }}>All caught up! No notifications.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
