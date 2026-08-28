# RAGify

RAGify is a full-stack RAG application for searching and chatting with internal documentation.

Instead of manually browsing through PDFs, procedures, policies, or other internal files, users can ask questions in natural language. RAGify retrieves the most relevant document chunks, adds them to the model context, and generates an answer based on those sources.

The application also supports a regular AI chat mode when document retrieval is not needed.

## Features

- Chat with streamed responses using Server-Sent Events
- RAG-based document search with PostgreSQL and pgvector
- Standard chat and RAG chat modes
- OpenAI and OpenRouter model support
- PDF document processing and indexing
- Conversation history
- Conversation folders and favorites
- Email/password authentication
- Google and GitHub OAuth
- Token usage tracking
- Swagger/OpenAPI documentation
- Dark and light themes
- Rate limiting and common API security middleware

## How RAG works

The RAG flow is intentionally kept separate from the regular chat flow.

When RAG mode is enabled:

1. The user sends a question.
2. The server generates an embedding for the question.
3. PostgreSQL/pgvector searches for document chunks with similar embeddings.
4. The retrieved chunks are added to the LLM context.
5. The selected model generates the answer.
6. The response is streamed back to the client through SSE.

A simplified version of the flow looks like this:

```text
User question
     |
     v
Generate embedding
     |
     v
pgvector similarity search
     |
     v
Relevant document chunks
     |
     v
Build LLM context
     |
     v
OpenAI / OpenRouter
     |
     v
Stream response to client
```

When RAG mode is disabled, the application skips the document retrieval step and behaves like a regular AI chat application.

## Tech stack

### Client

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Radix UI
- TanStack Query
- Zustand
- Axios
- Lucide React

### Server

- Bun
- Express 5
- TypeScript
- PostgreSQL
- pgvector
- Prisma
- InversifyJS
- Zod
- Passport.js
- JWT
- Winston
- Swagger / OpenAPI

### AI and document processing

- OpenAI API
- OpenRouter
- `text-embedding-3-small`
- pgvector similarity search
- Tiktoken
- PDF.js

## Project structure

RAGify uses a small monorepo containing the frontend and backend applications.

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
├── .husky/
├── index.ts
├── package.json
└── README.md
```

The backend follows a layered structure:

```text
routes
  ↓
controllers
  ↓
services
  ↓
repositories
  ↓
database
```

RAG-specific logic, document processing, embeddings, authentication, and other application concerns are handled through their respective services and utilities.

## Getting started

### Requirements

Before running the project locally, make sure you have:

- Bun or Node.js 20+
- PostgreSQL
- pgvector installed in PostgreSQL
- an OpenAI or OpenRouter API key

## Installation

Clone the repository:

```bash
git clone https://github.com/Os-humble-man/RAGify.git
cd RAGify
```

Install dependencies:

```bash
bun install
```

Create the server environment file:

```bash
cd packages/server
cp .env.example .env
```

Configure the required environment variables.

At minimum, you will need a database connection, JWT secret, and an AI provider API key.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ragify?schema=public"

JWT_SECRET="your-secret-key"

OPENAI_API_KEY="sk-..."

# or

OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
```

Optional OAuth configuration:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GITHUB_CALLBACK_URL="http://localhost:3000/api/auth/github/callback"
```

Application configuration:

```env
PORT=3000
CLIENT_URL="http://localhost:5173"
```

Optional email configuration:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## Database setup

Generate the Prisma client:

```bash
bun run prisma:generate
```

Run the database migrations:

```bash
bun run prisma:dev
```

The PostgreSQL database must have the `pgvector` extension available for vector storage and similarity search.

## Indexing documents

Documents used by the RAG pipeline are stored under:

```text
packages/server/assets/documents/
```

After adding documents, run:

```bash
bun run prepare-docs
```

The indexing process extracts the document content, splits it into chunks, generates embeddings, and stores the chunks and vectors in PostgreSQL.

You can test the RAG setup with:

```bash
bun run test-rag
```

## Running the application

From the repository root:

```bash
bun run dev
```

This starts both applications:

```text
Client:  http://localhost:5173
API:     http://localhost:3000
Swagger: http://localhost:3000/api-docs
```

To inspect the database using Prisma Studio:

```bash
cd packages/server
bun run prisma:studio
```

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

## Chat modes

RAGify currently provides two chat modes.

### Standard mode

The selected LLM answers the conversation directly without retrieving internal documents.

This mode is useful for general-purpose conversations.

### RAG mode

RAGify searches the indexed documentation before generating the response.

For example:

```text
How do I request leave?
```

or:

```text
What is the stock management procedure?
```

The retrieved document context is then passed to the model so that the response is based on the organization's documentation instead of only the model's general knowledge.

## Authentication

RAGify supports:

- email and password
- Google OAuth
- GitHub OAuth

Authentication uses Passport.js, JWT, and bcrypt.

The server also includes Helmet, CORS configuration, and rate limiting.

## API documentation

The backend exposes Swagger documentation at:

```text
http://localhost:3000/api-docs
```

It can be used to inspect and test the available API endpoints during development.

## Additional documentation

More detailed notes about specific parts of the project are available in the repository:

- `DOCUMENT_RAG_QUICKSTART.md`
- `RAG_INTEGRATION_GUIDE.md`
- `RAG_MODE_USAGE.md`
- `DATABASE_SETUP.md`
- `CONVERSATION_FILTERING.md`
- `FOLDER_FEATURES.md`
- `FEATURES_ROADMAP.md`

## Roadmap

Some areas I would like to continue improving:

- better source citations in RAG responses
- document versioning
- faster vector search and embedding caching
- role-based document access
- response feedback
- conversation export and sharing
- better analytics around queries and token usage
- additional document integrations
- broader automated test coverage

## Author

**Oscar Kanangila**

Web Developer

GitHub: [@Os-humble-man](https://github.com/Os-humble-man)

Project: [RAGify](https://github.com/Os-humble-man/RAGify)

## License

MIT
