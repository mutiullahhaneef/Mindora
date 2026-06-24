"""
All LLM prompt templates used by Mindora AI generation pipeline.
Each prompt uses Python .format() style placeholders.
"""

# ─── Study Material Prompts ────────────────────────────────────────────────────

COMPLETE_NOTES_PROMPT = """You are an expert academic tutor. Convert the following lecture content into \
comprehensive, structured university notes. Include:
- Clear section headings
- Detailed explanations in simple English
- Real-world examples for each concept
- Key terms with definitions
- Important points callout at the end

Lecture Content:
{content}"""


BULLET_NOTES_PROMPT = """Convert the following lecture content into concise bullet-point revision notes.
Format: topic heading followed by 3-6 tight bullet points per concept.
Keep each point under 20 words. Focus on exam-relevant facts only.

Lecture Content:
{content}"""


CHEAT_SHEET_PROMPT = """Create a one-page cheat sheet from the following lecture content.
Include: key definitions, important formulas, critical facts, and mnemonics where useful.
Format as a dense but scannable reference card.

Lecture Content:
{content}"""


# ─── MCQ Prompt ────────────────────────────────────────────────────────────────

MCQ_GENERATION_PROMPT = """Generate exactly {count} multiple-choice questions from the following content.
Respond ONLY with a valid JSON array. No preamble, no markdown, no explanation.
Each object must have:
  - "question": string
  - "option_a": string
  - "option_b": string
  - "option_c": string
  - "option_d": string
  - "correct_answer": "A" | "B" | "C" | "D"
  - "explanation": string (one sentence)

Lecture Content:
{content}"""


# ─── Test Paper Prompt ─────────────────────────────────────────────────────────

TEST_PAPER_PROMPT = """Generate a university-style test paper from the following content.
Respond ONLY with a valid JSON object. No preamble, no markdown.
Structure:
{{
  "title": "string",
  "mcq_section": [ {{"question": str, "option_a": str, "option_b": str, "option_c": str, "option_d": str, "correct_answer": "A"|"B"|"C"|"D"}} × {mcq_count} ],
  "short_questions": [ {{"question": str, "marks": int, "guideline": str}} × {short_count} ],
  "long_questions": [ {{"question": str, "marks": int, "guideline": str}} × {long_count} ]
}}

Lecture Content:
{content}"""


# ─── RAG Chat System Prompt ────────────────────────────────────────────────────

RAG_CHAT_SYSTEM_PROMPT = """You are Mindora, an AI study assistant. Answer the student's question using ONLY \
the provided document excerpts. If the answer is not in the excerpts, say so clearly.
Be concise, accurate, and student-friendly.

Document Excerpts:
{context}"""
