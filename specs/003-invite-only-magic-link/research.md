# Research: Invite-Only Magic Link Authentication

**Created**: 2024-12-31  
**Feature**: [spec.md](spec.md)

## Supabase Magic Link Authentication

### Decision: Use `signInWithOtp` with `shouldCreateUser: false`

**Rationale**: Supabase's `signInWithOtp` method is the standard way to implement magic link authentication. Setting `shouldCreateUser: false` prevents unauthorized users from creating accounts by entering any email address - they must be pre-invited by an admin.

**Alternatives considered**:
- Custom magic link implementation → Rejected: Reinventing the wheel, Supabase handles token generation, expiration, and security
- Email OTP (6-digit code) instead of magic link → Rejected: Worse UX, requires users to manually enter code

### Implementation Pattern

```typescript
// Login page - request magic link
const { data, error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    shouldCreateUser: false, // Prevents self-registration
    emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
  },
})
```

### Magic Link Expiration

Supabase magic links expire after 1 hour by default, which matches our specification requirement (FR-011). This is configurable in Supabase dashboard under Authentication → Email Templates if needed.

### Rate Limiting

Supabase has built-in rate limiting:
- Default: 4 emails per hour per email address
- This aligns with FR-010 (3 requests per 15 minutes is more restrictive, but Supabase's default is acceptable)

## Admin Invite Flow Changes

### Decision: Continue using `inviteUserByEmail` for invitations

**Rationale**: The existing `inviteUserByEmail` API already creates users with magic links. No changes needed to the invitation mechanism itself - only the accept-invite flow needs simplification.

**Current flow**:
1. Admin calls `inviteUserByEmail(email, { data: { role, department_id } })`
2. User receives email with magic link
3. User clicks link → redirected to `/accept-invite` to set password
4. User sets password and is logged in

**New flow**:
1. Admin calls `inviteUserByEmail(email, { data: { role, department_id } })`
2. User receives email with magic link
3. User clicks link → authenticated directly via `/auth/callback`
4. If profile incomplete (no name), redirect to profile completion
5. Otherwise, proceed to dashboard

### Invite Email Template

The invitation email template in Supabase should be updated to reflect the new passwordless flow. The default "Set your password" language should change to "Access your account" or similar.

## Login Page Redesign

### Decision: Replace email/password form with email-only form

**Rationale**: Password field is no longer needed. Simpler UI with just email input and "Send magic link" button.

**Changes needed**:
- Remove password field
- Remove "Forgot password?" link
- Remove "Sign up" link (FR-002)
- Add success state showing "Check your email" message
- Update validation schema to email-only

### Removing Registration

**Files to modify/remove**:
- `app/(auth)/register/` - Delete or convert to redirect
- `app/(auth)/register/actions.ts` - Delete
- `lib/validations/auth.ts` - Keep `registerSchema` for reference but remove from exports/usage
- `ROUTES.REGISTER` - Keep constant but route should redirect to login
- Links in login page footer - Remove "Sign up" link

## Auth Callback Handling

### Decision: Update `/auth/callback` to handle magic links correctly

**Current behavior**: Redirects invite/magiclink to `/accept-invite` for password setup

**New behavior**:
- For `type=magiclink` (login): Redirect to `next` param or dashboard
- For `type=invite` (new user): Check profile completeness, redirect to profile setup if needed
- For `type=recovery`: Keep existing redirect to reset-password (for future password-based fallback if needed)

## Profile Completion Flow

### Decision: Add profile completion check in middleware or dashboard layout

**Rationale**: New invited users may not have a name set. We need to ensure profiles are complete before allowing full access.

**Implementation options**:
1. Middleware check → Rejected: Too aggressive, would block API routes
2. Dashboard layout check → Selected: Check on dashboard entry, redirect to settings if incomplete
3. Accept-invite page repurpose → Selected: Repurpose for profile completion only (no password)

**Recommended approach**: 
- Modify `/accept-invite` page to only handle profile completion (name field)
- Update `/auth/callback` to check if profile is complete for invite type
- If profile incomplete, redirect to `/accept-invite` with profile completion form

## Password-Related Cleanup

### Files that can be simplified/removed:

| File | Action |
|------|--------|
| `app/(auth)/forgot-password/` | Keep for future use, but hide from UI |
| `app/(auth)/reset-password/` | Keep for edge cases, but hide from UI |
| `resetPasswordSchema` | Keep but don't use in main flows |
| `forgotPasswordSchema` | Keep but don't use in main flows |
| Login password field | Remove |
| Register page | Redirect to login |

### Files to update:

| File | Changes |
|------|---------|
| `app/(auth)/login/page.tsx` | Remove password field, add magic link flow |
| `app/(auth)/login/actions.ts` | Replace password login with magic link request |
| `app/(auth)/accept-invite/page.tsx` | Remove password setup, add profile completion |
| `app/auth/callback/route.ts` | Update redirect logic for magic links |
| `middleware.ts` | Add `/register` redirect to login |
| `lib/validations/auth.ts` | Add magic link email schema |
| `lib/constants.ts` | Keep ROUTES.REGISTER but it will redirect |

## Security Considerations

### Email Enumeration Prevention

When a user requests a magic link for an unregistered email, we show the same success message as for registered emails. This prevents attackers from determining which emails are registered.

```typescript
// Always show success message regardless of email existence
return { success: true, message: "If an account exists, a magic link has been sent." }
```

### Session Handling

Supabase handles session creation securely via the magic link token exchange. No changes needed to session management - the `exchangeCodeForSession` call in `/auth/callback` already handles this correctly.

### One-Time Use

Supabase magic link tokens are automatically invalidated after first use. No additional implementation needed for FR-005.
