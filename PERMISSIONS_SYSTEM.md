# Permissions System Documentation

## Overview
The IDM System implements a robust, granular permissions system that allows heads to control exactly what each case manager can do. This system goes beyond simple role-based access control (RBAC) by providing individual permission management at the user level.

## Architecture

### Components

#### 1. **useUserPermissions Hook** (`src/hooks/useUserPermissions.js`)
- Fetches the currently logged-in user's permissions from the database
- Provides three key functions:
  - `hasPermission(name)` - Check for a single permission
  - `hasAnyPermission(names[])` - Check if user has ANY of the listed permissions
  - `hasAllPermissions(names[])` - Check if user has ALL of the listed permissions
- Automatically grants all permissions to `head` role users
- Caches permissions to minimize database queries

#### 2. **PermissionGuard Component** (`src/components/PermissionGuard.jsx`)
- Wraps UI elements to conditionally render based on permissions
- Supports single or multiple permission checks
- Can show fallback content when permission is denied
- Handles loading states gracefully

#### 3. **RolePermissions Page** (`src/pages/security/RolePermissions.jsx`)
- Admin interface for heads to manage user permissions
- Fetches users, permissions, and current assignments from database
- Allows batch permission changes with pending state preview
- Logs all permission changes to audit trail

### Database Tables

#### `permissions`
```sql
- id: UUID (primary key)
- name: TEXT (unique) - e.g., 'create_case', 'delete_user'
- display_name: TEXT - Human-readable name
- description: TEXT - What the permission allows
- category: TEXT - Group ('case', 'user', 'system', etc.)
```

#### `user_permissions`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- permission_id: UUID (foreign key to permissions)
- granted_at: TIMESTAMPTZ
- granted_by: UUID (foreign key to auth.users)
```

## Available Permissions

### Case Management
- ~~`view_cases`~~ - **REMOVED** - All users can view cases by default
- `create_case` - Create new case intake forms
- `edit_case` - Modify existing case records
- `delete_case` - Delete case records
- ~~`export_cases`~~ - **REMOVED** - All users can export case data by default

### Program Management
- `create_program` - Create new intervention programs
- `edit_program` - Modify existing program details
- `delete_program` - Delete programs and associated data
- `create_enrollment` - Enroll cases into programs
- `edit_enrollment` - Update enrollment progress and status
- `delete_enrollment` - Remove case enrollments
- `create_service_delivery` - Log service delivery sessions
- `edit_service_delivery` - Modify service delivery records
- `delete_service_delivery` - Delete service delivery logs
- `create_partner` - Add partner organizations
- `edit_partner` - Update partner information
- `delete_partner` - Remove partner organizations

### Resource Management
- `create_resource_request` - Submit new resource requests
- `update_inventory_stock` - **HEAD ONLY** - Update stock levels and track usage
- `create_inventory_item` - **HEAD ONLY** - Add new items to inventory
- `approve_resource_request` - **HEAD ONLY** - Approve pending resource requests
- `reject_resource_request` - **HEAD ONLY** - Reject resource requests
- `manage_staff_assignment` - **HEAD ONLY** - Assign staff to service delivery tasks

### User Management
- `view_users` - View user accounts
- `create_user` - Create new user accounts
- `edit_user` - Modify user accounts
- `delete_user` - Delete user accounts
- `manage_roles` - Assign and modify user roles

### System & Security
- `view_audit_logs` - Access audit trail and activity logs
- `manage_permissions` - Configure user permissions
- `view_dashboard` - Access system dashboard
- `system_settings` - Modify system-wide settings

### Reports & Analytics
- `view_reports` - Access reports and analytics
- `create_reports` - Generate custom reports
- `export_reports` - Export reports to files

### Resource Management
- `view_resources` - View resource allocation
- `allocate_resources` - Manage resource allocation

## Integration Points

### Case Management (`src/components/cases/data-table.jsx`)
- **INTAKE SHEET button** - Protected by `create_case`
- **Edit menu items** - Protected by `edit_case`
- **Delete menu items** - Protected by `delete_case`
- Applied across all case tabs: CASE, CICL/CAR, FAR, FAC, IVAC

### Program Management
#### Programs Tab (`src/components/programs/ProgramCatalog.jsx`)
- **Create Program button** (in ProgramCatalogPage) - Protected by `create_program`
- **Edit Program menu item** - Protected by `edit_program`
- **Delete Program menu item** - Protected by `delete_program`

#### Enrollments Tab (`src/components/programs/EnrollmentTable.jsx`)
- **New Enrollment button** - Protected by `create_enrollment`
- **Update Progress menu item** - Protected by `edit_enrollment`
- **Delete Enrollment menu item** - Protected by `delete_enrollment`

#### Service Delivery Tab (`src/components/programs/ServiceDeliveryTable.jsx`)
- **Log Session button** - Protected by `create_service_delivery`
- **Edit Log menu item** - Protected by `edit_service_delivery`
- **Delete Log menu item** - Protected by `delete_service_delivery`

#### Partners Tab (`src/components/programs/PartnersTable.jsx`)
- **Add Partner button** - Protected by `create_partner`
- **Edit Partner menu item** - Protected by `edit_partner`
- **Delete Partner menu item** - Protected by `delete_partner`

### Program Management Main Page (`src/pages/case manager/ProgramManagement.jsx`)
- **Create Program button** (header) - Protected by `create_program`

### Resource Management
#### Resource Allocation (`src/components/resources/ResourceAllocation.jsx`)
- **Submit Resource Request button** - Protected by `create_resource_request`

#### Requests Table (`src/components/resources/RequestsTable.jsx`)
- **Approve button** - Protected by `approve_resource_request`
- **Reject button** - Protected by `reject_resource_request`

#### Resource Inventory (`src/components/resources/ResourceInventory.jsx`)
- **Update Stock button** - Protected by `update_inventory_stock`

## Usage Examples

### In Components

```jsx
import { useUserPermissions } from "@/hooks/useUserPermissions";

