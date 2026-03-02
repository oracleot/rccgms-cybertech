# Feature Specification: Invite-Only Magic Link Authentication

**Feature Branch**: `003-invite-only-magic-link`  
**Created**: 2024-12-31  
**Status**: Planning  
**Input**: User description: "Remove user signup, make registration invite-only with Supabase magic link authentication"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Invites New Team Member (Priority: P1)

An admin needs to add a new member, leader, or admin to the Cyber Tech platform. Since self-registration is disabled, the admin sends an invitation through the admin panel. The invited user receives an email with a magic link that logs them directly into the platform.

**Why this priority**: This is the only way new users can join the platform since self-registration is removed. Without this flow, no new users can be added.

**Independent Test**: Admin can invite a new user via the existing invite modal, user receives magic link email, clicks it, and is logged into the dashboard.

**Acceptance Scenarios**:

1. **Given** an admin is logged in and on the user management page, **When** they click "Invite User" and enter a valid email address with role selection, **Then** an invitation with a magic link is sent to that email address
2. **Given** an invitation email is sent, **When** the recipient clicks the magic link, **Then** they are authenticated and redirected to the dashboard
3. **Given** a magic link has been clicked and used, **When** someone attempts to use the same link again, **Then** the system shows the message "This link has already been used or has expired. Please request a new one."

---

### User Story 2 - Existing User Logs In via Magic Link (Priority: P1)

An existing user wants to log into the platform. Instead of entering a password, they enter their email address and receive a magic link. Clicking the link authenticates them and takes them to the dashboard.

**Why this priority**: This is the primary login mechanism replacing password-based authentication. All existing users need this to access the platform.

**Independent Test**: User enters email on login page, receives magic link, clicks it, and is logged into the dashboard.

**Acceptance Scenarios**:

1. **Given** an existing user is on the login page, **When** they enter their registered email and request a magic link, **Then** a magic link is sent to their email
2. **Given** the user has received the magic link email, **When** they click the link, **Then** they are authenticated and redirected to their intended destination (dashboard or original requested page)
3. **Given** a user enters an email that is not registered, **When** they request a magic link, **Then** the system shows a generic message (to prevent email enumeration) but does not send any email

---

### User Story 3 - Remove Self-Registration Access (Priority: P1)

Users should no longer be able to self-register on the platform. The registration page and all links to it should be removed to prevent confusion.

**Why this priority**: Core requirement to enforce invite-only access. Must be done alongside the other changes to ensure security.

**Independent Test**: Attempting to access the registration page directly via URL redirects to the login page.

**Acceptance Scenarios**:

1. **Given** a user attempts to access the /register URL directly, **When** the page loads, **Then** they are redirected to the login page
2. **Given** a user is on the login page, **When** they view the page, **Then** there is no "Sign up" or "Create account" link visible
3. **Given** the system codebase, **When** reviewed, **Then** the registration functionality is fully removed or disabled

---

### User Story 4 - Invited User First-Time Setup (Priority: P2)

When a newly invited user clicks their magic link for the first time, they need to complete their profile setup (name if not provided during invite) before accessing the dashboard.

**Why this priority**: Ensures user profiles are complete for proper system functionality (rota assignments, notifications, etc.). Not critical for core authentication but important for user experience.

**Independent Test**: New invited user clicks magic link, is prompted to enter their name if not pre-filled, then accesses dashboard.

**Acceptance Scenarios**:

1. **Given** a newly invited user clicks their magic link, **When** their profile is incomplete (missing name), **Then** they are directed to complete their profile before accessing the dashboard
2. **Given** an invited user was invited with a pre-filled name, **When** they click the magic link, **Then** they can proceed directly to the dashboard
3. **Given** a user is on the profile completion page, **When** they submit their name, **Then** their profile is updated and they are redirected to the dashboard

---

### Edge Cases

- What happens when a user requests multiple magic links in succession? (Latest link should work, consider rate limiting)
- How does the system handle expired magic links? (Show clear message indicating the link has expired after 1 hour, allow requesting new link)
- What happens if an admin tries to invite an email that already has an account? (Show error message: "This email is already registered. The user can log in via magic link.")
- How does the system handle users who were previously registered with passwords? (They can log in via magic link using their existing email)
- What happens if the magic link email goes to spam or is delayed? (User can request a new link after a short waiting period)

## Clarifications

### Session 2024-12-31

- Q: What should be the magic link expiration duration? → A: 1 hour (balanced security and usability - industry standard)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST disable self-registration - the /register route should redirect to /login
- **FR-002**: System MUST remove all UI links and references to the registration page (from login page, etc.)
- **FR-003**: System MUST send magic link emails for user login instead of accepting password credentials
- **FR-004**: System MUST continue supporting the existing admin invite flow, but invitations should use magic links instead of password setup
- **FR-005**: System MUST validate that magic links can only be used once
- **FR-006**: System MUST redirect users to their originally requested page after magic link authentication (or dashboard if no specific page requested)
- **FR-007**: System MUST show a generic message when an unregistered email requests a magic link (to prevent email enumeration)
- **FR-008**: System MUST prompt first-time invited users to complete their profile if name is missing
- **FR-009**: System MUST maintain existing user roles and permissions after authentication method change
- **FR-010**: System MUST support rate limiting on magic link requests to prevent abuse (use Supabase default: 4 emails per hour per email address)
- **FR-011**: Magic links MUST expire after 1 hour to balance security with usability

### Key Entities

- **User Profile**: Existing entity, no changes to structure. May have incomplete name for invited users until profile completion.
- **Magic Link Token**: Managed by Supabase Auth, temporary token embedded in magic link URL for passwordless authentication.
- **Invitation**: Existing entity linking to user creation, now sends magic link instead of password setup link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully log in via magic link within 2 minutes of requesting it (assuming email delivery)
- **SC-002**: 100% of attempts to access /register result in redirect to /login
- **SC-003**: New invited users can complete their first login and access the dashboard within 3 minutes of receiving their invitation email
- **SC-004**: Zero password-related support requests after migration (forgot password, password reset, etc.)
- **SC-005**: Existing users can transition to magic link login without any account issues or data loss
- **SC-006**: Admin invite workflow continues to function with success rate matching or exceeding current rates
