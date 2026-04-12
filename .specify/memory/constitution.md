<!--
Sync Impact Report
==================
Version change: 0.0.0 → 1.0.0
Modified principles: N/A (initial version)
Added sections: Core Principles (7), Technology Stack, Security & Data Privacy, Development Workflow
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (compatible - Constitution Check section exists)
  - .specify/templates/spec-template.md ✅ (compatible - Requirements section aligns)
  - .specify/templates/tasks-template.md ✅ (compatible - Phase structure aligns)
Follow-up TODOs: None
-->

# Fusion Constitution

**Church Tech Department Management Platform**

## Core Principles

### I. User-Centric Ministry Focus

Every feature MUST directly serve the mission of supporting worship services and empowering tech team volunteers. Features are evaluated by their impact on:

- Reducing manual coordination overhead for team leaders
- Enabling volunteers to serve more effectively
- Improving the quality and reliability of Sunday services

**Rationale**: This is a ministry tool, not a commercial product. Decisions prioritize volunteer experience and operational efficiency over feature bloat. If a feature doesn't help someone serve better or lead more effectively, it doesn't belong.

### II. Mobile-First, Offline-Capable

The application MUST be designed mobile-first and function as a Progressive Web App (PWA) with offline capabilities for critical views.

- All UI components MUST be responsive and touch-friendly
- Core read operations (my schedule, current rundown, equipment lookup) MUST work offline
- The app MUST be installable on mobile devices via "Add to Home Screen"
- Performance target: < 2s page load on 3G connections

**Rationale**: Tech team members primarily access the system during services on mobile devices, often in areas with poor connectivity. The app must work reliably in these conditions.

### III. Modular Feature Independence

Each major feature module (Rota, Livestream, Equipment, Rundown, Social, Training) MUST be:

- Independently deployable and testable
- Loosely coupled with clear API boundaries
- Capable of graceful degradation if dependencies are unavailable

**Rationale**: The team may adopt features incrementally. A problem in one module should never break another. This also enables focused development and testing.

### IV. Type Safety & Validation

All data flows MUST be type-safe from database to UI:

- TypeScript strict mode enabled (`"strict": true`)
- Supabase-generated types for database schema
- Zod schemas for all API inputs and form validation
- No `any` types except with explicit justification

**Rationale**: Type safety prevents runtime errors that would disrupt services. Strong validation at boundaries catches issues early and provides clear error messages.

### V. Security by Default

User data and church operations MUST be protected through defense-in-depth:

- Supabase Row Level Security (RLS) policies on ALL tables—no exceptions
- Role-based access control enforced at database level, not just UI
- Sensitive data (API keys, tokens) encrypted at rest
- All external API calls via server-side routes—never expose secrets to client
- Session management with secure, HTTP-only cookies

**Rationale**: The app handles personal contact information, schedules, and ministry operations. Trust is paramount. Security failures would harm both individuals and the ministry's reputation.

### VI. AI as Augmentation, Not Replacement

AI features (GPT-4) MUST augment human decision-making, never replace it:

- All AI-generated content MUST be editable before use
- AI suggestions MUST include clear "edit" and "regenerate" options
- AI MUST NOT auto-post to external platforms without explicit human approval
- Rate limiting and cost controls MUST be implemented on AI endpoints

**Rationale**: AI accelerates content creation but humans remain accountable for ministry communications. We prevent runaway API costs and maintain editorial control.

### VII. Graceful Degradation & Error Resilience

The system MUST handle failures gracefully without disrupting user workflows:

- External service failures (AI, SMS, email, Google Drive) MUST NOT block core functionality
- All errors MUST be caught, logged, and presented with actionable user messages
- Retry logic with exponential backoff for transient failures
- Fallback UI states for loading, error, and empty conditions

**Rationale**: Sunday services cannot wait for bug fixes. The system must remain usable even when parts fail. Clear error messages help users understand what happened and what to do next.

## Technology Stack

The following technology choices are **non-negotiable** for this project:

