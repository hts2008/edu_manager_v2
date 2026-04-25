---
description: "Deep context synchronization — audit codebase reality, cross-reference project state, sync to Dual-Brain ecosystem"
version: "2.0"
---

// turbo-all

## Overview

This workflow is the operational engine behind the `/deep-sync` command v2. It orchestrates a comprehensive 6-phase audit of project reality (codebase, KANBAN, memory) and synchronizes verified findings into Neural Memory + Context+ so AI Agents have an accurate, complete context map.

**Difference from `/start-session`**: Start-session is a lightweight boot (loads existing context). Deep-sync is a HEAVY audit (verifies context against reality, fixes drift, enriches brain).

**Difference from `/status`**: Status is read-only reporting. Deep-sync WRITES verified findings to NM, C+, and memory bank.

---

## §0 — Cognitive Framework

### Adversarial Default
Memory có thể OUTDATED. KANBAN có thể STALE. Brain có thể SAI.
**→ Chỉ tin CODE THỰC TẾ. Memory/KANBAN là claims cần VERIFY.**

### Core Constraints
1. **ĐỌC CODE THẬT** — không đoán từ file names. Mở file, đọc nội dung.
2. **TRUST CODE OVER MEMORY** — code là source of truth.
3. **KHÔNG sửa code** — chỉ sửa MEMORY/KANBAN/BRAIN.
4. **GHI CỤ THỂ** — drift phải ghi: nói X, thực tế Y, sửa thành Z.
5. **Hỏi user khi uncertain** — flag ❓ cho items không đủ data.
6. **Phase outputs chain** — Phase N output = Phase N+1 input. Không fabricate.

---

## Prerequisites

```
BEFORE executing deep-sync:
  1. Session must be active (/start-session or equivalent)
  2. KANBAN.md must be loaded
  3. Target project workspace must be accessible
  4. Neural Memory server should be reachable (graceful degradation OK)
  5. Context+ should be reachable (graceful degradation OK)
```

## Pre-Flight — Detect Execution Scope

```
INPUT: user flags (--scan-only, --sync-only, --phase N, --target, --dry-run)

IF --target specified:
  Set PROJECT_ROOT = target path
  Set PROJECT_NAME = basename(target path)
ELSE:
  Set PROJECT_ROOT = current workspace root
  Set PROJECT_NAME = from GEMINI.md §0.6 or KANBAN title

IF --scan-only: execute Phase 1-3 only
IF --sync-only: execute Phase 4-6 only (requires Phase 1-3 cache)
IF --phase N: execute only Phase N
IF --dry-run: set DRY_RUN=true (skip all writes)
```

---

## Phase 1: CODEBASE RECONNAISSANCE

**Duration**: 30-90 seconds | **Risk**: NONE (read-only) | **Tools**: Context+, file system, shell

