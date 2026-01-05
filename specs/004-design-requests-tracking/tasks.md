# Tasks: Design Requests Tracking

**Input**: Design documents from `/specs/018-design-requests-tracking/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: Manual testing only (no automated test suite per plan.md)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database, types, and validation setup shared across all user stories

- [X] T001 Apply database migration in supabase/migrations/024_design_requests.sql
- [X] T002 Regenerate TypeScript types with `pnpm db:generate`
- [X] T003 [P] Create TypeScript types for designs in types/designs.ts
- [X] T004 [P] Create Zod validation schemas in lib/validations/designs.ts
- [X] T005 [P] Create rate limiting helper in lib/rate-limit.ts
- [X] T006 Update NotificationType union in types/notification.ts with design request types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Update middleware.ts to whitelist `/designs/request` as public route
- [X] T008 [P] Create design status badge component in components/designs/design-status-badge.tsx
- [X] T009 [P] Create design priority badge component in components/designs/design-priority-badge.tsx
- [X] T010 Add designs navigation item to dashboard sidebar in components/layout/ (existing sidebar component)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Submit Design Request (Priority: P1) 🎯 MVP

**Goal**: Public form for congregation members to submit design requests without authentication

**Independent Test**: Visit `/designs/request`, fill form with event details, submit, see confirmation message

### Implementation for User Story 1

- [X] T011 [P] [US1] Create public layout (no auth) in app/designs/request/layout.tsx
- [X] T012 [P] [US1] Create public request form page in app/designs/request/page.tsx
- [X] T013 [US1] Create design request form component in components/designs/design-request-form.tsx (with honeypot field)
- [X] T014 [US1] Create POST /api/designs endpoint for public submission in app/api/designs/route.ts (rate limit + honeypot check)
- [X] T015 [US1] Add success confirmation UI to form submission flow

**Checkpoint**: User Story 1 complete - Public form submission works independently

---

## Phase 4: User Story 2 - View and Claim Design Requests (Priority: P1)

**Goal**: Team members can view all requests, filter by status, and claim unclaimed requests

**Independent Test**: Log in, navigate to /designs, filter by status, click "Claim" on unclaimed request

### Implementation for User Story 2

- [X] T016 [P] [US2] Create design request card component in components/designs/design-request-card.tsx
- [X] T017 [P] [US2] Create design request list component with filters in components/designs/design-request-list.tsx
- [X] T018 [P] [US2] Create claim modal component in components/designs/claim-modal.tsx
- [X] T019 [US2] Create dashboard designs list page in app/(dashboard)/designs/page.tsx
- [X] T020 [US2] Add GET endpoint to app/api/designs/route.ts (list with filters, search, pagination)
- [X] T021 [US2] Create POST /api/designs/[id]/assign endpoint for claim/unclaim in app/api/designs/[id]/assign/route.ts
- [X] T022 [US2] Create server actions for designs in app/(dashboard)/designs/actions.ts (claimRequest, unclaimRequest)
- [X] T022b [US2] Add reassign functionality to assign endpoint (admin/leader only) - FR-021

**Checkpoint**: User Story 2 complete - Team can view, filter, claim, and reassign requests

---

## Phase 5: User Story 3 - Track Design Progress (Priority: P2)

**Goal**: Team members update status and add internal notes as they work through requests

**Independent Test**: Claim a request, update status to "in_progress", add internal notes, verify changes visible

### Implementation for User Story 3

- [X] T023 [P] [US3] Create update status modal component in components/designs/update-status-modal.tsx
- [X] T024 [US3] Create design request detail page in app/(dashboard)/designs/[id]/page.tsx
- [X] T025 [US3] Create GET /api/designs/[id] endpoint for single request in app/api/designs/[id]/route.ts
- [X] T026 [US3] Create PATCH /api/designs/[id] endpoint for status/priority/notes update in app/api/designs/[id]/route.ts
- [X] T027 [US3] Add updateRequest server action to app/(dashboard)/designs/actions.ts

**Checkpoint**: User Story 3 complete - Status tracking workflow operational

---

## Phase 6: User Story 4 - Complete Design with Deliverable (Priority: P2)

**Goal**: Complete requests with required Google Drive link for deliverables

**Independent Test**: Try to complete without link (fails), add Drive URL, complete successfully

### Implementation for User Story 4

- [X] T028 [P] [US4] Create complete modal component in components/designs/complete-modal.tsx (requires deliverable URL)
- [X] T029 [US4] Create POST /api/designs/[id]/complete endpoint in app/api/designs/[id]/complete/route.ts
- [X] T030 [US4] Add completeRequest server action to app/(dashboard)/designs/actions.ts
- [X] T031 [US4] Display deliverable link on completed request detail page

**Checkpoint**: User Story 4 complete - Designs can be completed with deliverables

---

## Phase 7: User Story 5 - Request Revision (Priority: P3)

**Goal**: Change status to "revision_requested" with notes when requester needs changes

**Independent Test**: Set request to "review", change to "revision_requested" with notes, verify notes visible

### Implementation for User Story 5

- [X] T032 [US5] Add revision workflow to update status modal (revision_requested status with required notes)
- [X] T033 [US5] Update PATCH /api/designs/[id] to handle revision notes append with timestamp
- [X] T034 [US5] Display revision notes history on detail page in app/(dashboard)/designs/[id]/page.tsx

**Checkpoint**: User Story 5 complete - Revision workflow operational

---

## Phase 8: User Story 6 - Email Notifications (Priority: P3)

**Goal**: Automated email notifications at key status changes

**Independent Test**: Trigger each notification scenario, verify emails sent to correct recipients

### Implementation for User Story 6

- [X] T035 [P] [US6] Create new request email template in emails/design-request-new.tsx
- [X] T036 [P] [US6] Create claimed email template in emails/design-request-claimed.tsx
- [X] T037 [P] [US6] Create review email template in emails/design-request-review.tsx
- [X] T038 [P] [US6] Create completed email template in emails/design-request-completed.tsx
- [X] T039 [US6] Integrate notification service in POST /api/designs (notify team on new request - query profiles table for all team member emails)
- [X] T040 [US6] Integrate notification service in assign endpoint (notify requester on claim)
- [X] T041 [US6] Integrate notification service in PATCH endpoint (notify on status changes)
- [X] T042 [US6] Integrate notification service in complete endpoint (notify requester with deliverable link)

**Checkpoint**: User Story 6 complete - All notification triggers operational

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, archiving, deletion, and final polish

- [X] T043 [P] Create delete modal component in components/designs/delete-modal.tsx
- [X] T044 Create DELETE /api/designs/[id] endpoint in app/api/designs/[id]/route.ts (admin/leader only)
- [X] T045 Add deleteRequest server action to app/(dashboard)/designs/actions.ts
- [X] T046 Add "Include archived" filter toggle to design request list
- [X] T047 Create cron job for auto-archive in app/api/cron/archive-designs/route.ts
- [X] T048 Add search functionality to design request list (title, requester name)
- [X] T049 Handle edge case: past "needed by" date warning badge
- [X] T050 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase
  - US1 (Public Form) → US2 (View/Claim) can run in parallel
  - US3 (Status Tracking) depends on US2 (needs detail page)
  - US4 (Complete) depends on US3 (needs detail page)
  - US5 (Revisions) depends on US3 (needs status modal)
  - US6 (Notifications) can run in parallel with US3-US5
- **Polish (Phase 9)**: Depends on US1-US5 being complete

### User Story Dependencies

| User Story | Depends On | Can Parallelize With |
|------------|------------|----------------------|
| US1 (Submit) | Foundational | US2, US6 |
| US2 (View/Claim) | Foundational | US1, US6 |
| US3 (Track Progress) | US2 | US6 |
| US4 (Complete) | US3 | US5, US6 |
| US5 (Revisions) | US3 | US4, US6 |
| US6 (Notifications) | Foundational | US1-US5 |

### Parallel Opportunities

```bash
# Phase 1: All [P] tasks in parallel
T003: types/designs.ts
T004: lib/validations/designs.ts
T005: lib/rate-limit.ts

