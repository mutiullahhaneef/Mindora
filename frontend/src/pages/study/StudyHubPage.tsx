import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  MessageSquare,
  BookOpen,
  Search,
  Brain,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Send,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { studyApi } from '../../lib/api/study';
import type { ChatMessage } from '../../lib/api/study';
import './StudyHubPage.css';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function StudyHubPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Chat Drawer States
  const [chatDocId, setChatDocId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: studyApi.getDocuments,
    retry: 1,
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => studyApi.uploadDocument(file, setUploadProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      setUploadProgress(null);
      setUploadError('');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { status?: number; data?: { detail?: string; message?: string } } };
      if (e.response?.status === 401) {
        setUploadError('Authentication required. Please log in again.');
      } else {
        setUploadError(e.response?.data?.detail || e.response?.data?.message || 'Upload failed. Please try again.');
      }
      setUploadProgress(null);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: studyApi.deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });

  // Generate Flashcards Mutation
  const generateCardsMutation = useMutation({
    mutationFn: (docId: string) => studyApi.generateFlashcards(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decks'] });
      navigate('/flashcards');
    },
  });

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.pdf') && file.type !== 'text/plain') {
      setUploadError('Only PDF files are supported.');
      return;
    }
    setUploadError('');
    uploadMutation.mutate(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.name.endsWith('.pdf') && file.type !== 'text/plain') {
        setUploadError('Only PDF files are supported.');
        return;
      }
      setUploadError('');
      uploadMutation.mutate(file);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open Chat Drawer with PDF context
  const handleOpenChat = (docId: string) => {
    setChatDocId(docId);
    const docTitle = documents.find(d => d.id === docId)?.title || 'document';
    setChatMessages([
      {
        role: 'assistant',
        content: `Hi there! 👋 I am your study assistant. I have reviewed **${docTitle}**. Ask me any questions, request summaries, or let me explain complex terms!`,
      },
    ]);
    setChatInput('');

    // Establish WebSocket Connection for Real-time streaming
    if (wsRef.current) {
      wsRef.current.close();
    }

    const token = localStorage.getItem('mindora-token') || '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/api/v1/study/chat/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Study Chat WebSocket connected.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'token') {
          setChatMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + data.content }
              ];
            }
            return [...prev, { role: 'assistant', content: data.content }];
          });
        } else if (data.type === 'done') {
          setIsChatSending(false);
        } else if (data.type === 'error') {
          setChatMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Error: ${data.content}` }
          ]);
          setIsChatSending(false);
        }
      } catch (err) {
        console.error('Failed parsing token', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WS Error', err);
      setIsChatSending(false);
    };

    ws.onclose = () => {
      console.log('Study Chat WS closed.');
      setIsChatSending(false);
    };
  };

  const handleCloseChat = () => {
    setChatDocId(null);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Send Chat message via WebSocket
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatDocId || isChatSending) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: '' } // empty token buffer
    ]);
    setIsChatSending(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        document_id: chatDocId,
        query: userMsg,
        history: chatMessages.slice(1).map(m => ({ role: m.role, content: m.content }))
      }));
    } else {
      setChatMessages(prev => [
        ...prev.slice(0, -2),
        { role: 'assistant', content: 'Connection lost. Please close and re-open the drawer.' }
      ]);
      setIsChatSending(false);
    }
  };

  const selectedChatDoc = documents.find(d => d.id === chatDocId);

  return (
    <motion.div className="study-hub" variants={container} initial="hidden" animate="show">
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        .typing-cursor {
          display: inline-block;
          width: 6px;
          height: 14px;
          background: var(--primary);
          animation: blink 1s step-end infinite;
          margin-left: 2px;
        }
      `}</style>
      
      <motion.div className="study-header" variants={item}>
        <div>
          <h1>Study Hub</h1>
          <p className="text-muted">Upload study documents and interact with AI assistance</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
          {uploadMutation.isPending ? 'Uploading...' : 'Upload PDF'}
        </button>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,text/plain"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {/* Upload Zone */}
      <motion.div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        variants={item}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
        style={{ cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer' }}
      >
        <div className="upload-zone-content">
          {uploadMutation.isPending ? (
            <>
              <div className="upload-progress-ring">
                <svg viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke="var(--primary)" strokeWidth="4"
                    strokeDasharray={`${(uploadProgress ?? 0) * 1.508}, 150.8`}
                    strokeLinecap="round"
                    transform="rotate(-90 28 28)"
                    style={{ transition: 'stroke-dasharray 0.3s' }}
                  />
                </svg>
                <span className="upload-progress-text">{uploadProgress ?? 0}%</span>
              </div>
              <p className="text-muted text-sm" style={{ marginTop: '12px' }}>Uploading your document...</p>
            </>
          ) : (
            <>
              <div className="upload-icon-wrapper">
                <Upload size={32} />
              </div>
              <h3>Drag & drop your PDF here</h3>
              <p className="text-muted text-sm">or click to browse • Max 50MB • PDF files only</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse Files
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Error display */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4d',
              background: 'rgba(255,77,77,0.08)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,77,77,0.2)' }}
          >
            <AlertCircle size={16} />
            {uploadError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents List */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <FileText size={20} className="text-primary" />
          Your Documents {documents.length > 0 && <span className="badge">{documents.length}</span>}
        </h2>
        <div className="documents-grid">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="document-card card skeleton" style={{ height: '100px' }} />)
          ) : documents.length === 0 ? (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p>No documents yet — upload your first PDF to get started!</p>
            </div>
          ) : (
            <>
              {documents.map((doc) => {
                const isGenPending = generateCardsMutation.isPending && generateCardsMutation.variables === doc.id;

                return (
                  <motion.div key={doc.id} className="document-card card" whileHover={{ y: -3 }} layout>
                    <div className="document-icon">
                      <FileText size={28} />
                    </div>
                    <div className="document-info">
                      <span className="document-title">{doc.title}</span>
                      <span className="document-meta">
                        {doc.page_count > 0 ? `${doc.page_count} pages` : 'Document'} • {formatDate(doc.created_at)}
                      </span>
                    </div>
                    <div className={`document-status ${isGenPending ? 'processing' : doc.status}`}>
                      {isGenPending ? (
                        <><Loader2 size={13} className="spin" /> Generating Decks</>
                      ) : doc.status === 'processed' ? (
                        <><CheckCircle size={13} /> Ready</>
                      ) : doc.status === 'processing' ? (
                        <><Loader2 size={13} className="spin" /> Processing</>
                      ) : (
                        <><AlertCircle size={13} /> Error</>
                      )}
                    </div>
                    <div className="document-actions">
                      <button 
                        className="btn btn-sm btn-ghost" 
                        title="Chat with AI"
                        onClick={() => handleOpenChat(doc.id)}
                        disabled={isGenPending}
                      >
                        <MessageSquare size={16} /> Chat
                      </button>
                      <button 
                        className="btn btn-sm btn-ghost" 
                        title="Generate flashcards"
                        onClick={() => generateCardsMutation.mutate(doc.id)}
                        disabled={isGenPending || generateCardsMutation.isPending}
                      >
                        <Brain size={16} /> Cards
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        title="Delete"
                        style={{ color: '#ff4d4d' }}
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={isGenPending}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {/* Add New Card */}
              <motion.div
                className="document-card document-card-new card"
                whileHover={{ y: -3 }}
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <Plus size={32} className="text-muted" />
                <span className="text-muted font-medium">Add Document</span>
              </motion.div>
            </>
          )}
        </div>
      </motion.section>

      {/* AI Features Grid */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <Sparkles size={20} className="text-primary" />
          AI Study Tools
        </h2>
        <div className="ai-tools-grid">
          {[
            { icon: MessageSquare, label: 'AI Study Chat', desc: 'Ask questions about your documents', color: '#58CC02', available: true },
            { icon: Brain, label: 'Smart Flashcards', desc: 'Auto-generated from your material', color: '#1CB0F6', available: true },
            { icon: BookOpen, label: 'Quiz Arena', desc: 'Auto-generated interactive quizzes', color: '#FF9600', available: true },
            { icon: Search, label: 'Weak Topic Detection', desc: 'Find gaps in your understanding', color: '#A855F7', available: false },
          ].map((tool) => (
            <motion.div 
              key={tool.label} 
              className="ai-tool-card" 
              whileHover={{ y: -2 }} 
              style={{ opacity: tool.available ? 1 : 0.65, cursor: tool.available ? 'pointer' : 'default' }}
              onClick={() => {
                if (tool.label === 'Quiz Arena') navigate('/quiz');
                if (tool.label === 'Smart Flashcards') navigate('/flashcards');
              }}
            >
              <div className="ai-tool-icon" style={{ background: tool.color }}>
                <tool.icon size={20} color="white" />
              </div>
              <div className="ai-tool-info">
                <span className="ai-tool-label">
                  {tool.label}
                  {!tool.available && <span className="badge" style={{ marginLeft: '6px', fontSize: '10px' }}>Coming Soon</span>}
                </span>
                <span className="ai-tool-desc">{tool.desc}</span>
              </div>
              <ArrowRight size={16} className="ai-tool-arrow" />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CONTEXTUAL STUDY CHAT SIDEBAR DRAWER */}
      <AnimatePresence>
        {chatDocId && (
          <div className="card-gen-modal-overlay" onClick={() => !isChatSending && handleCloseChat()}>
            <motion.div 
              className="orb-panel glass active-drawer"
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, width: '450px', maxWidth: '100%',
                borderRadius: '24px 0 0 24px', zIndex: 1001, height: '100vh', display: 'flex', flexDirection: 'column'
              }}
            >
              <div className="orb-panel-header" style={{ padding: '20px' }}>
                <div className="orb-panel-title">
                  <MessageSquare size={18} className="text-primary" />
                  <span className="text-sm font-semibold" style={{ display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedChatDoc?.title}
                  </span>
                </div>
                <button className="btn-icon" onClick={handleCloseChat} disabled={isChatSending}>
                  <X size={18} />
                </button>
              </div>

              {/* Chat Messages Logs */}
              <div className="orb-panel-messages" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`orb-message orb-message-${msg.role === 'user' ? 'user' : 'ai'}`}>
                    {msg.role !== 'user' && (
                      <div className="orb-message-avatar">
                        <Sparkles size={12} />
                      </div>
                    )}
                    <div className="orb-message-content">
                      <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-line', lineHeight: '1.4', display: 'flex', alignItems: 'center' }}>
                        {msg.content || (idx === chatMessages.length - 1 && <span className="typing-cursor" />)}
                      </p>
                    </div>
                  </div>
                ))}
                {isChatSending && (
                  <div className="orb-message orb-message-ai">
                    <div className="orb-message-avatar spin">
                      <Loader2 size={12} />
                    </div>
                    <div className="orb-message-content">
                      <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>Mindora AI is researching your document...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat inputs */}
              <form onSubmit={handleSendChat} className="orb-panel-input" style={{ padding: '20px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask a question about this document..."
                  className="orb-input"
                  style={{ flex: 1 }}
                  disabled={isChatSending}
                />
                <button
                  type="submit"
                  className="btn-icon orb-send"
                  disabled={!chatInput.trim() || isChatSending}
                >
                  <Send size={16} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
