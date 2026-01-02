# Data Model: Fix Display Freeze in Background Tabs

**Feature**: 003-fix-display-freeze | **Phase**: 1 (Design & Contracts) | **Date**: 2025-01-02

## Overview

This feature involves **no database schema changes**. All modifications are client-side timer state management using React hooks and browser APIs.

## Client-Side State Entities

The following entities represent in-memory state managed by React components. They are **not persisted** to the database.

### Timer Reference State

**Purpose**: Track timer start point and paused state for timestamp-based calculations

**Storage**: React `useRef` hooks in `rundown-timer.tsx`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `startTimeRef.current` | `number \| null` | Unix timestamp (milliseconds) when timer started, or null if not running | `1704211200000` (2025-01-02 12:00:00 UTC) |
| `pausedElapsedRef.current` | `number` | Elapsed seconds accumulated before current timer session (for pause/resume) | `120` (2 minutes elapsed before pause) |
| `onTickRef.current` | `(seconds: number) => void \| undefined` | Callback function reference for timer updates | Function reference |

**Lifecycle**:
- Created: When `RundownTimer` component mounts
- Updated: On timer start/pause/resume actions
- Destroyed: When component unmounts

**Relationships**: None (isolated component state)

---

### Page Visibility State

**Purpose**: Track whether display tab is currently visible or hidden

**Storage**: Browser native `document.visibilityState` + event listener

| Property | Type | Description | Possible Values |
|----------|------|-------------|-----------------|
| `document.visibilityState` | `string` | Current visibility state of document | `'visible'`, `'hidden'` |

**Lifecycle**:
- Managed: By browser automatically
- Accessed: Via `document.visibilityState` property
- Monitored: Via `visibilitychange` event listener

**Event**: `visibilitychange` fires when tab becomes hidden or visible

---

### Display Timer UI State

**Purpose**: Current elapsed/remaining time displayed to user

**Storage**: React `useState` hook in `rundown-timer.tsx`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `elapsed` | `number` | Current elapsed seconds | `125` (2 minutes 5 seconds) |
| `isRunning` | `boolean` | Whether timer is currently counting | `true` |

**Calculation**:
```typescript
const now = Date.now()
const elapsedSinceStart = Math.floor((now - startTimeRef.current!) / 1000)
const totalElapsed = pausedElapsedRef.current + elapsedSinceStart
setElapsed(totalElapsed)
```

**Lifecycle**:
- Created: When `RundownTimer` component mounts
- Updated: Every 250ms (when visible) or 1000ms (when hidden, browser-throttled)
- Destroyed: When component unmounts

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Browser System Clock (Date.now())                          │
│ Source of Truth - Continues during sleep/background        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Read on every update
                     │
┌────────────────────▼────────────────────────────────────────┐
│ updateTimer() - Timestamp Calculation                      │
│ totalElapsed = (Date.now() - startTime)/1000 + paused     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Set state
                     │
┌────────────────────▼────────────────────────────────────────┐
│ React State (elapsed)                                       │
│ Triggers re-render with new time                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Render
                     │
┌────────────────────▼────────────────────────────────────────┐
│ UI Display (MM:SS format)                                   │
│ Visible to operator/congregation                           │
└─────────────────────────────────────────────────────────────┘

           ┌────────────────────────────────┐
           │ Page Visibility API            │
           │ (visibilitychange event)       │
           └──────────┬─────────────────────┘
                      │
                      │ Force immediate update
                      │
           ┌──────────▼─────────────────────┐
           │ updateTimer()                  │
           │ Recalc from timestamp          │
           └────────────────────────────────┘
```

**Key Principle**: System clock (`Date.now()`) is single source of truth. All calculations derive from comparing current time to stored start timestamp. Page visibility changes trigger immediate recalculation rather than relying on throttled interval.

---

## Type Definitions

### Existing Types (No Changes Required)

From `types/rundown.ts`:

```typescript
// Already exists - includes timestamp for sync
export interface DisplaySyncMessage {
  type: 'TIMER_UPDATE' | 'ITEM_CHANGE' | 'CONFETTI' | 'DISPLAY_READY' | 'DISPLAY_CLOSED'
  payload: {
    rundownId: string
    timestamp?: number  // Unix timestamp for sync validation
    // ... other fields based on message type
  }
}
```

**Note**: The `timestamp` field already exists in `DisplaySyncMessage` for synchronization purposes, confirming no type changes needed.

---

## Database Impact

### Tables Affected

**None**. This feature does not modify, add, or remove any database tables.

### Migrations Required

**None**. No schema changes.

### Data Seed Changes

**None**. No test data changes needed.

---

## Caching & Synchronization

### BroadcastChannel Synchronization

**Existing Mechanism**: `use-display-sync.ts` already uses BroadcastChannel for cross-window communication

**No Changes Required**: The timestamp field in `DisplaySyncMessage` is already used for sync validation. Each display window independently calculates elapsed time from its local system clock, ensuring synchronization even if windows have different visibility states.

**Synchronization Logic**:
1. Each display window maintains its own timer calculation
2. Timer updates based on local `Date.now()` - immune to other windows' visibility states
3. BroadcastChannel used only for control messages (start/pause/reset), not continuous timer updates
4. Multiple displays stay in sync because they all reference the same absolute start timestamp

---

## Performance Considerations

### Memory Footprint

| Component | Memory Impact | Justification |
|-----------|---------------|---------------|
| Timer refs | +24 bytes (3 refs × 8 bytes) | Negligible - three additional ref objects |
| Visibility listener | +~100 bytes | Single event listener registration |
| Total | ~124 bytes | Insignificant compared to existing component overhead |

### Update Frequency

- **Before**: 4 updates/sec in foreground, ~1 update/sec in background (throttled)
- **After**: Same frequency, plus one immediate update on visibility change
- **Impact**: Negligible - one additional calculation per visibility transition (~1-2 times per service on average)

---

## Security & Privacy

### Data Classification

All timer state is **Internal** (per Constitution data classification):
- Visible only to authenticated users accessing the rundown
- No personal information involved
- No persistence beyond component lifetime

### Sensitive Data

**None**. Timer calculations use:
- Unix timestamps (public time standard)
- Elapsed seconds (derived calculation)
- No user-specific or sensitive information

---

## Conclusion

This feature requires **zero database changes**. All state is ephemeral client-side calculation managed by React hooks and browser APIs. The existing `DisplaySyncMessage` type already includes the `timestamp` field needed for cross-window synchronization.

**Data Model Complexity**: Minimal - three ref values and one state variable per timer instance.

**Future Compatibility**: No database migrations mean zero backward compatibility concerns. Changes are isolated to component implementation and fully reversible.
