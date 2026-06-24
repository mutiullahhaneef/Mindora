import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical,
  Plus,
  Search,
  FileText,
  Quote,
  PenTool,
  Wand2,
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  Sparkles,
} from 'lucide-react';
import { researchApi } from '../../lib/api/research';
import './ResearchPage.css';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const searchSources = [
  { name: 'Google Scholar', papers: '~400M', color: '#4285F4' },
  { name: 'arXiv', papers: '~2.4M', color: '#B31B1B' },
  { name: 'Semantic Scholar', papers: '~200M', color: '#1857B6' },
  { name: 'CrossRef', papers: '~130M', color: '#EF5350' },
  { name: 'PubMed', papers: '~36M', color: '#326599' },
];

export function ResearchPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Dialog / Modal States
  const [showNewPaperModal, setShowNewPaperModal] = useState(false);
  const [newPaperTitle, setNewPaperTitle] = useState('');
  const [newPaperFormat, setNewPaperFormat] = useState('apa');

  // Writing Tool States
  const [activeTool, setActiveTool] = useState<'paraphrase' | 'grammar' | 'citation' | null>(null);
  const [toolInput, setToolInput] = useState('');
  const [toolOutput, setToolOutput] = useState<string | { corrected: string; suggestions: string[] } | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [citationTone, setCitationTone] = useState('academic');

  // Paper Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fetch papers from DB
  const { data: papers = [], isLoading: papersLoading } = useQuery({
    queryKey: ['papers'],
    queryFn: researchApi.getPapers,
  });

  // Search papers Query
  const { data: searchResults = [], isLoading: searchLoading, refetch: executeSearch } = useQuery({
    queryKey: ['paper-search', searchQuery],
    queryFn: () => researchApi.searchPapers(searchQuery),
    enabled: false,
  });

  // Create Paper Mutation
  const createPaperMutation = useMutation({
    mutationFn: () => researchApi.createPaper(newPaperTitle, newPaperFormat),
    onSuccess: (newPaper) => {
      qc.invalidateQueries({ queryKey: ['papers'] });
      setShowNewPaperModal(false);
      setNewPaperTitle('');
      // Redirect straight to the editor workspace
      navigate(`/papers?id=${newPaper.id}`);
    },
  });

  const handleCreatePaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaperTitle.trim()) return;
    createPaperMutation.mutate();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSearchResults(true);
    executeSearch();
  };

  // Run AI writing tool
  const handleRunTool = async () => {
    if (!toolInput.trim()) return;
    setToolLoading(true);
    setToolOutput(null);

    try {
      if (activeTool === 'paraphrase') {
        const paraphrased = await researchApi.paraphraseText(toolInput, citationTone);
        setToolOutput(paraphrased);
      } else if (activeTool === 'grammar') {
        const result = await researchApi.checkGrammar(toolInput);
        setToolOutput(result);
      }
    } catch (err) {
      console.error(err);
      setToolOutput("Error communicating with AI workspace. Please try again.");
    } finally {
      setToolLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const grammarOutput = toolOutput && typeof toolOutput === 'object' ? (toolOutput as { corrected: string, suggestions: string[] }) : null;

  return (
    <motion.div className="research-page" variants={container} initial="hidden" animate="show">
      
      <motion.div className="research-header" variants={item}>
        <div>
          <h1>Research Workspace</h1>
          <p className="text-muted">Write, cite, and publish academic research papers with AI</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewPaperModal(true)}>
          <Plus size={18} />
          New Paper
        </button>
      </motion.div>

      {/* Papers List */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <FileText size={20} className="text-primary" />
          Your Papers
        </h2>
        
        {papersLoading ? (
          <div className="papers-list">
            {[1, 2].map(i => <div key={i} className="paper-card skeleton" style={{ height: '70px', borderRadius: '14px' }} />)}
          </div>
        ) : papers.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <FlaskConical size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p>No papers drafted yet — create your first research workspace now!</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setShowNewPaperModal(true)}>
              Draft New Paper
            </button>
          </div>
        ) : (
          <div className="papers-list">
            {papers.map((paper) => (
              <motion.div 
                key={paper.id} 
                className="paper-card card glass" 
                whileHover={{ y: -2 }}
                onClick={() => navigate(`/papers?id=${paper.id}`)}
              >
                <div className="paper-info">
                  <FlaskConical size={20} className="paper-icon" />
                  <div>
                    <span className="paper-title">{paper.title}</span>
                    <span className="paper-meta">
                      Journal Style: <strong style={{ textTransform: 'uppercase' }}>{paper.journal_format}</strong> •{' '}
                      <span className={`paper-status-text ${paper.status}`}>
                        {paper.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="paper-progress">
                  <span className="text-xs text-muted" style={{ marginRight: '8px' }}>Open Editor</span>
                  <ArrowRight size={18} className="paper-arrow" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* AI Writing Tools */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <Wand2 size={20} className="text-primary" />
          AI Writing Tools
        </h2>
        <div className="writing-tools-grid">
          {[
            { key: 'paraphrase', icon: PenTool, label: 'Paraphraser', desc: 'Rewrite with academic tone', color: '#58CC02' },
            { key: 'grammar', icon: Wand2, label: 'Grammar Helper', desc: 'Fix errors & improve flow', color: '#1CB0F6' },
            { key: 'citation', icon: Quote, label: 'Citation Search', desc: 'APA, MLA, IEEE database', color: '#FF9600' },
          ].map((tool) => (
            <motion.div
              key={tool.label}
              className="writing-tool-card card glass"
              whileHover={{ y: -3 }}
              onClick={() => {
                if (tool.key === 'citation') {
                  setSearchQuery('');
                  setShowSearchResults(false);
                  const searchEl = document.getElementById('academic-search-input');
                  searchEl?.scrollIntoView({ behavior: 'smooth' });
                  searchEl?.focus();
                } else {
                  setActiveTool(tool.key as 'paraphrase' | 'grammar');
                  setToolInput('');
                  setToolOutput(null);
                }
              }}
            >
              <div className="writing-tool-icon" style={{ background: tool.color }}>
                <tool.icon size={22} color="white" />
              </div>
              <span className="writing-tool-label">{tool.label}</span>
              <span className="writing-tool-desc">{tool.desc}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Research Search */}
      <motion.section variants={item}>
        <h2 className="section-title">
          <Search size={20} className="text-primary" />
          Search Papers & Generate Citations
        </h2>
        <form onSubmit={handleSearchSubmit} className="search-section card glass">
          <div className="search-input-wrapper">
            <Search size={20} className="search-input-icon" />
            <input
              id="academic-search-input"
              type="text"
              className="input search-large-input"
              placeholder="Search millions of papers (e.g. quantum computing, microservices)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </div>
          
          <div className="search-sources">
            {searchSources.map((source) => (
              <div key={source.name} className="search-source-chip">
                <CheckCircle2 size={14} style={{ color: source.color }} />
                <span>{source.name}</span>
                <span className="source-count">{source.papers}</span>
              </div>
            ))}
          </div>
        </form>
      </motion.section>

      {/* SEARCH RESULTS MODAL */}
      <AnimatePresence>
        {showSearchResults && (
          <div className="card-gen-modal-overlay" onClick={() => setShowSearchResults(false)}>
            <motion.div 
              className="card-gen-modal card glass"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              style={{ maxWidth: '650px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Search Results: "{searchQuery}"</h3>
                <button className="btn-icon" onClick={() => setShowSearchResults(false)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
                {searchLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                    <Loader2 size={36} className="spin text-primary" />
                    <p className="text-muted text-sm">Querying Google Scholar & CrossRef index...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={32} style={{ marginBottom: '8px' }} />
                    <p>No publications matching your query could be found.</p>
                  </div>
                ) : (
                  searchResults.map((result, idx) => {
                    const firstAuthor = result.authors[0] || 'Unknown';
                    const citationAPA = `${firstAuthor} et al. (${result.year}). *${result.title}*.`;

                    return (
                      <div key={idx} className="search-result-card card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{result.title}</h4>
                          <span className="badge badge-accent">{result.year}</span>
                        </div>
                        <p style={{ margin: '6px 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Authors: <strong>{result.authors.join(', ')}</strong>
                        </p>
                        <p style={{ margin: '8px 0', fontSize: '13px', lineHeight: '1.4' }}>{result.abstract}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Quote size={10} /> {result.doi || 'No DOI'}
                          </span>
                          
                          <button 
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleCopy(citationAPA, idx)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            {copiedIndex === idx ? <Check size={12} color="var(--color-primary)" /> : <Copy size={12} />}
                            {copiedIndex === idx ? 'Copied' : 'Copy APA'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW PAPER MODAL */}
      <AnimatePresence>
        {showNewPaperModal && (
          <div className="card-gen-modal-overlay" onClick={() => !createPaperMutation.isPending && setShowNewPaperModal(false)}>
            <motion.div 
              className="card-gen-modal card glass"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Draft New Research Paper</h3>
                <button className="btn-icon" onClick={() => setShowNewPaperModal(false)} disabled={createPaperMutation.isPending}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePaper} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="auth-field">
                  <label>Paper Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quantum Algorithms for Deep Convolutional Networks..."
                    value={newPaperTitle}
                    onChange={e => setNewPaperTitle(e.target.value)}
                    disabled={createPaperMutation.isPending}
                  />
                </div>

                <div className="auth-field">
                  <label>Journal Citation Format Style</label>
                  <select
                    className="input"
                    value={newPaperFormat}
                    onChange={e => setNewPaperFormat(e.target.value)}
                    disabled={createPaperMutation.isPending}
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '10px', borderRadius: '8px' }}
                  >
                    <option value="apa">APA 7th Edition</option>
                    <option value="mla">MLA 9th Edition</option>
                    <option value="ieee">IEEE Format</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={!newPaperTitle.trim() || createPaperMutation.isPending}
                >
                  {createPaperMutation.isPending ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  {createPaperMutation.isPending ? 'Generating Workspace...' : 'Create Paper Workspace'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI UTILITIES SLIDE-OUT OVERLAY DRAWER */}
      <AnimatePresence>
        {activeTool && (
          <div className="card-gen-modal-overlay" onClick={() => !toolLoading && setActiveTool(null)}>
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
                  {activeTool === 'paraphrase' ? <PenTool size={18} className="text-primary" /> : <Wand2 size={18} className="text-primary" />}
                  <span className="text-sm font-semibold">
                    {activeTool === 'paraphrase' ? 'AI Academic Paraphraser' : 'AI Grammar Proofreader'}
                  </span>
                </div>
                <button className="btn-icon" onClick={() => setActiveTool(null)} disabled={toolLoading}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  {activeTool === 'paraphrase' 
                    ? 'Enter a sentence or paragraph. Mindora AI will rewrite it with structured, formal academic syntax suitable for top-tier peer publications.'
                    : 'Enter an academic paragraph. Mindora AI will proofread spelling, optimize flow, and highlight specific grammar recommendations.'}
                </p>

                <div className="auth-field" style={{ margin: 0 }}>
                  <label>Your Text</label>
                  <textarea
                    className="input"
                    rows={6}
                    placeholder="Type or paste your academic writing here..."
                    value={toolInput}
                    onChange={e => setToolInput(e.target.value)}
                    disabled={toolLoading}
                    style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '12px', borderRadius: '10px', width: '100%', resize: 'vertical' }}
                  />
                </div>

                {activeTool === 'paraphrase' && (
                  <div className="auth-field" style={{ margin: 0 }}>
                    <label>Target Tone Style</label>
                    <select
                      className="input"
                      value={citationTone}
                      onChange={e => setCitationTone(e.target.value)}
                      disabled={toolLoading}
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '10px', borderRadius: '8px' }}
                    >
                      <option value="academic">Formal Academic (Recommended)</option>
                      <option value="professional">Professional</option>
                      <option value="simplified">Simplified / ELI10</option>
                    </select>
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  onClick={handleRunTool} 
                  disabled={!toolInput.trim() || toolLoading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {toolLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  {toolLoading ? 'Processing with AI...' : activeTool === 'paraphrase' ? 'Rewrite Section' : 'Proofread Text'}
                </button>

                {toolOutput && (
                  <motion.div 
                    className="tool-output-box card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'rgba(88, 204, 2, 0.05)', border: '1px solid rgba(88, 204, 2, 0.2)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-xs font-semibold text-primary">Mindora AI Recommendation:</span>
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleCopy(grammarOutput ? grammarOutput.corrected : (toolOutput as string), 999)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copiedIndex === 999 ? <Check size={10} color="var(--color-primary)" /> : <Copy size={10} />}
                        {copiedIndex === 999 ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                      {grammarOutput ? grammarOutput.corrected : (toolOutput as string)}
                    </p>

                    {grammarOutput && grammarOutput.suggestions && grammarOutput.suggestions.length > 0 && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid rgba(88, 204, 2, 0.1)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Suggestions:</span>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {grammarOutput.suggestions.map((sug: string, i: number) => <li key={i}>{sug}</li>)}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
