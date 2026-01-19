# Feature Specification: Design Requests Tracking

**Feature Branch**: `018-design-requests-tracking`  
**Created**: 4 January 2026  
**Status**: Draft  
**Input**: User description: "Public-facing design request system for church. Anyone can submit design requests (banners, flyers, social graphics) without authentication. Team members can view, claim, and track design work. Includes revision workflow when requester needs changes. Completed designs link to Google Drive. Email notifications keep team and requesters informed of status changes."

## Problem Statement

The church tech department struggles with tracking design requests. Banners for important events are forgotten, announcements miss their design deadlines, and there's no visibility into who is working on what. This leads to:
- Missed designs for church events and announcements
- Duplicate work when multiple team members unknowingly start the same design
- No accountability or tracking of design request status
- Requesters have no idea if their design is being worked on

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit Design Request (Priority: P1)

A congregation member, ministry leader, or staff member needs a design created (banner, flyer, social graphic) for an upcoming church event or announcement. They visit a public page, fill out a form with their request details, and submit it without needing to log in or create an account.

**Why this priority**: This is the entry point for all design work. Without the ability to submit requests publicly, the entire system has no purpose. It must be friction-free to encourage adoption.

**Independent Test**: Can be fully tested by visiting the public request page, filling out the form with event details, submitting, and seeing a confirmation message. Delivers immediate value by capturing design needs in a structured way.

**Acceptance Scenarios**:

1. **Given** I am anyone with the request page URL, **When** I visit the design request page, **Then** I see a form without any login requirement
2. **Given** I am on the request form, **When** I fill in title, description, design type, my contact info, and submit, **Then** I see a success confirmation with my request details
3. **Given** I am filling the form, **When** I select a design type (flyer, banner, social graphic, video thumbnail, presentation, other), **Then** my selection is captured with the request
4. **Given** I am filling the form, **When** I optionally add a "needed by" date and reference URLs (inspiration images), **Then** this information is included with my request
5. **Given** I submit a request with invalid email, **When** the form validates, **Then** I see a clear error message asking for a valid email

---

### User Story 2 - View and Claim Design Requests (Priority: P1)

A tech team member logs into the dashboard and sees all submitted design requests. They can filter by status and priority, find an unclaimed request they want to work on, and claim it so other team members know it's being handled.

**Why this priority**: Without visibility into requests and the ability to claim them, team coordination is impossible. This prevents duplicate work and ensures accountability.

**Independent Test**: Can be tested by logging in as a team member, viewing the design requests list, filtering by status, and clicking "Claim" on an unclaimed request. The request should show as assigned to the team member.

**Acceptance Scenarios**:

1. **Given** I am a logged-in team member, **When** I navigate to the designs section, **Then** I see a list of all submitted design requests
2. **Given** I am viewing the requests list, **When** I use the status filter, **Then** I see only requests matching that status (submitted, in progress, review, revision requested, completed)
3. **Given** I am viewing an unclaimed request, **When** I click "Claim", **Then** the request is assigned to me and shows my name as the assignee
4. **Given** a request is already claimed by another team member, **When** I view it, **Then** I see who is working on it and the "Claim" button is not available
5. **Given** I have claimed a request, **When** another team member views it, **Then** they see it's assigned to me

---

### User Story 3 - Track Design Progress (Priority: P2)

A team member who has claimed a design request updates its status as they work through it. They move it from "submitted" to "in progress" to "review" and finally to "completed", keeping the workflow visible to the team.

**Why this priority**: Status tracking provides visibility and helps prioritize work. It's essential for team coordination but depends on the claim functionality being in place first.

**Independent Test**: Can be tested by claiming a request, updating its status through each stage, and verifying the status is reflected in the list view. Add internal notes along the way.

**Acceptance Scenarios**:

1. **Given** I have claimed a request, **When** I start working on it, **Then** I can update the status to "in progress"
2. **Given** I am working on a request, **When** I update the status, **Then** the change is immediately visible in the requests list
3. **Given** I am on a request detail page, **When** I add internal notes, **Then** other team members can see these notes
4. **Given** I view the requests list, **When** I look at priority badges, **Then** urgent requests are highlighted prominently (e.g., red for urgent, orange for high)

---

### User Story 4 - Complete Design with Deliverable (Priority: P2)

A team member finishes a design and needs to mark it complete. They must provide a Google Drive link to the finished design files before the system allows completion. This ensures every completed request has an accessible deliverable.

