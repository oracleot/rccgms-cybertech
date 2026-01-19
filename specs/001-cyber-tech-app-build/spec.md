# Feature Specification: Cyber Tech - Church Tech Department Management App

**Feature Branch**: `001-cyber-tech-app-build`  
**Created**: December 21, 2025  
**Status**: Draft  
**Input**: User description: "Build the Cyber Tech church tech department management application based on the product specification and technical documentation"

## Overview

Cyber Tech is a comprehensive web application designed to automate and streamline the operations of the RCCG Morning Star church tech department. The platform centralizes task management, scheduling, content creation, and team coordination into a single, intuitive interface.

### Target Users

| Role | Description | Key Needs |
|------|-------------|-----------|
| **Tech Lead/Admin** | Oversees all tech operations | Full access to all features, user management, analytics |
| **Team Leaders** | Manage specific areas (sound, cameras, etc.) | Rota creation, team member management, rundown editing |
| **Volunteers** | Serve on scheduled Sundays | View schedules, submit availability, access training |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Authentication & Access (Priority: P1)

As a tech department member, I want to securely sign up, log in, and access the application so that I can use the platform according to my role permissions.

**Why this priority**: Authentication is the foundational requirement. Without user accounts and role-based access, no other features can function properly. This gates all subsequent functionality.

**Independent Test**: Can be fully tested by creating an account, logging in, and verifying that role-appropriate dashboard elements are visible. Delivers immediate value by establishing user identity and access control.

**Acceptance Scenarios**:

1. **Given** a new user with a valid email, **When** they complete the signup form with email and password, **Then** they receive a verification email and can activate their account
2. **Given** a registered user, **When** they enter valid credentials on the login page, **Then** they are redirected to their role-appropriate dashboard
3. **Given** a logged-in user, **When** they click "Forgot Password", **Then** they receive a reset link that expires after 1 hour
4. **Given** an Admin user, **When** they access the admin section, **Then** they can invite new members via email invitation
5. **Given** a user with expired session, **When** they attempt to access a protected page, **Then** they are redirected to login

---

### User Story 2 - Rota Management & Scheduling (Priority: P1)

As a Team Leader, I want to create and manage weekly service rotas so that volunteers know when and where they are serving, reducing last-minute coordination chaos.

**Why this priority**: Rota management is the core operational need identified by the Tech Lead persona. It directly addresses the pain point of spending hours on WhatsApp coordinating schedules.

**Independent Test**: Can be fully tested by creating a rota for an upcoming Sunday, assigning volunteers to positions, publishing it, and verifying that assigned volunteers receive notifications. Delivers immediate operational value.

**Acceptance Scenarios**:

1. **Given** a Team Leader on the rota page, **When** they select a service date, **Then** they see all available positions with min/max volunteer requirements
2. **Given** a rota with positions displayed, **When** the Leader assigns a volunteer via dropdown or drag-drop, **Then** the assignment is saved and the position shows the volunteer's name
3. **Given** a complete rota in draft status, **When** the Leader clicks "Publish", **Then** all assigned volunteers receive email notifications
4. **Given** a volunteer viewing their dashboard, **When** they check "My Schedule", **Then** they see all their upcoming assignments for the next 4 weeks
5. **Given** an assigned volunteer, **When** they submit availability as unavailable for a date, **Then** Leaders are notified of the conflict

---

### User Story 3 - Volunteer Availability Submission (Priority: P1)

As a Volunteer, I want to submit my availability for upcoming Sundays so that Leaders can schedule me appropriately and I don't get assigned when unavailable.

**Why this priority**: Availability tracking is essential for effective rota creation and prevents scheduling conflicts that lead to last-minute scrambles.

**Independent Test**: Can be fully tested by a volunteer accessing the availability calendar, marking dates as available/unavailable, and verifying Leaders can see this when creating rotas.

**Acceptance Scenarios**:

1. **Given** a logged-in Volunteer, **When** they access the availability page, **Then** they see a calendar-based picker for upcoming weeks
2. **Given** the availability calendar, **When** the Volunteer marks a date as unavailable with an optional note, **Then** the status is saved and visible to Leaders
3. **Given** a Leader creating a rota, **When** they select a volunteer for assignment, **Then** they see that volunteer's availability status for the selected date

