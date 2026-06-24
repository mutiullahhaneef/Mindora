import { motion, AnimatePresence } from 'framer-motion';
import { useGamificationStore } from '../../lib/stores/gamificationStore';
import './XPPopup.css';

export function XPPopup() {
  const { showXpPopup, dismissXpPopup } = useGamificationStore();

  return (
    <AnimatePresence>
      {showXpPopup && (
        <motion.div
          className="xp-popup"
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onAnimationComplete={() => {
            setTimeout(dismissXpPopup, 2000);
          }}
        >
          <div className="xp-popup-icon">⚡</div>
          <div className="xp-popup-content">
            <span className="xp-popup-amount">+{showXpPopup.amount} XP</span>
            <span className="xp-popup-action">{showXpPopup.action}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
