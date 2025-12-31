````markdown
# Tasks: Invite-Only Magic Link Authentication

**Input**: Design documents from `/specs/003-invite-only-magic-link/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in specification - omitting test tasks

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **App Router pages**: `app/(auth)/`, `app/(dashboard)/`, `app/api/`
- **Lib/validations**: `lib/validations/`
- **Middleware**: `middleware.ts`

---

## Phase 1: Setup (Validation Schemas & Types)

**Purpose**: Create validation schemas and type definitions needed for magic link authentication

- [X] T001 Add magicLinkSchema to lib/validations/auth.ts
- [X] T002 [P] Add completeProfileSchema to lib/validations/auth.ts

---

## Phase 2: Foundational (API Endpoints)

**Purpose**: Core API infrastructure that multiple user stories depend on

**⚠️ CRITICAL**: No user story UI work can begin until these endpoints exist

- [X] T003 Create magic link request endpoint in app/api/auth/magic-link/route.ts
- [X] T004 [P] Create profile completion endpoint in app/api/auth/complete-profile/route.ts

**Checkpoint**: API endpoints ready - user story UI implementation can now begin

---

## Phase 3: User Story 3 - Remove Self-Registration Access (Priority: P1) 🎯 MVP

**Goal**: Disable self-registration and redirect /register to /login

**Independent Test**: Accessing /register directly via URL redirects to the login page

### Implementation for User Story 3

- [X] T005 [US3] Update middleware.ts to redirect /register to /login
- [X] T006 [US3] Modify app/(auth)/register/page.tsx to redirect to /login (fallback)
- [X] T007 [US3] Remove "Sign up" and "Create account" links from app/(auth)/login/page.tsx

**Checkpoint**: Self-registration is fully disabled, no way to access register page

---

## Phase 4: User Story 2 - Existing User Logs In via Magic Link (Priority: P1)

**Goal**: Replace password login with email-only magic link authentication

**Independent Test**: User enters email on login page, receives magic link, clicks it, and is logged into the dashboard

### Implementation for User Story 2

- [X] T008 [US2] Modify app/(auth)/login/page.tsx to use email-only form with magic link flow
- [X] T009 [US2] Update app/(auth)/login/actions.ts to use signInWithOtp instead of signInWithPassword
- [X] T010 [US2] Add success state UI showing "Check your email" message in login page
- [X] T011 [US2] Update app/auth/callback/route.ts to handle magic link type authentication (adds `type=magiclink` handling)
- [X] T012 [US2] Remove "Forgot password?" link from login page UI

**Checkpoint**: Existing users can log in via magic link, password login is removed

---

## Phase 5: User Story 1 - Admin Invites New Team Member (Priority: P1)

**Goal**: Existing invite flow works with magic links instead of password setup

**Independent Test**: Admin invites user via modal, user receives magic link email, clicks it, and is logged into dashboard

### Implementation for User Story 1

- [ ] T013 [US1] Update app/auth/callback/route.ts to handle invite type with profile completeness check (adds `type=invite` handling, builds on T011)
- [ ] T014 [US1] Modify redirect logic in callback to send incomplete profiles to /accept-invite
- [ ] T015 [US1] Verify existing admin invite modal works with magic links (no changes expected)

**Checkpoint**: Admin invite flow works end-to-end with magic links

---

## Phase 6: User Story 4 - Invited User First-Time Setup (Priority: P2)

**Goal**: New invited users can complete their profile (name) after first magic link login

**Independent Test**: New invited user clicks magic link, is prompted to enter name if not pre-filled, then accesses dashboard

### Implementation for User Story 4

- [ ] T016 [US4] Modify app/(auth)/accept-invite/page.tsx to remove password setup fields
- [ ] T017 [US4] Update accept-invite page to show name-only profile completion form
- [ ] T018 [US4] Connect profile completion form to PUT /api/auth/complete-profile endpoint
- [ ] T019 [US4] Add redirect to dashboard after successful profile completion

**Checkpoint**: First-time invited users can complete profile and access dashboard

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, UI polish, and validation across all stories

- [ ] T020 [P] Remove unused password-related imports from login page
- [ ] T021 [P] Update login page copy/text for magic link flow
- [ ] T022 [P] Hide forgot-password and reset-password links from UI (keep routes for edge cases)
- [ ] T023 Run quickstart.md validation - test all 4 test scenarios
- [ ] T024 Verify email templates in Supabase reflect magic link flow (manual check)
- [ ] T025 [P] Fix pre-existing lint errors across codebase (28 errors, 66 warnings identified in QA)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion
- **User Story 3 (Phase 3)**: Depends on Phase 2 - simplest story, removes registration
- **User Story 2 (Phase 4)**: Depends on Phase 2 - core login flow
- **User Story 1 (Phase 5)**: Depends on Phase 2 and partially on Phase 4 (callback updates)
- **User Story 4 (Phase 6)**: Depends on Phase 2 and Phase 5 (callback flow)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 3 (P1)**: Independent - can start after Foundational
- **User Story 2 (P1)**: Independent - can start after Foundational
- **User Story 1 (P1)**: Integrates with callback from US2 (T011 → T013)
- **User Story 4 (P2)**: Depends on callback logic from US1 (T014 → T016)

### Within Each User Story

- API endpoint must exist before UI connects to it
- Validation schemas must exist before API uses them
- Core flow before polish/cleanup

### Parallel Opportunities

- T001 and T002 can run in parallel (different schemas, same file but independent)
- T003 and T004 can run in parallel (different API routes)
- T005, T006, T007 cannot run in parallel (T005 and T006 both affect /register flow)
- T008, T009, T010, T011, T012 are sequential (all modify login flow)
- T020, T021, T022 can run in parallel (different files/concerns)

---

## Parallel Example: Setup Phase

```bash
# Launch validation schema tasks together:
Task: "Add magicLinkSchema to lib/validations/auth.ts"
Task: "Add completeProfileSchema to lib/validations/auth.ts"