---

### User Story 4 - Duty Swap Requests (Priority: P2)

As a Volunteer, I want to request a duty swap with another team member when I can no longer serve on my assigned date, so that my responsibilities are covered without burdening the Team Leader.

**Why this priority**: Swap requests are a key quality-of-life feature that reduces Leader workload and empowers volunteers to manage their commitments.

**Independent Test**: Can be fully tested by an assigned volunteer initiating a swap request, another volunteer accepting it, and a Leader approving the swap with all parties receiving notifications.

**Acceptance Scenarios**:

1. **Given** an assigned Volunteer viewing their assignment, **When** they click "Request Swap", **Then** they can select a target volunteer and provide a reason
2. **Given** a swap request sent, **When** the target volunteer views their pending requests, **Then** they can accept or decline the swap
3. **Given** an accepted swap, **When** the Leader reviews pending requests, **Then** they can approve or reject the swap
4. **Given** an approved swap, **When** the workflow completes, **Then** both volunteers and the Leader receive confirmation notifications

---

### User Story 5 - Livestream Description Generator (Priority: P1)

As a Team Leader, I want to generate YouTube and Facebook descriptions for weekly services using AI, so that I can reduce the 15 minutes spent manually writing descriptions to under 2 minutes.

**Why this priority**: This is a critical time-saving feature that directly addresses the identified pain point of manually creating YouTube descriptions. It's also a differentiating AI-powered capability.

**Independent Test**: Can be fully tested by entering service details (date, title, speaker, scripture), generating a description, editing it if needed, and copying it to clipboard.

**Acceptance Scenarios**:

1. **Given** a Leader on the livestream page, **When** they fill in service details (date, title, speaker, scripture, key points), **Then** they can click "Generate" to create a description
2. **Given** a generation in progress, **When** the AI streams the response, **Then** the user sees the text appearing in real-time
3. **Given** a generated description, **When** the user reviews it, **Then** they can edit the content inline before saving
4. **Given** a finalized description, **When** the user clicks "Copy to Clipboard", **Then** the text is copied and a confirmation toast appears
5. **Given** YouTube vs Facebook selected, **When** generating, **Then** the output follows platform-specific formatting conventions

---

### User Story 6 - Service Rundown Builder (Priority: P2)

As a Team Leader, I want to create and manage service rundowns with timing and cues, so that the tech team knows the exact flow and their responsibilities during service.

**Why this priority**: Rundowns are essential for coordinated service execution, providing the "what happens when" that everyone needs to follow.

**Independent Test**: Can be fully tested by creating a rundown, adding items (songs, sermon, announcements), setting durations, assigning personnel, and viewing in live mode.

**Acceptance Scenarios**:

1. **Given** a Leader on the rundown page, **When** they create a new rundown for a service date, **Then** they can add items with title, type, duration, and assignments
2. **Given** a rundown with items, **When** they drag and drop to reorder, **Then** the order is updated and running totals recalculated
3. **Given** a completed rundown, **When** opened in "Live View" mode, **Then** it displays a clean, distraction-free view optimized for service execution
4. **Given** a common service structure, **When** the user saves it as a template, **Then** it can be reused for future services

---

### User Story 7 - Equipment Inventory Management (Priority: P2)

As a Team Leader, I want to track all tech department equipment, manage checkouts, and report issues, so that we always know what's available and what needs attention.

**Why this priority**: Equipment tracking prevents the discovered-during-service equipment issues identified in the persona pain points.

**Independent Test**: Can be fully tested by adding equipment to inventory, generating a QR code, scanning to view details, and completing a checkout/return cycle.

**Acceptance Scenarios**:

1. **Given** a Leader on the equipment page, **When** they add new equipment with details (name, category, serial number), **Then** it appears in the inventory with "Available" status
2. **Given** equipment in inventory, **When** they generate a QR code label, **Then** a printable QR code is produced linking to that item
3. **Given** a mobile device with camera access, **When** a user scans an equipment QR code, **Then** they see the equipment details and checkout option
4. **Given** available equipment, **When** a user completes checkout with expected return date, **Then** status changes to "In Use" and checkout is logged
5. **Given** checked-out equipment, **When** the user returns it and records condition, **Then** status returns to "Available" and return is logged
6. **Given** equipment with an issue, **When** a user reports a problem with severity level, **Then** the issue is logged and status changes to "Maintenance" if needed

