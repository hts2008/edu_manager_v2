---
name: debugging-strategies
description: "Root cause analysis, binary search debugging, error categorization"
---

# Debugging Strategies Skill

## Quick Reference

### 5-Phase Protocol
1. **Evidence**: Error message, stack trace, logs, reproduction steps
2. **Reproduce**: Follow exact steps locally. 3 attempts max, then ask for more info
3. **Isolate**: Binary search — comment out half, check if bug persists
4. **Root Cause**: Trace execution bottom-up. Categorize: logic | state | timing | data | config
5. **Fix + Regress**: Write test (fails now), fix, verify test passes, run full suite

### Error Category Decision Tree
```
Error → Is it a crash?
  YES → Stack trace points to your code? → Logic error
  YES → Stack trace points to dependency? → Dependency issue
  NO  → Wrong output? → Logic / state mutation error
  NO  → Intermittent? → Timing / race condition
  NO  → Works locally, fails in CI/prod? → Environment / config error
```

### Common Root Causes
| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Cannot read property of undefined" | Missing null check | Optional chaining + fallback |
| Stale data | Missing cache invalidation | TTL + event-based invalidation |
| Intermittent failure | Race condition | Proper async/await, mutex |
| Works locally, fails in prod | Env config difference | .env.example validation |

## Sub-Skills
- `root-cause-analysis.md` — 5-why technique, fishbone diagrams
- `binary-search-debugging.md` — Halving technique for isolation
- `production-debugging.md` — Remote debugging, log analysis, tracing