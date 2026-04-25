---
name: Indexing Review
description: Index strategy: when to add, composite indexes, covering indexes
---

# Indexing Review

## When To Index
- Columns in WHERE clauses with high selectivity
- JOIN columns (FKs usually need index)
- ORDER BY columns for sort optimization
- Never index columns with very low cardinality (boolean)

## Composite Indexes
- Column order matters: most selective first
- Leftmost prefix rule: (a,b,c) covers queries on (a), (a,b), (a,b,c)

## Index Types
- B-tree: default, good for range and equality
- Hash: equality only, faster than B-tree for point lookups
- GIN/GiST: full-text search, JSONB, arrays

## Maintenance
- Monitor unused indexes (pg_stat_user_indexes)
- Remove duplicate and overlapping indexes
- REINDEX periodically for bloated indexes
