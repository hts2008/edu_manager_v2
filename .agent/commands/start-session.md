---
description: "Boot sequence for UAC workspace — detects mode (fresh/resume/warm-up), loads context, reports status, recommends next action"
---

# /start-session

> UAC runtime boot sequence. Must be invoked at the start of every session or new chat window.

## Mode Detection

Before executing any steps, detect which mode applies:

```
IF KANBAN.md does NOT exist OR memory/memory-bank/activeContext.md does NOT exist:
  → MODE A: Fresh Init

ELSE IF memory/sessions/handoff.md has content AND memory/sessions/current-session.md has content:
  → MODE C: New Chat Warm-Up (context window reset, project is active)

ELSE:
  → MODE B: Resume Existing Project
```

Report detected mode: `"Session mode detected: [MODE A/B/C] — [reason]"`

---

## MODE A — Fresh Init (No project memory exists)

1. **Verify repo structure**. Check that these directories exist:
   - `agents/`, `commands/`, `workflows/`, `skills/`, `rules/`
   - `memory/memory-bank/`, `memory/brain/`, `memory/sessions/`
   - `manifests/`, `policies/`, `scripts/`
   - `.agent/`, `.gemini/`
   - Report: `"Repo structure: [X]/12 directories present"`

2. **Run project discovery questionnaire**. Ask the user:
   - What is the project name?
   - What tech stack? (language, framework, database, deployment target)
   - What is the primary goal of this project?
   - Who is the target user?
   - Are there existing files/code to onboard?

3. **Initialize memory-bank**. Create or populate:
   - `memory/memory-bank/activeContext.md` — with project name, stack, current focus
   - `memory/memory-bank/progress.md` — with entry: "Session 1: Project initialized"
   - `memory/memory-bank/decisionLog.md` — empty template with DEC-001 placeholder
   - `memory/memory-bank/techContext.md` — with stack info from questionnaire
   - `memory/memory-bank/systemPatterns.md` — empty, to be filled during development
   - `memory/memory-bank/projectBrief.md` — with project goal and target user
   - `memory/memory-bank/productContext.md` — with product description

4. **Initialize KANBAN.md**. Create with:
   ```markdown
   # KANBAN — [Project Name]
   **Sprint**: INIT-001 — Project Setup
   **Last Updated**: [now]
   **Status**: 🚀 STARTING
   ## Snapshot
   - PLANNED: 0
   - IN PROGRESS: 0
   - IMPLEMENTED: 0
   ```

5. **Initialize session files**:
   - `memory/sessions/current-session.md` — with session start timestamp and objective
   - `memory/sessions/handoff.md` — empty (no previous session)

6. **Routing sanity check**. Verify:
   - `GEMINI.md` exists at workspace root
   - `agents/registry.yaml` exists and is parseable
   - `manifests/routing.yaml` exists
   - Report any missing files

7. **Output: Ready-to-Work Report**:
   ```
   🟢 PROJECT INITIALIZED
   Project: [name]
   Stack: [tech stack]
   Sprint: INIT-001
   Memory: Initialized (7 files)
   KANBAN: Created
   Next recommended action: Define first user story / create sprint plan
   ```

---

## MODE B — Resume Existing Project

1. **Load KANBAN (Operational Truth)**. Read `KANBAN.md` and extract:
   - Current sprint name and status
   - Count: PLANNED / IN PROGRESS / IMPLEMENTED / BLOCKED
   - Any tasks marked BLOCKED — extract blocker reason
   - The most recent IN PROGRESS task (= resume target)

2. **Load Memory (Cognitive Truth)** in priority order:
   - `memory/memory-bank/activeContext.md` — current focus, known issues, active decisions
   - `memory/memory-bank/progress.md` — last 5 entries only
   - `memory/memory-bank/decisionLog.md` — scan for unresolved decisions
   - `memory/memory-bank/techContext.md` — stack, versions, dependencies
   - `memory/memory-bank/systemPatterns.md` — established patterns to follow

3. **Load Brain (Pattern Memory)**:
   - `memory/brain/learned-patterns.md` — patterns to reuse
   - `memory/brain/error-catalog.md` — errors to watch for

4. **Health Check**. Verify:
   - KANBAN and activeContext agree on current sprint (no desync)
   - No orphan tasks (IN PROGRESS with no recent progress entry)
   - No stale blockers (BLOCKED > 3 sessions without unblock attempt)
   - Report: `"Health: [HEALTHY/WARNING/CRITICAL] — [details]"`

5. **Detect Active Story/Phase/Task**:
   - Find the highest-priority IN PROGRESS task
   - If none, find the highest-priority PLANNED task
   - If all IMPLEMENTED, suggest next sprint planning

6. **Output: Resume Report**:
   ```
   🔄 RESUMING PROJECT
   Sprint: [name] — [X] done, [Y] in progress, [Z] blocked
   Last session: [summary from progress.md last entry]
   Active task: [task ID + description]
   Blockers: [list or "none"]
   Recent decisions: [last 2 from decisionLog]
   Health: [HEALTHY/WARNING/CRITICAL]
   ▶ Recommended: Continue [task ID] — [specific next step]
   ```

---

## MODE C — New Chat Warm-Up (Context Window Reset)

1. **Load Handoff (Previous Session State)**. Read `memory/sessions/handoff.md`:
   - What was done last session
   - What is partially done
   - What is blocked
   - What should be done next
   - What must not be forgotten

2. **Load Current Session Snapshot**. Read `memory/sessions/current-session.md`:
   - Current objective
   - Active task ID
   - Files touched
   - Pending validations
   - Unresolved risks

3. **Load KANBAN (Operational Truth)**. Same as MODE B step 1.

4. **Load Memory (Cognitive Truth)**. Same as MODE B step 2 (full priority load).

5. **Reconstruct Working State**:
   - From handoff: identify the exact stopping point
   - From current-session: identify files that were being edited
   - If those files still exist, read first 20 lines of each to re-establish familiarity

6. **Check Environment State** (if project has build/test tooling):
   - `git status` — any uncommitted changes?
   - `git log -3 --oneline` — last 3 commits for context
   - If `package.json` exists: check if `node_modules/` exists
   - Report: `"Environment: [clean/dirty] — [details]"`

7. **Output: Context Recovery Report**:
   ```
   ♻️ CONTEXT RECOVERED (new chat window)
   Previous session: [summary from handoff]
   Stopping point: [from handoff.what_is_partially_done]
   Active task: [task ID from current-session]
   Files in progress: [list from current-session.files_touched]
   Git state: [clean/dirty + uncommitted file count]
   Pending validations: [from current-session]
   ▶ You are here: [specific location in workflow]
   ▶ Next step: [from handoff.what_should_be_done_next]
   ```

---

## Post-Session Hooks

At the end of every session (or when context window reaches ~80% capacity):

1. Update `memory/sessions/current-session.md` with current state
2. Update `memory/sessions/handoff.md` with what-was-done / what-next
3. Append `memory/memory-bank/progress.md` with session summary
4. Update `memory/memory-bank/activeContext.md` with current focus
5. Sync `KANBAN.md` with all task status changes
6. If new decisions were made → append `decisionLog.md`
7. If new patterns discovered → append `learned-patterns.md`
8. If new errors encountered → append `error-catalog.md`

Reference: `workflows/session-close.md` for full close protocol.