**Why this priority**: Completing with a deliverable link ensures the design work actually gets delivered. Without this, requests could be marked done without the requester receiving anything.

**Independent Test**: Can be tested by attempting to complete a request without a link (should fail), then providing a valid Google Drive URL and completing successfully.

**Acceptance Scenarios**:

1. **Given** I am on a request I've claimed, **When** I try to mark it complete without a deliverable URL, **Then** the system prevents completion and prompts for the link
2. **Given** I have a Google Drive link ready, **When** I enter it and click complete, **Then** the request status changes to "completed" and the link is stored
3. **Given** a request is completed, **When** anyone views it, **Then** they can see and access the Google Drive deliverable link
4. **Given** I complete a request, **When** the system sends the notification, **Then** the requester receives an email with the final design link

---

### User Story 5 - Request Revision (Priority: P3)

A team member marks a design as ready for review, but the requester (via email communication) indicates changes are needed. The team member updates the request to "revision requested" status with notes about what changes are needed, so the assigned designer knows to revisit the work.

**Why this priority**: Revisions are a common real-world scenario but represent a secondary workflow. The core submit→claim→complete flow works without revisions.

**Independent Test**: Can be tested by setting a request to "review" status, then changing it to "revision requested" with revision notes, and verifying the assigned team member can see the revision details.

**Acceptance Scenarios**:

1. **Given** a request is in "review" status, **When** revisions are needed, **Then** a team member can change status to "revision requested"
2. **Given** I am requesting revisions, **When** I enter revision notes explaining the changes, **Then** these notes are saved and visible on the request
3. **Given** I am the assigned team member, **When** a revision is requested, **Then** I receive a notification about the revision request
4. **Given** a request has had revisions, **When** I view its history, **Then** I can see the progression of status changes

---

### User Story 6 - Email Notifications (Priority: P3)

The system sends automated email notifications at key points: when a new request is submitted (to the team), when someone claims a request (to the requester), when a design is ready for review (to the requester with preview), and when completed (to the requester with the final link).

**Why this priority**: Notifications enhance the experience but the core tracking works without them. They can be added after the main workflow is functional.

**Independent Test**: Can be tested by triggering each notification scenario and verifying emails are sent to the correct recipients with appropriate content.

**Acceptance Scenarios**:

1. **Given** a new request is submitted, **When** the submission succeeds, **Then** all team members receive an email notification about the new request
2. **Given** a team member claims a request, **When** the claim is saved, **Then** the requester receives an email that their design is being worked on
3. **Given** a request is marked for review, **When** the status changes, **Then** the requester receives an email with the design preview/link for feedback
4. **Given** a request is completed, **When** the deliverable URL is saved, **Then** the requester receives an email with the final Google Drive link

---

### Edge Cases

- What happens when a team member tries to claim an already-claimed request? → The system prevents the claim and shows who currently owns it
- What happens if a claimed request's assignee becomes unavailable? → Any team member can reassign the request to themselves or another member (admin/leader only)
- What happens when an invalid Google Drive URL is provided? → The system validates it's a valid URL format before accepting
- How does the system handle duplicate requests for the same event? → Requests are shown with requester and date; team members manually identify and handle duplicates
- What happens when a request is cancelled? → Team members can change status to "cancelled" with a reason note
- What if someone submits a request with a past "needed by" date? → The system accepts it but displays a warning badge

## Requirements *(mandatory)*

### Functional Requirements

#### Public Request Submission
- **FR-001**: System MUST allow anyone to submit design requests without authentication
- **FR-002**: System MUST collect: title, description, design type, requester name, requester email
- **FR-003**: System MUST optionally collect: requester phone, requester ministry, needed-by date, up to 5 reference URLs
- **FR-004**: System MUST validate requester email format before accepting submission
- **FR-005**: System MUST show confirmation with submitted details after successful submission
- **FR-035**: System MUST rate limit submissions to maximum 3 requests per hour per IP address
- **FR-036**: System MUST include a honeypot field to detect and reject bot submissions

#### Design Types and Priority
- **FR-006**: System MUST support design types: flyer, banner, social graphic, video thumbnail, presentation, other
- **FR-007**: System MUST support priority levels: low, normal (default), high, urgent
- **FR-008**: System MUST display priority with visual distinction (color-coded badges)
- **FR-041**: System MUST allow requesters to suggest priority at submission
- **FR-042**: System MUST allow team members to adjust priority after submission

