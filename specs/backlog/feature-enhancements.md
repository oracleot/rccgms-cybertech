# Cyber Tech Feature Enhancements Plan

**Created:** 31 December 2025  
**Status:** Planning Complete

---

## Executive Summary

This document outlines planned improvements for the Cyber Tech church management app based on a comprehensive codebase review. The app is currently ~90% complete with solid architecture. Three major enhancement initiatives have been scoped:

1. **AI Assistant Panel** — Intelligent member suggestions for rota scheduling
2. **Offline PWA Support** — View-only schedule caching for reliability
3. **Planning Center Integration** — Import teams and schedules from Planning Center Online

---

## Part 1: Current State Assessment

### Module Completeness

| Module | Status | Notes |
|--------|--------|-------|
| Auth (US1) | 95% ✅ | Login, register, password reset, invitations working |
| Rota (US2-4) | 85% ✅ | Calendar, assignments, availability, swaps implemented |
| Livestream (US5) | 95% ✅ | AI generation with streaming, history, templates |
| Rundown (US6) | 95% ✅ | Full editor, live view, templates, lyrics display |
| Equipment (US7) | 95% ✅ | Complete CRUD, QR codes, checkout/return, maintenance |
| Social (US9) | 90% ✅ | Direct uploads working; platform publishing not implemented |
| Training (US10) | 80% ⚠️ | Tracks, steps, enrollment working; **quiz not implemented** |
| Dashboard (US8) | 95% ✅ | All widgets for member and leader/admin roles |
| Admin | 95% ✅ | User management, departments, positions, notifications |

**Overall: ~90% Complete**

### Known Gaps

#### High Priority (Functional)

1. **Quiz Step Implementation** — `app/(dashboard)/training/[id]/step/[stepId]/page.tsx` shows placeholder only
2. **Swap Request Notifications** — 5 TODOs in `app/api/rota/swaps/actions.ts` for notification sending
3. **Rota Publishing Notifications** — TODO at `app/api/rota/actions.ts` line 218
4. **Song Library Management UI** — Schema exists but no admin interface
5. **Assignment Confirmation by Members** — Schema has `confirmation_status` but no UI

#### Medium Priority

6. **Social Media Platform Publishing** — Content scheduled but no Facebook/Instagram/YouTube API calls
7. **PWA Service Worker** — Manifest exists but no offline caching (Tasks T288-T291 deferred)
8. **Rate Limiting for AI Endpoints** — No proactive rate limiting middleware

### Technical Debt

| File | Issue |
|------|-------|
| `app/layout.tsx` | Metadata shows "Create Next App", missing Toaster |
| `app/manifest.ts` | References PNG icons that don't exist |
| Route error handling | Only `dashboard/error.tsx` exists |
| Toast notifications | Inconsistent usage across features |

---

## Part 2: Enhancement Initiatives

### Initiative 1: AI Rota Assistant Panel

**Goal:** Help leaders quickly fill rota positions with intelligent member suggestions

#### User Flow
1. Leader opens rota assignment modal for a position
2. Clicks "AI Suggest" button to open side panel
3. AI analyzes available members and their assignment history
4. Streaming suggestions appear with reasoning
5. Leader clicks copy icon to use suggestion in assignment form

#### Technical Design

**API Endpoint:** `POST /api/ai/rota-suggestions`

```typescript
// Request
{
  rotaId: string,
  positionId: string,
  date: string,
  context: {
    availableMembers: Array<{
      id: string,
      name: string,
      isAvailable: boolean
    }>,
    recentAssignments: Array<{
      userId: string,
      positionId: string,
      date: string
    }>
  }
}

// Response: Streaming text with member recommendations
```

**Prompt Context:**
- List of members marked available for that date
- Past 3 months of assignments for the position
- No skills/certifications (simplified scope)

**Components:**
- `components/rota/ai-assistant-panel.tsx` — Sheet-based side panel
- `components/rota/ai-suggestion-card.tsx` — Individual suggestion with copy button

**Patterns to Follow:**
- Streaming: `components/livestream/description-generator.tsx`
- Copy button: `components/livestream/copy-button.tsx`
- OpenAI client: `lib/ai/openai.ts`

---

### Initiative 2: Offline PWA Support

