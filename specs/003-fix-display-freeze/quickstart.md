# Quickstart: Testing Display Freeze Fix

**Feature**: 003-fix-display-freeze | **Phase**: 1 (Design & Contracts) | **Date**: 2025-01-02

## Prerequisites

- Running local development server (`pnpm dev`)
- Existing rundown with items and at least one timed item
- Two browser windows/tabs (or two separate browser windows for optimal testing)

## Test Setup

### Option 1: Single Device (Two Browser Tabs)

1. **Terminal 1**: Start dev server
   ```bash
   pnpm dev
   ```

2. **Browser Tab 1** (Live View): Navigate to rundown live view
   ```
   http://localhost:3000/rundown/[rundown-id]/live
   ```

3. **Browser Tab 2** (Display): Navigate to display projection
   ```
   http://localhost:3000/rundown/[rundown-id]/display
   ```

### Option 2: Two Devices (Recommended for Real-World Testing)

1. **Operator Device**: Open live view (control panel)
2. **Display Device**: Open display projection (separate laptop/desktop)
3. Ensure both devices on same network

## Testing User Story 1: Timer Accuracy (Priority P1)

### Test Case 1.1: Background for 60 Seconds

**Objective**: Verify timer continues accurately when display tab is backgrounded

**Steps**:
1. In Live View tab, start a timer for any rundown item
2. Switch to Display tab and verify timer is running
3. Switch to a different browser tab (e.g., a blank tab) for exactly 60 seconds
   - Tip: Use your phone's stopwatch or the system clock
4. Return to Display tab

**Expected Result**: Timer shows 60 seconds of elapsed time (within ±1 second tolerance)

**Failure Signs**:
- Timer frozen at the value it showed when tab was backgrounded
- Timer shows significantly less than 60 seconds (e.g., 10-20 seconds)
- Timer jumps rapidly from old value to correct value (should update instantly, no animation)

---

### Test Case 1.2: Countdown Timer Accuracy

**Objective**: Verify countdown timers remain accurate during backgrounding

**Steps**:
1. Create a rundown item with 3:00 (180 seconds) duration
2. Start the timer in Live View
3. Switch to Display tab and verify countdown shows 3:00
4. Background Display tab for 90 seconds
5. Return to Display tab

**Expected Result**: Countdown shows 1:30 remaining (within ±1 second)

**Failure Signs**:
- Countdown still shows 3:00 or close to it
- Countdown shows negative time (overtime) when it shouldn't be
- Countdown animation stutters or jumps

---

### Test Case 1.3: Multiple Display Windows

**Objective**: Verify synchronization across multiple display windows

**Steps**:
1. Open Display tab (Tab A)
2. Open second Display tab in new browser window (Tab B) to the same rundown
3. Start timer in Live View
4. Verify both displays show timer running
5. Background Tab A for 30 seconds (keep Tab B visible)
6. Return to Tab A

**Expected Result**: Both tabs show the same elapsed time (within ±500ms per SC-002)

---

## Testing User Story 2: Confetti Animations (Priority P2)

### Test Case 2.1: Confetti After Backgrounding

**Objective**: Verify confetti animations work after display was backgrounded

**Steps**:
1. Open Display tab and background it for 2+ minutes
2. Return Display tab to foreground
3. In Live View, trigger confetti (button in live view controls)

**Expected Result**: Confetti animation plays immediately and smoothly

**Failure Signs**:
- Confetti doesn't appear
- Confetti appears but animation stutters or freezes
- Confetti takes >1 second to start after trigger (violates SC-003)

---

## Testing User Story 3: Smooth Transitions (Priority P2)

### Test Case 3.1: Item Transitions After Background

**Objective**: Verify transitions work smoothly after backgrounding

**Steps**:
1. Open Display tab showing current rundown item
2. Background Display tab for 1+ minutes
3. Return Display tab to foreground
4. In Live View, advance to next rundown item
5. Observe transition animation on Display

**Expected Result**: Transition completes smoothly within configured duration (default 500ms)

**Failure Signs**:
- Transition stutters or appears to skip frames
- Transition takes significantly longer than expected
- No transition occurs (content jumps instantly)

---

## Testing Edge Cases

### Edge Case 1: Extended Backgrounding (30+ Minutes)

**Steps**:
1. Start timer in Live View
2. Background Display tab for 35 minutes (use system timer)
3. Return to Display tab

