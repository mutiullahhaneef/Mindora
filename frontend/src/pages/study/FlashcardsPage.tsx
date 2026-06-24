import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RotateCcw, Check, Sparkles, X, FileText, HelpCircle, Trophy } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyApi } from '../../lib/api/study';
import type { FlashcardDeck, Flashcard } from '../../lib/api/study';
import './FlashcardsPage.css';

export function FlashcardsPage() {
  const qc = useQueryClient();

  // States
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Fetch flashcard decks
  const { data: decks = [], isLoading: decksLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: studyApi.getDecks,
  });

  // Fetch documents for the generation modal
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: studyApi.getDocuments,
    enabled: showGenModal,
  });

  // Review Card Mutation
  const reviewMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: number }) =>
      studyApi.reviewCard(cardId, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decks'] });
    },
  });

  // Generate Deck Mutation
  const generateDeckMutation = useMutation({
    mutationFn: (docId: string) => studyApi.generateFlashcards(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decks'] });
      setShowGenModal(false);
      setSelectedDocId(null);
    },
  });

  // Start Reviewing a Specific Deck
  const handleStartReview = async (deck: FlashcardDeck) => {
    try {
      const cards = await studyApi.getDeckCards(deck.id);
      
      // Filter to only due cards or review all if none are due
      const now = new Date();
      let dueCards = cards.filter(c => !c.next_review_date || new Date(c.next_review_date) <= now);
      if (dueCards.length === 0) {
        dueCards = cards; // Study all if none are strictly scheduled
      }

      if (dueCards.length > 0) {
        setActiveCards(dueCards);
        setActiveDeckId(deck.id);
        setCurrentCardIdx(0);
        setIsFlipped(false);
        setIsReviewComplete(false);
      } else {
        alert("This deck has no cards in it yet!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start Daily Review (Aggregates all due cards from all decks)
  const handleStartDailyReview = async () => {
    try {
      const allDueCards: Flashcard[] = [];
      const now = new Date();
      
      for (const deck of decks) {
        if (deck.due_count > 0) {
          const cards = await studyApi.getDeckCards(deck.id);
          const due = cards.filter(c => !c.next_review_date || new Date(c.next_review_date) <= now);
          allDueCards.push(...due);
        }
      }

      if (allDueCards.length > 0) {
        setActiveCards(allDueCards);
        setActiveDeckId('daily-review');
        setCurrentCardIdx(0);
        setIsFlipped(false);
        setIsReviewComplete(false);
      } else {
        alert("You have no pending due cards left to review today!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Spaced Repetition Quality Rating
  const handleRateCard = (rating: number) => {
    const activeCard = activeCards[currentCardIdx];
    reviewMutation.mutate({ cardId: activeCard.id, rating });

    // Advance
    if (currentCardIdx < activeCards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIdx(idx => idx + 1);
      }, 200);
    } else {
      setIsReviewComplete(true);
    }
  };

  // Calculate Total Daily Due Cards
  const totalDailyDue = decks.reduce((acc, d) => acc + d.due_count, 0);

  const activeCard = activeCards[currentCardIdx];
  const activeDeckName = activeDeckId === 'daily-review' 
    ? 'Daily Review' 
    : decks.find(d => d.id === activeDeckId)?.title || 'Deck Review';

  return (
    <motion.div className="flashcards-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      
      {/* HEADER SECTION */}
      {activeDeckId === null && (
        <>
          <motion.div className="flashcards-header" initial={{ y: -10 }} animate={{ y: 0 }}>
            <div>
              <h1>Flashcards</h1>
              <p className="text-muted">Smart spaced repetition for better long-term retention</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowGenModal(true)}>
              <Sparkles size={18} />
              Generate Deck
            </button>
          </motion.div>

          {/* Daily Review CTA */}
          <motion.div className="daily-review-banner card glass" initial={{ y: 15 }} animate={{ y: 0 }}>
            <div className="daily-review-info">
              <Brain size={28} className="daily-review-icon animate-float" />
              <div>
                <h3>Daily Study Review</h3>
                <p className="text-sm text-muted">
                  You have <strong>{totalDailyDue} cards</strong> due for spaced repetition today
                </p>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={handleStartDailyReview}
              disabled={totalDailyDue === 0}
            >
              Start Review
            </button>
          </motion.div>

          {/* Decks Grid */}
          <motion.section>
            <h2 className="section-title">
              <Brain size={20} className="text-primary" />
              Your Decks
            </h2>
            
            {decksLoading ? (
              <div className="decks-grid">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="deck-card card skeleton" style={{ height: '180px', borderRadius: '16px' }} />
                ))}
              </div>
            ) : decks.length === 0 ? (
              <div className="card glass" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Brain size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <p>No study decks available yet. Generate a deck from your uploaded PDFs to start studying!</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setShowGenModal(true)}>
                  Generate AI Deck
                </button>
              </div>
            ) : (
              <div className="decks-grid">
                {decks.map((deck) => {
                  const progressPct = deck.card_count > 0 
                    ? Math.round((deck.mastered_count / deck.card_count) * 100) 
                    : 0;

                  return (
                    <motion.div
                      key={deck.id}
                      className="deck-card card glass"
                      whileHover={{ y: -4 }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="deck-color-bar" style={{ background: deck.color }} />
                      <h3 className="deck-title">{deck.title}</h3>
                      <span className="deck-count">{deck.card_count} cards</span>

                      <div className="deck-stats">
                        <div className="deck-stat">
                          <RotateCcw size={14} />
                          <span>{deck.due_count} due</span>
                        </div>
                        <div className="deck-stat deck-stat-mastered">
                          <Check size={14} />
                          <span>{deck.mastered_count} mastered</span>
                        </div>
                      </div>

                      <div className="deck-progress-bar">
                        <div
                          className="deck-progress-fill"
                          style={{
                            width: `${progressPct}%`,
                            background: deck.color,
                          }}
                        />
                      </div>

                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ width: '100%', marginTop: '12px' }}
                        onClick={() => handleStartReview(deck)}
                      >
                        Review
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        </>
      )}

      {/* ACTIVE CARD REVIEW INTERFACE */}
      {activeDeckId !== null && (
        <div className="review-session-container">
          <div className="review-top-meta">
            <span>Deck: <strong>{activeDeckName}</strong></span>
            <span>Card {currentCardIdx + 1} of {activeCards.length}</span>
          </div>

          {!isReviewComplete ? (
            <>
              {/* Spaced Repetition Progress Bar */}
              <div className="progress-bar" style={{ width: '100%' }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${((currentCardIdx) / activeCards.length) * 100}%`, background: 'var(--primary)' }} 
                />
              </div>

              {/* 3D Flip Card */}
              <div className="flashcard-3d-scene" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`flashcard-3d-card ${isFlipped ? 'flipped' : ''}`}>
                  
                  {/* Front Face */}
                  <div className="flashcard-face flashcard-face-front">
                    <HelpCircle size={24} className="text-muted" style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h2>{activeCard?.front_text}</h2>
                    <span className="card-hint">Click card to reveal answer</span>
                  </div>

                  {/* Back Face */}
                  <div className="flashcard-face flashcard-face-back">
                    <Check size={24} className="text-primary" style={{ marginBottom: '16px', opacity: 0.8 }} />
                    <p>{activeCard?.back_text}</p>
                    <span className="card-hint">Click to flip back</span>
                  </div>

                </div>
              </div>

              {/* Spaced Repetition Grading Controls */}
              <div className="rating-controls-container">
                {isFlipped ? (
                  <div className="rating-buttons-grid">
                    <button className="rating-btn rating-btn-again" onClick={() => handleRateCard(0)}>
                      Again
                      <span>Repeat</span>
                    </button>
                    <button className="rating-btn rating-btn-hard" onClick={() => handleRateCard(2)}>
                      Hard
                      <span>Not sure</span>
                    </button>
                    <button className="rating-btn rating-btn-good" onClick={() => handleRateCard(4)}>
                      Good
                      <span>Retained</span>
                    </button>
                    <button className="rating-btn rating-btn-easy" onClick={() => handleRateCard(5)}>
                      Easy
                      <span>Mastered</span>
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-primary tap-to-reveal-btn" onClick={() => setIsFlipped(true)}>
                    Show Answer
                  </button>
                )}
                
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ width: '100%', marginTop: '6px' }}
                  onClick={() => setActiveDeckId(null)}
                >
                  Exit Session
                </button>
              </div>
            </>
          ) : (
            // Review session completed screen
            <motion.div 
              className="quiz-finished-screen card glass" 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }}
              style={{ width: '100%', textAlign: 'center', padding: '30px' }}
            >
              <Trophy size={60} color="var(--primary)" className="animate-float" style={{ marginBottom: '16px' }} />
              <h2>Deck Completed!</h2>
              <p className="text-muted">Excellent job! Spaced repetition variables have been updated dynamically via the SM-2 scheduler.</p>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setActiveDeckId(null)}>
                Return to Decks
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* GENERATE DECK MODAL */}
      <AnimatePresence>
        {showGenModal && (
          <div className="card-gen-modal-overlay" onClick={() => !generateDeckMutation.isPending && setShowGenModal(false)}>
            <motion.div 
              className="card-gen-modal card glass"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Generate AI Flashcard Deck</h3>
                <button 
                  className="btn-icon" 
                  onClick={() => setShowGenModal(false)}
                  disabled={generateDeckMutation.isPending}
                >
                  <X size={18} />
                </button>
              </div>

              {generateDeckMutation.isPending ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '30px 0' }}>
                  <div className="upload-progress-ring spin">
                    <svg viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray="30, 150" />
                    </svg>
                  </div>
                  <h4 style={{ margin: 0 }}>Mindora AI is studying...</h4>
                  <p className="text-muted text-sm" style={{ textAlign: 'center', margin: 0 }}>Parsing your document layout, extracting key academic definitions, and generating spaced repetition flashcard sets. This will take a moment...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted">Select an uploaded study document. Mindora AI will extract key terms and definitions to construct your custom study deck.</p>
                  
                  <div className="doc-select-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {documents.length === 0 ? (
                      <div className="empty-docs-state" style={{ padding: '20px 0' }}>
                        <FileText size={28} className="text-muted" />
                        <p className="text-xs" style={{ marginTop: '8px' }}>No documents uploaded. Upload a PDF in the Study Hub first!</p>
                      </div>
                    ) : (
                      documents.map(doc => (
                        <div 
                          key={doc.id} 
                          className={`select-doc-item ${selectedDocId === doc.id ? 'active' : ''}`}
                          onClick={() => setSelectedDocId(doc.id)}
                          style={{
                            background: selectedDocId === doc.id ? 'rgba(28, 176, 246, 0.08)' : 'transparent',
                            borderColor: selectedDocId === doc.id ? 'var(--primary)' : 'var(--border-color)',
                          }}
                        >
                          <div className="doc-info-side">
                            <FileText size={16} className="text-primary" />
                            <span className="doc-name" style={{ fontSize: '13px' }}>{doc.title}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '12px' }}
                    onClick={() => selectedDocId && generateDeckMutation.mutate(selectedDocId)}
                    disabled={!selectedDocId}
                  >
                    <Sparkles size={16} /> Generate AI Deck
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