#### Request Status Workflow
- **FR-009**: System MUST support status progression: submitted → in_progress → review → completed
- **FR-010**: System MUST support status: revision_requested (branching from review back to in_progress)
- **FR-011**: System MUST support status: cancelled (can occur from any status except completed)
- **FR-012**: System MUST track timestamp when status changes occur

#### Team Dashboard
- **FR-013**: System MUST require authentication to view design requests list
- **FR-014**: System MUST display all requests with status, priority, requester, assignee, and needed-by date
- **FR-015**: System MUST allow filtering requests by status
- **FR-016**: System MUST allow searching requests by title or requester name
- **FR-017**: System MUST display requests in priority order (urgent first) within each status

#### Claiming and Assignment
- **FR-018**: System MUST allow any authenticated team member to claim an unclaimed request
- **FR-019**: System MUST prevent claiming a request that is already assigned
- **FR-020**: System MUST record who claimed the request and when
- **FR-021**: System MUST allow reassignment by admin or leader roles only
- **FR-040**: System MUST allow assignee to unclaim their own request at any time (returns to "submitted" status, available for others to claim)

#### Completion with Deliverable
- **FR-022**: System MUST require a deliverable URL (Google Drive link) before allowing completion
- **FR-023**: System MUST validate the deliverable URL is a valid URL format
- **FR-024**: System MUST store and display the deliverable URL on completed requests

#### Revisions
- **FR-025**: System MUST allow changing status to "revision_requested" from "review"
- **FR-026**: System MUST require revision notes when requesting revisions
- **FR-027**: System MUST preserve revision notes history as an append-only text field with timestamps (e.g., "[Jan 4, 2:30pm] Need logo bigger")

#### Internal Notes
- **FR-028**: System MUST allow team members to add internal notes to any request
- **FR-029**: System MUST NOT expose internal notes to requesters (internal only)

#### Email Notifications
- **FR-030**: System MUST email all team members when a new request is submitted
- **FR-031**: System MUST email the requester when their request is claimed
- **FR-032**: System MUST email the requester when design is ready for review
- **FR-033**: System MUST email the assigned team member when a revision is requested
- **FR-034**: System MUST email the requester when design is completed (include deliverable link)

#### Data Retention & Archiving
- **FR-037**: System MUST auto-archive completed requests after 12 months (hidden from default dashboard view)
- **FR-038**: System MUST allow searching/viewing archived requests via an "Include archived" filter
- **FR-039**: System MUST allow admin/leader roles to manually delete any request (with confirmation)

### Key Entities

- **Design Request**: Represents a single request for design work. Contains title, description, type, priority, status, requester information (name, email, phone, ministry), needed-by date, reference URLs for inspiration, deliverable URL for final output, revision notes (append-only timestamped log), internal team notes, and timestamps for creation and status changes.

- **Assignment**: Tracks which team member is working on a request. Links a design request to a team member profile, with timestamps for when claimed and by whom.

- **Status History**: Implicit tracking of status changes through timestamps. Records when each status transition occurred for audit and timeline display.

## Clarifications

### Session 2026-01-04

- Q: How should the public form be protected from spam/abuse? → A: Rate limit by IP (max 3 requests/hour) plus honeypot field
- Q: How should revision notes history be stored? → A: Append-only text field with timestamps
- Q: How long should design requests be retained? → A: Keep indefinitely, auto-archive after 12 months (hidden from default view), plus manual delete option
- Q: Can team members unclaim requests they've claimed? → A: Yes, assignee can unclaim at any time (returns to submitted status)
- Q: Who can set priority levels on requests? → A: Requester suggests priority at submission, team members can adjust afterward

## Assumptions

- Team members are already registered users in the system with profiles
- The existing notification infrastructure can be extended for new notification types
- Google Drive is the standard location for design deliverables (no need to support other platforms)
- Requesters do not need a portal to check status; email updates are sufficient
- Ministry is a free-text field; no predefined list is required
- All team members have equal ability to claim any request (no role-based restrictions on claiming)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Requesters can submit a design request in under 2 minutes without creating an account
- **SC-002**: Team members can view, filter, and claim requests within 30 seconds of logging in
- **SC-003**: 100% of completed requests have an associated deliverable URL (enforced by system)
- **SC-004**: Team members can see who is working on any request at a glance (no duplicate work)
- **SC-005**: Status updates are reflected in the dashboard immediately (within 2 seconds)
- **SC-006**: Requesters receive email notification within 5 minutes of key status changes
- **SC-007**: Reduce missed design deadlines by providing visibility into the "needed by" date queue
- **SC-008**: Zero duplicate design work due to visibility of who claimed each request
