# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OggaHub** is a full-stack real estate platform built with Next.js for Petrolina and Juazeiro. It's a marketplace connecting property owners, realtors/brokers, agencies, developers, and regular users. Key features include property listings, lead management with queue-based distribution, chat between users and agents, agency CRM, AI-powered assistant features, OLX integration, and real-time notifications via Pusher.

## Stack

- **Framework:** Next.js 15 (App Router, `src/` directory)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Prisma ORM
- **Caching/Jobs:** Redis + BullMQ for background workers
- **Auth:** NextAuth.js v4 (Credentials, Google OAuth, GitHub OAuth)
- **Styling:** TailwindCSS + shadcn/ui (Radix primitives)
- **Real-time:** Pusher WebSockets
- **Forms:** React Hook Form + Zod
- **AI:** OpenAI (GPT-4o for assistant features)
- **Email:** Nodemailer
- **Observability:** Sentry, Vercel Analytics

## Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Development server (Turbopack)
npm run dev

# Run BullMQ workers (requires Redis)
npm run worker
```

### Database

```bash
npm run prisma:migrate      # Apply pending migrations (interactive)
npm run prisma:studio       # Open Prisma GUI
npm run db:seed:properties  # Seed with test data
npm run db:validate         # Validate schema
```

### Lint, Type Check, Test

```bash
npm run lint        # ESLint
npm run test        # Vitest
npm run test:ui     # Vitest watch mode
npx tsc --noEmit    # Type check
```

### Build & Deploy

```bash
npm run build   # Production build (runs migrations + Prisma generate)
npm start       # Start production server
```

### Admin Utilities

```bash
npm run create-admin          # Create admin user interactively
npm run set-role              # Set user role
npm run init-queue            # Initialize realtor queue (one-time)
npm run db:backfill:public-codes
```

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── api/               # Route handlers organized by feature domain
│   │   ├── admin/         # Admin analytics and moderation
│   │   ├── agency/        # Agency workspace
│   │   ├── assistant/     # AI assistant endpoints
│   │   ├── chat/          # Lead chat messaging
│   │   ├── leads/         # Lead management
│   │   └── cron/          # Scheduled jobs
│   ├── admin/             # Admin dashboards
│   ├── agency/            # Agency workspace UI
│   ├── broker/            # Realtor dashboard
│   ├── chat/ & chats/     # Chat UI and inbox
│   ├── owner/             # Owner workspace
│   ├── property/          # Property detail pages
│   └── (marketing)/       # Public pages
├── components/
│   └── ui/                # shadcn/ui primitives
├── lib/                   # Services and utilities
│   ├── queue/             # BullMQ queue configuration
│   ├── auth.ts
│   ├── prisma.ts
│   ├── pusher-client.ts
│   └── (other services)
├── workers/index.ts        # BullMQ job processors
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
└── middleware.ts           # Auth, role-based routing, redirects

prisma/schema.prisma        # 50+ models, authoritative source of truth
scripts/                    # One-off admin/migration utilities
```

### Database Schema (Prisma)

`prisma/schema.prisma` is the authoritative source — always check it for exact field names, enums, and relations. Key model groups:

- **Auth:** User, Account, Session — Role enum: `USER | OWNER | REALTOR | AGENCY | DEVELOPER | ADMIN`
- **Properties:** Property, Image, PropertyDocument, Favorite
- **Leads:** Lead, LeadMessage, LeadNote, LeadCandidature, LeadAutoReplyJob
- **Professionals:** RealtorQueue, RealtorStats, AgencyProfile, DeveloperProfile
- **Teams:** Team, TeamMember, TeamInvite
- **CRM:** Client, ClientPreference, ClientPropertyMatch, ClientRecommendationList
- **AI:** AssistantItem, RealtorAssistantChatThread, RealtorAutoReplySettings
- **OLX Integration:** OlxAccount, OlxListing, OlxLeadEvent

Portuguese terms appear throughout schema and UI: `corretor` = realtor, `imóvel` = property, `funil` = pipeline.

### Background Workers (BullMQ)

`src/workers/index.ts` — workers gracefully disable if Redis is unavailable (safe in build/CI). Jobs:

- `LEAD_EXPIRY` — marks leads expired after 24h, updates realtor scores
- `QUEUE_RECALCULATION` — reorders realtor queue by score
- `CLEANUP` — removes stale data (30-day retention)
- `ASSISTANT_RECALCULATION` — refreshes AI task items
- `LEAD_AUTO_REPLY` — processes AI auto-replies to client messages

### Middleware & Auth

`src/middleware.ts` handles role-based path protection, JWT validation, force-password-change flow, and deprecated route redirects. It injects headers (`x-user-id`, `x-user-role`, `x-user-email`) used by API routes for authorization.

### API Routes

Convention: `src/app/api/{feature}/{resource}/route.ts`. Read auth from middleware-injected headers:

```typescript
const userId = req.headers.get("x-user-id");
const userRole = req.headers.get("x-user-role");
```

### Real-time (Pusher)

Import via `src/lib/pusher-client.ts`. Key channels:
- `chat-{leadId}` — lead messages (`new-chat-message`, `lead-chat-state-changed`)
- `private-agency-{teamId}` — team notifications (requires Pusher auth)

### Cron Jobs (Vercel)

Defined in `vercel.json`. Note: plan limited to 2 active crons; `recalc-conversion-benchmarks` is embedded inside `expire-leads` to work around this.

### Docker

```bash
docker-compose up --build
# postgres:5432, redis:6379, app:3001, worker (2 replicas)
```

## Environment Variables

Essential vars — see `.env.example` for full list:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (with pooler) |
| `DIRECT_URL` | Direct PostgreSQL (no pooler, for migrations) |
| `REDIS_URL` | Redis for BullMQ (gracefully disabled if missing) |
| `NEXTAUTH_SECRET` | Session encryption (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | OAuth callback URL |
| `CLOUDINARY_*` | Image uploads |
| `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` | Real-time |
| `SMTP_*` | Email via Nodemailer |

## Key Conventions

- **Prisma client:** Always import via `import { prisma } from "@/lib/prisma"` — never instantiate directly.
- **Server vs Client components:** App Router defaults to Server Components. Add `"use client"` only for interactivity.
- **Redis/BullMQ:** Always check `getRedisConnection()` return value before enqueueing — may be null in environments without Redis.
- **Migrations:** Use `npm run prisma:migrate` locally, `npm run db:deploy` in CI. Never edit committed migration files.
- **External API calls (OpenAI, Pusher, email):** Always wrap in try-catch and log failures to Sentry.
