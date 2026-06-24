import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Trophy, Sparkles, AlertCircle, FileText, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyApi } from '../../lib/api/study';
import { useGamificationStore } from '../../lib/stores/gamificationStore';
import './QuizPage.css';

export function QuizPage() {
  const qc = useQueryClient();
  const awardXp = useGamificationStore(state => state.awardXp);
  const updateStreak = useGamificationStore(state => state.updateStreak);

  // States
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Fetch documents
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: studyApi.getDocuments,
  });

  // Fetch quiz questions
  const { data: questions = [], isLoading: quizLoading, error: quizError, refetch } = useQuery({
    queryKey: ['quiz', selectedDocId],
    queryFn: () => studyApi.getQuiz(selectedDocId!),
    enabled: !!selectedDocId,
    retry: false,
  });

  // Re-generate quiz mutation
  const generateQuizMutation = useMutation({
    mutationFn: (docId: string) => studyApi.generateQuiz(docId),
    onSuccess: (data) => {
      qc.setQueryData(['quiz', selectedDocId], data);
      resetQuizState();
    },
  });

  const resetQuizState = () => {
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsFinished(false);
  };

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    resetQuizState();
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setShowResult(true);

    const question = questions[currentQuestionIdx];
    if (index === question.correct_option_index) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Award XP on complete
      const xpReward = score * 25 + 50;
      awardXp(xpReward, `Completed Quiz Arena`);
      updateStreak();
      setIsFinished(true);
    }
  };

  const currentDoc = documents.find(d => d.id === selectedDocId);
  const activeQuestion = questions[currentQuestionIdx];

  return (
    <motion.div className="quiz-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="quiz-header">
        <div>
          <h1>Quiz Arena</h1>
          <p className="text-muted">Test your knowledge on your study documents</p>
        </div>
      </div>

      {!selectedDocId ? (
        // Document Selector Screen
        <motion.div className="doc-select-container card glass" initial={{ y: 20 }} animate={{ y: 0 }}>
          <div className="select-banner">
            <GraduationCap size={48} className="text-primary animate-float" />
            <h2>Choose a study document to start</h2>
            <p className="text-muted text-sm">Mindora AI will fetch or generate a custom multiple-choice quiz based on your document.</p>
          </div>

          <div className="doc-select-list">
            {docsLoading ? (
              [1, 2, 3].map(i => <div key={i} className="select-doc-item skeleton" style={{ height: '70px', borderRadius: '12px' }} />)
            ) : documents.length === 0 ? (
              <div className="empty-docs-state">
                <FileText size={36} className="text-muted" />
                <p>No documents uploaded yet. Go to <a href="/study" className="text-primary font-semibold">Study Hub</a> to upload a PDF!</p>
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="select-doc-item" onClick={() => handleSelectDoc(doc.id)}>
                  <div className="doc-info-side">
                    <FileText size={20} className="text-primary" />
                    <div>
                      <span className="doc-name">{doc.title}</span>
                      <span className="doc-pages">{doc.page_count > 0 ? `${doc.page_count} pages` : 'Document'}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="chevron-icon" />
                </div>
              ))
            )}
          </div>
        </motion.div>
      ) : quizLoading || generateQuizMutation.isPending ? (
        // Loading state
        <div className="quiz-loading-container card glass">
          <div className="upload-progress-ring spin">
            <svg viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray="30, 150" />
            </svg>
          </div>
          <h3>Consulting Mindora AI...</h3>
          <p className="text-muted text-sm">Generating your custom multiple-choice questions from {currentDoc?.title}...</p>
        </div>
      ) : isFinished ? (
        // Quiz finished screen
        <motion.div
          className="quiz-finished-screen card glass"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="quiz-result-card">
            <motion.div className="quiz-trophy" animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.8 }}>
              <Trophy size={64} color="var(--primary)" />
            </motion.div>
            <h1>Quiz Complete! 🎉</h1>
            <p className="quiz-score-text">
              You scored <span className="text-primary">{score}</span> out of <span>{questions.length}</span>
            </p>
            <div className="quiz-score-pct">
              {Math.round((score / questions.length) * 100)}%
            </div>
            <div className="quiz-xp-reward badge badge-xp animate-pulse">
              +{score * 25 + 50} XP
            </div>
            <div className="result-actions">
              <button className="btn btn-secondary btn-lg" onClick={() => setSelectedDocId(null)}>
                Choose Another Doc
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => generateQuizMutation.mutate(selectedDocId)}>
                <Sparkles size={16} /> Regenerate Quiz
              </button>
            </div>
          </div>
        </motion.div>
      ) : quizError || questions.length === 0 ? (
        // Error state
        <div className="quiz-error-container card glass">
          <AlertCircle size={48} color="#ff4d4d" />
          <h3>Error Generating Quiz</h3>
          <p className="text-muted text-sm">{quizError?.toString() || "No questions could be extracted. Please make sure the PDF has readable text."}</p>
          <div className="error-actions">
            <button className="btn btn-secondary" onClick={() => setSelectedDocId(null)}>Go Back</button>
            <button className="btn btn-primary" onClick={() => refetch()}>Try Again</button>
          </div>
        </div>
      ) : (
        // Active Quiz Screen
        <div className="active-quiz-container">
          <div className="quiz-progress-section">
            <div className="quiz-progress-info">
              <span className="text-sm font-semibold">
                Question {currentQuestionIdx + 1} of {questions.length}
              </span>
              <span className="text-sm text-muted">Document: {currentDoc?.title}</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-bar-fill"
                animate={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <motion.div key={currentQuestionIdx} className="quiz-card card glass card-float" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="quiz-question-header">
              <GraduationCap size={22} className="text-primary" />
              <span className="badge badge-accent">Quiz Arena</span>
            </div>

            <h2 className="quiz-question-text">{activeQuestion.question_text}</h2>

            <div className="quiz-options">
              {activeQuestion.options.map((option, idx) => {
                let optionClass = 'quiz-option';
                if (showResult) {
                  if (idx === activeQuestion.correct_option_index) optionClass += ' correct';
                  else if (idx === selectedAnswer) optionClass += ' incorrect';
                }
                if (idx === selectedAnswer) optionClass += ' selected';

                return (
                  <motion.button
                    key={idx}
                    className={optionClass}
                    onClick={() => handleAnswer(idx)}
                    disabled={selectedAnswer !== null}
                    whileHover={selectedAnswer === null ? { scale: 1.005 } : {}}
                    whileTap={selectedAnswer === null ? { scale: 0.995 } : {}}
                  >
                    <span className="quiz-option-letter">{String.fromCharCode(65 + idx)}</span>
                    <span className="quiz-option-text">{option}</span>
                    {showResult && idx === activeQuestion.correct_option_index && <CheckCircle size={20} className="quiz-option-icon" />}
                    {showResult && idx === selectedAnswer && idx !== activeQuestion.correct_option_index && <XCircle size={20} className="quiz-option-icon" />}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  className={`quiz-explanation ${selectedAnswer === activeQuestion.correct_option_index ? 'correct' : 'incorrect'}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <div className="quiz-explanation-header">
                    {selectedAnswer === activeQuestion.correct_option_index ? (
                      <><CheckCircle size={18} /> <strong>Correct! 🎉</strong></>
                    ) : (
                      <><XCircle size={18} /> <strong>Not quite 😅</strong></>
                    )}
                  </div>
                  <p>{activeQuestion.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {showResult && (
              <motion.div className="quiz-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button className="btn btn-primary" onClick={handleNext}>
                  {currentQuestionIdx < questions.length - 1 ? (
                    <>Next Question <ChevronRight size={18} /></>
                  ) : (
                    <>See Results <Trophy size={18} /></>
                  )}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
