# Feature Specification: Fix Display Freeze in Background Tabs

**Feature Branch**: `003-fix-display-freeze`  
**Created**: 2025-01-02  
**Status**: Draft  
**Input**: User description: "Currently, when I run the service rundown and start the service, the display freezes the time until I go back to the window tab where the app runs. I don't always have to worry about this so will like a fix for this"

## Clarifications

### Session 2025-01-02

- Q: When the display tab has been backgrounded while messages are sent from the live view (e.g., item changes, confetti triggers), how should the system handle these missed messages? → A: No message queueing needed - live view always visible on separate screen, focus solely on timer continuity
- Q: When the display tab returns from background after an extended period (e.g., 30+ minutes), should the timer update happen instantly or should there be a brief visual indicator that the display is "catching up"? → A: Instant update with no catch-up indicator
- Q: When the device running the display goes to sleep or the browser suspends the tab completely (beyond normal backgrounding), what should happen to the timer when the device wakes up? → A: Timer continues counting (as if time passed normally)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display Timer Continues in Background (Priority: P1)

As a service operator running a church service, I need the rundown display timer to continue counting accurately when the display tab is in the background, so that projected countdown timers remain synchronized with the actual service timing without requiring constant attention to the tab.

**Why this priority**: This is the core functionality issue - without accurate timing in background tabs, the display becomes unreliable for service operation. Operators often switch between tabs during services, and inaccurate timing disrupts service flow.

**Independent Test**: Can be fully tested by starting a rundown timer, switching to another tab for 30+ seconds, returning to the display tab, and verifying the timer shows the correct elapsed time (not frozen at the moment the tab was backgrounded).

**Acceptance Scenarios**:

1. **Given** a rundown display is open showing a timer that is running, **When** the user switches to another browser tab for 60 seconds, **Then** upon returning to the display tab, the timer shows 60 seconds of elapsed time (not frozen)
2. **Given** a countdown timer showing 2:00 remaining is running on the display, **When** the tab is minimized for 90 seconds, **Then** upon restoring the tab, the timer shows 0:30 remaining (correctly accounting for background time)
3. **Given** multiple display windows are open for the same rundown, **When** one display tab is backgrounded while the timer runs, **Then** all display windows show synchronized timing regardless of tab focus state

---

### User Story 2 - Confetti Animation Works in Background (Priority: P2)

As a service operator, I need visual celebration effects (like confetti) to trigger correctly when the display tab becomes active, so that service milestones are properly celebrated on the projection screen.

**Why this priority**: Visual effects enhance service experience, but are secondary to accurate timing. Since the live view is always visible on a separate screen, confetti is typically triggered when the display is already in focus.

**Independent Test**: Can be tested by triggering a confetti event from the live view while the display tab is visible, and verifying the confetti animation plays smoothly even after the tab was previously backgrounded.

**Acceptance Scenarios**:

1. **Given** a display tab that was previously backgrounded is now in foreground, **When** an operator triggers a confetti effect from the live view, **Then** the display shows the confetti animation immediately
2. **Given** a display tab has been backgrounded for several minutes then brought to foreground, **When** a confetti effect is triggered, **Then** the animation plays smoothly without lag or freezing

---

### User Story 3 - Smooth Transitions After Background Period (Priority: P2)

As a service operator, I need display transitions between rundown items to work smoothly even after the display tab has been in the background, so that the projected content appears professional regardless of tab state.

**Why this priority**: Smooth transitions maintain professional appearance. While important, this is secondary to accurate timing functionality.

**Independent Test**: Can be tested by backgrounding the display tab, advancing to the next rundown item from the live view, then bringing the display to foreground and verifying the transition animation completes smoothly.

**Acceptance Scenarios**:

1. **Given** a display tab has been in the background, **When** the operator advances to the next rundown item, **Then** the display transitions smoothly to the new content without stuttering or freezing
2. **Given** a display tab returns from background state, **When** slide transitions or fade effects are triggered, **Then** the configured transition duration (e.g., 500ms) completes as expected

---

### Edge Cases

