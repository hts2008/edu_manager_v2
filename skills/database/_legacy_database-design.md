---
name: database-design
description: "Schema design, migrations, indexing, query optimization"
---

# Database Design Skill

## Quick Reference

### Schema Convention
- Tables: snake_case, plural (`users`, `order_items`)
- Every table: `id` (UUID), `created_at`, `updated_at`, `deleted_at`
- FKs: `{table_singular}_id` (e.g., `user_id`)

### Data Type Selection
| Concept | Use | Not This |
|---------|-----|----------|
| Money | `DECIMAL(19,4)` | `FLOAT` |
| Timestamps | `TIMESTAMPTZ` | `TIMESTAMP` |
| IDs | `UUID` | Auto-increment |
| JSON | `JSONB` | `TEXT` + parse |

### Index Decision Table
| Query Pattern | Index Type |
|---------------|-----------|
| WHERE column = value | B-tree (default) |
| WHERE column LIKE 'prefix%' | B-tree |
| WHERE column @> '{}' (JSONB) | GIN |
| Full-text search | GIN + tsvector |
| Geospatial | GiST |

### Migration Safety
1. Add new column as NULL
2. Backfill data
3. Add NOT NULL constraint
4. Never rename/drop in one step

## Sub-Skills
- `schema-design.md` — Normalization, denormalization, constraints
- `migration-patterns.md` — Safe migration strategies, zero-downtime
- `query-optimization.md` — EXPLAIN ANALYZE, index usage, N+1 prevention
- `connection-pooling.md` — Pool sizing, timeout config