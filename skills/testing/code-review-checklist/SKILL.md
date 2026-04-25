---
name: Code Review Checklist
description: Systematic code review: quality gates, common issues, review protocol
---

# Code Review Checklist

## Review Priorities
1. Correctness: does it do what it should?
2. Security: injection, auth bypass, data exposure?
3. Performance: N+1, unnecessary computation, memory leaks?
4. Maintainability: clear naming, reasonable complexity?
5. Testing: adequate coverage, meaningful assertions?

## Common Issues
- Missing error handling
- Missing input validation
- Hardcoded values that should be config
- Console.log left in production code
- Missing or misleading comments

## Review Protocol
- Review within 24 hours of PR
- Be specific: suggest code, not just problems
- Approve with minor comments if non-blocking
- Request changes for correctness/security issues only
