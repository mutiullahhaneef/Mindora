import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Sparkles,
  BookOpen,
  Quote,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Info,
  AlertCircle,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { researchApi, type PaperDetail } from '../../lib/api/research';

interface CitationPayload {
  title: string;
  authors: string[];
  year?: number;
  doi?: string;
  source_url?: string;
}
import './ResearchPage.css';

export function PapersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Get paper ID from query params
  const searchParams = new URLSearchParams(location.search);
  const paperId = searchParams.get('id');

  // Active editor states
  const [activeTab, setActiveTab] = useState<'content' | 'citations'>('content');
  const [activeSectionType, setActiveSectionType] = useState('abstract');
  const [editorText, setEditorText] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  // AI draft assistant states
  const [outline, setOutline] = useState('');
  const [assistantContext, setAssistantContext] = useState('');
  const [selectedCitIds, setSelectedCitIds] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // New citation form states
  const [showAddCitModal, setShowAddCitModal] = useState(false);
  const [newCitTitle, setNewCitTitle] = useState('');
  const [newCitAuthors, setNewCitAuthors] = useState('');
  const [newCitYear, setNewCitYear] = useState('');
  const [newCitDoi, setNewCitDoi] = useState('');
  const [newCitUrl, setNewCitUrl] = useState('');

  // Fetch paper details
  const { data: paper, isLoading: paperLoading, error: paperError } = useQuery({
    queryKey: ['paper', paperId],
    queryFn: () => researchApi.getPaper(paperId!),
    enabled: !!paperId,
  });

  // Sync editor content when section type changes or paper loads
  useEffect(() => {
    if (paper) {
      const activeSection = paper.sections.find(s => s.section_type === activeSectionType);
      const content = activeSection?.content || '';
      // Use a ref-based approach via requestAnimationFrame to avoid cascading render warning
      const frame = requestAnimationFrame(() => {
        setEditorText(content);
        setIsSaved(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [paper, activeSectionType]);

  // Save Section Mutation
  const saveSectionMutation = useMutation({
    mutationFn: () => researchApi.updateSection(paperId!, activeSectionType, editorText),
    onSuccess: (updatedSec) => {
      // Optimistically update cache
      qc.setQueryData(['paper', paperId], (oldData: PaperDetail | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          sections: oldData.sections.map(s => s.section_type === activeSectionType ? updatedSec : s)
        };
      });
      setIsSaved(true);
      // Auto-award study XP on saving research sections
      const awardXp = useGamificationStore.getState().awardXp;
      awardXp(20, `Saved Section: ${activeSectionType}`);
    },
  });

  // Generate AI Draft Mutation
  const generateDraftMutation = useMutation({
    mutationFn: () => researchApi.generateSection(paperId!, activeSectionType, outline, assistantContext, selectedCitIds),
    onSuccess: (draftData) => {
      // Append AI generated text to editor and mark unsaved
      setEditorText(prev => prev + "\n\n" + draftData.content);
      setIsSaved(false);
      setShowAiPanel(false);
      setOutline('');
      setAssistantContext('');
      setSelectedCitIds([]);
    },
  });

  // Add Citation Mutation
  const addCitationMutation = useMutation({
    mutationFn: (payload: CitationPayload) => researchApi.addCitation(paperId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paper', paperId] });
      setShowAddCitModal(false);
      setNewCitTitle('');
      setNewCitAuthors('');
      setNewCitYear('');
      setNewCitDoi('');
      setNewCitUrl('');
    },
  });

  // Delete Citation Mutation
  const deleteCitationMutation = useMutation({
    mutationFn: (citId: string) => researchApi.deleteCitation(paperId!, citId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paper', paperId] });
    },
  });

  if (!paperId) {
    return (
      <div className="card glass" style={{ textAlign: 'center', padding: '40px', maxWidth: '600px', margin: '40px auto' }}>
        <AlertCircle size={48} color="#ff4d4d" style={{ marginBottom: '12px' }} />
        <h3>Invalid Workspace Parameters</h3>
        <p className="text-muted text-sm">Please select a valid paper from your Research Workspace main catalog.</p>
        <button className="btn btn-primary" onClick={() => navigate('/research')} style={{ marginTop: '16px' }}>
          Go to Workspace
        </button>
      </div>
    );
  }

  if (paperLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <Loader2 size={36} className="spin text-primary" />
        <p className="text-muted">Loading research publication workspace...</p>
      </div>
    );
  }

  if (paperError || !paper) {
    return (
      <div className="card glass" style={{ textAlign: 'center', padding: '40px', maxWidth: '600px', margin: '40px auto' }}>
        <AlertCircle size={48} color="#ff4d4d" style={{ marginBottom: '12px' }} />
        <h3>Failed to Load Publication</h3>
        <p className="text-muted text-sm">Apologies, we encountered an error fetching this paper database. Verify database is active.</p>
        <button className="btn btn-primary" onClick={() => navigate('/research')} style={{ marginTop: '16px' }}>
          Go Back
        </button>
      </div>
    );
  }

  const handleEditorChange = (val: string) => {
    setEditorText(val);
    setIsSaved(false);
  };

  const handleSaveClick = () => {
    saveSectionMutation.mutate();
  };

  const handleCitationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCitTitle.trim() || !newCitAuthors.trim()) return;
    
    const authorsArr = newCitAuthors.split(',').map(a => a.trim()).filter(Boolean);
    const payload = {
      title: newCitTitle.trim(),
      authors: authorsArr,
      year: newCitYear.trim() ? parseInt(newCitYear) : undefined,
      doi: newCitDoi.trim() || undefined,
      source_url: newCitUrl.trim() || undefined,
    };
    addCitationMutation.mutate(payload);
  };

  const toggleCitSelection = (id: string) => {
    setSelectedCitIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const sectionLabel = activeSectionType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <motion.div 
      className="research-editor-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}
    >
      {/* Editor Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon" onClick={() => navigate('/research')} title="Back to Workspace">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{paper.title}</h2>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Style Format: <strong style={{ textTransform: 'uppercase' }}>{paper.journal_format}</strong> · Status: <strong style={{ color: 'var(--color-primary)' }}>{paper.status}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowAiPanel(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={16} /> AI Co-Writer
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={handleSaveClick}
            disabled={isSaved || saveSectionMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saveSectionMutation.isPending ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isSaved ? 'Saved' : 'Save Section'}
          </button>
        </div>
      </div>

      {/* Editor Layout Grid */}
      <div className="editor-layout-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Workspace Sidebar (Sections list + Citations toggle) */}
        <div className="editor-sidebar card glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="tab-switcher" style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '4px' }}>
            <button 
              className={`btn btn-sm ${activeTab === 'content' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setActiveTab('content')}
              style={{ flex: 1, fontSize: '12px', padding: '6px' }}
            >
              Sections
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'citations' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setActiveTab('citations')}
              style={{ flex: 1, fontSize: '12px', padding: '6px' }}
            >
              Citations ({paper.citations.length})
            </button>
          </div>

          {activeTab === 'content' ? (
            <div className="sections-list-menu" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { type: 'abstract', title: 'Abstract' },
                { type: 'introduction', title: 'Introduction' },
                { type: 'literature_review', title: 'Literature Review' },
                { type: 'methodology', title: 'Methodology' },
                { type: 'results_discussion', title: 'Results & Discussion' },
                { type: 'conclusion', title: 'Conclusion' },
              ].map(sec => (
                <div 
                  key={sec.type}
                  className={`section-menu-item ${activeSectionType === sec.type ? 'active' : ''}`}
                  onClick={() => {
                    if (!isSaved) {
                      if (!confirm("You have unsaved changes in this section. Continue without saving?")) return;
                    }
                    setActiveSectionType(sec.type);
                  }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
                    background: activeSectionType === sec.type ? 'rgba(28, 176, 246, 0.08)' : 'transparent',
                    border: activeSectionType === sec.type ? '1px solid var(--color-primary)' : '1px solid transparent',
                    color: activeSectionType === sec.type ? 'var(--color-primary)' : 'var(--color-text)'
                  }}
                >
                  <span>{sec.title}</span>
                  <ChevronRight size={14} style={{ opacity: activeSectionType === sec.type ? 0.8 : 0.3 }} />
                </div>
              ))}
            </div>
          ) : (
            // Bibliography/Citations sidebar list
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs font-semibold text-muted">Bibliography</span>
                <button className="btn btn-secondary btn-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowAddCitModal(true)}>
                  <Plus size={10} /> Add
                </button>
              </div>

              <div className="sidebar-citations-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                {paper.citations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No citations added yet.
                  </div>
                ) : (
                  paper.citations.map(cit => (
                    <div key={cit.id} className="citation-sidebar-card card" style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontStyle: 'italic', fontWeight: 500, lineHeight: 1.3 }}>{cit.formatted_text}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ opacity: 0.6, fontSize: '10px' }}>DOI: {cit.doi || 'No DOI'}</span>
                        <button 
                          className="btn-icon" 
                          style={{ color: '#ff4d4d', padding: '2px' }}
                          onClick={() => deleteCitationMutation.mutate(cit.id)}
                          title="Delete Citation"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live rich text workspace editor panel */}
        <div className="editor-pane-workspace card glass" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', padding: '24px', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} className="text-primary" />
              <span className="text-sm font-semibold text-primary">{sectionLabel}</span>
            </div>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: isSaved ? 'rgba(88, 204, 2, 0.1)' : 'rgba(255, 150, 0, 0.1)', color: isSaved ? 'var(--color-primary)' : '#ff9600' }}>
              {isSaved ? 'Draft Saved' : 'Unsaved Changes'}
            </span>
          </div>

          <textarea
            className="editor-textarea-field"
            value={editorText}
            onChange={e => handleEditorChange(e.target.value)}
            placeholder={`Draft your academic ${sectionLabel.toLowerCase()} publication text here... Use Markdown for tables, subheadings and structures.`}
            style={{
              flex: 1, minHeight: '400px', width: '100%', resize: 'none', border: 'none', background: 'transparent',
              fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '15px', lineHeight: '1.6', color: 'var(--color-text)', outline: 'none'
            }}
          />
        </div>

      </div>

      {/* AI WRITING ASSISTANT SLIDE-OUT PANEL DRAWER */}
      <AnimatePresence>
        {showAiPanel && (
          <div className="card-gen-modal-overlay" onClick={() => !generateDraftMutation.isPending && setShowAiPanel(false)}>
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
                  <Sparkles size={18} className="text-primary" />
                  <span className="text-sm font-semibold">AI Writing Assistant: {sectionLabel}</span>
                </div>
                <button className="btn-icon" onClick={() => setShowAiPanel(false)} disabled={generateDraftMutation.isPending}>
                  <X size={18} />
                </button>
              </div>

              {generateDraftMutation.isPending ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '50px 20px', textAlign: 'center' }}>
                  <div className="upload-progress-ring spin">
                    <svg viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray="30, 150" />
                    </svg>
                  </div>
                  <h4 style={{ margin: 0 }}>Drafting Academic Publication...</h4>
                  <p className="text-muted text-sm">Mindora AI is organizing literature references, building formal phrasing paradigms, and compiling section text. This will take a moment...</p>
                </div>
              ) : (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(28, 176, 246, 0.05)', padding: '12px', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'start' }}>
                    <Info size={16} className="text-primary" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Outline your structural goals and context. Mindora AI will write a formal publication-ready draft. Any generated text will be appended to the current section!
                    </span>
                  </div>

                  <div className="auth-field" style={{ margin: 0 }}>
                    <label>Outline Goals & Arguments</label>
                    <input
                      type="text"
                      placeholder="e.g. Discuss microservices orchestration patterns and stateful limits..."
                      value={outline}
                      onChange={e => setOutline(e.target.value)}
                    />
                  </div>

                  <div className="auth-field" style={{ margin: 0 }}>
                    <label>Custom Context / Writing Guideline</label>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="e.g. Focus on Kubernetes, cite empirical data on latencies, use active verbs..."
                      value={assistantContext}
                      onChange={e => setAssistantContext(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '10px', borderRadius: '8px', width: '100%', resize: 'none' }}
                    />
                  </div>

                  {/* Citation Checkboxes */}
                  <div className="auth-field" style={{ margin: 0 }}>
                    <label>Integrate Bibliographies & Citations</label>
                    <div className="citations-checkbox-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.02)', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      {paper.citations.length === 0 ? (
                        <span className="text-xs text-muted" style={{ padding: '6px' }}>No references available. Add citations in the Sidebar references panel first!</span>
                      ) : (
                        paper.citations.map(cit => {
                          const isSelected = selectedCitIds.includes(cit.id);
                          return (
                            <div 
                              key={cit.id} 
                              className="cit-checkbox-item" 
                              onClick={() => toggleCitSelection(cit.id)}
                              style={{
                                display: 'flex', gap: '10px', alignItems: 'center', padding: '6px 8px', borderRadius: '6px',
                                border: '1px solid transparent', cursor: 'pointer', background: isSelected ? 'rgba(28, 176, 246, 0.05)' : 'transparent',
                              }}
                            >
                              <div style={{
                                width: '14px', height: '14px', borderRadius: '3px', border: '1px solid var(--color-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--color-primary)' : 'transparent',
                              }}>
                                {isSelected && <Check size={10} color="white" />}
                              </div>
                              <span style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
                                {cit.formatted_text}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '12px' }}
                    onClick={() => generateDraftMutation.mutate()}
                    disabled={!outline.trim()}
                  >
                    <Sparkles size={16} /> Draft Academic Section
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CITATION MODAL */}
      <AnimatePresence>
        {showAddCitModal && (
          <div className="card-gen-modal-overlay" onClick={() => !addCitationMutation.isPending && setShowAddCitModal(false)}>
            <motion.div 
              className="card-gen-modal card glass"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Add Bibliographic Reference</h3>
                <button className="btn-icon" onClick={() => setShowAddCitModal(false)} disabled={addCitationMutation.isPending}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCitationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="auth-field">
                  <label>Publication Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deep Learning Architectures for Academic Analysis"
                    value={newCitTitle}
                    onChange={e => setNewCitTitle(e.target.value)}
                    disabled={addCitationMutation.isPending}
                  />
                </div>

                <div className="auth-field">
                  <label>Authors (comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. J. Smith, A. Johnson, K. Patel"
                    value={newCitAuthors}
                    onChange={e => setNewCitAuthors(e.target.value)}
                    disabled={addCitationMutation.isPending}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="auth-field">
                    <label>Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 2024"
                      value={newCitYear}
                      onChange={e => setNewCitYear(e.target.value)}
                      disabled={addCitationMutation.isPending}
                    />
                  </div>
                  <div className="auth-field">
                    <label>DOI String</label>
                    <input
                      type="text"
                      placeholder="e.g. 10.1016/j.ai.2024"
                      value={newCitDoi}
                      onChange={e => setNewCitDoi(e.target.value)}
                      disabled={addCitationMutation.isPending}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>URL Address link</label>
                  <input
                    type="url"
                    placeholder="e.g. https://arxiv.org/abs/2401.0456"
                    value={newCitUrl}
                    onChange={e => setNewCitUrl(e.target.value)}
                    disabled={addCitationMutation.isPending}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={!newCitTitle.trim() || !newCitAuthors.trim() || addCitationMutation.isPending}
                >
                  {addCitationMutation.isPending ? <Loader2 size={16} className="spin" /> : <Quote size={16} />}
                  {addCitationMutation.isPending ? 'Formatting citation...' : 'Format & Save Citation'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

// Importing store locally for auto-award XP
import { useGamificationStore } from '../../lib/stores/gamificationStore';