- What happens when the display tab is backgrounded for an extended period (30+ minutes) and then brought back to foreground? Timer updates instantly to show correct elapsed time with no catch-up animation.
- How does the system handle multiple rapid tab switches (backgrounded/foregrounded multiple times per second)?
- What happens if the browser throttles all timers to minimum intervals in deeply backgrounded tabs?
- How does the fix impact battery usage on laptop devices running the display for extended periods?
- What happens when the device goes to sleep while the display tab is open? Timer continues counting based on timestamp, showing correct elapsed time when device wakes.
- How does the system handle clock drift between the operator's device and display device over long services (2+ hours)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use timestamp-based calculations for all timer tracking, not interval-based counters, to ensure accuracy regardless of browser throttling
- **FR-002**: Display timers MUST show accurate elapsed time within ±1 second tolerance when tab returns from background state, regardless of how long the tab was backgrounded
- **FR-003**: System MUST use Page Visibility API to detect when display tab becomes backgrounded or foregrounded, and trigger immediate timer recalculation via `Date.now() - startTimeRef.current + pausedElapsed` when transitioning from hidden to visible state
- **FR-004**: System MUST recalculate timer state using current timestamp when display tab transitions from background to foreground, with instant visual update (no transition animation)
- **FR-005**: System MUST synchronize timer state across multiple display windows even when some are backgrounded
- **FR-011**: System MUST continue counting elapsed time correctly when device sleeps/wakes, treating sleep time as normal elapsed time
- **FR-006**: Confetti animations MUST complete successfully when triggered after display tab was backgrounded
- **FR-007**: Display transitions MUST complete smoothly with correct timing (within ±100ms) after display tab returns from background
- **FR-008**: System MUST recalculate and update display immediately (no catch-up animation) when tab transitions from background to foreground
- **FR-009**: Timer update callbacks MUST not cause React re-render loops or performance degradation
- **FR-010**: System MUST gracefully handle scenarios where background throttling delays setInterval/setTimeout by seconds or minutes

### Key Entities *(include if feature involves data)*

- **Display Timer**: Tracks elapsed and remaining time for rundown items, must calculate from timestamps rather than accumulated intervals
- **Page Visibility State**: Browser state indicating whether display tab is visible/hidden, used to trigger recalculations
- **Display Sync Message**: Communication between live view and display windows, must include timestamp information for accurate synchronization
- **Timer Reference**: Stored start timestamp and paused elapsed time, used to calculate current elapsed time on each update

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Display timers remain accurate within ±1 second after display tab has been backgrounded for any duration up to 4 hours
- **SC-002**: Timer synchronization across multiple display windows maintains ±500ms tolerance regardless of individual tab focus states
- **SC-003**: Confetti animations triggered during background state play successfully within 1 second of display tab returning to foreground
- **SC-004**: Display transitions complete within ±100ms of expected duration after backgrounding, maintaining smooth visual appearance
- **SC-005**: System handles 100+ background/foreground transitions during a 2-hour service without timer drift exceeding ±2 seconds
- **SC-006**: Battery impact on operator's laptop running display for 2 hours increases by no more than 5% compared to display without fix

## Technical Context *(mandatory)*

### Current Implementation Issues

The current implementation in `components/rundown/rundown-timer.tsx` uses `setInterval(updateTimer, 250)` with timestamp-based calculations, which is partially correct. However:

1. **Browser throttling**: Modern browsers throttle `setInterval` in background tabs to 1000ms minimum, causing the UI to appear frozen
2. **No visibility detection**: The code doesn't detect when the tab is backgrounded or foregrounded to force immediate recalculation
3. **Animation timing**: The `display-view.tsx` component uses `Date.now()` for confetti animations but doesn't account for delayed frame execution in background tabs

### Affected Components

- `components/rundown/rundown-timer.tsx`: Main timer component with setInterval-based updates
- `components/rundown/display-view.tsx`: Display projection view with confetti animations
- `hooks/use-display-sync.ts`: Message synchronization between live view and display windows
- `app/rundown/[id]/display/page.tsx`: Display page that renders the projection view

### Browser Behavior Background

Browsers implement aggressive timer throttling for background tabs:
- Minimum `setInterval` frequency: 1000ms in background tabs (Chrome, Firefox, Safari)
- `requestAnimationFrame` pauses completely in background tabs
- Page Visibility API provides `visibilitychange` event to detect state changes

## Assumptions *(mandatory)*

1. Display windows are expected to remain open for entire service duration (typically 1-4 hours)
2. Live view (operator control panel) is always visible on a separate screen, so message queueing for missed updates is not required
3. Operators may frequently switch between tabs on the display device (notes, browser tabs) during services
4. Network latency between operator and display device is typically <100ms (same local network)
5. Multiple display windows may be open simultaneously (e.g., main projection + overflow room)
6. Services run on standard modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
7. Display device has stable clock (not drifting more than 1 second per hour)
8. Battery life is a concern for laptop-based display devices during extended services

## Dependencies *(mandatory)*

- Browser Page Visibility API support (available in all modern browsers since 2013)
- Existing `useDisplaySync` hook for message passing between windows
- Existing BroadcastChannel API usage for cross-window communication
- Current timestamp-based timer calculation approach in `rundown-timer.tsx`

## Out of Scope *(mandatory)*

- Fixing timer accuracy issues unrelated to background tab throttling (e.g., clock drift, network latency)
- Optimizing performance of other display components not affected by background throttling
- Adding new timer features or controls beyond fixing existing background behavior
- Synchronizing timers across devices on different physical clocks (assumed synchronized)
- Supporting browsers that don't implement Page Visibility API (IE11 and earlier)
- Implementing server-side timer synchronization or WebSocket-based timing
- Queueing or replaying missed messages sent while display tab was backgrounded (live view always visible on separate screen)
