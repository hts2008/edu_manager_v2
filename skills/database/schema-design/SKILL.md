---
name: Schema Design
description: Database schema design: normalization, relationships, constraints, naming
---

# Schema Design

## Normalization
- 1NF: atomic values, no repeating groups
- 2NF: no partial dependencies on composite key
- 3NF: no transitive dependencies
- Denormalize intentionally for read performance, document why

## Naming Conventions
- Tables: plural snake_case (users, order_items)
- Columns: singular snake_case (first_name, created_at)
- PKs: id (auto-increment or UUID)
- FKs: referenced_table_singular_id (user_id, order_id)

## Constraints
- NOT NULL by default, nullable only when business requires
- UNIQUE for natural keys (email, slug)
- CHECK for value ranges and enums
- FK with ON DELETE CASCADE or RESTRICT (never SET NULL without reason)

## Timestamps
- created_at: NOT NULL DEFAULT now()
- updated_at: NOT NULL, trigger or application-managed
- deleted_at: nullable for soft delete

## Indexes
- PK auto-indexed. Add indexes for WHERE, JOIN, ORDER BY columns
- Composite indexes: most selective column first
- Partial indexes for filtered queries