```
STEP 1.1 — Structure Scan:
  PARALLEL:
    ├─ TRY get_context_tree(depth_limit=3, include_symbols=true, max_tokens=15000)
    │   → Captures full project structure with functions/classes
    ├─ TRY semantic_navigate() → clusters + module boundaries
    ├─ TRY list_dir(PROJECT_ROOT)
    │   → Captures top-level layout
    └─ git log -5 --oneline (if git repo)
        → Captures recent history
  
  FALLBACK (no Context+):
    # PowerShell — file inventory
    Get-ChildItem -Recurse -File |
      Where-Object { $_.FullName -notmatch 'node_modules|\.git|\.next|dist|build' } |
      Group-Object Extension | Sort-Object Count -Desc | Select-Object -First 20

    # Directory structure (2 levels)
    Get-ChildItem -Directory -Depth 2 |
      Where-Object { $_.FullName -notmatch 'node_modules|\.git|\.next' }
    
    # LOC count
    Get-ChildItem -Recurse -Include *.ts,*.tsx,*.py,*.js,*.jsx |
      Where-Object { $_.FullName -notmatch 'node_modules' } |
      Get-Content | Measure-Object -Line

  EXTRACT:
    - total_files: count of source files
    - total_dirs: count of directories
    - file_types: distribution map (.ts: N, .py: N, .md: N, ...)
    - config_files: [package.json, tsconfig.json, Dockerfile, docker-compose.yaml, ...]
    - entry_points: [src/index.ts, main.py, app.ts, ...]
    - monorepo: true/false (turbo.json, pnpm-workspace.yaml, lerna.json?)

STEP 1.2 — Tech Stack Detection:
  READ each config file found in 1.1:
    package.json → name, version, dependencies, devDependencies, scripts
    tsconfig.json → compilerOptions.target, module, paths
    requirements.txt / pyproject.toml → Python deps
    Cargo.toml → Rust deps
    go.mod → Go deps
    Dockerfile / docker-compose.yaml → runtime, services
    .env.example → environment variable catalog
    prisma/schema.prisma → DB models

  # Quick framework detection
  grep_search("next", package.json) → Next.js
  grep_search("nest", package.json) → NestJS
  grep_search("express", package.json) → Express
  grep_search("prisma", package.json) → Prisma
  grep_search("react", package.json) → React

  COMPILE tech_stack object:
    {
      languages: [{name, version}],
      frameworks: [{name, version, purpose}],
      databases: [{name, version, orm}],
      build_tools: [{name}],
      test_tools: [{name}],
      deploy_targets: [{platform, method}],
      dep_count: {production: N, dev: N}
    }

STEP 1.3 — Architecture Detection:
  PARALLEL:
    ├─ TRY semantic_code_search("API routes, controllers, endpoints")
    ├─ TRY semantic_code_search("database models, schemas, entities")
    ├─ TRY semantic_code_search("services, business logic, domain")
    └─ TRY semantic_code_search("authentication, authorization, guards")
  
  FALLBACK (no C+):
    ├─ grep_search("router|controller|handler", *.ts *.py)
    ├─ grep_search("model|entity|schema", *.ts *.py)
    ├─ grep_search("service|usecase|domain", *.ts *.py)
    └─ grep_search("auth|guard|middleware", *.ts *.py)
  
  CLASSIFY:
    architecture_pattern: from file organization + detected patterns
    module_count: number of distinct modules/features
    api_endpoint_count: approximate from route files
    model_count: from entity/model files

STEP 1.4 — Feature Inventory:
  # API endpoints (NestJS/Express/FastAPI)
  grep_search("@Get|@Post|@Put|@Delete|@Patch|router.get|router.post|@app.get|@app.post",
              includes=["*.ts", "*.py", "*.js"])

  # Frontend routes/pages
  find: app/**/page.tsx, pages/**/*.tsx, routes/**

  # Database models
  grep_search("^model ", prisma/schema.prisma)  OR equivalent

  # Test files count
  find: *.test.*, *.spec.*, __tests__/

  # Services / Business logic
  find: *service*, *controller*, *repository*

STEP 1.5 — Code Health Check:
  # Build
  TRY: npm run build 2>&1 | tail -5
  CAPTURE: build_status = PASS/FAIL + error summary

  # Lint
  TRY: npm run lint 2>&1 | tail -10
  CAPTURE: lint_status = PASS/FAIL + error count + warning count

  # Tests
  TRY: npm test 2>&1 | tail -10
  CAPTURE: test_status = PASS/FAIL + pass count + fail count

  # Type check (if TypeScript)
  TRY: npx tsc --noEmit 2>&1 | tail -10
  CAPTURE: type_status = PASS/FAIL + error count

  # Static analysis (Context+)
  IF Context+ available:
    TRY run_static_analysis(target_path=PROJECT_ROOT)
    → Captures: lint warnings, type errors, unused vars, dead code count

  # Git status
  git status --short → uncommitted_files
  git log --oneline -10 → recent_history

STEP 1.6 — Code Metrics:
  total_loc: estimate from file scan
  largest_files: top 10 by size
  test_file_count: from 1.4

EMIT → codebase_scan_result (internal, not written to disk yet)
```

---

## Phase 2: PROJECT STATE AUDIT

**Duration**: 15-30 seconds | **Risk**: NONE (read-only) | **Tools**: file system

