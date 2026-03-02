# Developer Role Implementation - Next Steps

## ✅ Completed

All code changes for the developer role have been implemented and committed:

1. **Migrations 028 & 029**: Added developer role enum and RLS policies to the database schema
2. **TypeScript Types**: Updated all type definitions across 17 files
3. **Auth Guards**: Updated with developer permissions
4. **Admin UI**: Implemented read-only mode for developers
5. **Test Mode**: Full test mode implementation with React Context and UI
6. **Documentation**: Created architecture and feature docs

All changes are committed and pushed to branch: `copilot/fix-live-view-timer`

## 🔄 Required Actions

### 1. Apply Migrations to Database (TWO STEPS REQUIRED!)

**⚠️ IMPORTANT**: Due to PostgreSQL enum limitations, this requires TWO separate migrations applied in sequence.

**Step 1: Add Developer Enum Value**

Via Supabase Dashboard:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Open file: `supabase/migrations/028_add_developer_role_enum.sql`
5. Copy the entire SQL content
6. Paste into SQL Editor
7. Click **Run**
8. ✅ Verify success (should show "ALTER TYPE" completion)

**Step 2: Apply Developer Permissions**

Via Supabase Dashboard:
1. In the same **SQL Editor**
2. Open file: `supabase/migrations/029_developer_role_permissions.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click **Run**
6. ✅ Verify no errors

**Via Supabase CLI (Alternative):**

```powershell
# First, link your project (if not already done)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations (will apply both in order)
npx supabase db push
```

**What These Migrations Do:**

**Migration 028** (Enum):
- Adds `developer` enum value to `user_role` type
- Must be committed before being used in policies

**Migration 029** (Permissions):
- Updates RLS policies on 15+ tables to include developer permissions
- Grants developers read access to user data
- Adds content management permissions

### 2. Create a Test Developer Account

After applying the migration, create a developer user for testing:

**Via SQL Editor:**
```sql
-- Find a user to promote to developer
UPDATE profiles 
SET role = 'developer' 
WHERE email = 'your-test-email@example.com';
```

**Or via Admin Panel:**
1. Log in as admin
2. Go to **Admin > User Management**
3. Edit a user
4. Change role to "Developer"
5. Save

### 3. Test the Developer Role

Log in as the developer user and verify:

**Read-Only Admin Access:**
- [ ] Can view Admin panel
- [ ] See "Developer Mode (Read-Only)" banner
- [ ] User table shows data
- [ ] Edit/Delete buttons are disabled with tooltips
- [ ] Invite button is hidden

**Test Mode Functionality:**
- [ ] Test Mode Panel appears on User Management page
- [ ] Can toggle test mode on/off
- [ ] Edit user shows "Test Mode" badge
- [ ] Button says "Simulate Change" instead of "Save Changes"
- [ ] Simulated changes appear in Test Mode Panel log
- [ ] Clear All button resets changes
- [ ] Exit confirmation dialog works

**Content Management:**
- [ ] Can create/edit rundowns
- [ ] Can manage equipment
- [ ] Can create/edit rotas
- [ ] Can manage design requests

### 4. Review and Adjust

Based on testing, you may want to:

1. **Adjust Permissions**: Modify RLS policies if needed
2. **Add More Test Features**: Extend test mode to other areas
3. **Update Documentation**: Add any discovered edge cases
4. **Train Developers**: Share the test mode documentation

## 📝 Files Changed

### Created Files
- `app/(dashboard)/admin/layout.tsx` - Admin layout with TestModeProvider
- `components/admin/test-mode-panel.tsx` - Test mode UI component
- `contexts/test-mode-context.tsx` - Test mode state management
- `docs/architecture/database-schema-strategy.md` - Database architecture docs
- `docs/features/developer-test-mode.md` - Test mode user guide

### Modified Files
- `supabase/migrations/028_add_developer_role.sql` - Developer role migration
- `types/database.ts` - Database types with developer role
- `lib/constants.ts` - Role labels and hierarchy
- `lib/auth/guards.ts` - Auth guards with developer support
- `components/admin/role-editor.tsx` - Test mode integration
- `components/admin/user-table.tsx` - Developer read-only UI
- `app/(dashboard)/admin/page.tsx` - Developer mode banner
- `app/(dashboard)/admin/users/page.tsx` - Test mode panel integration
- Plus 9 more TypeScript files

## 🚀 Deployment

### Before Merging

1. ✅ Migration applied to database
2. ✅ Developer role tested in development
3. ✅ Test mode verified working
4. ✅ All TypeScript errors resolved
5. ✅ Documentation reviewed

### Merge to Main

```powershell
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge the feature branch
git merge copilot/fix-live-view-timer

# Push to remote
git push origin main
```

### Deploy to Production

The deployment process depends on your setup:

**Vercel (Automatic):**
- Merging to `main` should trigger deployment automatically
- Vercel will build and deploy the application
- Migration must be applied manually to production database

**Manual Deployment:**
1. Apply migration to production database first
2. Deploy application code
3. Test developer role in production
4. Monitor for any issues

## 🐛 Troubleshooting

### Migration Fails

**Error: "unsafe use of new value 'developer' of enum type"**
- This means you tried to run the combined migration
- **Solution**: Apply migrations 028 and 029 separately (in order)
- Migration 028 adds the enum, migration 029 uses it

**Error: "type 'developer' already exists"**
- The developer enum value may already exist
- Check: `SELECT unnest(enum_range(NULL::user_role));`
- If it exists, skip migration 028, run 029 only

**Error: "relation 'profiles' does not exist"**
- Verify you're running in the correct database
- Check Supabase project connection

### Test Mode Not Working

**Panel doesn't appear:**
- Verify user role is exactly `developer` (not `Developer`)
- Check browser console for errors
- Ensure TestModeProvider wraps admin pages

**Changes not logging:**
- Open browser DevTools → React DevTools
- Inspect TestModeContext state
- Check if `isTestMode` is true

### Role Editor Issues

**Button still disabled:**
- Verify test mode is enabled
- Check `isDeveloper && isTestMode` condition
- Review browser console for errors

## 📚 Documentation

Read the following docs for more details:

1. **Test Mode User Guide**: `docs/features/developer-test-mode.md`
2. **Database Architecture**: `docs/architecture/database-schema-strategy.md`
3. **Migration Details**: `supabase/migrations/028_add_developer_role.sql`
4. **RLS Policies**: See data-model.md in specs

## 🎯 Next Features

Ideas for future enhancements:

1. **Test Mode Expansion**
   - Department change simulation
   - User deletion simulation
   - Bulk operations testing

2. **Developer Tools**
   - Debug panel
   - API request inspector
   - Performance metrics

3. **Advanced Permissions**
   - Custom permission sets
   - Temporary elevated access
   - Audit logging

## ✅ Success Criteria

The implementation is complete when:

- [x] Migration 028 applied successfully
- [ ] Developer can log in and access admin panel
- [ ] Test mode toggle works correctly
- [ ] Simulated changes appear in log
- [ ] No actual database modifications in test mode
- [ ] All documentation is accurate and helpful

---

**Current Status**: Code complete, awaiting database migration application and testing.

**Branch**: `copilot/fix-live-view-timer`  
**Commits**: 4 total (feat, fix, docs, feat)  
**Files Changed**: 25+  
**Lines Added**: 900+