| Layer | Technology | Justification |
|-------|------------|---------------|
| Framework | Next.js 14+ (App Router) | Server components, API routes, Vercel deployment |
| Language | TypeScript (strict) | Type safety, developer experience |
| Database | PostgreSQL via Supabase | Managed, RLS, real-time capable |
| Auth | Supabase Auth | Integrated with database, simple setup |
| AI | Vercel AI SDK + GPT-4 | Streaming responses, edge-compatible |
| Email | Resend | React Email support, Vercel integration |
| SMS | Telnyx | Cost-effective, reliable API |
| UI | shadcn/ui + Magic UI | Accessible, customizable, beautiful |
| Styling | Tailwind CSS | Utility-first, consistent design |
| Storage | Supabase Storage + Google Drive API | Media storage, existing team workflow |
| Hosting | Vercel | Optimized for Next.js, global edge |

**Adding new dependencies**: Any new dependency MUST be justified against:
1. Does it solve a problem we can't solve with existing stack?
2. Is it actively maintained with a healthy community?
3. Does it add < 50KB to the client bundle (or is tree-shakeable)?

## Security & Data Privacy

### Data Classification

| Classification | Examples | Handling Requirements |
|----------------|----------|----------------------|
| **Public** | Service times, church address | No restrictions |
| **Internal** | Rotas, rundowns, equipment lists | Auth required, RLS enforced |
| **Sensitive** | Member phone numbers, emails | Encrypted, minimal access, audit logged |
| **Secret** | API keys, OAuth tokens | Server-side only, environment variables |

### Access Control Matrix

| Action | Volunteer | Leader | Admin |
|--------|-----------|--------|-------|
| View own schedule | ✅ | ✅ | ✅ |
| View team schedules | ❌ | ✅ | ✅ |
| Create/edit rotas | ❌ | ✅ | ✅ |
| Manage equipment | ❌ | ✅ | ✅ |
| AI content generation | ❌ | ✅ | ✅ |
| User management | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |

### Notification Consent

- Users MUST explicitly opt-in to SMS notifications
- Email notifications enabled by default with clear opt-out
- Notification preferences stored per-user and respected across all features
- Default reminder timing: 1 day before service (user-customizable)

## Development Workflow

### Code Quality Gates

All code MUST pass these checks before merge:

1. **TypeScript**: `tsc --noEmit` passes with zero errors
2. **Linting**: ESLint passes with zero errors
3. **Formatting**: Prettier check passes
4. **Build**: `next build` completes successfully
5. **Tests**: All existing tests pass (when tests exist)

### Commit Standards

- Commits MUST follow Conventional Commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Scopes: `rota`, `livestream`, `social`, `equipment`, `rundown`, `training`, `auth`, `ui`, `api`
- Example: `feat(rota): add swap request workflow`

### Branch Strategy

- `main`: Production-ready code, deployed automatically to Vercel
- `dev`: Integration branch for features in progress
- `feature/*`: Individual feature branches, merged to `dev` via PR
- Naming: `feature/[module]-[brief-description]` (e.g., `feature/rota-swap-requests`)

### Documentation Requirements

- All API routes MUST have JSDoc comments describing inputs/outputs
- Complex business logic MUST include inline comments explaining "why"
- New features MUST update relevant docs in `.github/docs/`
- Database schema changes MUST be reflected in `TECH_DOCS.md`

## Governance

### Constitution Authority

This constitution supersedes all other practices and conventions. When in doubt, refer here first.

### Amendment Process

1. **Propose**: Document the proposed change with rationale
2. **Review**: Discuss impact on existing code and workflows
3. **Approve**: Requires consensus from project maintainers
4. **Implement**: Update constitution, increment version, update `LAST_AMENDED_DATE`
5. **Propagate**: Update any affected templates or documentation

### Version Policy

- **MAJOR**: Backward-incompatible principle changes or removals
- **MINOR**: New principles or significant expansions
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Verification

- Code reviews MUST verify alignment with constitution principles
- Violations MUST be documented and justified if proceeding
- Unjustified violations block merge

**Version**: 1.0.0 | **Ratified**: 2025-12-21 | **Last Amended**: 2025-12-21
