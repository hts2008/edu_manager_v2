---
name: contextplus-integration
description: Context+ MCP server integration — semantic code intelligence for UAC agents
category: mcp
version: "1.0"
prerequisites:
  - Ollama running locally (http://localhost:11434)
  - nomic-embed-text model pulled (ollama pull nomic-embed-text)
  - qwen2.5-coder:7b model pulled (ollama pull qwen2.5-coder:7b)
  - .mcp.json config at workspace root
---

# Context+ Integration Skill

## What Context+ Is

Context+ is a local MCP server that transforms your codebase into a searchable, structured, semantic graph. It uses Tree-sitter for AST parsing, vector embeddings for semantic search, and spectral clustering for feature mapping. It runs entirely locally — no data leaves your machine.

## What Context+ Is NOT

- NOT a replacement for your test suite
- NOT ground truth — verify tool output against compile/test/runtime evidence
- NOT a substitute for PM Orchestrate, git workflow, or PR process
- NOT mandatory for every operation — it enhances, not gates

## Tool Matrix

### Discovery Tools (read-only, safe to call anytime)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `get_context_tree` | AST structural tree of project — files, functions, classes with line ranges | Session start, before diving into unknown code, before architecture decisions |
| `get_file_skeleton` | Single file overview — exports, functions, classes, auto-pruned | Before reading a large file — understand structure first, avoid context waste |
| `get_feature_hub` | Feature graph — clusters related code across files | Feature planning, understanding how a feature is spread across modules |

### Semantic Tools (read-only, requires embeddings)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `semantic_code_search` | Find code by meaning, not keywords ("where do we validate user input?") | When grep fails, when looking for patterns across codebase |
| `semantic_identifier_search` | Find symbols by semantic similarity ("functions related to authentication") | Discovering related functions/classes you didn't know existed |
| `semantic_navigate` | Follow semantic links between code elements | Tracing data flow, understanding caller/callee chains |

### Analysis Tools (read-only, critical for impact awareness)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `get_blast_radius` | Trace every file/line where a symbol is imported or used | **MANDATORY before refactor/rename/delete of any shared symbol** |
| `run_static_analysis` | Lint/quality check on changed files | Post-change verification, before declaring "done" |

### Code Ops Tools (writes code, creates restore points)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `propose_commit` | Validates against rules, creates restore point, then saves | See `policies/contextplus-risk-tiers.yaml` for mandatory/optional |
| `edit_file` | Direct file edit via Context+ | When tool-assisted editing is preferred |

### Version Tools (manages restore points)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `list_restore_points` | Show available shadow restore points | Before/after propose_commit, before risky changes |
| `undo_change` | Roll back to a restore point | When a change needs reverting without Git noise |

### Memory Graph Tools (knowledge graph)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `get_memory_graph` | Traverse project knowledge/feature graph | Understanding feature dependencies, onboarding |
| `update_memory_graph` | Update knowledge graph with new insights | After discovering important cross-cutting relationships |

## Workflow Patterns

### Pattern 1: Discover-Before-Read
```
INSTEAD OF: view_file(large_file.ts)  // 500 lines, wastes context
DO:          get_file_skeleton(large_file.ts)  // 20 lines, understand structure
THEN:        view_file(large_file.ts, start=45, end=80)  // read only what matters
```

### Pattern 2: Impact-Before-Edit
```
BEFORE refactoring:
  1. get_blast_radius(target_symbol)
  2. Review affected files/lines
  3. IF affected_files > 10 → escalate risk tier to HIGH
  4. Plan changes across all affected locations
  5. propose_commit(changes)  // if MEDIUM+ risk
  6. run_static_analysis()    // verify no regressions
```

### Pattern 3: Semantic-Trace-Debug
```
WHEN bug is reported:
  1. semantic_code_search("error handling for [feature]")
  2. semantic_identifier_search("[error_type]")
  3. get_blast_radius(suspected_function)
  4. Narrow scope → view relevant code → hypothesize → fix → verify
```

### Pattern 4: Feature-Discovery-Plan
```
BEFORE creating new feature:
  1. get_feature_hub()  // see existing feature clusters
  2. semantic_code_search("existing [similar_feature] implementation")
  3. IF similar pattern exists → reuse, don't reinvent
  4. get_context_tree()  // see where new code should live structurally
```

## Anti-Patterns

- ❌ **Trusting tool output blindly** — Always verify against tests/compile/runtime
- ❌ **Calling get_context_tree on every small task** — Use only for structural decisions
- ❌ **Skipping blast_radius before refactor** — This defeats the purpose of Context+
- ❌ **Using propose_commit for typo fixes** — LOW risk changes don't need guardrails
- ❌ **Replacing grep entirely** — Semantic search complements, not replaces, exact matching
- ❌ **Ignoring fallback mode** — When Context+ is down, proceed with manual tools

## Decision Matrix

| Situation | Use Context+? | Which Tools? |
|-----------|--------------|--------------|
| Starting new session | Yes | `get_context_tree` for structural map |
| Reading unfamiliar code | Yes | `get_file_skeleton` + `semantic_navigate` |
| Planning new feature | Yes | `get_feature_hub` + `semantic_code_search` |
| Bug investigation | Yes | `semantic_code_search` + `get_blast_radius` |
| Refactoring existing code | **Mandatory** | `get_blast_radius` + `propose_commit` + `run_static_analysis` |
| Typo/comment fix | No | Direct write is fine |
| Reading config files | No | Direct read is sufficient |
| Writing tests | Optional | `get_blast_radius` to find untested consumers |
| Code review | Yes | `run_static_analysis` + `get_blast_radius` on changed symbols |
| Schema migration | **Mandatory** | `get_blast_radius` on models/types + `propose_commit` |

## Monitoring & Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Ollama not running | `get_context_tree` returns connection error | Start Ollama, or proceed in manual mode |
| Model not pulled | Semantic search returns empty results | `ollama pull nomic-embed-text`, retry |
| Context+ server not starting | npx fails or times out | Check Node.js version, clear npx cache |
| Blast radius returns empty | Symbol not indexed yet | Run `get_context_tree` first to trigger indexing |
| propose_commit rejects change | Validation rules block save | Review rule violation, fix, retry |
| Stale index after file changes | Search returns outdated results | Delete `.mcp_data/`, restart server to reindex |

## Troubleshooting

### Context+ not responding
```bash
# Check Ollama
ollama list              # Should show nomic-embed-text and qwen2.5-coder:7b

# Check .mcp.json config
cat .mcp.json            # Verify context-plus entry exists

# Clear cache and restart
rm -rf .mcp_data/        # Force reindex on next server start
```

### Semantic search returning poor results
```bash
# Ensure embed model is correct
ollama pull nomic-embed-text   # Re-pull to get latest

# Force reindex
rm -rf .mcp_data/embeddings/   # Clear embeddings only
```

## Evidence & Receipts

When Context+ tools are used in a task, receipts should include:
```yaml
contextplus_used: true
tools_invoked: [get_blast_radius, run_static_analysis]
blast_radius_summary: "12 files affected, 3 direct importers"
restore_point_id: "rp-2026-03-28-001"
static_analysis_result: "0 errors, 2 warnings"
```
