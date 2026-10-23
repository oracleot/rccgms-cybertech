# Intentional Fusion experience

## Decision

Use an operational design direction: calm, high-contrast surfaces, a clear preparation-to-output model, and a restrained violet/cyan state language. This direction serves volunteers working under time pressure better than either an editorial marketing treatment or a spatial/glass-heavy control room.

## Scope

1. Replace the decorative landing hero with a responsive product demonstration of a supported Bible/OBS and worship-lyrics workflow.
2. Reorganize the shared sidebar around user tasks while retaining all existing routes, permissions and feature entitlements.
3. Make the dashboard action-led using existing live data only.
4. Send meeting email notifications promptly while keeping queued retry/audit records, expose honest delivery feedback, and add an explicit invite-everyone control.
5. Exclude WhatsApp and database migrations.

## Data and behavior

The landing demonstration uses clearly marked sample content and local UI state. It does not call production services. Auth hash handling remains intact.

Meeting creation and attendee persistence remain authoritative. Notification dispatch creates one auditable record per recipient, attempts delivery through the configured email provider, and leaves failures eligible for retry without creating a duplicate record. The server action returns a small delivery summary so the form can distinguish sent invitations from queued invitations.

The dashboard continues to query Supabase server-side. New hierarchy may combine current assignments, upcoming services and pending swaps, but it must not display fabricated activity.

## Verification

- Production build and focused lint/type checks.
- Existing meeting and notification tests plus focused delivery-state tests where contracts can be isolated meaningfully.
- Rendered landing page at 390, 768 and 1440px, including reduced-motion mode.
- Rendered authenticated shell where local credentials/data permit; otherwise static and build evidence are reported separately.
- Keyboard and focus review for the demonstration controls, attendee bulk selection, and sidebar navigation.