**Goal:** Allow members to view their schedules even without internet connection

#### Scope Decision: View-Only

| Feature | Included | Excluded |
|---------|----------|----------|
| View my schedule | ✅ | |
| View rundown details | ✅ | |
| Edit availability | | ❌ |
| Submit swap requests | | ❌ |
| Sync queue / conflict resolution | | ❌ |

This simplifies implementation by ~50% — no sync queue, no conflict resolution logic.

#### Technical Design

**Dependencies:**
```json
{
  "dexie": "^4.0.0",
  "dexie-react-hooks": "^1.1.7",
  "@serwist/next": "^9.0.0"
}
```

**IndexedDB Schema:** `lib/offline/db.ts`

```typescript
class CyberTechDB extends Dexie {
  mySchedule!: Table<MyScheduleItem>
  rundowns!: Table<RundownWithDetails>
  
  constructor() {
    super('CyberTechDB')
    this.version(1).stores({
      mySchedule: 'id, date, rotaId',
      rundowns: 'id, date, status'
    })
  }
}
```

**Service Worker Caching:** `app/sw.ts`

| Route | Strategy | Cache TTL |
|-------|----------|-----------|
| `/api/rota/my-schedule` | StaleWhileRevalidate | — |
| `/api/rundowns/[id]` | CacheFirst | 24 hours |

**UI Components:**
- `components/shared/offline-indicator.tsx` — Connection status in header
- `hooks/use-offline-schedule.ts` — Falls back to IndexedDB when offline
- `hooks/use-offline-rundown.ts` — Falls back to IndexedDB when offline

---

### Initiative 3: Planning Center Integration

**Goal:** Import teams, people, and schedules from Planning Center Online

#### Scope Decision: Manual Sync Only

| Sync Method | Included | Excluded |
|-------------|----------|----------|
| On-demand manual import | ✅ | |
| Nightly cron job | | ❌ |
| Real-time webhooks | | ❌ |

This avoids webhook infrastructure and complex sync state management.

#### OAuth Flow

1. Admin clicks "Connect Planning Center" in settings
2. Redirect to PCO authorization URL with scopes: `people`, `services`
3. PCO redirects back with authorization code
4. Exchange code for tokens, store in `social_integrations` table
5. Show "Connected" status with "Import Now" buttons

#### Data Mapping

| PCO Entity | Cyber Tech Table | Field Mapping |
|------------|------------------|---------------|
| `people` | `profiles` | `first_name + last_name` → `full_name`, `email` → `email` |
| `teams` | `departments` | `name` → `name` |
| `team_positions` | `positions` | `name` → `name`, link to department |
| `scheduled_people` | `rota_assignments` | Link person to position on date |

#### Database Migration: `024_planning_center_integration.sql`

```sql
-- Add PCO IDs for mapping
ALTER TABLE profiles ADD COLUMN pco_id TEXT UNIQUE;
ALTER TABLE departments ADD COLUMN pco_team_id TEXT UNIQUE;
ALTER TABLE positions ADD COLUMN pco_position_id TEXT UNIQUE;

-- Track import history
CREATE TABLE integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES social_integrations(id),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

#### API Endpoints

```
app/api/integrations/planning-center/
├── connect/route.ts        # Redirect to PCO OAuth
├── callback/route.ts       # Exchange code, store tokens
├── disconnect/route.ts     # Remove integration
└── import/
    ├── people/route.ts     # Import people → profiles
    └── schedules/route.ts  # Import schedules → rotas
```

#### UI Components

- `components/settings/planning-center-connect.tsx` — Connection UI
- Add "Integrations" section to existing settings page

---

## Part 3: File Structure

### New Files to Create

```
lib/
├── offline/
│   ├── db.ts                         # Dexie IndexedDB setup
│   └── hooks/
│       ├── use-offline-schedule.ts   # Cached schedule hook
│       └── use-offline-rundown.ts    # Cached rundown hook
├── integrations/
│   └── planning-center/
│       ├── client.ts                 # PCO API wrapper
│       ├── types.ts                  # PCO response types
│       └── mappers.ts                # Entity mapping functions