function CaseManagementPage() {
  const { hasPermission, loading } = useUserPermissions();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Viewing and exporting cases is accessible to all users - no permission check needed */}
      
      {/* Only show button if user can create cases */}
      {hasPermission('create_case') && (
        <Button onClick={createCase}>Create New Case</Button>
      )}
      
      {/* Disable delete if user doesn't have permission */}
      <Button 
        disabled={!hasPermission('delete_case')}
        onClick={deleteCase}
      >
        Delete
      </Button>
    </div>
  );
}
```

### Using PermissionGuard

```jsx
import { PermissionGuard } from "@/components/PermissionGuard";

function CaseActions() {
  return (
    <div>
      {/* Single permission check */}
      <PermissionGuard permission="create_case">
        <Button>Create Case</Button>
      </PermissionGuard>

      {/* Multiple permissions - user needs ALL */}
      <PermissionGuard permissions={['view_reports', 'export_reports']}>
        <Button>Export Report</Button>
      </PermissionGuard>

      {/* Multiple permissions - user needs ANY */}
      <PermissionGuard 
        permissions={['edit_case', 'delete_case']} 
        requireAny
      >
        <Button>Manage Case</Button>
      </PermissionGuard>

      {/* Show fallback when permission denied */}
      <PermissionGuard 
        permission="system_settings"
        fallback={<p className="text-muted">Access Denied</p>}
      >
        <SettingsPanel />
      </PermissionGuard>
    </div>
  );
}
```

### In Dropdown Menus

```jsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <PermissionGuard permission="edit_case">
      <DropdownMenuItem onClick={handleEdit}>
        Edit
      </DropdownMenuItem>
    </PermissionGuard>
    
    <PermissionGuard permission="delete_case">
      <DropdownMenuItem onClick={handleDelete}>
        Delete
      </DropdownMenuItem>
    </PermissionGuard>
  </DropdownMenuContent>
</DropdownMenu>
```

## Managing Permissions (For Heads)

1. Navigate to **Security & Audit > Role Permissions**
2. Select a user from the left panel
3. Toggle permissions on/off in the right panel
4. Changes are staged and shown with "Modified" badges
5. Click "Save Changes" to commit all changes at once
6. All changes are logged to the audit trail

## Permission Flow

```
User Login
    ↓
authStore.init()
    ↓
Fetch user's role from profile table
    ↓
useUserPermissions hook loads
    ↓
If role = 'head': Grant all permissions
If role = 'case_manager': Fetch from user_permissions table
    ↓
Permissions cached in hook state
    ↓
Components check permissions via:
  - hasPermission()
  - PermissionGuard component
    ↓
