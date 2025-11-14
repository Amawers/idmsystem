# Audit Trail Feature Documentation

## Overview
The Audit Trail is a comprehensive activity logging and monitoring system that tracks all user actions and system events in real-time. It provides administrators and authorized users with complete visibility into system activities for security, compliance, and troubleshooting purposes.

## Features

### 1. **Real-Time Activity Monitoring**
- Live updates via Supabase real-time subscriptions
- Instant notifications when new activities are detected
- Automatic table refresh on new audit log entries

### 2. **Advanced Filtering**
- **Search**: Full-text search across user emails, action types, resource types, and descriptions
- **Date Range**: Quick presets (Today, Last 7 Days, Last 30 Days, All Time)
- **Category**: Filter by action category (Auth, Case, User, Permission, Program, Partner, System, Report)
- **Severity**: Filter by severity level (Info, Warning, Critical)
- **Clear Filters**: One-click reset of all filters

### 3. **Statistics Dashboard**
- Total activity count
- Critical events count with visual indicator
- Warning events count with visual indicator
- Info events count with visual indicator
- Toggleable statistics view

### 4. **Data Export**
- Export audit logs to CSV format
- Includes all relevant fields (timestamp, user, action, category, resource, description, severity)
- Properly formatted for Excel and other spreadsheet applications
- Timestamped filename for easy identification

### 5. **Detailed View**
- Click any log entry to view complete details
- Displays:
  - Full timestamp with timezone
  - User email and role
  - Action type and category
  - Severity level with color coding
  - User ID and resource information
  - Complete description
  - JSON metadata for additional context

### 6. **Pagination**
- Configurable rows per page (5, 10, 25, 50, 100)
- Server-side pagination for optimal performance
- Clear page indicators
- Next/Previous navigation

### 7. **Responsive Design**
- Mobile-friendly layout
- Scrollable table with fixed headers
- Adaptive controls for different screen sizes

## Technical Architecture

### Components
- **AuditTrail.jsx**: Main component (`src/pages/security/AuditTrail.jsx`)
- Uses `useAuditLogs` custom hook for data management
- Integrates with Supabase for real-time updates

### Data Flow
```
User Action → createAuditLog() → Supabase audit_log table
                                        ↓
                                  Real-time subscription
                                        ↓
                                  AuditTrail component
                                        ↓
                                  UI Update + Toast notification
```

### Hook: `useAuditLogs`
**Location**: `src/hooks/useAuditLogs.js`

**State Management**:
- `data`: Array of audit log entries
- `count`: Total count of records (for pagination)
- `loading`: Loading state
- `error`: Error state
- `filters`: Current filter configuration

**Methods**:
- `reload()`: Manually refresh data
- `setFilters(newFilters)`: Update filter values
- `resetFilters()`: Clear all filters
- `nextPage()`: Navigate to next page
- `prevPage()`: Navigate to previous page

### Utility Library: `auditLog.js`
**Location**: `src/lib/auditLog.js`

**Main Functions**:

#### `createAuditLog(params)`
Creates a new audit log entry.

```javascript
await createAuditLog({
  actionType: 'create_case',
  actionCategory: 'case',
  description: 'Created new case intake form',
  resourceType: 'case',
  resourceId: caseId,
  metadata: { caseType: 'CICL-CAR', clientName: 'John Doe' },
  severity: 'info'
});
```

#### `fetchAuditLogs(filters)`
Fetches audit logs with filtering and pagination.

```javascript
const { data, count, error } = await fetchAuditLogs({
  userId: 'user-id',
  actionCategory: 'case',
  severity: 'critical',
  startDate: new Date('2025-01-01'),
  endDate: new Date(),
  limit: 50,
  offset: 0
});
```

**Constants**:
- `AUDIT_ACTIONS`: Predefined action types
- `AUDIT_CATEGORIES`: Standard categories
- `AUDIT_SEVERITY`: Severity levels

## Database Schema

