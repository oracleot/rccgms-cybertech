# Quick Migration Guide - Developer Role

## UPDATED: Simplified Two-Step Process

I've created a single reference file with clear instructions: `docs/APPLY_THIS_developer_role_complete.sql`

### 🎯 Easiest Method: Use the Combined File

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Open `docs/APPLY_THIS_developer_role_complete.sql` in your code editor
3. **STEP 1**: Copy lines from "PART 1" section (lines ~15-35)
4. Paste into SQL Editor and click **Run**
5. ✅ Verify success (should see "Added developer to user_role enum")
6. **STEP 2**: Copy lines from "PART 2" section (lines ~48 to end)
7. Paste into SQL Editor and click **Run**
8. ✅ Verify success (should see multiple "DROP POLICY" and "CREATE POLICY" messages)

---

## Why Two Steps?

PostgreSQL requires new enum values to be committed before they can be used. If you try to run both parts together, you'll get:

```
ERROR: 55P04: unsafe use of new value "developer" of enum type user_role
```

By running them separately, the enum gets committed after Part 1, then Part 2 can use it.

---

## Step-by-Step Application

### Option A: Via Supabase Dashboard (Recommended)

#### Step 1: Add Developer to Enum

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project → **SQL Editor**
3. Copy SQL from: `supabase/migrations/028_add_developer_role_enum.sql`
4. Paste in SQL Editor
5. Click **Run**
6. ✅ Should see: "ALTER TYPE" success message

```sql
-- This is what you're running (Step 1):
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';
COMMENT ON TYPE user_role IS '...';
```

#### Step 2: Apply Developer Permissions

1. In same SQL Editor
2. Copy SQL from: `supabase/migrations/029_developer_role_permissions.sql`
3. Paste in SQL Editor
4. Click **Run**
5. ✅ Should see: Multiple "DROP POLICY" and "CREATE POLICY" success messages

---

### Option B: Via Supabase CLI

```powershell
# If not already linked:
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply both migrations in order:
npx supabase db push
```

The CLI will automatically apply migrations 028 and 029 in the correct sequence.

---

## Verification

After applying both migrations, verify the developer role exists:

```sql
-- Check enum values
SELECT unnest(enum_range(NULL::user_role));
```

Expected output:
```
admin
developer
leader
member
```

---

## Next: Create Test Developer

After migrations are applied, promote a user to developer:

```sql
-- Via SQL:
UPDATE profiles 
SET role = 'developer' 
WHERE email = 'your-test-email@example.com';
```

Or use the Admin UI as an admin user.

---

## Files Changed

- **Renamed**: `028_add_developer_role.sql` → `028_add_developer_role.sql.old` (archived)
- **Created**: `028_add_developer_role_enum.sql` (Step 1)
- **Created**: `029_developer_role_permissions.sql` (Step 2)

---

## Common Issues

### "type 'developer' already exists"
- Skip migration 028
- Only run migration 029

### "policy already exists"
- The policies may have been partially applied
- Check which policies exist:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
```

### Still getting enum commit error
- Make sure you're running migrations **separately**
- Don't combine them into one transaction

---

## Success Criteria

After applying both migrations:

- ✅ Enum value `developer` exists
- ✅ All RLS policies updated with developer permissions
- ✅ No SQL errors in dashboard
- ✅ Can create/update user with developer role

---

## Support

If you encounter issues:
1. Check the [Next Steps Guide](docs/implementation/developer-role-next-steps.md)
2. Review [Test Mode Documentation](docs/features/developer-test-mode.md)
3. Verify you applied migrations in correct order
