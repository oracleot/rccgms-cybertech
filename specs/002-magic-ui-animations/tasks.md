# Tasks: Magic UI Animations & Visual Enhancements

**Input**: Magic UI documentation from magicui.design  
**Purpose**: Add life, animations, and visual polish to the Cyber Tech app using Magic UI components

**Organization**: Tasks are grouped by feature area/page with priority ordering

## Format: `[ID] [P?] [Area] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Area]**: Which area of the app this affects (Landing, Auth, Dashboard, etc.)

## Path Conventions

- **Magic UI Components**: `components/ui/` (installed via shadcn CLI)
- **App Pages**: `app/`, `app/(auth)/`, `app/(dashboard)/`
- **Feature Components**: `components/[feature]/`
- **Styles**: `app/globals.css`

---

## Phase 1: Setup & Dependencies ✅

**Purpose**: Install Magic UI components and configure animation dependencies

- [x] T001 Install @magicui/text-animate via `pnpm dlx shadcn@latest add @magicui/text-animate`
- [x] T002 [P] Install @magicui/blur-fade via `pnpm dlx shadcn@latest add @magicui/blur-fade`
- [x] T003 [P] Install @magicui/border-beam via `pnpm dlx shadcn@latest add @magicui/border-beam`
- [x] T004 [P] Install @magicui/shimmer-button via `pnpm dlx shadcn@latest add @magicui/shimmer-button`
- [x] T005 [P] Install @magicui/number-ticker via `pnpm dlx shadcn@latest add @magicui/number-ticker`
- [x] T006 [P] Install @magicui/pulsating-button via `pnpm dlx shadcn@latest add @magicui/pulsating-button`
- [x] T007 [P] Install @magicui/animated-list via `pnpm dlx shadcn@latest add @magicui/animated-list`
- [x] T008 [P] Install @magicui/particles via `pnpm dlx shadcn@latest add @magicui/particles`
- [x] T009 [P] Install @magicui/sparkles-text via `pnpm dlx shadcn@latest add @magicui/sparkles-text`
- [x] T010 [P] Install @magicui/ripple via `pnpm dlx shadcn@latest add @magicui/ripple`
- [x] T011 Verify all Magic UI components installed correctly in components/ui/

**Checkpoint**: All Magic UI components installed and ready for use ✅

---

## Phase 2: Landing Page (First Impression) ⭐ HIGH PRIORITY ✅

**Purpose**: Transform the landing page into a visually captivating first impression

**File**: `app/page.tsx`

- [x] T012 [Landing] Add Particles background component behind the login card
  - Subtle floating particles with low quantity (~50)
  - Color matching theme (dark mode aware)
  - Position absolute, z-index behind card

- [x] T013 [P] [Landing] Replace "Cyber Tech" title with SparklesText component
  - Sparkle colors: purple/blue gradient to match tech theme
  - Maintain accessibility (text still readable)

- [x] T014 [P] [Landing] Add TextAnimate to tagline "Tech Department Management for RCCG Morningstar"
  - Animation: blurInUp
  - By: word
  - Delay staggered after title

- [x] T015 [Landing] Replace "Sign In" Button with ShimmerButton
  - Shimmer color: white/light
  - Background: primary color
  - Maintain full-width styling

- [x] T016 [Landing] Add BlurFade wrapper to entire Card component
  - Direction: up
  - Delay: 0.1s
  - Smooth entrance on page load

- [x] T017 [P] [Landing] Update loading spinner with better animated spinner
  - Replace basic border-spin with smoother animation
  - Add subtle pulse effect

**Checkpoint**: Landing page has visual impact with animations ✅

---

## Phase 3: Auth Pages (Login/Register) ✅

**Purpose**: Add subtle polish to authentication flows