components/
├── rota/
│   ├── ai-assistant-panel.tsx        # AI suggestions side panel
│   └── ai-suggestion-card.tsx        # Individual suggestion card
├── settings/
│   └── planning-center-connect.tsx   # PCO connection UI
└── shared/
    └── offline-indicator.tsx         # Online/offline status

app/
├── sw.ts                             # Service worker
└── api/
    ├── ai/
    │   └── rota-suggestions/route.ts
    └── integrations/
        └── planning-center/
            ├── connect/route.ts
            ├── callback/route.ts
            ├── disconnect/route.ts
            └── import/
                ├── people/route.ts
                └── schedules/route.ts

supabase/migrations/
└── 024_planning_center_integration.sql
```

---

## Part 4: Implementation Order

### Phase 1: AI Assistant (Effort: Medium)

| # | Task | Files |
|---|------|-------|
| 1 | Create rota suggestions API endpoint | `app/api/ai/rota-suggestions/route.ts` |
| 2 | Add AI prompts for rota context | `lib/ai/prompts.ts` |
| 3 | Build AI suggestion card component | `components/rota/ai-suggestion-card.tsx` |
| 4 | Build AI assistant panel | `components/rota/ai-assistant-panel.tsx` |
| 5 | Integrate panel into assignment modal | `components/rota/assignment-modal.tsx` |

### Phase 2: Offline Support (Effort: Medium)

| # | Task | Files |
|---|------|-------|
| 1 | Install dependencies | `package.json` |
| 2 | Configure Serwist in Next.js | `next.config.ts` |
| 3 | Create Dexie database schema | `lib/offline/db.ts` |
| 4 | Create service worker | `app/sw.ts` |
| 5 | Build offline hooks | `lib/offline/hooks/` |
| 6 | Add offline indicator to header | `components/shared/offline-indicator.tsx` |
| 7 | Create PWA icons | `public/icons/` |

### Phase 3: Planning Center Integration (Effort: High)

| # | Task | Files |
|---|------|-------|
| 1 | Create database migration | `supabase/migrations/024_*.sql` |
| 2 | Build PCO API client | `lib/integrations/planning-center/client.ts` |
| 3 | Create entity mappers | `lib/integrations/planning-center/mappers.ts` |
| 4 | Build OAuth connect endpoint | `app/api/integrations/planning-center/connect/route.ts` |
| 5 | Build OAuth callback endpoint | `app/api/integrations/planning-center/callback/route.ts` |
| 6 | Build disconnect endpoint | `app/api/integrations/planning-center/disconnect/route.ts` |
| 7 | Build people import endpoint | `app/api/integrations/planning-center/import/people/route.ts` |
| 8 | Build schedules import endpoint | `app/api/integrations/planning-center/import/schedules/route.ts` |
| 9 | Build settings UI component | `components/settings/planning-center-connect.tsx` |
| 10 | Add integrations section to settings page | `app/(dashboard)/settings/page.tsx` |

---

## Part 5: Dependencies

### NPM Packages to Add

```bash
pnpm add dexie dexie-react-hooks @serwist/next
```

### Environment Variables

```env
# Planning Center OAuth
PLANNING_CENTER_CLIENT_ID=
PLANNING_CENTER_CLIENT_SECRET=
PLANNING_CENTER_REDIRECT_URI=https://your-app.com/api/integrations/planning-center/callback
```

### Planning Center Developer Setup

1. Create app at https://api.planningcenteronline.com/oauth/applications
2. Set redirect URI to callback endpoint
3. Request scopes: `people`, `services`
4. Copy client ID and secret to environment variables

---

## Appendix: Existing Gaps (Backlog)

These items from the original review are not part of this enhancement plan but should be tracked:

| Item | Priority | Notes |
|------|----------|-------|
| Quiz step implementation | P1 | Training module incomplete |
| Swap notification sending | P1 | 5 TODOs in swaps/actions.ts |
| Rota publish notifications | P1 | TODO in rota/actions.ts |
| Song library admin UI | P2 | Schema exists, no CRUD UI |
| Assignment confirmation flow | P2 | Schema has status, no UI |
| Fix root layout metadata | P0 | Shows "Create Next App" |
| Create PWA icons | P0 | Referenced but don't exist |
| Social platform APIs | P3 | Facebook/Instagram/YouTube publishing |
