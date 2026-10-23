# Fusion interface contract

## Purpose

Fusion is a calm production desk for church teams. It should make preparing a service, coordinating people, and sending content to presentation surfaces feel dependable under time pressure.

**Primary task:** help a team member understand what needs attention and move content from preparation to a live output without ambiguity.

**Signature idea:** every important workflow distinguishes preparation, preview, and live output. Motion explains that handoff rather than decorating the screen.

**Exclusions:** novelty animation, hidden critical controls, ambiguous icon-only actions, fake activity, and dense card grids without a clear next action.

## Visual system

- Canvas: near-black ink for the public product story; existing light/dark application canvas inside the authenticated product.
- Accent: Fusion violet (`violet-500`/`violet-600`) for selection and primary action; cyan only for confirmed live/output state; amber for attention; red for destructive/error states.
- Type: Geist. Display text is tight and confident; operational text stays compact and highly legible.
- Geometry: 10-16px radii. Use fewer, larger surfaces. Avoid nested cards when spacing and rules can express hierarchy.
- Spacing: 4px base rhythm; common gaps 8, 12, 16, 24 and 32px.
- Elevation: borders and tonal separation first; shadows reserved for menus, active previews and mobile drawers.
- Motion: 160-240ms for controls; 400-700ms for product-story transitions. Transform and opacity only where practical. Motion must be interruptible.

## Navigation and controls

- Sidebar groups reflect user intent: Overview, Plan & coordinate, Present & broadcast, and Administration.
- Expanded navigation shows icon and label. Collapsed navigation remains a compact icon rail with tooltips and a clear active marker.
- The active item uses a stable filled surface and left indicator; hover never moves navigation horizontally.
- Primary actions remain visible. Three-dot menus contain secondary or infrequent actions only.
- Mobile uses the existing accessible drawer trigger and preserves route labels.

## Dashboard

- Reading order: greeting and next action; upcoming personal assignment; team attention items; supporting totals.
- Counts are supporting context, not the main purpose of the page.
- Empty states explain what the user can do next without inventing data.

## Meeting communication

- Creating or updating a meeting records the meeting first, then attempts prompt email delivery.
- The interface reports whether invitations were sent, queued for retry, or could not be queued.
- “Invite everyone” is explicit and reversible before submit. Individual attendees remain editable.
- Email delivery retains an auditable notification record and retry path.

## Landing page

- Hero message: prepare once, present with confidence.
- The main visual is an honest interactive demonstration of Bible selection moving into preview and then OBS output, followed by a worship-lyrics state.
- The demonstration is labeled and never implies a live connection.
- Mobile preserves the workflow rather than hiding the visual.
- Reduced motion removes continuous travel and autoplay; state changes remain available through direct controls.

## Accessibility and states

- Visible focus, semantic buttons and links, logical keyboard order, and labelled controls.
- Text contrast targets WCAG AA on the rendered surface.
- Every async action has pending, success and failure feedback.
- Reduced motion, long labels, 390px layouts, and keyboard-only navigation are required verification states.