UI elements shown/hidden accordingly
```

## HEAD-ONLY Permissions

Some permissions are exclusively reserved for heads and **cannot be assigned to case managers** through the Role Permissions interface. These are critical administrative functions that require executive authority:

### Resource Management HEAD-ONLY Permissions:
- `update_inventory_stock` - Only heads can update stock levels
- `create_inventory_item` - Only heads can add new inventory items
- `approve_resource_request` - Only heads can approve resource requests
- `reject_resource_request` - Only heads can reject resource requests  
- `manage_staff_assignment` - Only heads can manage staff deployments

**Implementation Details:**
- These permissions are automatically granted to all head users
- In the Role Permissions page, these permissions are:
  - Disabled (cannot be toggled) for case managers
  - Marked with a "Head Only" badge
  - Shown with reduced opacity to indicate unavailability
- Attempting to assign these to case managers will show an error toast
- These permissions are marked as "HEAD ONLY" in their descriptions in the database

**Why HEAD-ONLY?**
These permissions control critical approval workflows, inventory item creation, stock management, and resource allocation decisions that should remain under executive supervision to maintain accountability and proper authorization chains.

## Security Notes

- **Row Level Security (RLS)** is enabled on all permission tables
- Only heads can view and modify user permissions
- Users can view their own permissions
- All permission changes are logged to the audit trail with:
  - Who made the change
  - What permission was granted/revoked
  - To whom it was granted/revoked
  - Timestamp
- Permissions are checked on the client-side for UI control
- **Backend validation should also be implemented** for API endpoints
- **HEAD-ONLY permissions** cannot be assigned to case managers even by heads

## Best Practices

### 1. **Always Check Permissions Before Actions**
```jsx
// ✅ Good
if (hasPermission('delete_case')) {
  await deleteCase(caseId);
}

// ❌ Bad
await deleteCase(caseId); // No permission check!
```

### 2. **Use PermissionGuard for UI Elements**
```jsx
// ✅ Good - Hidden when no permission
<PermissionGuard permission="create_case">
  <Button>Create</Button>
</PermissionGuard>

// ❌ Bad - Still visible, just disabled
<Button disabled={!hasPermission('create_case')}>Create</Button>
```

### 3. **Group Related Permissions**
```jsx
// ✅ Good - Check for ANY management permission
<PermissionGuard 
  permissions={['edit_case', 'delete_case']} 
  requireAny
>
  <ManagementPanel />
</PermissionGuard>
```

### 4. **Provide Fallback for Critical Features**
```jsx
// ✅ Good - User knows why they can't access
<PermissionGuard 
  permission="view_dashboard"
  fallback={
    <Alert>
      <AlertTriangleIcon />
      <AlertDescription>
        You don't have permission to view the dashboard.
        Contact your administrator.
      </AlertDescription>
    </Alert>
  }
>
  <Dashboard />
</PermissionGuard>
```

## Extending the System

### Adding a New Permission

1. **Add to database via migration or SQL:**
```sql
INSERT INTO permissions (name, display_name, description, category) 
VALUES ('new_permission', 'New Feature', 'Allows access to new feature', 'category');
```

2. **Update the useUserPermissions hook** (if head should have it by default):
```js
if (role === "head") {
  setPermissions([
    // ...existing permissions
    "new_permission",
  ]);
}
```

3. **Use in components:**
```jsx
<PermissionGuard permission="new_permission">
  <NewFeatureButton />
</PermissionGuard>
```

### Adding Permission Checks to New Components

```jsx
import { PermissionGuard } from "@/components/PermissionGuard";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export default function MyNewComponent() {
  const { hasPermission, loading } = useUserPermissions();

  if (loading) return <Skeleton />;

  return (
    <div>
      {/* Guard entire sections */}
      <PermissionGuard permission="view_feature">
        <FeatureContent />
      </PermissionGuard>

      {/* Or check programmatically */}
      {hasPermission('edit_feature') && (
        <EditPanel />
      )}
    </div>
  );
}
```

## Troubleshooting

### User can't see features they should have access to
1. Check if permission is granted in **Security & Audit > Role Permissions**
2. Verify permission name matches exactly (case-sensitive)
3. Check browser console for permission loading errors
4. Ensure user is not banned or inactive

### Permissions not updating after changes
1. User needs to refresh the page (or implement live reload)
2. Check if changes were saved successfully
3. Verify RLS policies allow the user to view their permissions

### Head can't manage permissions
1. Check if user's role is exactly `'head'` in the profile table
2. Verify RLS policies on permissions tables
3. Check browser console for errors

## Performance Considerations

- Permissions are loaded once on mount and cached
- No database query on every permission check
- PermissionGuard uses React.memo internally
- Consider implementing permission refresh on route change for long sessions

## Future Enhancements

- [ ] Real-time permission updates via Supabase subscriptions
- [ ] Permission templates/presets for common user types
- [ ] Bulk permission management for multiple users
- [ ] Permission inheritance from groups/teams
- [ ] Time-based permissions (temporary access)
- [ ] Backend API permission enforcement middleware
- [ ] Permission audit reports and analytics
