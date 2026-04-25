---
name: database
description: "Schema conventions, migration safety, query patterns, indexing"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Database

## R1: Schema Conventions

- Tables: snake_case, plural (`users`, `order_items`)
- Columns: snake_case (`created_at`, `user_id`)
- Every table has: `id` (UUID), `created_at`, `updated_at`, `deleted_at` (soft delete)
- Foreign keys: `referenced_table_singular_id` (`user_id`)
- Indexes: `idx_tablename_columns` (`idx_users_email`)

## R2: Migration Safety

- One logical change per migration file
- Every UP migration has a corresponding DOWN
- Never rename/drop columns in one step â€” add new, migrate data, update code, then drop old
- Add new columns as NULL first, backfill, then add constraints
- Use `CREATE INDEX CONCURRENTLY` on production PostgreSQL
- Test migrations on a copy of production data before applying

## R3: Query Rules

- Always parameterize: `WHERE id = $1` (never string interpolation)
- Always LIMIT list queries (default 20, max 100)
- Select specific columns, not `SELECT *`
- Check `EXPLAIN ANALYZE` for queries on tables > 10K rows
- No ORM `.save()` in loops â€” use batch operations
- Avoid N+1: use joins, `IN()` clauses, or DataLoader

## R4: Data Types

| Concept | Type | Not This |
|---------|------|----------|
| Money | `DECIMAL(19,4)` or integer cents | `FLOAT` |
| Timestamps | `TIMESTAMPTZ` | `TIMESTAMP` (naive) |
| Boolean | `BOOLEAN` | Integer 0/1 |
| JSON data | `JSONB` (PostgreSQL) | `TEXT` + manual parse |
| IDs | `UUID` | Auto-increment integers |

## R5: Constraints

- Every FK column must have a foreign key constraint
- Unique constraints for business-unique fields (email, slug)
- Check constraints for domain rules (`CHECK (amount > 0)`)
- NOT NULL by default â€” only allow NULL if business logic requires it

## Verification

- Automated: migration test in CI, query parameterization lint
- Review: database-architect reviews all schema changes

## Related

- Agent: `agents/database-architect.md`
- Skills: `skills/database/schema-design/`