import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Palette, Brain, Bell, Shield, Camera, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useThemeStore } from '../../lib/stores/themeStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../lib/api/auth';

const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI Preferences', icon: Brain },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const { theme, toggleTheme } = useThemeStore();
  const queryClient = useQueryClient();

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Avatar states
  const [isUploading, setIsUploading] = useState(false);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await authApi.getMe();
      // Set initial values once loaded
      setFullName(data.full_name);
      setEmail(data.email);
      return data;
    },
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await authApi.updateProfile({ full_name: fullName, email });
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setSaveError(e.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await authApi.uploadAvatar(file);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '900px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <style>{`
        .avatar-overlay-hover:hover {
          opacity: 1 !important;
        }
      `}</style>

      <div>
        <h1>Settings</h1>
        <p className="text-muted">Manage your account and preferences</p>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '200px',
          flexShrink: 0,
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ border: 'none', cursor: 'pointer', background: 'none', textAlign: 'left' }}
            >
              <tab.icon size={18} className="nav-icon" />
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card" style={{ flex: 1, padding: '32px' }}>
          {isUserLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="spin" size={28} />
            </div>
          ) : activeTab === 'account' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h3>Account Settings</h3>
              
              {/* Premium Avatar Upload Workspace */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: '3px solid var(--primary)', flexShrink: 0 }}>
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary), #89E219)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '32px', fontWeight: 'bold' }}>
                      <span style={{ margin: 'auto' }}>{user?.full_name?.charAt(0).toUpperCase() || 'M'}</span>
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <label htmlFor="avatar-file-input" style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: isUploading ? 1 : 0, transition: 'opacity 0.2s', cursor: 'pointer'
                  }}
                  className="avatar-overlay-hover"
                  >
                    {isUploading ? <Loader2 className="spin" color="white" /> : <Camera color="white" size={24} />}
                  </label>
                  <input id="avatar-file-input" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} disabled={isUploading} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Your Profile Photo</h4>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>Click on the image to upload a new avatar. JPG, PNG or GIF.</p>
                </div>
              </div>

              {/* Success/Error displays */}
              {saveSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#58CC02', background: 'rgba(88,204,2,0.08)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(88,204,2,0.2)' }}>
                  <CheckCircle size={16} />
                  Profile updated successfully!
                </div>
              )}
              {saveError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4d', background: 'rgba(255,77,77,0.08)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,77,77,0.2)' }}>
                  <AlertCircle size={16} />
                  {saveError}
                </div>
              )}

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: '6px' }}>Full Name</label>
                  <input className="input" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: '6px' }}>Email</label>
                  <input className="input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spin" style={{ marginRight: '6px' }} /> : null}
                  Save Changes
                </button>
              </form>
            </div>
          ) : activeTab === 'appearance' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3>Appearance</h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div className="font-semibold">Dark Mode</div>
                  <div className="text-sm text-muted">Toggle between light and dark themes</div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={toggleTheme}
                >
                  {theme === 'light' ? '🌙 Enable Dark' : '☀️ Enable Light'}
                </button>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div className="font-semibold">Animations</div>
                  <div className="text-sm text-muted">Enable smooth transitions and micro-interactions</div>
                </div>
                <span className="badge badge-primary">Enabled</span>
              </div>
            </div>
          ) : activeTab === 'ai' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3>AI Preferences</h3>
              <div style={{
                padding: '16px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div className="font-semibold" style={{ marginBottom: '4px' }}>AI Model</div>
                <div className="text-sm text-muted">GPT-4o (Cloud) — High quality, requires internet</div>
              </div>
              <div style={{
                padding: '16px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div className="font-semibold" style={{ marginBottom: '4px' }}>Offline Mode</div>
                <div className="text-sm text-muted">Ollama (Local) — Available when disconnected</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', gap: '12px' }}>
              <SettingsIcon size={40} className="text-muted" />
              <h3>Coming Soon</h3>
              <p className="text-sm text-muted">This section is under development</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