```
STEP 2.1 — KANBAN Analysis:
  READ KANBAN.md → parse all sprint sections
  
  EXTRACT per sprint:
    - sprint_name, sprint_status
    - tasks: [{id, description, agent, status, evidence}]
  
  COMPUTE:
    - total_tasks: count all
    - by_status: {IMPLEMENTED: N, IN_PROGRESS: N, PLANNED: N, BLOCKED: N, ...}
    - completion_rate: IMPLEMENTED / total * 100
    - tasks_without_evidence: [tasks with IMPLEMENTED but empty evidence]
    - stale_tasks: [PLANNED for >90 days, IN_PROGRESS for >30 days]
    - blocked_tasks: [{id, blocker_reason, days_blocked}]
    - orphan_tasks: [tasks with no agent assigned]

STEP 2.2 — Memory Bank Analysis (ALL 7 files — report CÓ/TRỐNG):
  READ EACH file individually, report status:

  1. projectBrief.md
     → Status: CÓ NỘI DUNG / TRỐNG
     → Summary: [2-3 câu tóm tắt]
     → Last updated: [date from git or file]

  2. productContext.md
     → Status: CÓ / TRỐNG
     → Summary: [users, problems, UX goals]

  3. techContext.md
     → Status: CÓ / TRỐNG
     → Summary: [stack, deps, commands]
     → CRITICAL CHECK: does recorded stack MATCH Phase 1 detected stack?

  4. systemPatterns.md
     → Status: CÓ / TRỐNG
     → Summary: [architecture, patterns]
     → CRITICAL CHECK: patterns MATCH actual code?

  5. activeContext.md
     → Status: CÓ / TRỐNG
     → Summary: [current focus, known issues]
     → CRITICAL CHECK: "Đang Làm" matches actual git activity?

  6. progress.md
     → Status: CÓ ([N] entries) / TRỐNG
     → Last entry: [date + task]
     → Gap analysis: any gaps >7 days?

  7. decisionLog.md
     → Status: CÓ ([N] decisions) / TRỐNG
     → Last decision: [date + DEC-ID]
     → Any reversed without evidence?

  FLAG anomalies:
    - activeContext references non-existent files → STALE_REFERENCE
    - techContext lists dep not in actual package.json → TECH_DRIFT
    - progress.md gap >7 days between entries → SESSION_GAP
    - decisionLog has reversed decision without evidence → POLICY_VIOLATION
    - patterns in systemPatterns not found in code → DEAD_PATTERN

STEP 2.3 — Brain Analysis (ALL 4 files):
  READ:
    1. learned-patterns.md
       → Status: CÓ ([N] patterns) / TRỐNG
       → Patterns still applicable to current stack?

    2. error-catalog.md
       → Status: CÓ ([N] errors) / TRỐNG
       → Each error: ACTIVE / RESOLVED / STALE?

    3. model-preferences.md
       → Status: CÓ / TRỐNG
       → Model routing still valid for project?

    4. project-insights.md
       → Status: CÓ ([N] insights) / TRỐNG
       → Insights still relevant?

STEP 2.4 — Session History:
  READ:
    ├─ current-session.md → any incomplete work?
    ├─ handoff.md → any unhandled handoff?
    └─ session-events.jsonl → session frequency stats

STEP 2.5 — Evidence Audit:
  LIST receipts/ → total receipt count
  CROSS with KANBAN:
    - implemented_without_receipt = [tasks IMPLEMENTED but no receipt file]
    - orphan_receipts = [receipts with no matching KANBAN task]

EMIT → project_state_result with per-file status table
```

---

## Phase 3: CROSS-REFERENCE & GAP ANALYSIS

**Duration**: 20-40 seconds | **Risk**: NONE (analysis only) | **Tools**: comparison logic

