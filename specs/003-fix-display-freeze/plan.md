# Implementation Plan: Fix Display Freeze in Background Tabs

**Branch**: `003-fix-display-freeze` | **Date**: 2025-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-fix-display-freeze/spec.md`

## Summary

Fix rundown display timer freezing when browser tab is backgrounded by implementing Page Visibility API detection and instant timestamp-based recalculation. The solution ensures display timers remain accurate within ±1 second tolerance regardless of background duration, while maintaining smooth animations and transitions after tab regains focus. This is a targeted fix to existing components without new features—leveraging browser APIs to overcome `setInterval` throttling in inactive tabs.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 15+ App Router with React 18+ Server/Client Components)  
**Primary Dependencies**: React hooks, Page Visibility API (browser native), BroadcastChannel API (existing)  
**Storage**: N/A (client-side timer state only—no database changes)  
**Testing**: Manual testing via acceptance scenarios (automated tests optional for Phase 3)  
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+) on desktop/laptop devices  
**Project Type**: Web application (existing Next.js monolith)  
**Performance Goals**: ±1 second timer accuracy after any background duration, ±100ms transition timing accuracy  
**Constraints**: <5% battery impact increase, no React re-render loops, instant UI updates (no catch-up animation)  
**Scale/Scope**: 4 affected files (rundown-timer.tsx, display-view.tsx, use-display-sync.ts, display page), 100-200 lines modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluation Against Constitution Principles

| Principle | Alignment | Notes |
|-----------|-----------|-------|
| **I. User-Centric Ministry Focus** | ✅ **PASS** | Directly serves service operators by ensuring reliable timer display during worship services. Reduces manual monitoring overhead. |
| **II. Mobile-First, Offline-Capable** | ✅ **PASS** | Fix applies to browser-based display (not mobile-specific), but maintains performance standards. No offline impact—timer accuracy is client-side calculation. |
| **III. Modular Feature Independence** | ✅ **PASS** | Changes isolated to rundown module components. No cross-module dependencies added. Graceful degradation maintained (timer still works in foreground if visibility detection fails). |
| **IV. Type Safety & Validation** | ✅ **PASS** | TypeScript strict mode maintained. No new API inputs requiring validation. Existing type definitions sufficient. |
| **V. Security by Default** | ✅ **PASS** | No security implications—pure client-side timer calculation using browser APIs. No data transmission, authentication, or authorization changes. |
| **VI. AI as Augmentation** | ✅ **PASS** | No AI involvement in this feature. |
| **VII. Graceful Degradation & Error Resilience** | ✅ **PASS** | Fallback to existing behavior if Page Visibility API unavailable (defensive check). Timer continues working even if visibility detection fails. |

### Technology Stack Compliance

| Layer | Required Technology | This Feature | Compliance |
|-------|---------------------|--------------|------------|
| Framework | Next.js 14+ (App Router) | Next.js 15 (existing) | ✅ |
| Language | TypeScript (strict) | TypeScript 5.x (strict) | ✅ |
| UI | shadcn/ui + Tailwind | Existing components (no changes) | ✅ |

**New Dependencies**: None. Using browser-native Page Visibility API (zero bundle size impact).

###Decision: ✅ **PROCEED** - All gates passed. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-display-freeze/
├── plan.md              # This file (Phase 0 output)
├── research.md          # Page Visibility API patterns, timestamp strategies (Phase 0)
├── data-model.md        # N/A for this feature (no database changes)
├── quickstart.md        # Developer testing guide (Phase 1)
├── contracts/           # N/A (no API endpoints added)
├── checklists/
│   └── requirements.md  # Requirement validation checklist
└── spec.md              # Feature specification (input)
```

### Source Code (repository root)

```text
components/rundown/
├── rundown-timer.tsx        # MODIFIED: Add Page Visibility API hook, force recalc on visibility change
├── display-view.tsx         # MODIFIED: Handle visibility for confetti animations
└── display-view-client.tsx  # NO CHANGE: Server component wrapper

hooks/
└── use-display-sync.ts      # MODIFIED: Add timestamp to sync messages

app/rundown/[id]/display/
├── page.tsx                 # NO CHANGE: Server component (data loading only)
└── _components/
    └── display-view-client.tsx  # NO CHANGE: Client wrapper

types/
└── rundown.ts               # REVIEWED: Ensure DisplaySyncMessage includes timestamp field
```

**Structure Decision**: This is a modification to existing Next.js App Router web application. Changes isolated to `components/rundown/` and `hooks/` directories—no new modules, no API routes, no database migrations. Follows existing monolithic structure per Constitution principle III.

## Complexity Tracking

> **No violations to justify**—All constitution gates passed. This is a targeted bug fix with minimal scope.

---

## Phase Completion Summary

### Phase 0: Outline & Research ✅ **COMPLETE**

**Deliverable**: [research.md](./research.md)

**Research Questions Resolved**:
1. ✅ Browser timer throttling patterns and Page Visibility API workaround
2. ✅ Timestamp-based calculation approach using `Date.now()`
3. ✅ Animation handling strategy (no special queue needed)
4. ✅ React hooks pattern to prevent re-render loops

**Key Decisions**:
- Page Visibility API for background detection
- `Date.now()` for timestamp-based calculations (continues during device sleep)
- No special handling for confetti (triggered when display is foregrounded)
- `useRef` for callbacks and timestamps, `useState` only for display value

**No Clarifications Needed**: All technical questions answered via research.

---

### Phase 1: Design & Contracts ✅ **COMPLETE**

**Deliverables**:
- [data-model.md](./data-model.md) - Confirmed no database changes needed
- [quickstart.md](./quickstart.md) - Complete testing guide with test cases for all user stories
- ~~contracts/~~ - N/A (no API endpoints)

**Design Decisions**:
- Client-side state only (3 refs + 1 state variable per timer)
- Existing `DisplaySyncMessage` type already includes timestamp field - no type changes
- Memory footprint: ~124 bytes per timer instance (negligible)
- Performance impact: <5% battery increase (within SC-006 tolerance)

**Constitution Re-Check**: ✅ **PASS** - All gates remain green after design phase. No new dependencies, no security implications, modular changes only.

**Agent Context Updated**: ✅ GitHub Copilot instructions updated with Page Visibility API and timestamp calculation patterns.

---

### Phase 2: Task Breakdown ⏸️ **PENDING**

**Status**: Not started - run `/speckit.tasks` to generate tasks.md

**Expected Output**: Concrete implementation tasks with file-level changes, acceptance criteria, and sequencing.

**Next Command**: `/speckit.tasks` (or equivalent workflow command)

---

## Implementation Readiness

| Category | Status | Blocker |
|----------|--------|---------|
| Specification Clarity | ✅ Complete | None - all requirements clear with clarifications documented |
| Technical Research | ✅ Complete | None - all patterns researched and validated |
| Design Decisions | ✅ Complete | None - client-side only, no database/API changes |
| Constitution Compliance | ✅ Verified | None - all gates passed |
| Testing Strategy | ✅ Defined | None - quickstart.md provides complete test cases |
| Dependencies | ✅ Verified | None - browser-native APIs only |

**Recommendation**: ✅ **READY FOR TASK BREAKDOWN (Phase 2)** - All planning prerequisites met. No blockers identified.
