import { apiClient } from './client';

// ─── Document ─────────────────────────────────────────────────────────────────

// Normalized Document shape used by the UI
export interface Document {
  id: string;
  title: string;          // mapped from backend's `filename`
  page_count: number;
  status: 'processing' | 'processed' | 'error';
  created_at: string;
  file_url: string;
}

// Raw shape returned by the backend DocumentResponse schema
interface RawDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  page_count: number | null;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

/** Maps backend status values → UI status values */
function normalizeStatus(status: RawDocument['status']): Document['status'] {
  if (status === 'ready') return 'processed';
  if (status === 'failed') return 'error';
  return 'processing'; // pending & processing both show as "processing" in UI
}

function mapDocument(raw: RawDocument): Document {
  return {
    id: raw.id,
    title: raw.filename,
    page_count: raw.page_count ?? 0,
    status: normalizeStatus(raw.status),
    created_at: raw.created_at,
    file_url: '',
  };
}

// ─── Other types ──────────────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  deck_id: string;
  front_text: string;
  back_text: string;
  interval: number;
  repetition: number;
  easiness_factor: number;
  next_review_date: string | null;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  color: string;
  card_count: number;
  due_count: number;
  mastered_count: number;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const studyApi = {
  // ── Document Operations ──────────────────────────────────────────────────

  getDocuments: async (): Promise<Document[]> => {
    // Response envelope: { success, data: { items: RawDocument[], total, page, limit, pages }, message }
    const res = await apiClient.get('/study/documents/');
    const payload = res.data?.data;
    const rawItems: RawDocument[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
      ? payload.items
      : [];
    return rawItems.map(mapDocument);
  },

  uploadDocument: async (file: File, onProgress?: (pct: number) => void): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    // Response envelope: { success, data: { document_id, status }, message }
    const res = await apiClient.post('/study/documents/upload', formData, {
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    });
    const uploadData = res.data?.data;
    return {
      id: uploadData?.document_id ?? '',
      title: file.name,
      page_count: 0,
      status: 'processing',
      created_at: new Date().toISOString(),
      file_url: '',
    };
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/study/documents/${id}`);
  },

  // ── Study Chat (RAG) ─────────────────────────────────────────────────────

  sendChatMessage: async (documentId: string, query: string, history: ChatMessage[]): Promise<string> => {
    const res = await apiClient.post(`/study/documents/${documentId}/chat`, { query, history });
    return res.data?.data?.answer ?? res.data?.answer ?? '';
  },

  // ── Flashcards Operations ────────────────────────────────────────────────

  generateFlashcards: async (documentId: string): Promise<FlashcardDeck> => {
    const res = await apiClient.post(`/study/documents/${documentId}/flashcards/generate`);
    return res.data?.data;
  },

  getDecks: async (): Promise<FlashcardDeck[]> => {
    const res = await apiClient.get('/study/flashcards/decks');
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },

  getDeckCards: async (deckId: string): Promise<Flashcard[]> => {
    const res = await apiClient.get(`/study/flashcards/decks/${deckId}/cards`);
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },

  reviewCard: async (cardId: string, rating: number): Promise<Flashcard> => {
    const res = await apiClient.post(`/study/flashcards/${cardId}/review`, { rating });
    return res.data?.data;
  },

  // ── Quiz Operations ──────────────────────────────────────────────────────

  getQuiz: async (documentId: string): Promise<QuizQuestion[]> => {
    const res = await apiClient.get(`/study/documents/${documentId}/quiz`);
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },

  generateQuiz: async (documentId: string): Promise<QuizQuestion[]> => {
    const res = await apiClient.post(`/study/documents/${documentId}/quiz/generate`);
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },
};
