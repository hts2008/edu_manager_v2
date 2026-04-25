---
description: Code review — multi-perspective quality assessment
---
// turbo-all

## Steps

1. Get changed files: `git diff --name-only main...HEAD`

2. Categorize: new feature, bug fix, refactor, config. Determine risk level.

3. Review each dimension:
   - **Correctness**: Logic matches requirement? Edge cases handled?
   - **Security**: Input validated? Queries parameterized? Auth present?
   - **Performance**: N+1 queries? Unbounded queries? Bundle impact?
   - **Maintainability**: Function < 50 lines? File < 300 lines? No duplication?
   - **Test coverage**: New code has tests? Edge cases tested?

4. Label findings: 🔴 MUST FIX | 🟡 SHOULD FIX | 🟢 NIT

5. Verdict: APPROVED | NEEDS_CHANGES | REJECTED with justification.

## Context+ Enhancement

When Context+ is available:
- **Step 1**: Use `get_blast_radius` on each changed symbol to verify impact scope
- **Step 3**: Run `run_static_analysis` as independent quality check
- **Step 3**: Use `semantic_code_search("similar")` to check for duplicated patterns
- **Escalation**: If blast_radius shows >5 affected files for claimed "low risk" change → escalate to adversarial review