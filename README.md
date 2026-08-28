# RAGify

RAGify is a full-stack RAG application for searching and chatting with internal documentation.Instead of manually browsing PDFs, procedures, policies, and internal files, users can ask questions in natural language and get answers grounded in their documents.When **RAG mode** is enabled, the application retrieves relevant content, builds context for the model, and returns a response with sources.

---

## Preview

The main interface is built around a simple chat experience. Users can switch between standard AI chat and RAG mode, browse previous conversations, organize chats into folders, and manage their account from the same workspace.

![RAGify app preview](./docs/images/ragify-app-preview.png)

---

## Visual overview

### RAGify at a glance

At a high level, RAGify connects the web application to the backend RAG service, which coordinates the LLM provider, PostgreSQL/pgvector, and the internal document collection.The application stores conversation data and vector embeddings in PostgreSQL, while the RAG pipeline retrieves the most relevant document chunks before sending context to the selected model.

![RAGify at a glance](./docs/images/ragify-at-a-glance.png)

### How a RAG question is answered

A RAG request goes through several stages before the final answer reaches the user.The question is first converted into an embedding. That embedding is used to search for semantically similar document chunks in `pgvector`. The retrieved content is then combined with the user question and model instructions before the request is sent to the LLM.

The final response is streamed back to the interface together with references to the retrieved sources.

![How a RAG question is answered](./docs/images/how-rag-works.png)

### Project structure

RAGify is organized as a small monorepo with a separate client and server.The client contains the chat experience, RAG mode controls, conversation history, and folder management. The server handles authentication, API routes, document indexing, database access, and the RAG pipeline.

![Project structure](./docs/images/project-structure.png)

### Typical user journey

After signing in, a user can choose between standard chat and RAG mode.Standard chat works as a general AI assistant, while RAG mode uses indexed internal documents as additional context. Conversations can then be saved, organized into folders, or continued later.

![Typical user journey](./docs/images/user-journey.png)

---

## What RAGify does

RAGify helps teams interact with internal knowledge through a chat interface.
Typical use cases include:
- HR policies and internal procedures
- IT documentation and troubleshooting guides
- Operations workflows
- Compliance documentation
- Internal company knowledge bases

Users can switch between:

- **Standard chat** — general AI conversations
- **RAG mode** — answers based on indexed internal documents

---

## Main capabilities

- Streamed chat responses
- Retrieval-Augmented Generation
- Source-aware answers
- Internal document indexing
- Conversation history
- Folder organization
- Email/password authentication
- Google and GitHub OAuth
- OpenAI and OpenRouter support
- Swagger API documentation

---

## Tech stack

Only the main technologies are listed here. The repository contains the implementation details and supporting libraries.

### Frontend
- React
- TypeScript
### Backend
- Bun
- Express
### Data and retrieval
- PostgreSQL
- pgvector
- Prisma
### AI providers
- OpenAI
- OpenRouter
---

## How it works

When RAG mode is enabled:

1. The user sends a question.
2. The server creates an embedding for the question.
3. The application searches for relevant document chunks in `pgvector`.
4. The retrieved chunks are added to the prompt context.
5. The selected model generates an answer.
6. The response is streamed back to the client with source references.

---

## Getting started

### Requirements

Before running the project locally, make sure you have:
- Bun or Node.js 20+
- PostgreSQL
- `pgvector` enabled in PostgreSQL
- An OpenAI or OpenRouter API key

### Clone the repository

```bash
git clone https://github.com/Os-humble-man/RAGify.git
cd RAGify
```

### Install dependencies

```bash
bun install
```

### Configure the environment

Create the server environment file:

```bash
cd packages/server
cp .env.example .env
```

The server environment can include the following configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_app?schema=public"

# OpenAI / OpenRouter
OPENAI_API_KEY="sk-..."
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"

# JWT
JWT_SECRET="your-secret-key"

# OAuth (Google)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# OAuth (GitHub)
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GITHUB_CALLBACK_URL="http://localhost:3000/api/auth/github/callback"

# Server
PORT=3000
CLIENT_URL="http://localhost:5173"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

You do not need to configure every optional integration to start the application. For example, OAuth and SMTP can be configured only when those features are required.At minimum, the application needs a working database connection, a JWT secret, and credentials for at least one supported AI provider.

---

## Database setup

Generate the Prisma client:

```bash
bun run prisma:generate
```

Run the database migrations:

```bash
bun run prisma:dev
```

PostgreSQL must have the `pgvector` extension enabled because document embeddings are stored and queried as vectors.

---

## Index documents

Add internal documents to:

```text
packages/server/assets/documents/
```

Then run:

```bash
bun run prepare-docs
```

The indexing process:

1. extracts document content
2. splits the content into chunks
3. generates embeddings
4. stores chunks and vectors in PostgreSQL

You can test the RAG pipeline with:

```bash
bun run test-rag
```

---

## Run the application

From the repository root:

```bash
bun run dev
```

Default local endpoints:

| Service | URL |
| --- | --- |
| Web app | `http://localhost:5173` |
| API | `http://localhost:3000` |
| Swagger | `http://localhost:3000/api-docs` |

To open Prisma Studio:

```bash
cd packages/server
bun run prisma:studio
```

---

## Available scripts

### Root

```bash
bun run dev
bun run format
```

### Server

```bash
bun run dev
bun run start

bun run prisma:dev
bun run prisma:studio
bun run prisma:generate

bun run prepare-docs
bun run test-rag
bun run fix-pgvector
```

### Client

```bash
bun run dev
bun run build
bun run preview
bun run lint
```

---

## Project structure

```text
RAGify/
├── packages/
│   ├── client/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── store/
│   │   │   └── types/
│   │   └── package.json
│   │
│   └── server/
│       ├── assets/
│       │   └── documents/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── routes/
│       ├── middleware/
│       ├── strategies/
│       ├── utils/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── scripts/
│       ├── docs/
│       └── package.json
│
├── docs/
│   └── images/
│       ├── ragify-app-preview.png
│       ├── ragify-at-a-glance.png
│       ├── how-rag-works.png
│       ├── project-structure.png
│       └── user-journey.png
│
├── .husky/
├── index.ts
├── package.json
└── README.md
```

---

## Additional documentation

More detailed documentation is available in the repository:

- `DOCUMENT_RAG_QUICKSTART.md`
- `RAG_INTEGRATION_GUIDE.md`
- `RAG_MODE_USAGE.md`
- `DATABASE_SETUP.md`
- `CONVERSATION_FILTERING.md`
- `FOLDER_FEATURES.md`
- `FEATURES_ROADMAP.md`

---

## Roadmap

Planned improvements include:

- Better source citation UX
- Document versioning
- Faster retrieval and embedding caching
- Role-based document access
- Conversation export and sharing
- Better analytics and observability
- More document integrations
- Broader automated test coverage

---

## Author

**Oscar Kanangila**

Web Developer

- GitHub: [@Os-humble-man](https://github.com/Os-humble-man)
- Project: [RAGify](https://github.com/Os-humble-man/RAGify)

---

## License

MIT
