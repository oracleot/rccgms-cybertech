# Implementation Plan: Design Requests Tracking

**Branch**: `018-design-requests-tracking` | **Date**: 4 January 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-design-requests-tracking/spec.md`

## Summary

Public-facing design request system for church where congregation members submit design needs (banners, flyers, social graphics) without authentication. Team members view, claim, and track design work through a status workflow (submitted → in_progress → review → completed). Features include revision workflow, Google Drive deliverable links, rate limiting with honeypot for spam prevention, and email notifications at key status changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: Next.js 14+ (App Router), React 18, Zod, React Hook Form  
**Storage**: PostgreSQL via Supabase (RLS policies required)  
**Testing**: Manual testing (no automated test suite in project)  
**Target Platform**: Web (PWA-capable), mobile-first responsive  
**Project Type**: Web application (Next.js monolith)  
**Performance Goals**: < 2s page load on 3G, < 2s status update reflection (SC-005)  
**Constraints**: Rate limit 3 requests/hr/IP (FR-035), offline-capable reads (Constitution II)  
**Scale/Scope**: Church congregation (~500 members), ~20-50 design requests/month expected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User-Centric Ministry Focus | ✅ PASS | Directly reduces missed designs and duplicate work |
| II. Mobile-First, Offline-Capable | ✅ PASS | Dashboard will cache requests for offline viewing |
| III. Modular Feature Independence | ✅ PASS | Self-contained "designs" module with clear API boundaries |
| IV. Type Safety & Validation | ✅ PASS | Zod schemas for all inputs, Supabase-generated types |
| V. Security by Default | ✅ PASS | RLS policies on design_requests table, public insert only |
| VI. AI as Augmentation | N/A | No AI features in this module |
| VII. Graceful Degradation | ✅ PASS | Email failures logged, don't block core workflow |

**Pre-Design Gate**: ✅ PASSED

## Project Structure

### Documentation (this feature)

```text
specs/018-design-requests-tracking/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API endpoint specifications
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# New files for this feature
app/
├── designs/
│   └── request/
│       ├── page.tsx           # Public submission form
│       └── layout.tsx         # Public layout (no auth check)
└── (dashboard)/
    └── designs/
        ├── page.tsx           # Team dashboard (list view)
        ├── [id]/
        │   └── page.tsx       # Request detail view
        └── actions.ts         # Server actions

app/api/designs/
├── route.ts                   # GET list, POST create (public)
└── [id]/
    ├── route.ts               # GET detail, PATCH update
    ├── assign/
    │   └── route.ts           # POST claim/unclaim
    └── complete/
        └── route.ts           # POST complete with deliverable

components/designs/
├── design-request-form.tsx    # Public submission form
├── design-request-list.tsx    # List with filters
├── design-request-card.tsx    # Card display
├── design-status-badge.tsx    # Status pill with colors
├── claim-modal.tsx            # Claim confirmation
├── complete-modal.tsx         # Complete with Drive link
├── update-status-modal.tsx    # Status change modal
└── delete-modal.tsx           # Delete confirmation

lib/validations/
└── designs.ts                 # Zod schemas

types/
└── designs.ts                 # TypeScript types

emails/
├── design-request-new.tsx     # New request notification
├── design-request-claimed.tsx # Claim notification to requester
├── design-request-review.tsx  # Review notification
└── design-request-completed.tsx # Completion notification

supabase/migrations/
└── 024_design_requests.sql    # Database migration
```

**Structure Decision**: Follows existing feature module pattern (equipment, rota). Dashboard pages in `app/(dashboard)/designs/`, public page in `app/designs/request/`, server actions colocated with dashboard, API routes for public access and specific operations.

## Complexity Tracking

No Constitution violations. Feature follows established patterns.

## Phase Outputs

### Phase 0: Research

See [research.md](./research.md) for:
- Rate limiting implementation approach (upstash/ratelimit vs middleware)
- Honeypot field pattern for spam prevention
- Auto-archive implementation strategy (cron job vs RLS filter)
- Email template patterns for design notifications

### Phase 1: Design

See:
- [data-model.md](./data-model.md) - Database schema and RLS policies
- [contracts/api.md](./contracts/api.md) - API endpoint specifications
- [quickstart.md](./quickstart.md) - Developer setup and testing guide
