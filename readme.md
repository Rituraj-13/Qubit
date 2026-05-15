# 🧠 Qubit Chat

Qubit is an AI-powered conversational search engine application. It answers user queries using a powerful mixture of large language models for reasoning and live web search for gathering the latest information. 

## ✨ Features

- **Conversational Search:** Ask questions and get well-reasoned, source-backed answers.
- **Real-time Web Search:** Integrated with Tavily for fetching up-to-date web context.
- **LLM Integration:** Powered by Groq SDK for blazing-fast inference.
- **Project Management:** Organize your conversations and tasks into spaces called "Projects".
- **Source Tracking:** Easily consult the list of sources/URLs the AI referenced to build its answers.
- **Conversation Sharing:** Share specific conversations or chats with others via a public or read-only view.
- **Authentication:** Secure user authentication managed with Supabase.

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 + React Router v7
- **Bundler & Runtime:** Bun
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn UI (Radix UI primitives + Lucide React icons)
- **Data Rendering:** React Markdown with remark-gfm for formatting code blocks, tables, etc.
- **State Management & Data Fetching:** Axios, React state

### Backend
- **Framework:** Express.js (TypeScript) + Express Rate Limit
- **Runtime:** Bun / Node.js
- **Database ORM:** Prisma (w/ `@prisma/adapter-pg` and `@prisma/extension-accelerate`)
- **Database:** PostgreSQL
- **Validation:** Zod
- **External APIs:** 
  - [Groq AI](https://groq.com/) for LLM processing
  - [Tavily](https://tavily.com/) for online search capabilities
  - [Supabase](https://supabase.com/) for User Management / Auth

## 📁 Project Structure

```
Qubit/
├── backend/                  # Express.js REST API
│   ├── prisma/               # Prisma schema & migrations
│   ├── middlewares/          # Express route middlewares
│   ├── utils/                # Validation & utilities
│   ├── index.ts              # Entry point
│   ├── prompt.ts             # Contains system prompts & LLM instructions
│   └── package.json
└── frontend/                 # React SPA
    ├── src/                  # React source code
    │   ├── components/       # Reusable UI components (Dashboard, Sidebar, etc.)
    │   ├── pages/            # View components (Auth, Dashboard, SharedConversation)
    │   ├── lib/              # Client utilities
    │   └── App.tsx           # App Router
    ├── bunfig.toml           # Bun configuration
    ├── build.ts              # Custom Bun build script
    └── package.json
```

## 🛠️ Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed on your machine
- A PostgreSQL database
- API Keys for **Supabase**, **Groq**, and **Tavily**.

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd perplexity
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies using Bun:
```bash
cd backend
bun install
```

Configure your `.env` file in the `backend` folder:
```env
# Example environment variables needed
DATABASE_URL="postgres://user:pass@host:port/db"
GROQ_API_KEY="your-groq-api-key"
TAVILY_API_KEY="your-tavily-api-key"
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
PORT=8000
```

Run database migrations:
```bash
bunx prisma generate
bunx prisma migrate dev
```

Start the backend server:
```bash
bun run index.ts
```

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
bun install
```

Configure your `.env` file in the `frontend` folder:
```env
BUN_PUBLIC_SUPABASE_URL="your-supabase-url"
BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
VITE_API_BASE_URL="http://localhost:8000"
```

Configure your `config.ts` file in the `frontend` folder:
```config
export const BACKEND_URL ="http://localhost:3001"
```

Start the React development server:
```bash
bun run dev
```

### 4. Open the app
Navigate to `http://localhost:3000` (or the port specified by Bun) in your browser.
