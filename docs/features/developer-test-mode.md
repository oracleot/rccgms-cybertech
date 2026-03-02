# Developer Test Mode

## Overview

Test Mode is a feature that allows developers (users with the `developer` role) to safely experiment with user management operations without affecting production data. All changes made in test mode are simulated client-side and never sent to the database.

## Purpose

The developer role provides backend/technical access to the application with "read-only plus testing" capabilities:
- View all users and system data (read-only)
- Access admin panel features (read-only)
- Test user management workflows without production risk
- Manage content (rundowns, equipment, rotas, designs)
- View system logs and activity

## Features

### Test Mode Panel

Located on the **Admin > User Management** page, the Test Mode Panel provides:

1. **Toggle Switch**: Enable/disable test mode
2. **Status Indicator**: Shows when test mode is active with visual feedback
3. **Change Log**: Displays all simulated changes with:
   - Action type (Role Change, Department Change, User Deletion)
   - Affected user
   - Before/after values
   - Timestamp
4. **Clear Changes**: Button to reset all simulated changes
5. **Exit Confirmation**: Dialog when exiting test mode with pending changes

### Visual Indicators

- **Orange border**: Test mode panel has an orange border when active
- **Badge in dialogs**: "Test Mode" badge appears in role editor dialog
- **Button labels**: "Simulate Change" instead of "Save Changes"
- **Toast notifications**: "Change simulated" confirmations
- **Warning messages**: Clear indication that changes are not saved

### Role Editor Integration

When test mode is active:
- Role changes are simulated, not saved
- Developers can test the full workflow
- Visual feedback confirms simulation
- No API calls are made
- No database modifications occur

## Usage

### Enable Test Mode

1. Navigate to **Admin > User Management**
2. Find the Test Mode Panel at the top of the page
3. Toggle the switch to "ON"
4. Orange styling confirms test mode is active

### Simulate Changes

1. With test mode enabled, click "Edit" on any user
2. Change the role or departments as needed
3. Click "Simulate Change"
4. Toast notification confirms simulation
5. Change appears in Test Mode Panel log

### Review Simulated Changes

The Test Mode Panel shows:
```
Role Change: John Doe
member → leader
```

Or for department changes:
```
Department Change: Jane Smith
Tech Team → Media Team
```

### Clear Changes

Click **"Clear All"** in the Test Mode Panel to remove all simulated changes from the log.

### Exit Test Mode

1. Toggle the switch to "OFF"
2. If changes exist, a confirmation dialog appears
3. Choose:
   - **Stay in Test Mode**: Continue testing
   - **Exit & Discard Changes**: Leave test mode and clear all simulations

## Architecture

### Context Provider

**File**: `contexts/test-mode-context.tsx`

Manages test mode state using React Context:
- `isTestMode`: Boolean flag
- `testChanges`: Array of simulated changes
- `toggleTestMode()`: Enable/disable test mode
- `simulateRoleChange()`: Log a role change
- `simulateDepartmentChange()`: Log a department change
- `simulateUserDelete()`: Log a deletion
- `clearTestChanges()`: Reset all changes

### Components

1. **TestModePanel** (`components/admin/test-mode-panel.tsx`)
   - Displays test mode controls
   - Shows change log
   - Handles exit confirmation

2. **RoleEditorModal** (`components/admin/role-editor.tsx`)
   - Detects test mode
   - Routes to simulation instead of API
   - Shows test mode indicators

3. **Admin Layout** (`app/(dashboard)/admin/layout.tsx`)
   - Wraps admin pages with TestModeProvider
   - Makes context available to all admin components

## Permissions

### What Developers CAN Do

✅ View all users and their roles  
✅ View user departments and assignments  
✅ Access admin panel (read-only)  
✅ Simulate role changes in test mode  
✅ Manage content (rundowns, equipment, rotas, designs)  
✅ View system logs and activity  

### What Developers CANNOT Do

❌ Actually modify user roles (without test mode)  
❌ Delete users from production  
❌ Invite new users  
❌ Change critical system settings  
❌ Access admin-only features  

## Implementation Details

### Test Mode Detection

```typescript
const { isTestMode, simulateRoleChange } = useTestMode()
const isDeveloper = currentUserRole === "developer"

if (isDeveloper && isTestMode) {
  // Simulate change
  simulateRoleChange(userId, userName, previousRole, newRole)
  toast.success("Change simulated")
  return
}
```

### Change Tracking

```typescript
interface TestChange {
  id: string
  userId: string
  userName: string
  action: "role_change" | "department_change" | "delete"
  previousValue: string
  newValue: string
  timestamp: Date
}
```

### Persistence

**Test mode changes are NOT persisted:**
- Stored in React state only
- Cleared on page refresh
- Lost when test mode is disabled
- Never sent to database

## Best Practices

1. **Always use test mode** when experimenting with user roles
2. **Review changes** in the Test Mode Panel before exiting
3. **Document your tests** by exporting change logs (future feature)
4. **Clear changes** when starting a new test scenario
5. **Exit test mode** when done testing to avoid confusion

## Future Enhancements

Planned improvements:
- [ ] Export change log as JSON or CSV
- [ ] Department change simulation
- [ ] User deletion simulation
- [ ] Bulk operation testing
- [ ] Test mode for other admin features
- [ ] Change diff visualization
- [ ] Test scenario save/load

## Related Documentation

- [Database Schema Strategy](../architecture/database-schema-strategy.md)
- [Developer Role Next Steps](../implementation/developer-role-next-steps.md)

## Support

For issues or questions about test mode:
1. Check this documentation
2. Review the Test Mode Panel UI
3. Inspect browser console for errors
4. Contact the admin/technical lead
