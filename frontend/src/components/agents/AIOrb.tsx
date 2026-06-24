import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Mic } from 'lucide-react';
import { useThemeStore } from '../../lib/stores/themeStore';
import './AIOrb.css';

export function AIOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { theme } = useThemeStore();

  const orbColor = theme === 'dark' ? 'orb-neon' : 'orb-green';

  return (
    <>
      {/* Floating Orb Button */}
      <motion.button
        className={`ai-orb ${orbColor} ${isOpen ? 'orb-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="AI Assistant"
        layout
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="sparkle"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="orb-icon-wrapper"
            >
              <Sparkles size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="orb-panel glass"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="orb-panel-header">
              <div className="orb-panel-title">
                <Sparkles size={18} className="text-primary" />
                <span>Mindora AI</span>
              </div>
              <span className="badge badge-primary">Online</span>
            </div>

            <div className="orb-panel-messages">
              <div className="orb-message orb-message-ai">
                <div className="orb-message-avatar">
                  <Sparkles size={14} />
                </div>
                <div className="orb-message-content">
                  <p>Hey there! 👋 I'm your Mindora AI assistant. I can help you study, research, or answer any questions about the current page.</p>
                  <span className="orb-message-time">Just now</span>
                </div>
              </div>
            </div>

            <div className="orb-panel-input">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="orb-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && message.trim()) {
                    setMessage('');
                  }
                }}
              />
              <button className="btn-icon orb-voice" aria-label="Voice input">
                <Mic size={18} />
              </button>
              <button
                className="btn-icon orb-send"
                aria-label="Send message"
                disabled={!message.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