# Phase 2: All [P] tasks in parallel
T008: design-status-badge.tsx
T009: design-priority-badge.tsx

# Phase 3 (US1): Layout and page in parallel
T011: app/designs/request/layout.tsx
T012: app/designs/request/page.tsx

# Phase 4 (US2): All component tasks in parallel
T016: design-request-card.tsx
T017: design-request-list.tsx
T018: claim-modal.tsx

# Phase 8 (US6): All email templates in parallel
T035: design-request-new.tsx
T036: design-request-claimed.tsx
T037: design-request-review.tsx
T038: design-request-completed.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T010)
3. Complete Phase 3: User Story 1 - Public Form (T011-T015)
4. Complete Phase 4: User Story 2 - View/Claim (T016-T022)
5. **STOP and VALIDATE**: Full submit→view→claim flow works
6. Deploy/demo as MVP

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 + US2 → Public submission + team dashboard
2. **+Status Tracking**: Add US3 → Team can track progress
3. **+Completion**: Add US4 → Designs can be delivered
4. **+Revisions**: Add US5 → Revision workflow enabled
5. **+Notifications**: Add US6 → Automated communication
6. **+Polish**: Add Phase 9 → Archive, delete, search

### Single Developer Strategy

Execute in order: Setup → Foundational → US1 → US2 → US3 → US4 → US5 → US6 → Polish

Estimated task time: ~4-6 hours total

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Rate limiting uses in-memory Map (sufficient for low volume)
- Honeypot field silently rejects bots with fake success response
- Revision notes are append-only with timestamps
- RLS policies handle authorization (public insert, auth required for read/update)
- Only admin/leader can delete requests (enforced by RLS + API check)
- Auto-archive runs via cron, completed requests hidden after 12 months
