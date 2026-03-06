# Cyber Tech

Church tech department management app for RCCG Morning Star. Built with Next.js 16, Supabase, and Vercel AI SDK.

## Features

| Module | Description |
|--------|-------------|
| **Rota** | Weekly service scheduling with availability tracking and duty swaps |
| **Equipment** | Inventory management with QR code scanning for check-in/out |
| **Rundown** | Service order planning with live display mode |
| **Livestream** | AI-powered YouTube/Facebook description generator |
| **Designs** | Design request tracking and management |
| **Training** | Training tracks and progress monitoring |
| **Social** | Social media content management |

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (`npm install -g pnpm`)
- Supabase CLI (`npm install -g supabase`)

### 1. Clone & Install

```bash
git clone https://github.com/oracleot/rccgms-cybertech.git
cd cyber-tech
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
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Test Credentials

See `.github/docs/test-credentials` for test accounts.

---

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Vercel AI SDK + OpenAI
- **Email**: React Email + Resend
- **Validation**: Zod + React Hook Form

### Project Structure

```
app/
├── (auth)/              # Public auth pages (login, register, etc.)
├── (dashboard)/         # Protected routes
│   ├── admin/           # Admin-only pages
│   ├── rota/            # Rota management
│   ├── equipment/       # Equipment tracking
│   ├── rundown/         # Service rundowns
│   └── ...
└── api/                 # API routes

components/
├── ui/                  # shadcn/ui components
├── {feature}/           # Feature-specific components
└── shared/              # Shared components

lib/
├── supabase/            # Supabase clients (client, server, admin)
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
| **Leader** | Create/edit rotas, approve swaps, manage team |
| **Member** | View schedules, submit availability, request swaps |

---

## Development

### Common Commands

```bash
pnpm dev                              # Start dev server
pnpm build                            # Production build
pnpm lint                             # Run ESLint
pnpm dlx shadcn@latest add [name]     # Add shadcn component
```

### Database Commands

```bash
supabase db push                      # Apply migrations
supabase gen types typescript --local > types/database.ts  # Generate types
supabase migration new [name]         # Create new migration
supabase migration list               # Check migration status
```

### Key Conventions

**File Naming**: Use lowercase-kebab-case: `rota-calendar.tsx`, `equipment-checkout.ts`

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
supabase migration list

# 2. Find next available number
ls supabase/migrations/

# 3. Create with next sequential number (e.g., 023_your_migration.sql)
supabase migration new your_migration_name
```

### Important Rules

- Use sequential 3-digit prefixes: `001_`, `002_`, `003_`
- **Never reuse or duplicate a prefix number**
- Never edit already-applied migrations—create a new one instead
- Test migrations locally first if possible

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check `.env.local` for correct Supabase keys, no trailing whitespace |
| "RLS policy violation" | Check user role in profiles table |
| Type errors after db changes | Run `supabase gen types typescript --local > types/database.ts` |
| Notifications not sending | Check if `RESEND_API_KEY` is set; view `/admin/notifications` for errors |

---

## Resources

- [Project Specs](specs/001-cyber-tech-app-build/) - Detailed requirements and API contracts
- [Quickstart Guide](specs/001-cyber-tech-app-build/quickstart.md) - Extended setup and testing guide
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