**Expected Result**: Timer shows 35 minutes elapsed (within ±1 second), updates instantly with no catch-up animation

---

### Edge Case 2: Rapid Tab Switching

**Steps**:
1. Start timer in Live View
2. Rapidly switch between Display tab and another tab 10 times over 30 seconds
3. Leave on Display tab

**Expected Result**: Timer continues accurately, no errors in console, no visual glitches

---

### Edge Case 3: Device Sleep (Optional—Requires Actual Device Sleep)

**Steps**:
1. Start timer on Display device
2. Put device to sleep (close laptop lid or use system sleep) for 5 minutes
3. Wake device and return to Display tab

**Expected Result**: Timer shows 5 minutes elapsed (confirms FR-011)

**Note**: This test requires actual device sleep, not just browser tab backgrounding

---

## Verification Checklist

Before considering the fix complete, verify:

- [ ] Test Case 1.1: 60-second background test passes
- [ ] Test Case 1.2: Countdown accuracy test passes
- [ ] Test Case 1.3: Multi-window sync test passes
- [ ] Test Case 2.1: Confetti after background test passes
- [ ] Test Case 3.1: Transition smoothness test passes
- [ ] Edge Case 1: 30-minute background test passes
- [ ] Edge Case 2: Rapid switching test passes
- [ ] No console errors during any test
- [ ] Timer remains readable and properly formatted during all tests
- [ ] Battery usage observation: No significant drain during 2-hour test period

## Troubleshooting

### Timer still appears frozen after returning to tab

**Possible Causes**:
- Page Visibility API not detecting visibility change
- `visibilitychange` event listener not attached
- React effect cleanup removing listener prematurely

**Debug Steps**:
1. Open DevTools Console
2. Check for errors related to visibility detection
3. Add console.log in visibility change handler to verify it fires
4. Check `document.visibilityState` value when tab is visible

---

### Timer jumps or shows incorrect time

**Possible Causes**:
- Start timestamp not stored correctly
- Paused elapsed time not persisted
- Timer reset inadvertently when backgrounded

**Debug Steps**:
1. Add console.log for `startTimeRef.current` value
2. Verify `pausedElapsedRef.current` persists across visibility changes
3. Check that timer calculation uses `Date.now()` not `performance.now()`

---

### Confetti doesn't play after backgrounding

**Possible Causes**:
- `requestAnimationFrame` still paused (shouldn't happen if tab is visible)
- Canvas context lost during backgrounding
- confetti library issue

**Debug Steps**:
1. Verify tab is actually visible when triggering (check `document.visibilityState`)
2. Test confetti on a freshly loaded page (no backgrounding) to rule out library issue
3. Check browser console for canvas-related errors

---

## Success Criteria Validation

Use these metrics to validate against spec success criteria:

| Criterion | Target | Validation Method |
|-----------|--------|-------------------|
| SC-001 | ±1 second accuracy after 4 hours background | Extended background test with system stopwatch |
| SC-002 | ±500ms sync tolerance | Multi-window test with simultaneous observation |
| SC-003 | Confetti within 1 second | Stopwatch from trigger to animation start |
| SC-004 | Transition within ±100ms | Record screen and analyze frame timing |
| SC-005 | <±2 seconds drift after 100 switches | Automated script or manual rapid switching |
| SC-006 | <5% battery increase over 2 hours | **Method**: (1) Fully charge device, (2) Run display for 2 hours with current implementation, note battery % decrease, (3) Fully charge again, (4) Run display for 2 hours with Page Visibility API fix, note battery % decrease, (5) Compare: New battery usage should be ≤ 105% of baseline. Alternative: Use Chrome DevTools > Lighthouse > Performance audit before/after to compare estimated battery impact. |

## Quick Validation Script

For rapid iteration testing, use this browser console script:

```javascript
// Run in Display tab console
(async () => {
  console.log('[TEST] Starting 60-second background test...')
  console.log('[TEST] Current time:', new Date().toLocaleTimeString())
  alert('Background this tab NOW. Return in 60 seconds.')
  // Wait for tab to become hidden, then visible again
  await new Promise(resolve => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[TEST] Tab visible again at:', new Date().toLocaleTimeString())
        document.removeEventListener('visibilitychange', handler)
        resolve()
      }
    }
    document.addEventListener('visibilitychange', handler)
  })
  console.log('[TEST] Check timer value—should be ~60 seconds elapsed')
})()
```
