# Database Architecture Documentation

This directory contains comprehensive documentation about the database schema, architecture decisions, and migration strategies.

## Documents

### [database-schema-strategy.md](./database-schema-strategy.md)
Complete overview of the current single-schema architecture, proposed multi-schema approach, RLS policies, performance considerations, and migration history.

**Key Topics:**
- Current schema organization
- Naming conventions
- RLS policy patterns
- Future multi-schema proposal
- Performance optimization
- Security best practices

## Quick Reference

### Current Schema
All tables in `public` schema with feature prefixes

### Role Hierarchy
```
admin (4) > developer (3) > leader (2) > member (1)
```

### Key Migrations
- `027`: Member role + rundown permissions
- `028`: Developer role + read-only admin access

## Related Documentation

- [API Contracts](../../specs/001-cyber-tech-app-build/contracts/) - API endpoint specifications
- [Data Model](../../specs/001-cyber-tech-app-build/data-model.md) - Detailed table relationships
