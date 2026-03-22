# Feature Proposals for Discussion

**Created:** 22 March 2026
**Status:** Open for Discussion
**Related:** [feature-enhancements.md](./feature-enhancements.md) (existing backlog)

---

## Context

This document captures feature proposals to improve Cyber Tech beyond its current ~90% MVP state. It builds on the [existing enhancement plan](./feature-enhancements.md) (AI Rota Assistant, Offline PWA, Planning Center Integration) and identifies additional high-impact opportunities based on a full codebase review.

Proposals are grouped into three tiers based on user impact and effort.

---

## Tier 1 — High-Impact Features

These address the most significant gaps in the current application.

### 1. Attendance Tracking & Verification

**Problem:** There is no way to confirm whether assigned members actually showed up for duty. Leaders rely on memory or WhatsApp messages to track attendance.

**Proposal:**
- Add a check-in system for each service (manual check-in by leaders or self-check-in by members)
- Record attendance against rota assignments to identify no-shows
- Surface attendance rates on the dashboard and in member profiles
- Add an attendance history view for leaders

**Scope:** New database table (`attendance`), new UI components, dashboard widget integration.

**Effort:** Medium

---

### 2. Calendar Export & Sync (iCal / Google Calendar)

**Problem:** Members must manually check the app for their schedule. There's no way to push rota assignments to personal calendars.

**Proposal:**
- Generate iCal (.ics) feeds per member with their upcoming assignments
- Provide a subscribable calendar URL so personal calendars auto-update
- Add "Add to Calendar" buttons on assignment cards (Google Calendar deep link, .ics download)

**Scope:** New API endpoint for iCal feed generation, UI buttons on schedule views.

**Effort:** Low–Medium

---

### 3. Analytics & Reporting Dashboard

**Problem:** Leaders and admins have no data-driven visibility into team performance, workload distribution, or trends.

**Proposal:**
- **Team coverage report:** How many positions were filled vs. required per service
- **Member workload chart:** Assignment frequency per member over a period
- **Availability trends:** Percentage of team available week-over-week
- **Equipment utilization:** Checkout frequency, items most/least used
- **Swap frequency:** Which members request swaps most often

**Scope:** New admin route (`/admin/reports`), server queries for aggregated data, chart components.

**Effort:** Medium–High

---

### 4. Push Notifications (Browser & Mobile)

**Problem:** The notification system exists (email/SMS queue with retry) but users don't receive real-time alerts. Important changes (published rotas, swap requests, equipment returns) require manually checking the app.

**Proposal:**
- Implement Web Push via the Push API and service workers
- Trigger push notifications for: rota published, new swap request, swap approved/rejected, equipment overdue
- Add notification preferences so members control which alerts they receive
- Consider integration with the existing PWA manifest

**Scope:** Service worker push registration, backend push dispatch, notification preference UI.

**Effort:** Medium

---

### 5. Complete the Notification TODOs

**Problem:** There are 6 notification-sending TODOs in the codebase that are currently no-ops. Swap requests, approvals, rejections, and rota publications send no notifications.

**Locations:**
- `app/(dashboard)/rota/swaps/actions.ts` — 5 TODOs for swap lifecycle notifications
- `app/(dashboard)/rota/actions.ts` — 1 TODO for rota publish notification

**Proposal:** Wire up the existing `lib/notifications` infrastructure to actually send emails/SMS at each of these touchpoints.

**Effort:** Low (infrastructure already exists)

---

## Tier 2 — Quality-of-Life Improvements

These improve day-to-day usability for existing users.

### 6. Global Search (Cmd+K)

**Problem:** As the app grows with more rotas, equipment, members, and rundowns, there's no fast way to find things.

**Proposal:**
- Add a Cmd+K / Ctrl+K command palette (using the existing `cmdk` dependency already in package.json)
- Search across members, equipment, rotas, rundowns, and training tracks
- Provide quick navigation to any page

**Scope:** New `CommandMenu` component, keyboard shortcut handler, search index.

**Effort:** Low–Medium (cmdk already installed)

---

### 7. Recurring Availability Patterns

**Problem:** Members must mark availability one date at a time. If someone is never available on the first Sunday of each month, they must mark each date individually.

**Proposal:**
- Allow members to set recurring patterns (e.g., "Available every Sunday except 1st Sunday")
- Support blackout date ranges (e.g., vacation from Dec 20 – Jan 5)
- Auto-populate future availability from patterns

**Scope:** Schema extension to `availability` table, pattern editor UI, availability auto-fill logic.

**Effort:** Medium

---

### 8. Rota Templates & Auto-Scheduling

**Problem:** Leaders create rotas from scratch each week even though the team structure is often similar. There's no way to reuse previous assignments as a starting point.

**Proposal:**
- Save a rota as a template (captures position assignments without dates)
- "Create from template" option when making a new rota
- Optional auto-fill: given a template and member availability, auto-assign members and flag conflicts

**Scope:** Template storage (new table or JSON column), template picker UI, auto-fill algorithm.

**Effort:** Medium

---

### 9. Quiz Step Implementation for Training

