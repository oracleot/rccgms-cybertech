# Database Schema Strategy

**Last Updated:** March 1, 2026  
**Status:** Current (v1.0) - Single Schema Architecture

---

## Current Architecture (v1.0)

### Schema Organization

All tables currently live in the **`public` schema** with feature-based prefixes:

```
public/
├── Core Identity & Auth
│   ├── profiles
│   ├── departments
│   ├── positions
│   ├── user_departments (junction table)
│   └── invitations
│
├── Rota Management (7 tables)
│   ├── rotas
│   ├── rota_assignments
│   ├── availability
│   ├── swap_requests
│   ├── services
│   ├── recurrence_patterns
│   └── service_dates
│
├── Equipment Management (4 tables)
│   ├── equipment
│   ├── equipment_checkouts
│   ├── equipment_categories
│   └── equipment_maintenance_log
│
├── Rundowns (3 tables)
│   ├── rundowns
│   ├── rundown_items
│   └── rundown_templates
│
├── Social Media (3 tables)
│   ├── social_content
│   ├── social_platforms
│   └── social_scheduled_posts
│
├── Training (4 tables)
│   ├── training_modules
│   ├── training_steps
│   ├── training_completions
│   └── training_tracks
│
├── Design Requests (3 tables)
│   ├── design_requests
│   ├── design_assets
│   └── design_reviews
│
├── Livestream (2 tables)
│   ├── livestream_streams
│   └── livestream_templates
│
└── System Tables
    └── notifications (audit log)
```

### Naming Conventions

**Current Standard:**
- **Table names:** `feature_entity` (e.g., `rota_assignments`, `equipment_checkouts`)
- **Primary keys:** `id` (UUID v4)
- **Foreign keys:** `{table}_id` (e.g., `user_id`, `department_id`)
- **Timestamps:** `created_at`, `updated_at`
- **Soft deletes:** `deleted_at` (where applicable)
- **Metadata:** `metadata` (JSONB for flexible data)

**Enum Types:**
```sql
user_role: admin | developer | leader | member
rota_status: draft | published
assignment_status: pending | confirmed | declined
swap_status: pending | accepted | declined | approved | rejected
equipment_status: available | checked_out | maintenance | retired
rundown_status: draft | published | archived
design_status: pending | in_progress | review | approved | completed | rejected
training_status: not_started | in_progress | completed
```

### Row Level Security (RLS)

**All tables use RLS** with role-based policies:

**Role Hierarchy:**
```
admin (4)       → Full access to everything
developer (3)   → Content + read-only users + system logs
leader (2)      → Department management + content
member (1)      → View + limited actions
```

**Standard Policy Pattern:**
```sql
-- View: Based on role + ownership
CREATE POLICY "view_policy" ON table_name FOR SELECT
USING (
  -- Public visibility OR
  status = 'published' OR
  -- Own records OR
  user_id = auth.uid() OR
  -- Role-based access
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'developer', 'leader')
  )
);

-- Modify: Based on role hierarchy
CREATE POLICY "modify_policy" ON table_name FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'developer', 'leader')
  )
);
```

### Realtime Configuration

**Enabled for:**
- `rundowns` (live service order updates)
- `rundown_items` (live item changes)
- `notifications` (instant alerts)

**Replica Identity:** `FULL` (required for DELETE events + realtime subscriptions)

---

## Future Architecture (v2.0) - Multi-Schema Proposal

### Proposed Schema Layout

**Goal:** Separate concerns into dedicated PostgreSQL schemas for better organization and security isolation.

```sql
-- Core Schema (Identity & Shared)
core.profiles
core.departments
core.positions
core.user_departments
core.invitations
core.notifications

-- Rota Schema
rota.rotas
rota.assignments
rota.availability
rota.swap_requests
rota.services
rota.recurrence_patterns
rota.service_dates

-- Equipment Schema
equipment.items
equipment.checkouts
equipment.categories
equipment.maintenance_log

-- Rundown Schema
rundown.rundowns
rundown.items
rundown.templates

-- Social Schema
social.content
social.platforms
social.scheduled_posts

-- Training Schema
training.modules
training.steps
training.completions
training.tracks

-- Designs Schema
designs.requests
designs.assets
designs.reviews

-- Livestream Schema
livestream.streams
livestream.templates
```

### Benefits of Multi-Schema Architecture

✅ **Logical Separation** - Clear module boundaries  
✅ **Security Isolation** - Different RLS policies per schema  
✅ **Namespace Flexibility** - Same table names in different contexts  
✅ **Easier Backup/Restore** - Per-feature data management  
✅ **Multi-tenancy Ready** - Schema-per-church for future scaling  
✅ **Query Clarity** - `rota.assignments` > `rota_assignments`

### Migration Challenges