```
STEP 3.1 — Code ↔ KANBAN:
  FOR each task with status=IMPLEMENTED in KANBAN:
    IF evidence mentions specific files:
      VERIFY files exist in codebase
      IF missing → add to gaps: { type: "STALE", item: task.id, detail: "claimed file missing" }

  FOR each task with status=IN_PROGRESS:
    CHECK: recent git activity? uncommitted changes in related files?
    IF no activity → add: { type: "STALE", item: task.id, detail: "IN PROGRESS but no recent activity" }

  FOR each task with status=BLOCKED:
    CHECK: block reason still valid? dependency resolved?
    IF resolved → add: { type: "DRIFT", item: task.id, detail: "blocker resolved but status not updated" }

  FOR major source directories:
    IF directory not mentioned in any KANBAN task:
      add to gaps: { type: "UNTRACKED", item: dir_path, detail: "no KANBAN coverage" }

STEP 3.2 — Memory ↔ Code:
  COMPARE techContext.tech_stack vs Phase1.tech_stack:
    FOR each delta:
      IF in code but not in techContext → { type: "UNDOCUMENTED", detail: "dep in code, not in docs" }
      IF in techContext but not in code → { type: "STALE", detail: "dep in docs, not in code" }

  COMPARE systemPatterns vs actual code:
    FOR each pattern:
      IF pattern.example_file doesn't exist → { type: "DEAD_PATTERN" }
      IF new pattern found in code → { type: "MISSING_PATTERN" }

  COMPARE activeContext vs reality:
    → "Đang Làm" có evidence active? (git diff? recent commits?)  
    → "Lỗi Đã Biết" vẫn tồn tại? Hay đã fix?

STEP 3.3 — Decision Verification:
  FOR each decision in decisionLog:
    IF decision says "use X instead of Y":
      CHECK: is X used? is Y removed?
      MARK: VERIFIED / PARTIAL / NOT_IMPLEMENTED / REVERSED

STEP 3.4 — Brain ↔ Reality:
  FOR each learned-pattern → still used in code?
  FOR each error-catalog entry → still exists or resolved?
  FOR each model-preference → still valid for current stack?
  FOR each project-insight → still relevant?

STEP 3.5 — Categorize All Gaps:
  SORT by severity:
    🔵 CONTRADICTION (memory says X, code says Y) → P0
    🔴 MISSING (exists but undocumented) → P1
    ⚫ STALE (documented but doesn't exist) → P2
    🟡 DRIFT (partially wrong) → P3
    🟢 ALIGNED → info only
    ❓ UNCERTAIN → needs user input

  COMPUTE scores:
    documentation_score = aligned / (aligned + drift + stale + missing) * 100
    kanban_coverage = tasks_with_evidence / total_implemented * 100
    memory_accuracy = (1 - anomaly_count / total_memory_items) * 100

EMIT → gap_report
```

---

## Phase 4: RECONCILE & SYNC

**Duration**: 60-120 seconds | **Risk**: LOW-MEDIUM (writes to memory + NM) | **Tools**: file system, NM MCP