**Problem:** The training module supports text, video, and link step types, but the quiz step type shows a placeholder. This means training tracks cannot include knowledge checks.

**Current state:** `app/(dashboard)/training/[id]/step/[stepId]/page.tsx` renders a placeholder for quiz steps.

**Proposal:**
- Implement a simple multiple-choice quiz component
- Store questions/answers in the existing training step JSON content
- Auto-grade and record pass/fail
- Require passing grade before marking step complete

**Effort:** Medium

---

### 10. Data Export (CSV/PDF)

**Problem:** There's no way to export data from the application for external reporting, sharing with church leadership, or record-keeping.

**Proposal:**
- Add CSV export to key list views: member roster, rota assignments, equipment inventory, attendance records
- Add PDF export for individual rotas (printable schedule) and rundowns
- Add PDF certificate download (training certificates)

**Scope:** Utility functions for CSV/PDF generation, export buttons on list pages.

**Effort:** Low–Medium

---

### 11. Equipment Maintenance Scheduling

**Problem:** Equipment has maintenance history tracking but no proactive scheduling. There's no way to set recurring maintenance reminders.

**Proposal:**
- Add maintenance schedule per equipment item (e.g., "Clean camera sensor every 3 months")
- Generate reminders when maintenance is due
- Surface overdue maintenance on the dashboard equipment alerts widget

**Scope:** Schema extension, reminder cron job, dashboard widget enhancement.

**Effort:** Low–Medium

---

### 12. Broadcast Messages to Teams

**Problem:** Leaders cannot send announcements to their entire team or specific departments. Communication still happens on WhatsApp.

**Proposal:**
- Add a "Send Announcement" feature accessible to leaders and admins
- Target by department, role, or specific members
- Deliver via email, push notification, and in-app notification feed
- Keep announcement history

**Scope:** New UI component, backend broadcast logic, notification integration.

**Effort:** Medium

---

## Tier 3 — Forward-Looking Enhancements

These are larger initiatives for future planning.

### 13. Mobile App (React Native or PWA Enhancement)

**Problem:** While the app is responsive, a native-like mobile experience with offline support and push notifications would significantly improve adoption among members who primarily use phones.

**Proposal:**
- Option A: Enhance PWA with full offline support (aligns with existing backlog item)
- Option B: Build a React Native wrapper using the existing API routes

**Effort:** High

---

### 14. Multi-Church / Multi-Campus Support

**Problem:** The current data model is scoped to a single church. If other RCCG parishes want to use the tool, they'd need separate deployments.

**Proposal:**
- Add a `church_id` / `organization_id` tenant column to all tables
- Scope RLS policies to the tenant
- Add a church selection flow during onboarding

**Effort:** High (significant schema and RLS changes)

---

### 15. Integration Hub

**Problem:** Beyond Planning Center (already in the backlog), churches use various tools that could benefit from integration.

**Proposal:**
- **YouTube Live API:** Auto-set livestream titles/descriptions from the livestream module
- **ProPresenter / EasyWorship:** Export rundowns in a format these tools can import
- **WhatsApp Business API:** Send notifications via WhatsApp (preferred channel for many churches)
- **Slack/Discord:** Webhook notifications for tech team channels

**Effort:** Varies per integration (Medium each)

---

### 16. Service Feedback Collection

**Problem:** After each service, there's no structured way to collect feedback on what went well and what needs improvement.

**Proposal:**
- Post-service feedback form sent to all assigned members
- Simple rating + free-text per service area (sound, cameras, livestream, etc.)
- Aggregate feedback visible to leaders for trend analysis

**Effort:** Medium

---

## Already Planned (Existing Backlog)

For reference, these are already scoped in [feature-enhancements.md](./feature-enhancements.md):

| Initiative | Status | Effort |
|-----------|--------|--------|
| AI Rota Assistant Panel | Designed, not implemented | Medium |
| Offline PWA Support | Designed, not implemented | Medium |
| Planning Center Integration | Designed, not implemented | High |

---

## Known Bugs & Technical Debt

These should be addressed alongside new features:

| Item | Priority | Location |
|------|----------|----------|
| Root layout shows "Create Next App" metadata | P0 | `app/layout.tsx` |
| PWA manifest references PNG icons that don't exist | P0 | `app/manifest.ts` |
| Song library has schema but no admin UI | P2 | No UI exists |
| Assignment confirmation has schema but no UI | P2 | `confirmation_status` column unused |
| Social media platform publishing not connected | P3 | Content scheduled but no API calls |

---

## Discussion Questions

1. **Which Tier 1 features would deliver the most value to your team right now?**
2. **Are calendar exports (iCal/Google Calendar) a must-have for your members?**
3. **How important is attendance tracking vs. trusting members to show up?**
4. **Would analytics/reporting be used primarily by the Tech Lead or by all leaders?**
5. **Is WhatsApp integration more valuable than email/push notifications for your team?**
6. **Should we prioritize completing existing TODOs (notifications, quiz) before adding new features?**
7. **Any features not listed here that your team has been asking for?**
