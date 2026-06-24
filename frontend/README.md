# Mindora — Frontend

> React 19 + Vite + TypeScript frontend for the Mindora AI Academic Operating System.

---

## Tech Stack

| Technology | Role |
|---|---|
| React 19 + Vite | Framework & build tool |
| TypeScript | Type-safe development |
| Zustand | Global state management |
| React Query + Axios | Server state & API calls |
| React Router DOM | Client-side routing |
| Framer Motion | Fluid UI animations |
| Lucide React | Icon system |
| Vanilla CSS | Design system & styling |

---

## Folder Structure

```
frontend/
├── public/                   # Static assets (favicon, OG images)
├── src/
│   ├── main.tsx              # Entry point — React root mount
│   ├── App.tsx               # Root component — router & global providers
│   │
│   ├── pages/                # Route-level page components
│   │   ├── auth/             # Login & registration flows
│   │   ├── dashboard/        # Main home dashboard
│   │   ├── study/            # Document upload, quizzes, flashcards
│   │   ├── research/         # Paper library & AI research assistant
│   │   ├── achievements/     # Gamification — XP, badges, streaks
│   │   └── settings/         # User profile & preferences
│   │
│   ├── components/           # Reusable UI components
│   │   ├── agents/           # AI chat agent interface components
│   │   ├── gamification/     # XP bars, badge cards, streak displays
│   │   └── layout/           # Sidebar, topbar, page shell
│   │
│   ├── lib/                  # Shared utilities
│   │   ├── api.ts            # Axios instance + request helpers
│   │   ├── queryClient.ts    # React Query configuration
│   │   └── hooks/            # Custom React hooks
│   │
│   └── styles/               # Global CSS design system
│       ├── index.css         # Root variables & resets
│       └── components.css    # Shared component styles
│
├── index.html                # HTML entry point
├── vite.config.ts            # Vite configuration
├── tsconfig.app.json         # TypeScript config (app code)
├── tsconfig.node.json        # TypeScript config (build tooling)
├── eslint.config.js          # ESLint rules
└── package.json
```

---

## Local Development Setup

### 1. Prerequisites

- Node.js 18+
- npm (or pnpm / yarn)
- Mindora backend running on `http://localhost:8000`

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Start Dev Server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:5173**

The Vite dev server proxies API requests to the backend automatically — no CORS issues during local development.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across all source files |

---

## Key Pages

| Route | Page | Description |
|---|---|---|
| `/auth/login` | Login | JWT auth flow |
| `/auth/register` | Register | New account creation |
| `/dashboard` | Dashboard | Overview, recent activity, XP summary |
| `/study` | Study | Upload docs, generate quizzes & flashcards |
| `/research` | Research | Search papers, extract citations, AI summaries |
| `/achievements` | Achievements | Badges, XP history, streaks |
| `/settings` | Settings | Profile, preferences, API key management |

---

## ESLint (Type-Aware Linting)

For production-grade type-safe linting, update `eslint.config.js`:

```js
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```