---

### User Story 8 - Dashboard & Quick Actions (Priority: P2)

As a Volunteer, I want to see my upcoming duties and quick actions on my dashboard, so that I can quickly understand my commitments and access common tasks.

**Why this priority**: The dashboard is the daily touchpoint for all users, providing at-a-glance awareness and efficient navigation.

**Independent Test**: Can be fully tested by logging in and verifying the dashboard shows upcoming assignments, quick action buttons work, and role-appropriate widgets are displayed.

**Acceptance Scenarios**:

1. **Given** a logged-in Volunteer, **When** they view the dashboard, **Then** they see their next 4 weeks of duty assignments
2. **Given** the dashboard, **When** quick action buttons are clicked (e.g., "Submit Availability"), **Then** they navigate to the appropriate page
3. **Given** a Leader dashboard, **When** viewing, **Then** they also see pending swap requests and equipment alerts

---

### User Story 9 - Social Media Hub (Priority: P3)

As a Leader, I want to browse photos from Google Drive, generate AI-assisted captions, and preview posts for multiple platforms, so that post-service social media content creation is streamlined.

**Why this priority**: Social media management is important but not as time-critical as rota and livestream features. It enhances the team's content output.

**Independent Test**: Can be fully tested by connecting to Google Drive, browsing photos, selecting images, generating a caption, and previewing for different platforms.

**Acceptance Scenarios**:

1. **Given** a connected Google Drive account, **When** the user opens the Drive browser, **Then** they see photos from the shared service folder in a grid view
2. **Given** selected photos and service context, **When** the user clicks "Generate Caption", **Then** an AI-generated caption appears with hashtags
3. **Given** a composed post, **When** the user toggles between platforms (Facebook, Instagram), **Then** the preview updates to show platform-specific formatting

---

### User Story 10 - Volunteer Training & Onboarding (Priority: P3)

As a new Volunteer, I want to complete a structured training program for my role so that I'm prepared to serve effectively and can track my progress toward certification.

**Why this priority**: Training is important for team quality but is less time-sensitive than operational features. It builds long-term team capability.

**Independent Test**: Can be fully tested by enrolling in a training track, completing steps (videos, quizzes, shadowing sign-offs), and receiving certification upon completion.

**Acceptance Scenarios**:

1. **Given** a new Volunteer, **When** they view available training tracks, **Then** they see role-specific paths (Camera Operations, Sound, etc.) with step counts
2. **Given** an enrolled Volunteer, **When** they complete a video or quiz step, **Then** their progress is updated and next step unlocked
3. **Given** a practical step completed, **When** a mentor verifies completion, **Then** the step is marked complete with mentor attribution
4. **Given** all steps complete, **When** the final certification is issued, **Then** the Volunteer's profile reflects their certified status

---

### Edge Cases

- What happens when a volunteer is assigned but later marks themselves unavailable? The system should notify the Leader of the conflict and highlight the assignment.
- How does the system handle double-booking (same volunteer, same time, different positions)? The system should warn during assignment and prevent overlapping assignments.
- What happens when equipment is overdue for return? The system should send reminder notifications and flag the item on the dashboard.
- How does the system handle failed AI generation requests? Display a user-friendly error message with retry option; don't lose form input.
- What happens when a user loses internet during description generation? The partial streamed content should be preserved; user can retry to continue.
- What happens when an invited user doesn't complete registration within a reasonable timeframe? The invitation link should expire (default: 7 days) with option to resend.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & User Management**
- **FR-001**: System MUST allow users to sign up with email and password with email verification required
- **FR-002**: System MUST allow users to log in with email and password, with session persisting across browser sessions
- **FR-003**: System MUST allow users to reset password via email link that expires in 1 hour
- **FR-004**: System MUST support three user roles: Admin, Leader, and Volunteer with distinct permission sets
- **FR-005**: Admins MUST be able to invite new members via email invitation with signup link
- **FR-006**: Users MUST be able to update their profile (name, phone, avatar)
- **FR-007**: System MUST enforce role-based access control on all protected resources
- **FR-063**: Initial Admin account MUST be pre-seeded during deployment via database migration or seed script