```
IF DRY_RUN:
  REPORT "Would update N memory files, store N NM memories, fix N KANBAN tasks"
  SKIP actual writes

--- STEP 4.1: Memory Bank File Updates ---

FOR EACH DRIFT or STALE finding from Phase 3:

  techContext.md → update stack/deps per code scan reality:
    - Dependencies: [from actual package.json]
    - Commands: [from actual scripts section]
    - Database: [from actual docker-compose + schema]

  systemPatterns.md → update patterns per actual code:
    - Architecture: [describe REAL architecture from code]
    - Patterns: [patterns ACTUALLY used, not aspirational]
    - Key files: [mapping module → actual file paths]

  activeContext.md → REWRITE based on reality:
    ## Đang Làm
    [tasks ACTUALLY IN PROGRESS — evidence: recent commits/uncommitted]

    ## Vừa Hoàn Thành
    [tasks with evidence DONE — tests pass, code exists]

    ## Lỗi Đã Biết
    [errors ACTUALLY existing — build fail? test fail?]

    ## Technical State
    Build: [status] | Lint: [status] | Tests: [status] | Types: [status]

  progress.md → APPEND reconciliation entry (NEVER overwrite):
    "[Date] DEEP-SYNC: Reconciled memory with codebase.
     Found [N] drifts, [M] stale, [K] untracked. Memory updated."

  decisionLog.md → APPEND if decisions exist in code but not logged:
    "[Date] RETROSPECTIVE DECISION: [decision inferred from code]
     Evidence: [code pattern/config]. Note: existed in code but wasn't logged."

  projectBrief.md → update if trống or outdated
  productContext.md → update if trống or outdated

--- STEP 4.2: Brain File Updates ---

  learned-patterns.md:
    → REMOVE patterns not used in current code
    → ADD patterns found in code but not recorded

  error-catalog.md:
    → MARK errors as RESOLVED if code + tests confirm fix
    → ADD new errors from Phase 1 health check

  model-preferences.md:
    → UPDATE if project tech stack changed

  project-insights.md:
    → ADD insights from reconciliation findings

--- STEP 4.3: KANBAN Updates ---

  Tasks DONE but code MISSING → flag for REVIEW
  Tasks IN PROGRESS but no activity → mark STALE or BLOCKED
  Tasks BLOCKED but block resolved → update to IN PROGRESS
  Untracked features → create retroactive tasks:
    | T-NEW-XXX | [feature found] | IMPLEMENTED | [file paths] |
  Update Snapshot section: recalculate counts

--- STEP 4.4: Neural Memory Sync ---

  IF NM available:
    4.4a — Recall Existing:
      PARALLEL:
        ├─ nmem_recall("project architecture tech stack", compact=true)
        ├─ nmem_recall("recent decisions errors patterns", compact=true)
        └─ nmem_health(compact=true)
      DIFF: what NM knows vs. what we found

    4.4b — Store Verified Facts:
      nmem_remember_batch(memories=[
        { type: "fact", content: "[Project] stack: [tech list]", priority: 7, tags: ["deep-sync", "tech-stack"] },
        { type: "fact", content: "[Project] architecture: [pattern]. [N] modules", priority: 7, tags: ["deep-sync", "architecture"] },
        { type: "context", content: "Sprint [N]: [X]% complete. Active: [list].", priority: 8, tags: ["deep-sync", "sprint-state"] },
        { type: "fact", content: "[Project]: [N] source files, ~[N] LOC", priority: 5, tags: ["deep-sync", "metrics"] }
      ])

    4.4c — Store Active Decisions:
      FOR each non-stale decision:
        nmem_remember(type="decision", content=decision.text, tags=["deep-sync", "decision"])

    4.4d — Store Active Errors:
      FOR each ACTIVE error:
        nmem_remember(type="error", content=error.text, tags=["deep-sync", "error-catalog"])

    4.4e — Store Gap Insights:
      FOR each P0 or P1 gap:
        nmem_remember(type="insight", content="Gap: [desc]. Action: [recommendation]", tags=["deep-sync", "gap"])

    4.4f — Consolidate Brain:
      nmem_consolidate(strategy="enrich", compact=true)
      nmem_consolidate(strategy="dream", compact=true)
      nmem_consolidate(strategy="semantic_link", compact=true)
      nmem_health(compact=true) → capture post-sync grade
```

---

## Phase 5: CONTEXT+ SYNC

**Duration**: 10-20 seconds | **Risk**: NONE | **Tools**: C+ MCP

```
STEP 5.1 — Verify Index:
  TRY get_context_tree(depth_limit=1)
  IF success:
    cp_status = "ACTIVE"
    Record: indexed file count, last index time
  ELSE:
    cp_status = "UNAVAILABLE"
    REPORT "Context+ not available — semantic features degraded"

STEP 5.2 — Feature Hub Audit:
  IF cp_status == "ACTIVE":
    TRY get_feature_hub(show_orphans=true)
    Record: hub count, orphan file count

STEP 5.3 — Semantic Index Refresh:
  IF Ollama available AND cp_status == "ACTIVE":
    TRY semantic_navigate(max_clusters=15, max_depth=2)
    → Captures semantic cluster map
    Store cluster labels as context for NM

STEP 5.4 — Memory Graph Sync:
  IF C+ memory graph available:
    Create memory nodes for key modules/services
    Create edges: depends_on, implements relationships
```

---

