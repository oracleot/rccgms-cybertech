# Research: Fix Display Freeze in Background Tabs

**Feature**: 003-fix-display-freeze | **Phase**: 0 (Outline & Research) | **Date**: 2025-01-02

## Research Questions

### Q1: How do modern browsers throttle timers in background tabs, and what are the recommended patterns to work around this?

**Decision**: Use Page Visibility API to detect background/foreground transitions and force immediate recalculation based on `Date.now()` timestamps

**Rationale**:
- Modern browsers (Chrome 88+, Firefox 85+, Safari 14+) throttle `setInterval` to 1000ms minimum in background tabs
- `requestAnimationFrame` pauses completely in background tabs
- Page Visibility API (`document.visibilityState` and `visibilitychange` event) provides reliable detection of tab state changes
- Timestamp-based calculations (`Date.now()` or `performance.now()`) remain accurate regardless of timer throttling because they reference the system clock, not interval accumulation

**Alternatives Considered**:
- **Web Workers**: Can run timers more reliably in background, but adds complexity and doesn't solve the UI update problem (still needs to communicate back to main thread)
- **SharedArrayBuffer + Atomics**: Provides precise timing but requires CORS headers and is overkill for this use case
- **Server-sent events (SSE)**: Maintains connection for push updates, but adds server complexity and network dependency for what should be client-side calculation
- **requestIdleCallback**: Not reliable for timing—designed for low-priority tasks

**Implementation Pattern**:
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Force immediate recalculation using Date.now()
      updateTimer()
    }
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [])
```

---

### Q2: What is the best approach for timestamp-based timer calculations that remain accurate across background/foreground transitions and device sleep?

**Decision**: Store absolute start timestamp and paused elapsed time, calculate current elapsed via `Date.now() - startTimestamp + pausedElapsed` on each update

**Rationale**:
- `Date.now()` returns milliseconds since Unix epoch—unaffected by timer throttling or device sleep
- System clock continues during device sleep, so timestamps automatically account for sleep time (timer continues counting per FR-011)
- Single source of truth (start timestamp) prevents drift from accumulated interval counts
- Paused state handled by storing elapsed time at pause moment, then adding to new elapsed after resume

**Alternatives Considered**:
- **performance.now()**: More precise (microseconds) but pauses during device sleep—violates FR-011 requirement that timer continues counting during sleep

**Critical Distinction - Date.now() vs performance.now() During Device Sleep**:
- **Date.now()**: Based on system clock (wall-clock time). **Continues counting during device sleep**—when device wakes after 5 minutes sleep, Date.now() reflects 5 minutes elapsed. ✅ Correct choice for FR-011.
- **performance.now()**: Based on execution time (monotonic clock). **Pauses during device sleep**—when device wakes after 5 minutes sleep, performance.now() shows 0 additional milliseconds. ❌ Would violate FR-011 (timer must continue during sleep).
- **Accumulated intervals**: Current approach—suffers from drift due to throttling
- **Server-side timer**: Requires network, adds latency, violates offline-first principle

**Implementation Pattern**:
```typescript
const startTimeRef = useRef<number | null>(null)  // Date.now() when started
const pausedElapsedRef = useRef<number>(0)        // Seconds elapsed when paused

