---
name: Performance Profiling
description: Application profiling: CPU, memory, I/O bottleneck detection
---

# Performance Profiling

## Profiling Approach
- Measure before optimizing (no premature optimization)
- Profile in production-like environment
- Focus on hotspots (80/20 rule)

## CPU Profiling
- Node.js: --prof flag, clinic.js
- Python: cProfile, py-spy
- Browsers: Chrome DevTools Performance tab
- Look for: long-running functions, excessive iterations

## Memory Profiling
- Heap snapshots: compare before/after to find leaks
- Track allocation growth over time
- Watch for: event listener buildup, closure retention, cache unbounded growth

## I/O Profiling
- Database query timing (EXPLAIN ANALYZE)
- Network request waterfall
- File system operations
- Look for: N+1 queries, unnecessary round trips
