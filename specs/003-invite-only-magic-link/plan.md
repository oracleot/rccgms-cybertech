# Implementation Plan: Invite-Only Magic Link Authentication

**Branch**: `003-invite-only-magic-link` | **Date**: 2024-12-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-invite-only-magic-link/spec.md`

## Summary

Replace password-based authentication with Supabase magic links and disable self-registration. Users can only join the platform via admin invitation, and all logins use passwordless magic link authentication. The existing invite flow is simplified to use magic links instead of password setup.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: Next.js 14+ (App Router), Supabase Auth (@supabase/ssr), React Hook Form, Zod  
**Storage**: PostgreSQL via Supabase (existing profiles table, no new migrations)  
**Testing**: Manual testing via quickstart guide  
**Target Platform**: Web (PWA), Vercel deployment  
**Project Type**: Web application (Next.js monolith)  
**Performance Goals**: < 2s page load, magic link delivery < 30s  
**Constraints**: Offline-capable for reads (PWA), invite-only access  
**Scale/Scope**: Existing user base (~50-200 users), church tech department

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User-Centric Ministry Focus | ✅ PASS | Simplifies login UX, reduces password management overhead |
| II. Mobile-First, Offline-Capable | ✅ PASS | Login page is mobile-friendly, no offline changes needed |
| III. Modular Feature Independence | ✅ PASS | Auth module changes are isolated, no impact on other features |
| IV. Type Safety & Validation | ✅ PASS | New Zod schemas for magic link input, TypeScript strict mode |
| V. Security by Default | ✅ PASS | Supabase handles token security, rate limiting implemented |
| VI. AI as Augmentation | N/A | No AI features involved |
| VII. Graceful Degradation | ✅ PASS | Clear error messages, fallback to re-request magic link |

**Gate Status**: ✅ PASSED - Proceed with implementation

## Project Structure

### Documentation (this feature)

```text
specs/003-invite-only-magic-link/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Technical research and decisions
├── data-model.md        # Data model (no changes, just documentation)
├── quickstart.md        # Developer testing guide
├── contracts/           # API endpoint specifications
│   ├── magic-link-login.md
│   └── complete-profile.md
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Implementation tasks ✅ (reorganized by user story)
```

### Source Code Changes

```text
app/
├── (auth)/
│   ├── login/
│   │   ├── page.tsx           # MODIFY: Email-only form, magic link flow
│   │   └── actions.ts         # MODIFY: Replace signInWithPassword with signInWithOtp
│   ├── register/
│   │   └── page.tsx           # MODIFY: Redirect to /login
│   └── accept-invite/
│       └── page.tsx           # MODIFY: Profile completion only (remove password)
├── api/
│   └── auth/
│       ├── magic-link/
│       │   └── route.ts       # NEW: Magic link request endpoint
│       └── complete-profile/
│           └── route.ts       # NEW: Profile completion endpoint
└── auth/
    └── callback/
        └── route.ts           # MODIFY: Update redirect logic for magic links

lib/
└── validations/
    └── auth.ts                # MODIFY: Add magicLinkSchema, completeProfileSchema

middleware.ts                  # MODIFY: Add /register redirect to /login
```

## Implementation Phases

> **Note**: tasks.md reorganizes these phases by user story for independent implementation.
> See tasks.md for the authoritative task breakdown.

### Phase 1: Disable Self-Registration (FR-001, FR-002)
- Modify register page to redirect to login
- Update middleware to handle /register redirects
- Remove "Sign up" links from login page

### Phase 2: Magic Link Login (FR-003, FR-006, FR-007, FR-010, FR-011)
- Create magic link API endpoint
- Modify login page for email-only form
- Implement rate limiting
- Update login actions to use signInWithOtp
- Handle success/error states

### Phase 3: Auth Callback Updates (FR-005, FR-006)
- Update /auth/callback to handle magic link type
- Implement profile completeness check
- Redirect appropriately based on profile state

### Phase 4: Profile Completion Flow (FR-008)
- Modify accept-invite page for profile completion only
- Create profile completion API endpoint
- Remove password setup from invite flow

### Phase 5: Cleanup & Testing
- Remove unused password components
- Update UI text for magic link flow
- Test all user journeys from spec

## Complexity Tracking

No violations - this feature aligns with all constitution principles and uses existing patterns.
