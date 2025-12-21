# Quickstart Guide

**Project**: Cyber Tech - Church Tech Department Management  
**Date**: 2025-12-21

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (`npm install -g pnpm`)
- Git
- Supabase CLI (`npm install -g supabase`)
- Optional: Docker (for local Supabase)

---

## 1. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd cyber-tech

# Install dependencies
pnpm install
```

---

## 2. Environment Setup

Create `.env.local` from template:

```bash
cp .env.example .env.local
```

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Resend (email notifications)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@yourdomain.com

# Telnyx (SMS notifications)
TELNYX_API_KEY=KEY...
TELNYX_PHONE_NUMBER=+1234567890

# Google Drive (social media module)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/social/callback/google

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Database Setup

### Option A: Use Supabase Cloud (Recommended for Development)

1. Create project at [supabase.com](https://supabase.com)
2. Copy connection details to `.env.local`
3. Run migrations:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option B: Local Supabase (Docker)

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Get local credentials
supabase status
```

---

## 4. Seed Data

Create initial admin account and sample data:

```bash
pnpm db:seed
```

This creates:
- **Admin account**: `admin@example.com` / `AdminPassword123!`
- Sample equipment categories
- Sample training tracks
- Default notification templates

---

## 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
cyber-tech/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, accept-invite)
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── rota/          # Rota management
│   │   ├── equipment/     # Equipment inventory
│   │   ├── rundown/       # Service rundowns
│   │   ├── social/        # Social media content
│   │   ├── training/      # Training tracks
│   │   └── admin/         # Admin-only routes
│   ├── api/               # API routes
│   │   ├── auth/          # Auth endpoints
│   │   ├── ai/            # AI generation endpoints
│   │   ├── cron/          # Scheduled jobs
│   │   └── ...
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   ├── layouts/           # Layout components
│   └── features/          # Feature-specific components
├── lib/
│   ├── supabase/          # Supabase clients
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   └── admin.ts       # Admin client (service role)
│   ├── validations/       # Zod schemas
│   ├── hooks/             # React hooks
│   └── utils.ts           # Utility functions
├── types/                  # TypeScript types
├── public/                 # Static assets
├── supabase/
│   ├── migrations/        # Database migrations
│   ├── seed.sql           # Seed data
│   └── config.toml        # Supabase config
└── specs/                  # Project specifications
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm test` | Run tests |
| `pnpm db:push` | Push migrations to database |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:reset` | Reset database (⚠️ destructive) |
| `pnpm db:generate` | Generate types from schema |

---

## Key Development Workflows

### Adding a New Feature

1. Create route in `app/(dashboard)/feature-name/`
2. Add components in `components/features/feature-name/`
3. Create Zod schemas in `lib/validations/feature-name.ts`
4. Add types in `types/feature-name.ts`
5. Create API routes if needed in `app/api/feature-name/`

### Adding UI Components

```bash
# Using shadcn CLI
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add dialog
```

### Database Changes

```bash
# Create new migration
supabase migration new your_migration_name

# Edit migration file in supabase/migrations/
# Then apply:
supabase db push
```

### Generating Types from Database

```bash
pnpm db:generate
# or
supabase gen types typescript --local > types/database.ts
```

---

## Authentication Flow

1. **Magic Link (Default)**:
   - Admin invites user via email
   - User receives magic link
   - Clicking link creates account and logs in

2. **Session Handling**:
   - Sessions stored in Supabase
   - Middleware checks auth on protected routes
   - Automatic refresh token handling

3. **Role-Based Access**:
   - Roles: `admin`, `leader`, `member`
   - Checked via `profiles.role` column
   - RLS policies enforce access at database level

---

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Test Structure

```
__tests__/
├── unit/           # Unit tests for utilities
├── integration/    # API route tests
└── e2e/            # End-to-end tests (Playwright)
```

---

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy triggers on push to main branch

### Environment Variables for Production

All variables from `.env.local` plus:

```bash
# Vercel-specific
VERCEL=1
VERCEL_ENV=production

# Cron secrets
CRON_SECRET=generate-secure-secret

# Rate limiting
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Troubleshooting

### Common Issues

**"Cannot find module '@supabase/supabase-js'"**
```bash
pnpm install
```

**"Invalid API key"**
- Check `.env.local` has correct Supabase keys
- Ensure no trailing whitespace in values

**"RLS policy violation"**
- Check user role in profiles table
- Verify RLS policies in Supabase dashboard

**"Type errors after db changes"**
```bash
pnpm db:generate
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=* pnpm dev
```

### Supabase Dashboard

Access local dashboard at: http://localhost:54323

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

---

## Getting Help

1. Check this quickstart guide
2. Review specs in `/specs/001-cyber-tech-app-build/`
3. Check API contracts in `/specs/.../contracts/`
4. Open an issue in the repository
