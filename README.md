```
        ┌────────────────────────────┐
        │  ▓▓▓▓  FUSION  ▓▓▓▓         │
        │  ┌──────────────────────┐  │
        │  │ >  rota   --sync     │  │
        │  │ >  meetings --invite │  │
        │  │ >  livestream --gen  │  │
        │  │ >  _                 │  │
        │  └──────────────────────┘  │
        └──────────────┬─────────────┘
                    ────┴────
                 ───────────────
```

<h1 align="center">Fusion</h1>
<p align="center"><em>The tech-team control room for RCCG Morning Star</em></p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20RLS-3ECF8E?logo=supabase&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-private-lightgrey">
</p>

Rotas, rundowns, livestreams, meetings — one app instead of five spreadsheets and a group chat. Built with Next.js 16, Supabase, and the Vercel AI SDK.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Database Migrations](#database-migrations)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Features

| Module | Description |
|--------|-------------|
| 📅 **Rota** | Weekly service scheduling, availability tracking, and duty swaps |
| 🗓️ **Meetings** | Zoom/Google Meet/Teams/in-person meetings — RSVPs, reminders, calendar sync, and team availability-overlap scheduling |
| 🌐 **Public Availability** | A no-sign-in form so anyone on the team can submit availability from a shared link |
| 🎬 **Rundown** | Service order planning with a live operator/display mode |
| 📡 **Livestream** | AI-generated YouTube/Facebook descriptions in a church-announcement format |
| 🎨 **Designs** | Design request tracking, assignment, and file delivery |
| 🎓 **Training** | Training tracks, step-by-step progress, and certificates |

## Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9+ (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone https://github.com/oracleot/rccgms-cybertech.git
cd rccgms-cybertech
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI - for AI features (optional for dev)
OPENAI_API_KEY=sk-...

# Resend - for email notifications (optional for dev)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# One-off CLI use (no global install needed)
pnpm dlx supabase link --project-ref your-project-ref

# Push migrations
pnpm dlx supabase db push
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL + Auth + Row-Level Security)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **AI**: Vercel AI SDK + OpenAI
- **Email**: React Email + Resend
- **Calendar**: Hand-rolled RFC 5545 ICS generation + Google Calendar (optional)
- **Validation**: Zod + React Hook Form

### How a request flows

```mermaid
flowchart LR
    Browser -->|Server Actions / fetch| NextJS[Next.js App Router]
    NextJS -->|RLS-scoped| Supabase[(Supabase Postgres)]
    NextJS --> Auth[Supabase Auth]
    NextJS --> AI[Vercel AI SDK]
    NextJS --> Email[Resend]
    Cron[Vercel Cron] -->|reminders| NextJS
```

### Project Structure

```
app/
├── (auth)/              # Public auth pages (login, accept-invite, etc.)
├── (dashboard)/         # Protected routes
│   ├── admin/           # Admin-only pages
│   ├── rota/            # Rota + availability + swaps
│   ├── meetings/        # Meetings, RSVPs, calendar sync
│   ├── rundown/         # Service rundowns + live operator view
│   ├── designs/         # Design request tracking
│   └── training/        # Training tracks
├── availability/        # Public (signed-out) availability form
└── api/                 # API routes + cron jobs

components/
├── ui/                  # shadcn/ui components
├── {feature}/           # Feature-specific components
└── shared/              # Shared components

lib/
├── supabase/            # Supabase clients (client, server, admin)
├── calendar/            # Provider-agnostic ICS/timezone/calendar-links
├── meetings/            # Meeting queries, availability overlap
├── validations/         # Zod schemas
└── notifications/       # Email/SMS services

types/                   # TypeScript types
emails/                  # React Email templates
supabase/migrations/     # Database migrations
specs/                   # Project specifications
```

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, user management, system settings |
| **Lead Developer** | Content/data management across all modules, developer tools |
| **Developer** | Content/data management across all modules |
| **Leader** | Create/edit rotas & meetings, approve swaps, manage team |
| **Member** | View schedules, submit availability, request swaps, RSVP to meetings |

---

## Development

### Common Commands

```bash
pnpm dev                              # Start dev server
pnpm build                            # Production build
pnpm lint                             # Run ESLint
pnpm dlx shadcn@latest add [name]     # Add a shadcn/ui component
```

### Database Commands

All run via `pnpm dlx supabase` — no global CLI install required.

```bash
pnpm dlx supabase db push                                          # Apply migrations
pnpm dlx supabase migration list                                   # Check migration status
pnpm dlx supabase migration new [name]                             # Create a new migration
pnpm dlx supabase gen types typescript --linked > types/database.ts  # Regenerate types
```

### Key Conventions

**File Naming**: lowercase-kebab-case — `rota-calendar.tsx`, `meeting-form.tsx`

**Supabase Clients**:
```typescript
// Server Components & API Routes
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client Components
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()

// Admin operations (bypass RLS)
import { createAdminClient } from "@/lib/supabase/admin"
```

**Form Validation**:
```typescript
// Define schema in lib/validations/{feature}.ts
import { z } from "zod"
export const createRotaSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().date(),
})

// Use in React Hook Form
import { zodResolver } from "@hookform/resolvers/zod"
const form = useForm({ resolver: zodResolver(createRotaSchema) })
```

---

## Database Migrations

### Creating Migrations

```bash
# 1. Check current migration status
pnpm dlx supabase migration list

# 2. Find the next available number
ls supabase/migrations/

# 3. Create with the next sequential number (e.g., 042_your_migration.sql)
pnpm dlx supabase migration new your_migration_name
```

### Important Rules

- Use sequential 3-digit prefixes: `001_`, `002_`, `003_`
- **Never reuse or duplicate a prefix number**
- Never edit an already-applied migration — create a new one instead
- Run `pnpm dlx supabase migration list` before pushing, to confirm what's actually pending on the target project

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check `.env.local` for correct Supabase keys, no trailing whitespace |
| "RLS policy violation" | Check the user's role in the `profiles` table |
| Type errors after DB changes | Run `pnpm dlx supabase gen types typescript --linked > types/database.ts` |
| Notifications not sending | Check that `RESEND_API_KEY` is set; view `/admin/notifications` for errors |
| Local migration list doesn't match remote | Run `pnpm dlx supabase migration list` — if a migration was applied outside the CLI, use `migration repair --status applied <version>` rather than re-running it |

---

## Resources

- [Product Spec](.github/docs/PRODUCT_SPEC.md) · [Tech Docs](.github/docs/TECH_DOCS.md) · [User Guide](.github/docs/user.guide.md)
- [Project Specs](specs/001-cyber-tech-app-build/) — detailed requirements and API contracts
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

<p align="center">— built for the RCCG Morning Star tech team —</p>