⚠️ **Breaking Changes:**
1. All queries need schema qualification: `FROM rota.assignments`
2. RLS policies need schema-qualified names
3. Supabase generated types assume `public` schema
4. Cross-schema foreign keys require explicit qualification
5. 100+ files need query updates

⚠️ **Migration Complexity:**
- Estimated effort: 2-3 weeks for full codebase update
- Risk: High (breaks existing queries)
- Testing required: All features need re-validation

### Recommended Timeline

**Phase 1 (Current):** Continue with `public` schema  
**Phase 2 (Post-Launch):** Document multi-schema migration plan  
**Phase 3 (v2.0):** Execute schema migration during major version upgrade

---

## Performance Considerations

### Indexing Strategy

**Primary Indexes (All Tables):**
- Primary key: `id` (UUID, B-tree index)
- Foreign keys: All `{table}_id` columns indexed
- Lookup fields: `email`, `slug`, `external_id` (where applicable)

**Composite Indexes:**
```sql
-- Rota assignments lookup
CREATE INDEX idx_rota_assignments_user_date 
  ON rota_assignments(user_id, date);

-- Equipment availability
CREATE INDEX idx_equipment_status 
  ON equipment(status) 
  WHERE deleted_at IS NULL;

-- Notification queue processing
CREATE INDEX idx_notifications_pending 
  ON notifications(status, scheduled_for) 
  WHERE status = 'pending';
```

### Query Optimization

**Best Practices:**
1. Always wrap `auth.uid()` in subquery for RLS policies (prevents per-row re-evaluation)
2. Use `SELECT DISTINCT ON` instead of `GROUP BY` for latest records
3. Leverage partial indexes for filtered queries
4. Use materialized views for complex aggregations (future)
5. Implement query result caching at application layer

**Example Optimized RLS Policy:**
```sql
-- ❌ SLOW (re-evaluates auth.uid() per row)
USING (user_id = auth.uid())

-- ✅ FAST (evaluates once, uses in WHERE clause)
USING (user_id = (SELECT auth.uid()))

-- ✅ FASTEST (subquery with indexed lookup)
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = (SELECT auth.uid()) 
    AND role IN ('admin', 'leader')
  )
)
```

---

## Data Integrity

### Foreign Key Constraints

**Standard Pattern:**
```sql
FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE  -- or RESTRICT/SET NULL based on relationship
```

**Cascade Rules:**
- User deletion → CASCADE all user-owned records
- Department deletion → RESTRICT if has active users
- Service deletion → CASCADE assignments and dates

### Soft Deletes

**Implemented on:**
- `profiles` (legal requirement - retain audit trail)
- `equipment` (historical checkout records reference)
- `departments` (historical assignment references)

**Pattern:**
```sql
deleted_at TIMESTAMPTZ DEFAULT NULL
```

Queries must filter: `WHERE deleted_at IS NULL`

---

## Monitoring & Administration

### Database Health Metrics

**Monitor:**
1. Table bloat (run `VACUUM ANALYZE` regularly)
2. Index usage (`pg_stat_user_indexes`)
3. Slow queries (`pg_stat_statements`)
4. Connection pool saturation
5. RLS policy evaluation time

### Maintenance Schedule

**Daily:**
- Automated backups (Supabase handles)
- Failed notification retry queue

**Weekly:**
- Review slow query log
- Check table bloat percentages
- Validate RLS policy coverage

**Monthly:**
- Database size trends
- Index optimization review
- Migration history audit

---

## Security Notes

### RLS Best Practices

✅ **Always enable RLS:** `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`  
✅ **Default deny:** No policy = no access (except table owner)  
✅ **Test policies:** Use `SET ROLE` in SQL to test as different users  
✅ **Avoid role checks in app:** Database enforces all security  
✅ **Log policy violations:** Add to `notifications` table for audit

### Sensitive Data Handling

**Encrypted at rest:** All Supabase data encrypted via platform  
**Encrypted in transit:** TLS 1.3 for all connections  
**PII fields:** `email`, `phone` - access restricted by RLS  
**Audit trail:** `notifications` table logs all critical actions

---

## Migration History

**027_allow_all_users_create_rundowns.sql**
- Renamed `volunteer` role → `member`
- Granted members full rundown permissions
- Enabled realtime for rundowns

**028_add_developer_role.sql**
- Added `developer` role for technical/backend staff
- Granted developers content management + read-only user viewing
- Updated all RLS policies to include developer permissions

---

## Appendix: Useful Queries

### Schema Size Report
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### RLS Policy Coverage
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation,
  qual AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

### Index Usage Statistics
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

---

**Next Steps:**
1. ✅ Apply migration 028 (developer role)
2. ⏳ Implement dummy/test mode for developers
3. 📋 Plan v2.0 schema migration (post-launch)
