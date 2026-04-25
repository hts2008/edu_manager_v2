---
name: Query Optimization
description: SQL query performance: EXPLAIN, N+1, batching, connection pooling
---

# Query Optimization

## EXPLAIN Analysis
- EXPLAIN ANALYZE for actual execution time
- Look for Seq Scan on large tables (need index)
- Watch for Sort with high memory usage

## N+1 Problem
- Detect: N queries for N related records
- Fix: JOIN or eager loading (include/preload)
- ORM: always use .includes() or .preload()

## Batching
- INSERT ... VALUES (multiple rows) instead of loop
- UPSERT (ON CONFLICT) for insert-or-update
- Batch size 1000-5000 for bulk operations

## Connection Pooling
- Use PgBouncer or built-in pool (max 20-50 connections)
- Close connections after use
- Monitor active vs idle connections