# Launch API endpoint tasks together:
Task: "Create magic link request endpoint in app/api/auth/magic-link/route.ts"
Task: "Create profile completion endpoint in app/api/auth/complete-profile/route.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 2 & 3)

1. Complete Phase 1: Setup (validation schemas)
2. Complete Phase 2: Foundational (API endpoints)
3. Complete Phase 3: User Story 3 (disable registration)
4. Complete Phase 4: User Story 2 (magic link login)
5. **STOP and VALIDATE**: Test existing user magic link login
6. Deploy/demo if ready - existing users can now use magic links

### Incremental Delivery

1. Complete Setup + Foundational → API ready
2. Add User Story 3 → Registration disabled → Deploy (breaking change!)
3. Add User Story 2 → Magic link login works → Deploy (users can log in again)
4. Add User Story 1 → Admin invites work → Deploy (new users can join)
5. Add User Story 4 → Profile completion → Deploy (polish for new users)
6. Each story adds value without breaking previous stories

### Recommended Order

Given dependencies, implement in this order:
1. T001-T002 (schemas)
2. T003-T004 (API endpoints)
3. T005-T007 (disable registration - US3)
4. T008-T012 (magic link login - US2)
5. T013-T015 (invite callback - US1)
6. T016-T019 (profile completion - US4)
7. T020-T024 (polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 3 is listed first (Phase 3) because it's the simplest and can be done independently
- User Stories 2 and 1 share the callback route but modify different code paths
- Supabase handles magic link token security - no custom token implementation needed
- Rate limiting uses Supabase defaults (4 emails/hour) - can add custom if needed
- No database migrations required - uses existing profiles table

## Supabase-Handled Requirements (No Implementation Needed)

The following requirements are handled automatically by Supabase Auth and require no custom implementation. Verify during T023 quickstart testing:

- **FR-005** (one-time use): Supabase automatically invalidates magic link tokens after first use
- **FR-009** (maintain roles): No database schema changes; existing roles/permissions preserved
- **FR-011** (1hr expiration): Supabase default magic link expiration is 1 hour
````