**Rota Management**
- **FR-008**: System MUST display rotas in calendar view with month and week options
- **FR-009**: Leaders MUST be able to create new rotas by selecting a service date and assigning members to positions
- **FR-010**: System MUST support five service positions: Projection, Streaming, Sound, Cameras, Time Management
- **FR-011**: Each position MUST have configurable min/max volunteer requirements
- **FR-012**: Leaders MUST be able to assign members via drag-drop or dropdown selection
- **FR-013**: Volunteers MUST be able to submit availability via calendar-based picker
- **FR-014**: System MUST support duty swap request workflow: Request → Accept/Decline → Approve → Notify
- **FR-015**: System MUST send automated reminders via email (required) and SMS (optional)
- **FR-064**: System MUST log notification delivery failures and display them in the admin dashboard
- **FR-065**: Admins MUST be able to manually retry failed notifications from the dashboard
- **FR-016**: Users MUST be able to configure notification timing (1 week, 3 days, 1 day, morning of service)
- **FR-017**: Rotas MUST have draft/published status; drafts not visible to Volunteers
- **FR-018**: System MUST maintain assignment history for reference

**Livestream Description Generator**
- **FR-019**: System MUST provide input form for service details: date, type, title, speaker, scripture, key points, special notes
- **FR-020**: System MUST generate descriptions via AI with streaming response visible to user
- **FR-021**: Generated content MUST be editable inline before saving
- **FR-022**: System MUST provide one-click copy to clipboard functionality
- **FR-023**: System MUST save generated descriptions to history
- **FR-024**: Admins MUST be able to update the AI prompt template
- **FR-025**: System MUST support platform-specific formatting (YouTube vs Facebook)

**Equipment Inventory**
- **FR-026**: System MUST maintain equipment catalog with details (name, category, serial number, status, location)
- **FR-027**: System MUST support equipment categories: Cameras, Audio, Computers, Streaming, Cables & Adapters, Lighting, Miscellaneous
- **FR-028**: System MUST generate printable QR code labels for equipment
- **FR-029**: System MUST support mobile QR scanning to view/checkout equipment
- **FR-030**: System MUST track checkout/return with expected return dates
- **FR-031**: System MUST support issue reporting with severity levels
- **FR-032**: System MUST maintain equipment checkout and maintenance history
- **FR-033**: Equipment MUST have status: Available, In Use, Maintenance, or Returned (for borrowed items returned to owner)

**Service Rundown Builder**
- **FR-034**: Leaders MUST be able to create rundowns for specific service dates
- **FR-035**: System MUST support drag-drop reordering of rundown items
- **FR-036**: System MUST support item types: Song (worship), Sermon, Announcement, Video, Prayer, Transition, Offering, Scripture Reading, Special Item, Other
- **FR-037**: System MUST track per-item duration and running total
- **FR-038**: Leaders MUST be able to assign personnel to rundown items
- **FR-039**: System MUST support notes and technical cues per item
- **FR-040**: System MUST support saving and reusing rundown templates
- **FR-041**: System MUST provide a live view mode for service execution
- **FR-042**: System MUST include a searchable song library

**Social Media Hub**
- **FR-043**: System MUST integrate with Google Drive via OAuth for photo access
- **FR-044**: System MUST display photos in grid view with preview capability
- **FR-045**: System MUST generate AI-assisted captions based on service context
- **FR-046**: System MUST preview posts for Facebook, Instagram, and YouTube with character limits
- **FR-047**: System MUST support scheduling posts for future publishing

**Training & Onboarding**
- **FR-048**: System MUST provide training tracks organized by department/role
- **FR-049**: System MUST support step types: Video, Document, Quiz, Shadowing, Practical
- **FR-050**: System MUST display visual progress indicators
- **FR-051**: System MUST support mentor assignment for new volunteers
- **FR-052**: Practical steps MUST require mentor sign-off for completion
- **FR-053**: System MUST track certifications with expiry dates
- **FR-054**: System MUST provide centralized resource library for training materials

**Dashboard**
- **FR-055**: Volunteers MUST see their upcoming duties for next 4 weeks on dashboard
- **FR-056**: Dashboard MUST provide quick action buttons for common tasks
- **FR-057**: Leaders MUST see team overview, pending requests, and equipment alerts
- **FR-058**: Dashboard MUST display countdown to next service

