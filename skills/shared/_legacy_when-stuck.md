---
name: when-stuck
description: "Strategies for getting unstuck, escalation paths, debugging heuristics"
---

# When Stuck Skill

## Quick Reference

### Unstuck Protocol
```
1. REFRAME   → Am I solving the right problem?
2. REDUCE    → Can I make a smaller version of the problem?
3. RESEARCH  → Is there a known solution? (docs, StackOverflow, issues)
4. RUBBER DUCK → Explain the problem step by step to expose assumptions
5. FRESH EYES → Ask: what would someone unfamiliar with this code try?
6. ESCALATE  → After 3 failed attempts → log, ask for help
```

### Common Stuck Scenarios

| Stuck On | Try This |
|----------|----------|
| Error message makes no sense | Read the FULL stack trace, search the exact error text |
| Code works locally, fails in CI | Compare: Node version, env vars, file paths, OS differences |
| Test won't pass | Is the test correct? Test the test. Add logging to trace values |
| Can't reproduce bug | Check: data state, timing, concurrency, environment config |
| Don't know where to start | Run explorer-agent protocol: scan → map → trace one path |
| Performance is bad | Profile first, don't guess. Chrome DevTools / EXPLAIN ANALYZE |
| Too many options | Use brainstorming skill: diverge → evaluate → converge |

### 3-Strike Rule
After 3 failed attempts at the same approach:
1. STOP trying the same thing
2. LOG what you tried and why it failed
3. ESCALATE: try a different approach OR ask for help
4. Never repeat the same failing approach more than 3 times

### Debugging Mindset
- "What changed?" → git log, check recent modifications
- "What assumption am I making?" → list assumptions, test each
- "What if I'm wrong about X?" → verify each belief independently
- "What does the actual data look like?" → add logging, inspect values