**Files**: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/layout.tsx`

- [x] T018 [Auth] Add Ripple background effect to auth layout
  - Particles + gradient background with glowing orbs
  - Grid pattern overlay
  - Color: violet/indigo theme

- [x] T019 [Auth] Add BorderBeam to login Card component
  - Animated light traveling around card border
  - Colors: gradient from violet to indigo
  - Duration: 10s for subtle effect

- [x] T020 [P] [Auth] Add BlurFade to form fields with staggered delay
  - Wrap each FormField in BlurFade
  - Delay: 0.1s increment per field
  - Direction: up

- [x] T021 [P] [Auth] Add TextAnimate to "Welcome back" title
  - Animation: blurInUp
  - By: word

- [x] T022 [P] [Auth] Apply same animations to register page
  - Mirror login page animation pattern
  - Consistent user experience
  - UserPlus icon, staggered BlurFade on all 4 fields

- [x] T023 [P] [Auth] Apply same animations to forgot-password page
  - BorderBeam on card
  - BlurFade on form fields
  - Ripple effect on success state
  - Green theme for success confirmation

**Checkpoint**: Auth pages have consistent, polished animations ✅

---

## Phase 4: Dashboard Countdown Widget ⭐ HIGH PRIORITY ✅

**Purpose**: Make the countdown widget a signature animated feature

**File**: `components/dashboard/countdown-widget.tsx`

- [x] T024 [Dashboard] Replace static numbers with NumberTicker component
  - Animate digits when they change
  - Direction: up (counting)
  - Smooth transitions between values

- [x] T025 [P] [Dashboard] Add pulsing border effect when < 24 hours to service
  - BorderBeam with faster animation
  - Gradient background glow
  - Color: violet with increasing intensity

- [x] T026 [P] [Dashboard] Add PulsatingButton for "Service is Today!" state
  - Replace text with actionable pulsating button
  - Pulse color: violet
  - Link to rundown for that service

- [x] T027 [Dashboard] Add subtle scale animation to TimeBlock on urgent state
  - Gradient background when highlight=true
  - Box shadow glow effect
  - Smooth transition

- [x] T028 [P] [Dashboard] Add entrance animation to entire widget
  - Gradient background transition based on urgency
  - "LIVE SOON" badge when < 6 hours

**Checkpoint**: Countdown widget is eye-catching and dynamic ✅

---

## Phase 5: Dashboard Welcome & Layout ✅

**Purpose**: Add entrance animations and visual polish to dashboard

**Files**: `app/(dashboard)/dashboard/page.tsx`

- [x] T029 [Dashboard] Add gradient header with welcome message
  - Sparkles icon indicator
  - Gradient background with glow effect
  - BlurFade entrance animation

- [x] T030 [P] [Dashboard] Add NumberTicker to all stat cards
  - Animated count-up effect
  - Each card has distinct color theme
  - Hover effects with gradient backgrounds

- [x] T031 [Dashboard] Add staggered BlurFade to dashboard grid cards
  - Each widget wrapped in BlurFade
  - Delay increment: 0.05s per card
  - Creates cascading entrance effect

- [x] T032 [P] [Dashboard] Add interactive hover states to all cards
  - Color-coded icon backgrounds (violet, green, blue, amber)
  - Arrow transitions on quick action links
  - Pending swaps indicator with ping animation

**Checkpoint**: Dashboard has polished entrance and interactions ✅

---

## Phase 6: Notification Feed ✅

**Purpose**: Animate notifications for visual interest

**File**: `components/dashboard/notification-feed.tsx`

- [x] T033 [Dashboard] Wrap notification list with AnimatedList component
  - Delay between items: 100ms
  - Smooth entrance for each notification

- [x] T034 [P] [Dashboard] Add pulse animation to unread indicator dot
  - CSS ping animation
  - Violet color theme
  - Continuous animation for unread items

- [x] T035 [P] [Dashboard] Add hover effect to notification items
  - Gradient background on unread
  - Violet text color on hover
  - Smooth border transition

- [x] T036 [P] [Dashboard] Enhanced empty state design
  - Sparkles icon with gradient background
  - Pulsing glow effect
  - "All caught up" messaging

**Checkpoint**: Notification feed is dynamic and engaging ✅

---

## Phase 7: Quick Actions ✅

**Purpose**: Make quick action cards more interactive

**File**: `components/dashboard/quick-actions.tsx`

- [x] T037 [Dashboard] Add staggered BlurFade to quick action cards
  - Delay increment per card
  - Direction: up

- [x] T038 [P] [Dashboard] Add hover animation to action cards
  - Color-coded hover backgrounds per action type
  - Border color transition on hover
  - Arrow slide animation on hover

- [x] T039 [P] [Dashboard] Add icon animation on hover
  - Scale up effect on icon container
  - Color-specific styling
  - Smooth transition

- [x] T040 [P] [Dashboard] Add color transition on hover for icon container
  - Each action has unique color (violet, blue, green, amber, etc.)
  - Background intensifies on hover
  - Smooth 200ms transition

**Checkpoint**: Quick actions feel responsive and interactive ✅

---

## Phase 8: Equipment Cards ✅

**Purpose**: Add polish to equipment inventory display

**Files**: `components/equipment/equipment-card.tsx`, `components/equipment/status-badge.tsx`

- [x] T041 [Equipment] Add hover effect to equipment cards
  - Status-specific gradient overlays
  - Border color changes on hover
  - Shadow glow effect

- [x] T042 [P] [Equipment] Add status-specific animations to badges
  - "available": BorderBeam with green glow + ping indicator
  - "in-use": blue theme
  - "maintenance": amber theme
  - "retired": slate theme

- [x] T043 [P] [Equipment] Enhanced card styling
  - QR code indicator with violet icon
  - Code-style serial number display
  - Category pills

- [x] T044 [P] [Equipment] Add transition animation for interactions
  - Title color change on hover
  - Arrow slide on View Details button
  - "Ready" indicator for available items

**Checkpoint**: Equipment cards are polished and status-aware ✅

---

## Phase 9: Color Enhancement

**Purpose**: Update color palette for more visual interest

**File**: `app/globals.css`

- [ ] T045 [Colors] Add accent color variables for tech/modern feel
  - Electric blue: `oklch(0.6 0.2 250)` or similar
  - Purple accent: `oklch(0.6 0.2 290)`
  - Keep accessible contrast ratios

- [ ] T046 [P] [Colors] Add gradient CSS utilities for backgrounds
  - `.bg-gradient-tech`: primary → accent gradient
  - `.bg-gradient-glow`: radial glow effect

- [ ] T047 [P] [Colors] Add glow effect CSS utilities
  - `.glow-primary`: box-shadow glow in primary color
  - `.glow-urgent`: pulsing red glow for alerts

- [ ] T048 [Colors] Update chart colors for better visual consistency
  - Ensure chart-1 through chart-5 are harmonious
  - Consider purple/blue/teal palette

**Checkpoint**: Color palette is modern and visually cohesive ✅

---

## Phase 10: Sidebar & Navigation

**Purpose**: Subtle navigation enhancements

**File**: `components/layout/app-sidebar.tsx`

- [ ] T049 [Layout] Add subtle animation to logo icon
  - Gentle pulse or glow on idle
  - Or static but with hover effect

- [ ] T050 [P] [Layout] Add active link indicator animation
  - Smooth transition when switching active link
  - Animated background slide

- [ ] T051 [P] [Layout] Add hover animation to nav items
  - Background fade in
  - Icon shift or color change
  - Smooth 150ms transition

**Checkpoint**: Navigation feels polished and responsive ✅

---

## Phase 11: Micro-Interactions (Global)

**Purpose**: Add small, delightful interactions throughout the app

- [ ] T052 [Global] Add button hover scale effect to all Button components
  - Scale: 1.02 on hover
  - Update components/ui/button.tsx variants

- [ ] T053 [P] [Global] Add focus ring animation
  - Animated focus ring on keyboard navigation
  - Accessibility-friendly

- [ ] T054 [P] [Global] Add loading state animations to buttons
  - Spinner with smooth entrance
  - Disabled state visual feedback

- [ ] T055 [P] [Global] Add card hover states globally
  - Consistent hover effect across all Card components
  - Optional: Update components/ui/card.tsx

- [ ] T056 [Global] Add page transition animations
  - Fade or slide transitions between routes
  - Consider next/view-transitions or framer-motion

**Checkpoint**: Micro-interactions create a polished, cohesive feel ✅

---

## Phase 12: Performance & Accessibility

**Purpose**: Ensure animations don't harm UX

- [ ] T057 Add reduced-motion media query support
  - Check `prefers-reduced-motion`
  - Disable/reduce animations for users who prefer
  - Update globals.css with media query

- [ ] T058 [P] Audit animation performance
  - Check for jank on mobile devices
  - Ensure animations use GPU-accelerated properties
  - Test on slower devices

- [ ] T059 [P] Ensure animations don't block interaction
  - All animations should be non-blocking
  - Users can interact during animations

- [ ] T060 [P] Test screen reader compatibility
  - Ensure animated content is announced properly
  - No content hidden from assistive tech

**Checkpoint**: Animations are accessible and performant ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - install components first
- **Phase 2 (Landing)**: Depends on Phase 1 - high impact, do early
- **Phase 3 (Auth)**: Depends on Phase 1 - can parallel with Phase 2
- **Phase 4 (Countdown)**: Depends on Phase 1 - high impact, prioritize
- **Phase 5-8**: Can run in parallel after Phase 1
- **Phase 9 (Colors)**: Can run anytime, independent
- **Phase 10-11**: Lower priority, polish phase
- **Phase 12 (A11y)**: Run last, validates all animations

### Suggested Implementation Order

| Priority | Phase | Impact | Effort |
|----------|-------|--------|--------|
| 1️⃣ | Phase 1: Setup | Required | Low |
| 2️⃣ | Phase 2: Landing Page | ⭐⭐⭐⭐⭐ | Low |
| 3️⃣ | Phase 4: Countdown Widget | ⭐⭐⭐⭐⭐ | Low |
| 4️⃣ | Phase 3: Auth Pages | ⭐⭐⭐⭐ | Low |
| 5️⃣ | Phase 5: Dashboard Welcome | ⭐⭐⭐⭐ | Medium |
| 6️⃣ | Phase 6: Notification Feed | ⭐⭐⭐ | Low |
| 7️⃣ | Phase 7: Quick Actions | ⭐⭐⭐ | Low |
| 8️⃣ | Phase 9: Colors | ⭐⭐⭐⭐ | Medium |
| 9️⃣ | Phase 8: Equipment Cards | ⭐⭐ | Medium |
| 🔟 | Phase 10-11: Polish | ⭐⭐ | Medium |
| 1️⃣1️⃣ | Phase 12: A11y | Required | Low |

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 60 |
| **Phase 1 (Setup)** | 11 tasks |
| **Phase 2 (Landing)** | 6 tasks |
| **Phase 3 (Auth)** | 6 tasks |
| **Phase 4 (Countdown)** | 5 tasks |
| **Phase 5 (Dashboard)** | 4 tasks |
| **Phase 6 (Notifications)** | 4 tasks |
| **Phase 7 (Quick Actions)** | 4 tasks |
| **Phase 8 (Equipment)** | 4 tasks |
| **Phase 9 (Colors)** | 4 tasks |
| **Phase 10 (Sidebar)** | 3 tasks |
| **Phase 11 (Micro-interactions)** | 5 tasks |
| **Phase 12 (A11y/Perf)** | 4 tasks |
| **Parallel Opportunities** | ~70% of tasks marked [P] |

### Quick Win Path (Maximum Impact, Minimum Effort)

1. Phase 1: Install all components (~15 min)
2. Phase 2: Landing page animations (~30 min)
3. Phase 4: Countdown widget (~30 min)
4. Phase 3: Auth page polish (~30 min)

**Estimated time for high-impact animations**: ~2 hours

---

## Magic UI Component Reference

| Component | Use Case | Files |
|-----------|----------|-------|
| TextAnimate | Animated headings, titles | Landing, Dashboard, Auth |
| BlurFade | Entrance animations for sections/cards | Everywhere |
| BorderBeam | Animated card borders | Auth cards, Featured items |
| ShimmerButton | CTA buttons | Landing, Key actions |
| NumberTicker | Animated numbers | Countdown, Stats |
| PulsatingButton | Urgent CTAs | Service today, Alerts |
| AnimatedList | List animations | Notifications, Feeds |
| Particles | Background effects | Landing page |
| SparklesText | Decorative text | Brand name, Highlights |
| Ripple | Background effects | Auth layout |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- All animations should respect `prefers-reduced-motion`
- Test on mobile before marking complete
- Commit after each phase completion
- Avoid animation overload - subtle is better
