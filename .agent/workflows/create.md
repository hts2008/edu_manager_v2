---
description: Feature creation — design to implementation with TDD
---
// turbo-all

## Steps

1. Parse user request into: WHAT (feature), WHY (value), WHO (user role).

2. Identify hidden requirements: validation, error states, loading states, auth, responsive.

3. Check existing codebase for reusable components/patterns:
   ```
   find src/ -name "*.tsx" | head -20
   grep -r "similar_pattern" src/
   ```

4. Design component/service interface. Define API contract if needed.

5. Create task rows in KANBAN.md with dependency order.

6. TDD loop for each subtask:
   - Write test that describes expected behavior (RED)
   - Write minimal code to pass test (GREEN)
   - Refactor without changing behavior
   - Run full test suite: `npm test`

7. If UI: verify all states (loading, error, empty, success, responsive).

8. If API: test with curl/Postman against running server.

9. Update docs if new endpoints or setup steps changed.

10. Update KANBAN.md with IMPLEMENTED status and evidence links.

## Context+ Enhancement

When Context+ is available, enhance these steps:
- **Step 3**: Replace grep with `semantic_code_search("similar to [feature]")` for better pattern discovery
- **Step 4**: Use `get_blast_radius` on interfaces you'll implement to verify integration points
- **Step 6**: After GREEN, run `run_static_analysis` as part of refactor verification