**Non-Functional Requirements**
- **FR-059**: Application MUST load pages in under 2 seconds on 3G mobile connections (target: < 2s Time to First Contentful Paint)
- **FR-060**: Application MUST support installability as a Progressive Web App
- **FR-061**: Application MUST be accessible via keyboard navigation
- **FR-062**: Application MUST work offline for critical views (viewing schedule, rundowns)
- **FR-066**: Admins MUST be able to configure data retention period (default: 1 year); system auto-archives data older than configured period (soft delete with `archived_at` timestamp); Admins MAY trigger permanent deletion of archived data via explicit action

### Key Entities

- **Profile**: Represents a user account with name, email, phone, avatar, role (Admin/Leader/Volunteer), department assignment, and notification preferences
- **Department**: Organizational unit (Sound, Cameras, Projection, Streaming, Time Management) with a designated leader
- **Position**: A specific role within a service (e.g., Camera 1, Main Sound) with min/max volunteer requirements
- **Service**: A recurring event type (Sunday Service, Special Event) with day, time, and location
- **Rota**: A schedule for a specific service date containing position assignments, with draft/published status
- **Rota Assignment**: Links a volunteer to a position for a specific rota, with confirmation status
- **Availability**: A volunteer's availability status for a specific date with optional notes
- **Swap Request**: A request to exchange duty assignments between volunteers, with approval workflow
- **Livestream**: Generated content for a service including YouTube/Facebook descriptions and metadata
- **Equipment**: A physical item with name, category, serial number, status, QR code, and maintenance history
- **Equipment Checkout**: A record of equipment being borrowed, including who, when, and expected return
- **Rundown**: Service order document with title, date, items, and approval status
- **Rundown Item**: An element within a rundown with type, duration, assignment, and technical notes
- **Song**: Worship song with title, artist, key, tempo, lyrics, and chord chart
- **Training Track**: A learning path for a specific role with ordered steps and estimated duration
- **Training Step**: An individual learning unit within a track with type, content, and completion requirements
- **Volunteer Progress**: A volunteer's enrollment and completion status within a training track
- **Notification**: System-generated messages sent via email or SMS for reminders and updates

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Leaders can create a complete rota in under 5 minutes (down from 30 minutes baseline)
- **SC-002**: Zero missed duty incidents per month (down from 2/month baseline) due to automated reminders and visibility
- **SC-003**: Livestream description generation takes under 2 minutes including review (down from 15 minutes baseline)
- **SC-004**: 80% of new volunteers complete their training track within 30 days of joining
- **SC-005**: User satisfaction rating of 4.5/5 or higher in quarterly surveys
- **SC-006**: Application pages load within 2 seconds on standard mobile connections
- **SC-007**: 95% of assigned volunteers confirm their duty before service day
- **SC-008**: Equipment checkout/return cycle takes under 30 seconds via QR scanning
- **SC-009**: System supports 50 concurrent users without performance degradation
- **SC-010**: 90% of swap requests are resolved without Leader intervention (volunteer-to-volunteer acceptance)

## Clarifications

### Session 2025-12-21

- Q: How should the initial Admin account be created when the application first launches? → A: Pre-seeded Admin account created during deployment (credentials shared securely)
- Q: What should happen when email or SMS notifications fail to deliver? → A: Log failures, display in admin dashboard, allow manual retry
- Q: How long should the system retain historical data (past rotas, equipment logs, descriptions)? → A: Configurable by Admin (default: 1 year)

## Assumptions

- The initial Admin account is pre-seeded during deployment; credentials are shared securely with the Tech Lead
- Users have access to modern web browsers (Chrome, Safari, Firefox, Edge) on desktop or mobile devices
- The church has existing Google Workspace with Drive for storing service photos
- Volunteers have personal email addresses and optionally mobile phones for SMS
- The tech department has approximately 20-50 active volunteers across all roles
- Services occur primarily on Sundays with occasional special events
- Leaders have consistent internet access for administrative tasks
- The existing WhatsApp coordination will be phased out as adoption increases
- Equipment is stored centrally and can be physically labeled with QR codes