## Phase 6: SYNTHESIS & REPORT

**Duration**: 15-30 seconds | **Risk**: LOW (writes to memory bank) | **Tools**: file system

```
STEP 6.1 — Compute Health Scores:
  codebase_health = based on: build/lint/test/type results, file organization
  documentation_health = documentation_score from Phase 3
  memory_health = memory_accuracy from Phase 3
  kanban_health = kanban_coverage from Phase 3
  nm_health = brain grade from Phase 4
  cp_health = index status from Phase 5
  overall = weighted_avg(codebase:25, docs:15, memory:15, kanban:15, nm:15, cp:15)

STEP 6.2 — Generate Recommendations:
  PRIORITY sort:
    P0: Any 🔵 CONTRADICTION gaps → immediate fix required
    P1: Any 🔴 MISSING documentation → document before forgetting
    P2: NM grade < B → schedule consolidation
    P3: Stale references → cleanup pass
    P4: C+ not indexed → run /start-session from project workspace

STEP 6.3 — Update Memory Bank (unless DRY_RUN, final pass):
  UPDATE activeContext.md → replace with verified current state
  APPEND progress.md → "Deep-sync [date]: [1-line summary]"
  UPDATE techContext.md → if tech_drift found
  UPDATE systemPatterns.md → if dead patterns or new patterns found

STEP 6.4 — Emit Report Artifact:
  CREATE docs/artifacts/deep-sync-report-[YYYYMMDD].md
  WITH full formatted report (see command output format)

STEP 6.5 — Update KANBAN:
  IF gaps found that need tasks:
    ADD new PLANNED tasks for P0/P1 gaps
    UPDATE sprint snapshot counts
  ADD reconciliation note:
    "## Reconciliation [Date]
     Memory synced with codebase reality. [N] tasks added. [M] statuses corrected."
```

---

## Exit Conditions

| Condition | Result |
|-----------|--------|
| All 6 phases complete, report emitted | ✅ Deep-sync complete |
| Phase 1-3 complete (--scan-only) | ✅ Scan complete, no writes made |
| Phase 4-6 complete (--sync-only) | ✅ Sync complete using cached scan |
| NM/C+ both unreachable | ⚠️ Partial — scan completed, sync skipped |
| KANBAN.md not found | ⚠️ Partial — created minimal KANBAN from scan |
| Critical error | ❌ Abort — save partial results to report |

## DEFINITION OF DONE

```
☐ Phase 1: Codebase inventory complete (stack, modules, endpoints, models, tests, health check)
☐ Phase 2: Memory state inventory (7 memory-bank + 4 brain + KANBAN — per-file CÓ/TRỐNG status)
☐ Phase 3: Cross-check findings (≥5 items checked, all mismatches listed with categories)
☐ Phase 4: Memory/KANBAN/Brain files updated to match code reality + NM synced
☐ Phase 5: Context+ status checked and indices refreshed (or degradation logged)
☐ Phase 6: Project State Report delivered (full format) + artifact emitted
☐ Post-sync: progress.md + activeContext.md updated
☐ Final: No claim in memory contradicts code reality
```

## Integration Points

| System | Connection |
|--------|-----------|
| `/start-session` | May trigger deep-sync if brain grade ≤ D or first session |
| `/pm` | May suggest deep-sync for onboarding or stale context |
| `/consolidate` | Deep-sync Phase 4 includes consolidation |
| `/status` | Status report is a subset of deep-sync Phase 6 |
| `Neural Memory` | Phase 4 stores verified facts, decisions, errors, insights |
| `Context+` | Phase 5 verifies and refreshes semantic indices |
| `memory-bank/` | Phase 4 & 6 update all memory files with verified state |

## Performance Notes

- **Full deep-sync**: ~3-5 minutes for medium project (100-500 files)
- **Large projects** (>2000 files): may take 5+ minutes; use `--phase` for targeted audits
- **Resource usage**: primarily reads; NM writes are batched to minimize API calls
- **Frequency**: NOT for every session. Recommended: weekly, post-sprint, post-migration, or when brain grade drops 2+ levels