### Table: `audit_log`
```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_role TEXT,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes
- `idx_audit_log_user_id` on `user_id`
- `idx_audit_log_action_type` on `action_type`
- `idx_audit_log_action_category` on `action_category`
- `idx_audit_log_created_at` on `created_at DESC`
- `idx_audit_log_severity` on `severity`
- `idx_audit_log_resource_type` on `resource_type`

## Usage Examples

### Creating Audit Logs

#### Login Event
```javascript
await createAuditLog({
  actionType: AUDIT_ACTIONS.LOGIN,
  actionCategory: AUDIT_CATEGORIES.AUTH,
  description: 'User logged in successfully',
  severity: AUDIT_SEVERITY.INFO
});
```

#### Case Creation
```javascript
await createAuditLog({
  actionType: AUDIT_ACTIONS.CREATE_CASE,
  actionCategory: AUDIT_CATEGORIES.CASE,
  description: `Created new case intake for ${clientName}`,
  resourceType: 'case',
  resourceId: newCase.id,
  metadata: {
    caseType: 'CICL-CAR',
    clientName: clientName,
    referralSource: 'Police Department'
  },
  severity: AUDIT_SEVERITY.INFO
});
```

#### Permission Change (Critical)
```javascript
await createAuditLog({
  actionType: AUDIT_ACTIONS.GRANT_PERMISSION,
  actionCategory: AUDIT_CATEGORIES.PERMISSION,
  description: `Granted ${permission} permission to ${userEmail}`,
  resourceType: 'user',
  resourceId: userId,
  metadata: {
    permission: permission,
    grantedBy: currentUser.email
  },
  severity: AUDIT_SEVERITY.CRITICAL
});
```

## Best Practices

### When to Log
1. **Authentication Events**: Login, logout, password changes, failed login attempts
2. **Data Modifications**: Create, update, delete operations on cases, users, programs
3. **Permission Changes**: Role updates, permission grants/revokes
4. **Critical Actions**: Data exports, bulk operations, system configuration changes
5. **Security Events**: Unauthorized access attempts, suspicious activities

### Severity Guidelines
- **INFO**: Normal operations (views, successful logins, standard CRUD)
- **WARNING**: Unusual but not critical (failed operations, validation errors)
- **CRITICAL**: Security-sensitive actions (permission changes, deletions, exports)

### Metadata Best Practices
- Include before/after values for updates
- Add context-specific information
- Keep metadata structured and consistent
- Avoid storing sensitive data (passwords, tokens)

### Performance Considerations
- Server-side pagination reduces client load
- Indexed database queries ensure fast filtering
- Real-time subscriptions are lightweight
- Export functionality handles large datasets efficiently

## Security & Compliance

### Access Control
- Audit trail access requires appropriate permissions
- Only authorized roles can view audit logs
- User can only see logs relevant to their access level (configurable)

### Data Retention
- Audit logs are immutable (no updates or deletes via UI)
- Retention policy should be defined at database level
- Consider archiving old logs for long-term storage

### Privacy Considerations
- User emails and IDs are logged for accountability
- IP addresses can be added via Edge Functions
- Ensure compliance with data protection regulations

## Troubleshooting

### Real-Time Updates Not Working
1. Check Supabase real-time is enabled for `audit_log` table
2. Verify browser has stable connection
3. Check browser console for subscription errors
4. Ensure Supabase policies allow real-time access

### Performance Issues
1. Reduce page size if loading is slow
2. Use date range filters to limit dataset
3. Check database indexes are present
4. Consider archiving old audit logs

### Missing Audit Logs
1. Verify `createAuditLog()` is called after actions
2. Check user session is valid when logging
3. Review database policies for insert permissions
4. Check browser console for errors

## Future Enhancements

### Planned Features
- [ ] Advanced analytics and reporting
- [ ] Audit log retention policies
- [ ] Custom alert rules for specific events
- [ ] Bulk export with date range selection
- [ ] User activity timeline view
- [ ] Integration with external SIEM systems
- [ ] IP address and geolocation tracking
- [ ] User agent and device information
- [ ] Audit log archival system

### Under Consideration
- Audit log comparison tool
- Scheduled audit reports via email
- Custom dashboard widgets
- Machine learning for anomaly detection

## Related Documentation
- [Database Context](../databaseContext.md)
- [Permissions System](../PERMISSIONS_SYSTEM.md)
- [Security & Audit Overview](../README.md#security)

## Support
For questions or issues related to the Audit Trail feature, please contact the development team or create an issue in the project repository.
