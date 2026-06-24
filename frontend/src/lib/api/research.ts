import { apiClient } from './client';

export interface PaperSection {
  id: string;
  section_type: string;
  content: string;
  order_index: number;
}

export interface Citation {
  id: string;
  doi?: string;
  title: string;
  authors: string[];
  year?: number;
  source_url?: string;
  formatted_text?: string;
}

export interface Paper {
  id: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed';
  journal_format?: string;
  created_at: string;
}

export interface PaperDetail extends Paper {
  sections: PaperSection[];
  citations: Citation[];
}

export interface CitationSearchResult {
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  doi?: string;
  source_url?: string;
}

// All backend responses are wrapped: { success, data: <T>, message }
export const researchApi = {
  // Papers CRUD
  getPapers: async (): Promise<Paper[]> => {
    const res = await apiClient.get('/research/papers');
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },

  createPaper: async (title: string, journalFormat = 'apa'): Promise<PaperDetail> => {
    const res = await apiClient.post('/research/papers', { title, journal_format: journalFormat });
    return res.data?.data;
  },

  getPaper: async (id: string): Promise<PaperDetail> => {
    const res = await apiClient.get(`/research/papers/${id}`);
    return res.data?.data;
  },

  updatePaper: async (id: string, payload: Partial<Omit<Paper, 'id' | 'created_at'>>): Promise<Paper> => {
    const res = await apiClient.put(`/research/papers/${id}`, payload);
    return res.data?.data;
  },

  deletePaper: async (id: string): Promise<void> => {
    await apiClient.delete(`/research/papers/${id}`);
  },

  // Sections
  updateSection: async (paperId: string, sectionType: string, content: string): Promise<PaperSection> => {
    const res = await apiClient.put(`/research/papers/${paperId}/sections/${sectionType}`, { content });
    return res.data?.data;
  },

  generateSection: async (
    paperId: string,
    sectionType: string,
    outline: string,
    context: string,
    citationIds: string[]
  ): Promise<{ section_type: string; content: string }> => {
    const res = await apiClient.post(`/research/papers/${paperId}/generate`, {
      section_type: sectionType,
      outline,
      context,
      citation_ids: citationIds,
    });
    return res.data?.data;
  },

  // Citations
  addCitation: async (
    paperId: string,
    payload: { title: string; authors: string[]; year?: number; doi?: string; source_url?: string }
  ): Promise<Citation> => {
    const res = await apiClient.post(`/research/papers/${paperId}/citations`, payload);
    return res.data?.data;
  },

  deleteCitation: async (paperId: string, citationId: string): Promise<void> => {
    await apiClient.delete(`/research/papers/${paperId}/citations/${citationId}`);
  },

  // AI Tools
  paraphraseText: async (text: string, tone = 'academic'): Promise<string> => {
    const res = await apiClient.post('/research/tools/paraphrase', { text, tone });
    return res.data?.data?.paraphrased ?? res.data?.paraphrased ?? '';
  },

  checkGrammar: async (text: string): Promise<{ corrected: string; suggestions: string[] }> => {
    const res = await apiClient.post('/research/tools/grammar', { text });
    return res.data?.data ?? res.data;
  },

  // Search Papers
  searchPapers: async (q: string): Promise<CitationSearchResult[]> => {
    const res = await apiClient.get('/research/search', { params: { q } });
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },
};
