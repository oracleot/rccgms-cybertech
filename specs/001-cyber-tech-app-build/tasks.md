# Tasks: Cyber Tech - Church Tech Department Management App

**Input**: Design documents from `/specs/001-cyber-tech-app-build/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in specification. Test tasks are NOT included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **App routes**: `app/(auth)/`, `app/(dashboard)/`, `app/api/`
- **Components**: `components/ui/`, `components/layout/`, `components/[feature]/`
- **Libraries**: `lib/supabase/`, `lib/validations/`, `lib/notifications/`, `lib/ai/`
- **Types**: `types/`
- **Database**: `supabase/migrations/`, `supabase/seed.sql`

---

## Phase 1: Setup (Shared Infrastructure) ✅

**Purpose**: Project initialization, dependencies, and basic configuration

- [x] T001 Install core dependencies: @supabase/ssr, @supabase/supabase-js, react-hook-form, zod, @hookform/resolvers in package.json
- [x] T002 [P] Install UI dependencies: @radix-ui primitives, class-variance-authority, tailwind-merge, sonner in package.json
- [x] T003 [P] Install feature dependencies: @fullcalendar/react, react-day-picker, @dnd-kit/core, @dnd-kit/sortable in package.json
- [x] T004 [P] Install AI/notification dependencies: ai, @ai-sdk/openai, resend, telnyx, qrcode, html5-qrcode in package.json
- [x] T005 [P] Configure shadcn/ui components via CLI: button, card, input, label, dialog, dropdown-menu, avatar, badge, toast
- [x] T006 [P] Create environment variables template in .env.example with all required variables from quickstart.md
- [x] T007 Create Supabase client for browser in lib/supabase/client.ts
- [x] T008 [P] Create Supabase client for server components in lib/supabase/server.ts
- [x] T009 [P] Create Supabase admin client with service role in lib/supabase/admin.ts
- [x] T010 Create utility functions in lib/utils.ts (cn, formatDate, formatTime)
- [x] T011 [P] Create constants file in lib/constants.ts (roles, notification types, equipment categories)
- [x] T012 [P] Configure Tailwind CSS with custom theme colors in tailwind.config.ts
- [x] T013 Update global styles in app/globals.css with CSS variables for theming
- [x] T014 Create PWA manifest in app/manifest.ts per research.md specifications

---

## Phase 2: Foundational (Blocking Prerequisites) ✅

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & Migrations

- [x] T015 Create migration for enum types (user_role, rota_status, assignment_status, etc.) in supabase/migrations/001_enums.sql
- [x] T016 Create migration for profiles table with RLS policies in supabase/migrations/002_profiles.sql
- [x] T017 [P] Create migration for departments and positions tables in supabase/migrations/003_departments.sql
- [x] T018 [P] Create migration for services table in supabase/migrations/004_services.sql
- [x] T019 Create migration for rotas and rota_assignments tables with RLS in supabase/migrations/005_rotas.sql
- [x] T020 [P] Create migration for availability and swap_requests tables in supabase/migrations/006_availability.sql
- [x] T021 [P] Create migration for livestreams table in supabase/migrations/007_livestreams.sql
- [x] T022 [P] Create migration for equipment tables (equipment, equipment_categories, equipment_checkouts, equipment_maintenance) in supabase/migrations/008_equipment.sql
- [x] T023 [P] Create migration for rundowns and rundown_items tables in supabase/migrations/009_rundowns.sql
- [x] T024 [P] Create migration for songs table in supabase/migrations/010_songs.sql
- [x] T025 [P] Create migration for training tables (onboarding_tracks, onboarding_steps, volunteer_progress, step_completions) in supabase/migrations/011_training.sql
- [x] T026 [P] Create migration for notifications and notification_preferences tables in supabase/migrations/012_notifications.sql
- [x] T027 [P] Create migration for social_posts and social_integrations tables in supabase/migrations/013_social.sql
- [x] T028 Create migration for database triggers (profile creation, equipment status, timestamps) in supabase/migrations/014_triggers.sql
- [x] T029 Create seed data for initial admin, departments, positions, equipment categories in supabase/seed.sql

### TypeScript Types

- [x] T030 Generate database types from schema in types/database.ts using supabase gen types
- [x] T031 [P] Create Profile, Department, Position types in types/auth.ts
- [x] T032 [P] Create Rota, RotaAssignment, Availability, SwapRequest types in types/rota.ts
- [x] T033 [P] Create Livestream, PromptTemplate types in types/livestream.ts
- [x] T034 [P] Create Equipment, EquipmentCategory, EquipmentCheckout, EquipmentMaintenance types in types/equipment.ts
- [x] T035 [P] Create Rundown, RundownItem, ServiceType, ItemType types in types/rundown.ts
- [x] T036 [P] Create SocialContent, SocialIntegration, Platform types in types/social.ts
- [x] T037 [P] Create TrainingTrack, TrainingStep, TrainingProgress, StepCompletion types in types/training.ts
- [x] T038 [P] Create Notification, NotificationPreferences types in types/notification.ts

### Zod Validation Schemas

- [x] T039 Create auth validation schemas (inviteUser, updateProfile) in lib/validations/auth.ts
- [x] T040 [P] Create rota validation schemas (createRota, updateAssignments, setAvailability, createSwapRequest) in lib/validations/rota.ts
- [x] T041 [P] Create livestream validation schemas (generateDescription, saveDescription, updateTemplate) in lib/validations/livestream.ts
- [x] T042 [P] Create equipment validation schemas (createEquipment, checkout, return, logMaintenance) in lib/validations/equipment.ts
- [x] T043 [P] Create rundown validation schemas (createRundown, createItem, reorderItems) in lib/validations/rundown.ts
- [x] T044 [P] Create social validation schemas (createContent, updateContent, generateCaption) in lib/validations/social.ts
- [x] T045 [P] Create training validation schemas (createTrack, createStep, completeStep, verifyStep) in lib/validations/training.ts

### Shared Components & Layout

- [x] T046 Create sidebar navigation component in components/layout/app-sidebar.tsx
- [x] T047 [P] Create header component with user menu in components/layout/header.tsx
- [x] T048 [P] Create mobile navigation drawer in components/layout/mobile-nav.tsx
- [x] T049 Create dashboard layout shell in app/(dashboard)/layout.tsx
- [x] T050 [P] Create auth layout in app/(auth)/layout.tsx
- [x] T051 [P] Create loading skeletons component in components/shared/loading-skeleton.tsx
- [x] T052 [P] Create empty state component in components/shared/empty-state.tsx
- [x] T053 [P] Create error boundary component in components/shared/error-boundary.tsx
- [x] T054 Create auth middleware for protected routes in middleware.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel ✅

---

## Phase 3: User Story 1 - User Authentication & Access (Priority: P1) ✅ MVP

**Goal**: Enable tech department members to securely sign up, log in, and access the application with role-based permissions

**Independent Test**: Create an account, log in, verify role-appropriate dashboard elements are visible

### Implementation for User Story 1

- [x] T055 [US1] Create login page with email/password form in app/(auth)/login/page.tsx
- [x] T056 [P] [US1] Create signup page with email/password/name form in app/(auth)/register/page.tsx
- [x] T057 [P] [US1] Create forgot password page in app/(auth)/forgot-password/page.tsx
- [x] T058 [P] [US1] Create reset password page in app/(auth)/reset-password/page.tsx
- [x] T059 [US1] Create email verification callback handler in app/(auth)/verify/route.ts
- [x] T060 [US1] Implement login server action using Supabase Auth in app/(auth)/login/actions.ts
- [x] T061 [P] [US1] Implement signup server action with profile creation in app/(auth)/register/actions.ts
- [x] T062 [P] [US1] Implement password reset request action in app/(auth)/forgot-password/actions.ts
- [x] T063 [P] [US1] Implement password update action in app/(auth)/reset-password/actions.ts
- [x] T064 [US1] Create GET /api/auth/profile endpoint in app/api/auth/profile/route.ts
- [x] T065 [P] [US1] Create PATCH /api/auth/profile endpoint in app/api/auth/profile/route.ts
- [x] T066 [P] [US1] Create POST /api/auth/avatar upload endpoint in app/api/auth/avatar/route.ts
- [x] T067 [US1] Create POST /api/auth/invite endpoint (admin only) in app/api/auth/invite/route.ts
- [x] T068 [US1] Create accept invitation page in app/(auth)/accept-invite/page.tsx
- [x] T069 [US1] Create user settings page with profile form in app/(dashboard)/settings/page.tsx
- [x] T070 [P] [US1] Create notification preferences component in components/settings/notification-preferences.tsx
- [x] T071 [US1] Create role-based route guards utility in lib/auth/guards.ts
- [x] T072 [US1] Create useUser hook for client components in hooks/use-user.ts

**Checkpoint**: User Story 1 (Authentication) is fully functional and testable independently ✅

---

## Phase 4: User Story 2 - Rota Management & Scheduling (Priority: P1)

**Goal**: Enable Team Leaders to create and manage weekly service rotas so volunteers know when and where they are serving

**Independent Test**: Create a rota for an upcoming Sunday, assign volunteers to positions, publish it, verify assigned volunteers receive notifications

### Implementation for User Story 2

- [X] T073 [US2] Create rota calendar view page in app/(dashboard)/rota/page.tsx
- [X] T074 [P] [US2] Create FullCalendar wrapper component in components/rota/rota-calendar.tsx
- [X] T075 [P] [US2] Create rota list view component in components/rota/rota-list.tsx
- [X] T076 [US2] Create single rota detail page in app/(dashboard)/rota/[id]/page.tsx
- [X] T077 [P] [US2] Create new rota form page in app/(dashboard)/rota/new/page.tsx
- [X] T077b [US2] Create rota edit page in app/(dashboard)/rota/[id]/edit/page.tsx
- [X] T078 [US2] Create position assignment component with drag-drop in components/rota/position-assignment.tsx
- [X] T079 [P] [US2] Create volunteer selector dropdown in components/rota/volunteer-selector.tsx
- [X] T080 [P] [US2] Create rota status badge component in components/rota/rota-status-badge.tsx
- [X] T081 [US2] Implement createRota server action in app/(dashboard)/rota/actions.ts
- [X] T082 [P] [US2] Implement updateRotaAssignments server action in app/(dashboard)/rota/actions.ts
- [X] T083 [P] [US2] Implement publishRota server action in app/(dashboard)/rota/actions.ts
- [X] T084 [P] [US2] Implement deleteRota server action in app/(dashboard)/rota/actions.ts
- [X] T085 [US2] Create "My Schedule" view for volunteers in app/(dashboard)/rota/my-schedule/page.tsx
- [X] T086 [P] [US2] Create upcoming assignments card component in components/rota/upcoming-assignments.tsx
- [X] T087 [US2] Create notification service for rota publishing in lib/notifications/rota-notifications.ts
- [X] T088 [US2] Create email template for rota assignment in emails/rota-assignment.tsx

**Checkpoint**: User Story 2 (Rota Management) is fully functional and testable independently

---

## Phase 5: User Story 3 - Volunteer Availability Submission (Priority: P1) ✅

**Goal**: Enable volunteers to submit their availability for upcoming Sundays so Leaders can schedule appropriately

**Independent Test**: Access the availability calendar, mark dates as available/unavailable, verify Leaders can see this when creating rotas

### Implementation for User Story 3

- [X] T089 [US3] Create availability calendar page in app/(dashboard)/rota/availability/page.tsx
- [X] T090 [P] [US3] Create React DayPicker wrapper for availability in components/rota/availability-calendar.tsx
- [X] T091 [P] [US3] Create availability status toggle component in components/rota/availability-toggle.tsx
- [X] T092 [US3] Implement setAvailability server action in app/(dashboard)/rota/availability/actions.ts
- [X] T093 [P] [US3] Implement getMyAvailability server action in app/(dashboard)/rota/availability/actions.ts
- [X] T094 [US3] Create team availability view for Leaders in app/(dashboard)/rota/team-availability/page.tsx
- [X] T095 [P] [US3] Create availability grid component showing team member availability in components/rota/team-availability-grid.tsx
- [X] T096 [US3] Integrate availability data into volunteer selector in components/rota/volunteer-selector.tsx (update)

**Checkpoint**: User Story 3 (Availability) is fully functional and testable independently ✅

---

## Phase 6: User Story 4 - Duty Swap Requests (Priority: P2) ✅

**Goal**: Enable volunteers to request duty swaps with other team members when they can no longer serve on their assigned date

**Independent Test**: Initiate a swap request, have another volunteer accept it, have a Leader approve the swap, verify all parties receive notifications

### Implementation for User Story 4

- [X] T097 [US4] Create swap request modal component in components/rota/swap-request-modal.tsx
- [X] T098 [P] [US4] Create pending swap requests list component in components/rota/pending-swaps.tsx
- [X] T099 [P] [US4] Create swap request card component in components/rota/swap-request-card.tsx
- [X] T100 [US4] Implement createSwapRequest server action in app/(dashboard)/rota/swaps/actions.ts
- [X] T101 [P] [US4] Implement acceptSwapRequest server action in app/(dashboard)/rota/swaps/actions.ts
- [X] T102 [P] [US4] Implement declineSwapRequest server action in app/(dashboard)/rota/swaps/actions.ts
- [X] T103 [P] [US4] Implement approveSwapRequest server action (leader) in app/(dashboard)/rota/swaps/actions.ts
- [X] T104 [P] [US4] Implement rejectSwapRequest server action (leader) in app/(dashboard)/rota/swaps/actions.ts
- [X] T105 [US4] Create my swap requests page for volunteers in app/(dashboard)/rota/swaps/page.tsx
- [X] T106 [P] [US4] Create Leader swap approval dashboard section in components/rota/leader-swap-dashboard.tsx
- [X] T107 [US4] Create email template for swap request notification in emails/swap-request.tsx
- [X] T108 [P] [US4] Create email template for swap approval notification in emails/swap-approved.tsx

**Checkpoint**: User Story 4 (Swap Requests) is fully functional and testable independently ✅

---

## Phase 7: User Story 5 - Livestream Description Generator (Priority: P1) ✅

**Goal**: Enable Leaders to generate YouTube and Facebook descriptions for weekly services using AI in under 2 minutes

**Independent Test**: Enter service details, generate a description with streaming response, edit it, copy to clipboard

### Implementation for User Story 5

- [X] T109 [US5] Create livestream generator page in app/(dashboard)/livestream/page.tsx
- [X] T110 [P] [US5] Create description input form component in components/livestream/description-form.tsx
- [X] T111 [P] [US5] Create streaming preview component in components/livestream/streaming-preview.tsx
- [X] T112 [P] [US5] Create platform toggle (YouTube/Facebook) component in components/livestream/platform-toggle.tsx
- [X] T113 [US5] Create POST /api/ai/generate-description streaming endpoint in app/api/ai/generate-description/route.ts
- [X] T114 [P] [US5] Create OpenAI client configuration in lib/ai/openai.ts
- [X] T115 [P] [US5] Create YouTube prompt template in lib/ai/prompts/youtube.ts
- [X] T116 [P] [US5] Create Facebook prompt template in lib/ai/prompts/facebook.ts
- [X] T117 [US5] Create POST /api/ai/generate-description/save endpoint in app/api/ai/generate-description/save/route.ts
- [X] T118 [P] [US5] Create description history page in app/(dashboard)/livestream/history/page.tsx
- [X] T119 [P] [US5] Create description history list component in components/livestream/history-list.tsx
- [X] T120 [US5] Create useCompletion hook integration in components/livestream/description-form.tsx (update)
- [X] T121 [P] [US5] Create copy to clipboard functionality with toast notification in components/livestream/copy-button.tsx
- [X] T122 [US5] Create prompt template editor page (admin only) in app/(dashboard)/admin/livestream-templates/page.tsx
- [X] T123 [P] [US5] Create GET/PUT /api/livestream/templates endpoints in app/api/livestream/templates/route.ts

**Checkpoint**: User Story 5 (Livestream Generator) is fully functional and testable independently ✅

---

## Phase 8: User Story 6 - Service Rundown Builder (Priority: P2) ✅

**Goal**: Enable Leaders to create and manage service rundowns with timing and cues for coordinated service execution

**Independent Test**: Create a rundown, add items with durations, reorder via drag-drop, view in live mode

### Implementation for User Story 6

- [x] T124 [US6] Create rundowns list page in app/(dashboard)/rundown/page.tsx
- [x] T125 [P] [US6] Create rundown card component in components/rundown/rundown-card.tsx
- [x] T126 [US6] Create new rundown page in app/(dashboard)/rundown/new/page.tsx
- [x] T127 [P] [US6] Create rundown form component in components/rundown/rundown-form.tsx
- [x] T128 [US6] Create rundown editor page in app/(dashboard)/rundown/[id]/page.tsx
- [x] T129 [P] [US6] Create @dnd-kit sortable rundown editor in components/rundown/rundown-editor.tsx
- [x] T130 [P] [US6] Create sortable rundown item component in components/rundown/sortable-item.tsx
- [x] T131 [P] [US6] Create add rundown item modal in components/rundown/add-item-modal.tsx
- [x] T132 [P] [US6] Create rundown item type selector in components/rundown/item-type-selector.tsx
- [x] T133 [US6] Implement createRundown server action in app/(dashboard)/rundown/actions.ts
- [x] T134 [P] [US6] Implement addRundownItem server action in app/(dashboard)/rundown/actions.ts
- [x] T135 [P] [US6] Implement updateRundownItem server action in app/(dashboard)/rundown/actions.ts
- [x] T136 [P] [US6] Implement deleteRundownItem server action in app/(dashboard)/rundown/actions.ts
- [x] T137 [P] [US6] Implement reorderRundownItems server action in app/(dashboard)/rundown/actions.ts
- [x] T138 [US6] Create live view mode page in app/(dashboard)/rundown/[id]/live/page.tsx
- [x] T139 [P] [US6] Create live view component with current/next item in components/rundown/live-view.tsx
- [x] T140 [P] [US6] Create rundown timer component in components/rundown/rundown-timer.tsx
- [x] T141 [US6] Create POST /api/rundowns/:id/duplicate endpoint in app/api/rundowns/[id]/duplicate/route.ts
- [x] T142 [P] [US6] Create template save/load functionality in components/rundown/template-selector.tsx
- [x] T143 [US6] Enable real-time updates via Supabase subscription in components/rundown/rundown-editor.tsx (update)

**Checkpoint**: User Story 6 (Rundown Builder) is fully functional and testable independently ✅

---

## Phase 9: User Story 7 - Equipment Inventory Management (Priority: P2) ✅

**Goal**: Enable Leaders to track all tech department equipment, manage checkouts, and report issues

**Independent Test**: Add equipment to inventory, generate QR code, scan to view details, complete checkout/return cycle

### Implementation for User Story 7

- [x] T144 [US7] Create equipment list page in app/(dashboard)/equipment/page.tsx
- [x] T145 [P] [US7] Create equipment grid/list view component in components/equipment/equipment-list.tsx
- [x] T146 [P] [US7] Create equipment card component in components/equipment/equipment-card.tsx
- [x] T147 [P] [US7] Create equipment status badge component in components/equipment/status-badge.tsx
- [x] T148 [US7] Create add equipment form page in app/(dashboard)/equipment/new/page.tsx
- [x] T149 [P] [US7] Create equipment form component in components/equipment/equipment-form.tsx
- [x] T150 [US7] Create equipment detail page in app/(dashboard)/equipment/[id]/page.tsx
- [x] T151 [P] [US7] Create equipment detail component with history in components/equipment/equipment-detail.tsx
- [x] T152 [P] [US7] Create checkout history table component in components/equipment/checkout-history.tsx
- [x] T153 [P] [US7] Create maintenance history component in components/equipment/maintenance-history.tsx
- [x] T154 [US7] Implement createEquipment server action in app/(dashboard)/equipment/actions.ts
- [x] T155 [P] [US7] Implement updateEquipment server action in app/(dashboard)/equipment/actions.ts
- [x] T156 [P] [US7] Implement checkoutEquipment server action in app/(dashboard)/equipment/actions.ts
- [x] T157 [P] [US7] Implement returnEquipment server action in app/(dashboard)/equipment/actions.ts
- [x] T158 [P] [US7] Implement logMaintenance server action in app/(dashboard)/equipment/actions.ts
- [x] T159 [US7] Create POST /api/equipment/qr/:id endpoint for QR generation in app/api/equipment/qr/[id]/route.ts
- [x] T160 [P] [US7] Create QR code generator utility using qrcode library in lib/equipment/qr.ts
- [x] T161 [P] [US7] Create printable QR label page in app/api/equipment/qr/[id]/print/route.ts
- [x] T162 [US7] Create QR scanner component using html5-qrcode in components/equipment/qr-scanner.tsx
- [x] T163 [P] [US7] Create scan page for mobile in app/(dashboard)/equipment/scan/page.tsx
- [x] T164 [P] [US7] Create checkout modal component in components/equipment/checkout-modal.tsx
- [x] T165 [P] [US7] Create return modal component in components/equipment/return-modal.tsx
- [x] T166 [US7] Create issue report modal in components/equipment/issue-report-modal.tsx
- [x] T167 [P] [US7] Create overdue items dashboard widget in components/equipment/overdue-widget.tsx
- [x] T167a [US7] Implement deleteEquipment server action with cascade delete in app/(dashboard)/equipment/actions.ts
- [x] T167b [P] [US7] Create delete confirmation modal in components/equipment/delete-equipment-modal.tsx
- [x] T167c [P] [US7] Add isBorrowed field to equipment form and validation schemas
- [x] T167d [P] [US7] Create return borrowed modal for returning items to owner in components/equipment/return-borrowed-modal.tsx
- [x] T167e [P] [US7] Add breadcrumb navigation to equipment detail page
- [x] T167f [US7] Create migration for is_borrowed column in supabase/migrations/015_equipment_is_borrowed.sql
- [x] T167g [US7] Create migration for equipment_status 'returned' enum value in supabase/migrations/016_equipment_status_returned.sql
- [x] T167h [P] [US7] Add complete maintenance modal in components/equipment/complete-maintenance-modal.tsx

**Checkpoint**: User Story 7 (Equipment Inventory) is fully functional and testable independently ✅

---

## Phase 10: User Story 8 - Dashboard & Quick Actions (Priority: P2) ✅

**Goal**: Enable volunteers to see upcoming duties and quick actions on their dashboard for efficient access

**Independent Test**: Log in and verify dashboard shows upcoming assignments, quick action buttons work, role-appropriate widgets display

### Implementation for User Story 8

- [X] T168 [US8] Create dashboard home page in app/(dashboard)/page.tsx
- [X] T169 [P] [US8] Create upcoming duties widget component in components/dashboard/upcoming-duties.tsx
- [X] T170 [P] [US8] Create quick actions panel component in components/dashboard/quick-actions.tsx
- [X] T171 [P] [US8] Create service countdown widget in components/dashboard/countdown-widget.tsx
- [X] T172 [P] [US8] Create pending swaps widget for Leaders in components/dashboard/pending-swaps-widget.tsx
- [X] T173 [P] [US8] Create equipment alerts widget for Leaders in components/dashboard/equipment-alerts-widget.tsx
- [X] T174 [P] [US8] Create team overview widget for Leaders in components/dashboard/team-overview.tsx
- [X] T175 [US8] Create role-based dashboard layout logic in app/(dashboard)/page.tsx (update)
- [X] T176 [P] [US8] Create notification feed component in components/dashboard/notification-feed.tsx

**Checkpoint**: User Story 8 (Dashboard) is fully functional and testable independently ✅

---

## Phase 11: User Story 9 - Social Media Hub (Priority: P3) ✅

**Goal**: Enable Leaders to browse photos from Google Drive, generate AI-assisted captions, and preview posts

**Independent Test**: Connect to Google Drive, browse photos, select images, generate a caption, preview for different platforms

### Implementation for User Story 9

- [x] T177 [US9] Create social media hub page in app/(dashboard)/social/page.tsx
- [x] T178 [P] [US9] Create Google Drive connect button in components/social/drive-connect.tsx
- [x] T179 [US9] Create POST /api/social/connect/google OAuth initiation in app/api/social/connect/google/route.ts
- [x] T180 [P] [US9] Create GET /api/social/callback/google OAuth callback in app/api/social/callback/google/route.ts
- [x] T181 [US9] Create Google Drive client utility in lib/integrations/google-drive.ts
- [x] T182 [P] [US9] Create GET /api/social/drive/folders endpoint in app/api/social/drive/folders/route.ts
- [x] T183 [P] [US9] Create GET /api/social/drive/files endpoint in app/api/social/drive/files/route.ts
- [x] T184 [US9] Create Drive folder browser component in components/social/drive-browser.tsx
- [x] T185 [P] [US9] Create photo grid component with selection in components/social/photo-grid.tsx
- [x] T186 [P] [US9] Create photo preview modal in components/social/photo-preview.tsx (combined into content-composer)
- [x] T187 [US9] Create POST /api/ai/generate-caption streaming endpoint in app/api/ai/generate-caption/route.ts
- [x] T188 [P] [US9] Create caption generator component in components/social/caption-generator.tsx
- [x] T189 [P] [US9] Create platform preview component in components/social/platform-preview.tsx
- [x] T190 [US9] Create POST /api/social/content endpoint in app/api/social/content/route.ts
- [x] T191 [P] [US9] Create content composer component in components/social/content-composer.tsx
- [x] T192 [P] [US9] Create content calendar page in app/(dashboard)/social/calendar/page.tsx
- [x] T193 [P] [US9] Create scheduled posts list component in components/social/scheduled-posts.tsx
- [x] T245 [US9] Create POST /api/cron/publish-scheduled-posts cron endpoint in app/api/cron/publish-scheduled-posts/route.ts
- [x] T246 [P] [US9] Add vercel.json cron configuration for hourly scheduled post publishing

**Checkpoint**: User Story 9 (Social Media Hub) is fully functional and testable independently ✅

---

## Phase 12: User Story 10 - Volunteer Training & Onboarding (Priority: P3) ✅

**Goal**: Enable new volunteers to complete structured training programs and track progress toward certification

**Independent Test**: Enroll in a training track, complete steps (videos, self-study), request mentor verification, receive certification

### Implementation for User Story 10

- [x] T194 [US10] Create training tracks list page in app/(dashboard)/training/page.tsx
- [x] T195 [P] [US10] Create track card component in components/training/track-card.tsx
- [x] T196 [P] [US10] Create progress indicator component in components/training/progress-indicator.tsx
- [x] T197 [US10] Create track detail page in app/(dashboard)/training/[id]/page.tsx
- [x] T198 [P] [US10] Create track overview component in components/training/track-overview.tsx
- [x] T199 [P] [US10] Create step list component in components/training/step-list.tsx
- [x] T200 [US10] Create step viewer page in app/(dashboard)/training/[id]/step/[stepId]/page.tsx
- [x] T201 [P] [US10] Create video step component in components/training/video-step.tsx
- [x] T202 [P] [US10] Create document step component in components/training/document-step.tsx
- [x] T203 [P] [US10] Create mark complete button component in components/training/mark-complete.tsx
- [x] T204 [US10] Implement enrollInTrack server action in app/(dashboard)/training/actions.ts
- [x] T205 [P] [US10] Implement completeStep server action in app/(dashboard)/training/actions.ts
- [x] T206 [P] [US10] Implement requestVerification server action in app/(dashboard)/training/actions.ts
- [x] T207 [US10] Create my training progress page in app/(dashboard)/training/my-progress/page.tsx
- [x] T208 [P] [US10] Create my progress summary component in components/training/my-progress-summary.tsx
- [x] T209 [US10] Create pending verifications page for mentors in app/(dashboard)/training/verifications/page.tsx
- [x] T210 [P] [US10] Create verification request card component in components/training/verification-card.tsx
- [x] T211 [P] [US10] Implement verifyStep server action in app/(dashboard)/training/actions.ts
- [x] T212 [US10] Create certificate generation endpoint in app/api/training/certificates/[progressId]/route.ts
- [x] T213 [P] [US10] Create certificate template in components/training/certificate-template.tsx
- [x] T214 [US10] Create admin track management page in app/(dashboard)/admin/training/page.tsx
- [x] T215 [P] [US10] Create track editor component in components/admin/track-editor.tsx
- [x] T216 [P] [US10] Create step editor component in components/admin/step-editor.tsx

**Checkpoint**: User Story 10 (Training) is fully functional and testable independently

---

## Phase 13: Admin & Notifications ✅

**Purpose**: Admin-specific features and notification system infrastructure

### Admin Features

- [x] T217 Create admin dashboard page in app/(dashboard)/admin/page.tsx
- [x] T218 [P] Create user management page in app/(dashboard)/admin/users/page.tsx
- [x] T219 [P] Create user table component in components/admin/user-table.tsx
- [x] T220 [P] Create role editor modal in components/admin/role-editor.tsx
- [x] T221 Create department management page in app/(dashboard)/admin/departments/page.tsx
- [x] T222 [P] Create position management component in components/admin/position-manager.tsx
- [x] T223 Create notification logs page in app/(dashboard)/admin/notifications/page.tsx
- [x] T224 [P] Create notification log table component in components/admin/notification-log.tsx
- [x] T225 [P] Create retry notification action in app/(dashboard)/admin/notifications/actions.ts

### Notification Infrastructure

- [x] T226 Create email client wrapper using Resend in lib/notifications/email.ts
- [x] T227 [P] Create SMS client wrapper using Telnyx in lib/notifications/sms.ts
- [x] T228 Create notification service with failure logging in lib/notifications/notification-service.ts
- [x] T229 [P] Create email template for duty reminders in emails/duty-reminder.tsx
- [x] T230 [P] Create email template for swap notifications in emails/swap-notification.tsx
- [x] T231 Create POST /api/cron/send-reminders cron endpoint in app/api/cron/send-reminders/route.ts
- [x] T232 [P] Create vercel.json cron configuration for daily reminders

**Checkpoint**: Phase 13 (Admin & Notifications) is fully functional ✅

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T233 [P] Add Sonner toast provider to root layout in app/layout.tsx
- [ ] T234 [P] Implement global error handling with toast notifications
- [ ] T235 [P] Add loading states to all server actions
- [ ] T236 Configure PWA service worker for offline rota/rundown caching using next-pwa
- [ ] T237 [P] Add keyboard navigation support to all interactive components
- [ ] T238 [P] Implement responsive design adjustments for mobile views
- [ ] T239 Add rate limiting middleware for AI endpoints in middleware.ts
- [ ] T240 [P] Create API documentation in docs/api.md
- [ ] T241 [P] Create deployment guide in docs/deployment.md
- [ ] T242 Run quickstart.md validation and fix any setup issues
- [ ] T243 [P] Performance optimization: Add React.memo to heavy components
- [ ] T244 [P] Add Lighthouse CI configuration for performance monitoring

---

## Phase 15: Multi-Department User Assignment

**Purpose**: Enable users to be assigned to multiple departments (e.g., a volunteer serving in both Sound and Media)

**⚠️ Schema Change Required**: This requires a database migration to create a junction table

### Database Changes

- [x] T245 Create migration for user_departments junction table in supabase/migrations/020_user_departments.sql
  - Junction table: user_departments (user_id, department_id, is_primary, assigned_at)
  - Add RLS policies for read (authenticated) and write (admin/leader)
  - Migrate existing profiles.department_id data to junction table
  - Keep profiles.department_id as primary department for backwards compatibility

### Backend Updates

- [x] T246 Update types/auth.ts to add UserDepartment type and extend Profile with departments array
- [x] T247 [P] Update lib/validations/auth.ts with assignUserDepartments schema
- [x] T248 Create API endpoint app/api/admin/user-departments/route.ts for managing user department assignments
- [x] T249 Update user queries in admin pages to include department assignments via junction table

### UI Updates

- [x] T250 Create components/admin/user-departments-modal.tsx for assigning multiple departments to a user
- [x] T251 [P] Update components/admin/user-table.tsx to show all assigned departments as badges
- [x] T252 Update components/admin/role-editor.tsx to support multi-department selection with checkboxes
- [x] T253 [P] Add "Manage Departments" button to user table actions dropdown

### Documentation

- [x] T254 Update data-model.md with user_departments table schema and relationships
- [x] T255 Update user.guide.md with multi-department assignment instructions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-12)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Admin & Notifications (Phase 13)**: Can run parallel to P2/P3 user stories
- **Polish (Phase 14)**: Depends on all desired user stories being complete

### User Story Dependencies

| User Story | Priority | Dependencies | Can Parallel With |
|------------|----------|--------------|-------------------|
| US1 - Authentication | P1 | Foundational only | None (start first) |
| US2 - Rota Management | P1 | Foundational + US1 | US3, US5 after US1 complete |
| US3 - Availability | P1 | Foundational + US1 | US2, US5 after US1 complete |
| US4 - Swap Requests | P2 | US2 (rota assignments) | US6, US7, US8 |
| US5 - Livestream | P1 | Foundational + US1 | US2, US3 after US1 complete |
| US6 - Rundown | P2 | Foundational + US1 | US4, US7, US8 |
| US7 - Equipment | P2 | Foundational + US1 | US4, US6, US8 |
| US8 - Dashboard | P2 | US2, US4, US7 (widgets) | US9, US10 |
| US9 - Social Media | P3 | Foundational + US1 | US10 |
| US10 - Training | P3 | Foundational + US1 | US9 |

### Within Each User Story

- Models/types should be done in Foundational phase
- Server actions before UI components that use them
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T002, T003, T004 (package installations) can run in parallel
- T008, T009, T011 (lib files) can run in parallel

**Within Foundational (Phase 2)**:
- T017-T027 (migrations after enums) can largely run in parallel
- T031-T038 (types) can all run in parallel
- T040-T045 (validations) can all run in parallel
- T046-T053 (components) can largely run in parallel

**Across User Stories**:
- After US1 complete: US2, US3, US5 can start in parallel
- After US2 complete: US4, US6, US7, US8 can progress in parallel
- US9 and US10 can run in parallel once Foundational done

---

## Parallel Example: Phase 2 Foundational

```bash
# After T015-T016 (enums + profiles):
# Launch all other migrations in parallel:
Task: "Create migration for departments and positions tables"
Task: "Create migration for services table"
Task: "Create migration for livestreams table"
Task: "Create migration for equipment tables"
Task: "Create migration for rundowns and rundown_items tables"
Task: "Create migration for songs table"
Task: "Create migration for training tables"
Task: "Create migration for notifications tables"
Task: "Create migration for social_posts tables"
```

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Authentication)
4. Complete Phase 4: User Story 2 (Rota Management)
5. Complete Phase 5: User Story 3 (Availability)
6. Complete Phase 7: User Story 5 (Livestream Generator)
7. **STOP and VALIDATE**: Test all P1 stories independently
8. Deploy MVP - delivers core operational value

### Incremental Delivery

1. **MVP (P1)**: Auth → Rota → Availability → Livestream
2. **Phase 2 Release**: Swap Requests → Rundown → Equipment → Dashboard
3. **Phase 3 Release**: Social Media → Training
4. Each release adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Auth) → US2 (Rota) → US4 (Swaps)
   - Developer B: Wait for US1, then US5 (Livestream) → US6 (Rundown)
   - Developer C: Wait for US1, then US7 (Equipment) → US8 (Dashboard)
3. P3 stories assigned after P2 completion

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 255 |
| **Phase 1 (Setup)** | 14 tasks |
| **Phase 2 (Foundational)** | 40 tasks |
| **US1 - Authentication (P1)** | 18 tasks |
| **US2 - Rota Management (P1)** | 16 tasks |
| **US3 - Availability (P1)** | 8 tasks |
| **US4 - Swap Requests (P2)** | 12 tasks |
| **US5 - Livestream (P1)** | 15 tasks |
| **US6 - Rundown (P2)** | 20 tasks ✅ |
| **US7 - Equipment (P2)** | 33 tasks ✅ |
| **US8 - Dashboard (P2)** | 9 tasks |
| **US9 - Social Media (P3)** | 19 tasks |
| **US10 - Training (P3)** | 23 tasks |
| **Phase 13 (Admin/Notifications)** | 16 tasks |
| **Phase 14 (Polish)** | 12 tasks |
| **Phase 15 (Multi-Dept)** | 11 tasks |
| **Parallel Opportunities** | ~65% of tasks marked [P] |

### MVP Scope (Recommended)

- **Phases 1-2**: Setup + Foundational (54 tasks)
- **US1, US2, US3, US5**: Core P1 features (57 tasks)
- **Total MVP**: ~111 tasks
- **Estimated Time**: 8-10 developer days for MVP

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
