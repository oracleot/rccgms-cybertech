# Quickstart: Invite-Only Magic Link Authentication

**Feature**: 003-invite-only-magic-link  
**Created**: 2024-12-31

## Overview

This feature replaces password-based authentication with Supabase magic links and disables self-registration. Users can only join via admin invitation.

## Prerequisites

- Node.js 18+
- pnpm installed
- Supabase project configured
- Environment variables set in `.env.local`

## Setup

1. **Ensure Supabase is configured**:
   - Magic link emails are enabled by default in Supabase
   - No additional Supabase configuration required

2. **Install dependencies** (if not already):
   ```bash
   pnpm install
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

## Testing the Feature

### Test 1: Magic Link Login (Existing User)

1. Navigate to `http://localhost:3000/login`
2. Enter an existing user's email
3. Click "Send magic link"
4. Check email for magic link (use Supabase dashboard → Authentication → Users to see sent emails in development)
5. Click the magic link
6. Verify redirect to dashboard

### Test 2: Registration Disabled

1. Navigate to `http://localhost:3000/register`
2. Verify redirect to `/login`
3. Verify no "Sign up" link on login page

### Test 3: Admin Invite Flow

1. Login as admin
2. Navigate to Admin → Users
3. Click "Invite User"
4. Enter a new email address
5. Select role and department
6. Submit invitation
7. Check the invited email for magic link
8. Click magic link as invited user
9. Complete profile setup if prompted
10. Verify access to dashboard

### Test 4: Unregistered Email

1. Navigate to `http://localhost:3000/login`
2. Enter an email that is NOT registered
3. Click "Send magic link"
4. Verify same success message appears (no email enumeration)
5. Verify no email is sent (check Supabase logs)

## Key Files Changed

| File | Change |
|------|--------|
| `app/(auth)/login/page.tsx` | Email-only form, magic link flow |
| `app/(auth)/login/actions.ts` | `signInWithOtp` instead of password |
| `app/(auth)/register/page.tsx` | Redirect to login |
| `app/(auth)/accept-invite/page.tsx` | Profile completion only |
| `app/api/auth/magic-link/route.ts` | New magic link request endpoint |
| `app/api/auth/complete-profile/route.ts` | New profile completion endpoint |
| `app/auth/callback/route.ts` | Updated redirect logic |
| `middleware.ts` | Register redirect to login |
| `lib/validations/auth.ts` | New magic link schemas |

## Environment Variables

No new environment variables required. Uses existing:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Rollback

To rollback this feature:

1. Restore password fields to login page
2. Re-enable register page
3. Restore password login action
4. No database changes to revert

## Troubleshooting

### Magic link not received

- Check Supabase dashboard → Authentication → Logs
- Verify email provider is configured
- Check spam folder
- Wait for rate limit cooldown (15 minutes)

### "Invalid or expired link" error

- Magic links expire after 1 hour
- Links can only be used once
- Request a new magic link

### Redirect loop after login

- Clear browser cookies
- Check `/auth/callback` route is correctly handling the token
- Verify middleware is not blocking authenticated users