const updateTimer = () => {
  if (startTimeRef.current === null) return
  const now = Date.now()
  const elapsedSinceStart = Math.floor((now - startTimeRef.current) / 1000)
  const totalElapsed = pausedElapsedRef.current + elapsedSinceStart
  setElapsed(totalElapsed)
}
```

---

### Q3: How should confetti animations and transitions be triggered after a display tab has been backgrounded and throttled?

**Decision**: No special handling needed—animations triggered in foreground tab execute immediately. Page Visibility API ensures display is already foregrounded before confetti triggers (since live view operator triggers it while looking at display).

**Rationale**:
- Per clarifications, live view is always visible on separate screen—operator triggers confetti while actively viewing display
- Confetti uses `canvas-confetti` library which uses `requestAnimationFrame`—executes immediately when tab is visible
- Transitions use CSS (via Tailwind classes) which apply immediately regardless of previous tab state
- No need for animation queue or replay mechanism

**Alternatives Considered**:
- **Animation queue while backgrounded**: Unnecessary—per spec clarifications, confetti only triggered when display is already in focus
- **Delayed animation start**: Would add visual lag—contradicts user expectation of immediate feedback

**Implementation Pattern**:
No changes needed to confetti triggering logic. Existing implementation already correct:
```typescript
// From display-view.tsx - works correctly after backgrounding
const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  })
}
```

---

### Q4: What React hooks pattern prevents re-render loops when updating timer state frequently?

**Decision**: Use `useRef` for callback storage and timestamp references, `useState` only for display value, and optimize update frequency with visibility-aware interval adjustment

**Rationale**:
- `useRef` for callbacks prevents effect re-execution on every callback change
- `useRef` for timestamps avoids triggering re-renders when storing timing data
- `useState` only for displayed elapsed seconds—minimal render impact
- 250ms interval when visible is acceptable (4 updates/second), 1000ms when hidden (browser throttles anyway)

**Alternatives Considered**:
- **useReducer**: Overkill for simple timer state—adds boilerplate without benefit
- **useMemo for calculations**: Calculations are cheap (single subtraction), memoization overhead not worth it
- **RAF-based loop**: More precise but higher battery cost—unnecessary for second-level precision requirement

**Implementation Pattern**:
```typescript
const onTickRef = useRef(onTick)  // Callback ref
const startTimeRef = useRef<number | null>(null)  // Timestamp ref

useEffect(() => {
  onTickRef.current = onTick  // Keep ref current without effect dep
}, [onTick])

useEffect(() => {
  if (!isRunning) return
  const interval = setInterval(updateTimer, 250)
  return () => clearInterval(interval)
}, [isRunning])  // Only re-run when isRunning changes
```

---

## Key Technical Decisions Summary

| Decision Area | Choice | Justification |
|---------------|--------|---------------|
| Background Detection | Page Visibility API | Native browser API, zero bundle size, widely supported (2013+) |
| Timer Calculation | Timestamp-based (Date.now()) | Immune to throttling and device sleep, accurate to ±1ms |
| State Storage | useRef for timestamps, useState for display | Prevents unnecessary re-renders while maintaining reactivity |
| Animation Handling | No special handling | Live view ensures display is foregrounded before trigger |
| Update Frequency | 250ms in foreground, 1000ms in background | Balances responsiveness with battery life |

## Browser Compatibility

| Browser | Version | Page Visibility API | Date.now() | Notes |
|---------|---------|---------------------|------------|-------|
| Chrome | 90+ | ✅ Supported | ✅ Supported | Throttles to 1000ms in background |
| Firefox | 88+ | ✅ Supported | ✅ Supported | Throttles to 1000ms in background |
| Safari | 14+ | ✅ Supported | ✅ Supported | Aggressive throttling after 30s background |
| Edge | 90+ | ✅ Supported | ✅ Supported | Chromium-based, same as Chrome |

**Fallback Strategy**: If Page Visibility API unavailable (check `'visibilityState' in document`), gracefully degrade to existing behavior (timer works in foreground, may appear frozen in background for IE11 and earlier).

## Performance Impact Analysis

### Before Fix
- **Update frequency**: 4 updates/sec (250ms) in foreground, ~1 update/sec in background (throttled)
- **CPU impact**: Minimal—simple arithmetic
- **Battery impact**: Low—setInterval overhead negligible

### After Fix
- **Update frequency**: Same (250ms in foreground, 1000ms in background)
- **CPU impact**: Same + single visibility event handler (negligible)
- **Battery impact**: +1-2% estimated (one additional event listener, visibility check on transition)
- **Memory impact**: +8 bytes (one additional ref for visibility state) - negligible

**Conclusion**: Performance impact within acceptable limits (<5% battery increase per SC-006).

## References

- [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MDN: Date.now()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now)
- [Chrome: Timer Throttling in Background Tabs](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/)
- [React: useRef Hook](https://react.dev/reference/react/useRef)
- [Performance.now() vs Date.now() for Timers](https://stackoverflow.com/questions/30795525/performance-now-vs-date-now)
