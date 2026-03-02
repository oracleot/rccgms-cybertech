# Implementation Plan: Cyber Tech - Church Tech Department Management App

**Branch**: `001-cyber-tech-app-build` | **Date**: 2025-12-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-cyber-tech-app-build/spec.md`

## Summary

Build a comprehensive church tech department management web application that centralizes rota scheduling, livestream description generation, equipment tracking, service rundowns, social media management, and member training. The application uses Next.js 14 with App Router, Supabase for database/auth, Vercel AI SDK for GPT-4 integration, and deploys as a PWA on Vercel. Key priorities are mobile-first design, offline capability for critical views, and modular feature independence.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled  
**Framework**: Next.js 14.x (App Router)  
**Primary Dependencies**: 
- UI: shadcn/ui, Magic UI, Tailwind CSS 3.x
- Data: @supabase/ssr, @supabase/supabase-js
- AI: Vercel AI SDK 3.x, OpenAI GPT-4
- Forms: React Hook Form, Zod
- Calendar: FullCalendar, React DayPicker
- Drag & Drop: @dnd-kit/core
- Notifications: Resend (email), Telnyx (SMS), Sonner (toasts)
- QR: qrcode, html5-qrcode

**Storage**: PostgreSQL 15.x via Supabase (with RLS), Supabase Storage for files  
**Testing**: Vitest (unit), React Testing Library (components), Playwright (E2E)  
**Target Platform**: Web (PWA), optimized for mobile browsers (iOS Safari, Chrome)  
**Project Type**: Web application (Next.js monolith with API routes)  
**Performance Goals**: 
- Page load < 2 seconds
- Time to Interactive < 3 seconds
- API response < 500ms
- Lighthouse score > 90

**Constraints**: 
- Offline-capable for read operations (schedule, rundowns)
- < 200ms p95 for critical interactions
- Must work on 3G connections
- 50 concurrent users without degradation

**Scale/Scope**: 
- 20-50 active members
- ~50 screens across all features
- 7 feature modules (Auth, Rota, Livestream, Equipment, Rundown, Social, Training)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. User-Centric Ministry Focus | ✅ PASS | All features directly serve member coordination and service quality (rota, rundown, training) |
| II. Mobile-First, Offline-Capable | ✅ PASS | PWA requirement in FR-060, offline views in FR-062, < 2s load in FR-059 |
| III. Modular Feature Independence | ✅ PASS | 7 independent modules with clear boundaries defined in project structure |
| IV. Type Safety & Validation | ✅ PASS | TypeScript strict mode, Zod schemas for forms, Supabase-generated types |
| V. Security by Default | ✅ PASS | RLS policies on all tables, role-based access, server-side API secrets |
| VI. AI as Augmentation | ✅ PASS | All AI content editable (FR-021), explicit human approval required |
| VII. Graceful Degradation | ✅ PASS | Notification failure handling (FR-064/65), retry logic, fallback UI states |

**Gate Status**: ✅ ALL GATES PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-cyber-tech-app-build/
├── plan.md              # This file
├── research.md          # Phase 0: Technology research and decisions
├── data-model.md        # Phase 1: Entity definitions and relationships
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: API endpoint specifications
│   ├── auth.md
│   ├── rota.md
│   ├── livestream.md
│   ├── equipment.md
│   ├── rundown.md
│   ├── social.md
│   └── training.md
└── tasks.md             # Phase 2: Implementation tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
cyber-tech/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth route group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/                  # Protected dashboard routes
│   │   ├── layout.tsx                # Sidebar + header shell
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── rota/                     # Rota management
│   │   ├── livestream/               # AI description generator
│   │   ├── social/                   # Social media hub
│   │   ├── equipment/                # Equipment inventory
│   │   ├── rundown/                  # Service rundowns
│   │   ├── training/                 # Member training
│   │   ├── team/                     # Team directory
│   │   ├── admin/                    # Admin settings
│   │   └── settings/                 # User settings
│   ├── api/                          # API routes
│   │   ├── ai/                       # AI generation endpoints
│   │   ├── cron/                     # Scheduled jobs
│   │   └── webhooks/                 # External webhooks
│   ├── manifest.ts                   # PWA manifest
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
│
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── magicui/                      # Magic UI components
│   ├── layout/                       # Sidebar, header, nav
│   ├── rota/                         # Rota-specific components
│   ├── livestream/                   # Livestream components
│   ├── social/                       # Social media components
│   ├── equipment/                    # Equipment components
│   ├── rundown/                      # Rundown components
│   ├── training/                     # Training components
│   └── shared/                       # Shared components
│
├── lib/
│   ├── supabase/                     # Supabase clients
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── admin.ts                  # Admin client
│   ├── ai/                           # AI configuration
│   │   ├── openai.ts
│   │   └── prompts/
│   ├── notifications/                # Email/SMS clients
│   ├── integrations/                 # External APIs
│   ├── validations/                  # Zod schemas
│   ├── utils.ts
│   └── constants.ts
│
├── hooks/                            # Custom React hooks
├── types/                            # TypeScript definitions
├── emails/                           # React Email templates
├── public/                           # Static assets
│
├── supabase/
│   ├── migrations/                   # Database migrations
│   ├── seed.sql                      # Seed data (initial admin)
│   └── config.toml
│
├── middleware.ts                     # Auth middleware
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

**Structure Decision**: Next.js App Router monolith with colocated API routes. This aligns with the constitution's Modular Feature Independence principle—each feature module (rota, livestream, equipment, etc.) has its own route group, components folder, and can be developed/tested independently.

## Complexity Tracking

> No constitution violations detected. All 7 principles pass without justification needed.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Monolith vs Microservices | Next.js Monolith | Scale (50 users) doesn't justify distributed complexity |
| State Management | Server Components + React Query | Minimal client state, server-side rendering preferred |
| Offline Strategy | Service Worker + IndexedDB | Cache critical read-only views per constitution II |

---

## Phase Completion Status

### Phase 0: Outline & Research ✅ COMPLETE

- [x] research.md - 8 technology research areas documented
  - Supabase Auth (magic link configuration)
  - Supabase RLS (role-based policies)
  - Vercel AI SDK (streaming implementation)
  - PWA Strategy (next-pwa vs serwist)
  - Notification Delivery (Resend + Telnyx)
  - Zod Validation (patterns and best practices)
  - @dnd-kit (drag-and-drop implementation)
  - QR Code Libraries (generation and scanning)
  - Calendar Integration (FullCalendar + DayPicker)

### Phase 1: Design & Contracts ✅ COMPLETE

- [x] data-model.md - Complete database schema
  - 20+ tables with full column definitions
  - All RLS policies documented
  - 3 database triggers (profile creation, equipment status, timestamps)
  - Indexes for performance optimization
  - All enum types defined

- [x] contracts/ - API specifications for all 7 modules
  - auth.md - Supabase Auth + invite/profile endpoints
  - rota.md - Supabase queries + swap requests + cron job
  - livestream.md - AI streaming endpoint + templates
  - equipment.md - Inventory CRUD + checkout flow + QR generation
  - rundown.md - Builder + drag-drop reorder + live mode
  - social.md - Google Drive integration + caption generation
  - training.md - Tracks + progress + mentor verification

- [x] quickstart.md - Developer setup guide
  - Prerequisites and installation
  - Environment variables
  - Database setup (cloud + local)
  - Project structure overview
  - Available scripts
  - Key development workflows

- [x] Agent context updated (.github/agents/copilot-instructions.md)

### Phase 2: Implementation Tasks ⏳ NOT STARTED

> Phase 2 is NOT created by `/speckit.plan`. Use `/speckit.tasks` to generate implementation tasks.

---

## Next Steps

1. **Run `/speckit.tasks`** to generate `tasks.md` with granular implementation tasks
2. Each task will reference contracts and data model
3. Tasks will be organized by priority (P1 → P2 → P3)
4. Estimated total implementation: 15-20 developer days
