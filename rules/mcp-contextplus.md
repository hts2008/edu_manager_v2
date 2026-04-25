# MCP Context+ Usage Rules
version: "4.1"
scope: all-agents-with-contextplus-access
enforcement: advisory-then-block

## Rule 1: Blast Radius Before Refactor (MUST)
Any agent performing refactor, rename, or delete on a shared symbol MUST call `get_blast_radius` before editing.
Violation → edit proceeds but is flagged as "unverified scope" in receipts.

## Rule 2: Propose Commit for Medium+ Risk (SHOULD)
Changes classified as MEDIUM risk or higher SHOULD use `propose_commit` instead of direct file writes.
See `policies/contextplus-risk-tiers.yaml` for tier definitions.

## Rule 3: Skeleton Before Full Read (SHOULD)
For files >200 LOC, agents SHOULD call `get_file_skeleton` before `view_file` to avoid wasting context tokens.

## Rule 4: Semantic Search Before Creating New Code (SHOULD)
Before writing a new utility/hook/helper, agents SHOULD call `semantic_code_search` to check if similar code already exists.
Duplication penalty: if similar code exists and agent creates duplicate → judge-agent raises in review.

## Rule 5: Static Analysis After Every Change (SHOULD)
Agents with code_ops access SHOULD call `run_static_analysis` after making changes to verify no regressions.

## Rule 6: Context+ Output is NOT Ground Truth (MUST)
Agents MUST NOT treat Context+ output as definitive truth.
- IF Context+ output contradicts compile/test/runtime evidence → trust compile/test/runtime
- IF blast_radius returns empty → it may mean index is stale; verify manually

## Rule 7: Graceful Degradation (MUST)
If Context+ is unavailable, agents MUST:
1. Log degradation in activeContext.md
2. Proceed with fallback tools (grep, view_file, find_by_name)
3. Flag in session handoff: "Context+ unavailable this session"
4. Do NOT block task execution

## Rule 8: Evidence for High-Risk Operations (MUST)
When using `propose_commit` for HIGH/CRITICAL risk changes, agents MUST:
1. Save `get_blast_radius` output to `receipts/contextplus/`
2. Record `restore_point_id` from `propose_commit` response
3. Save `run_static_analysis` results to receipts
4. Include all evidence in review package

## Rule 9: No Cross-Workspace Access (MUST NOT)
Context+ MUST NOT be used to access files or data outside the current workspace.
Scope: `.mcp.json` → current workspace project only.

## Rule 10: Version Pinning (SHOULD)
The `.mcp.json` config SHOULD pin to a known-good version of Context+ when stability is required for production projects.

## Anti-Patterns

| Anti-Pattern | Why It's Bad | What to Do Instead |
|-------------|---------------|-------------------|
| Calling `get_context_tree` on every task | Wastes context tokens | Only for structural decisions |
| Using `propose_commit` for typo fixes | Unnecessary overhead | Direct write is fine for LOW risk |
| Trusting blast_radius blindly | May be stale | Cross-verify with grep/tests |
| Replacing all grep with semantic search | Semantic is approximate | Use grep for exact matches |
| Skipping blast_radius "to save time" | Most common cause of orphaned references | Always run for refactors |
