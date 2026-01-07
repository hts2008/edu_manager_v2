# ⛓️ WORKFLOW CHAINS PLAYBOOK
<!-- VI: Playbook cho automated workflow chains -->

> **Mục tiêu**: Tự động hóa workflow bằng cách chain các commands

---

## 📋 WORKFLOW CHAINS LÀ GÌ?

**Workflow Chain** = Chuỗi commands tự động chạy theo thứ tự:
```
/plan → /code → /test → /review → /git:cm
```

**Benefits:**
- Automation cho repetitive workflows
- Consistency trong process
- Faster development cycle

---

## 1. CORE WORKFLOW CHAINS

### Chain 1: Feature Development
```
/plan → /code → /test → /git:cm
```

```markdown
## AGENTIC PROMPT: Feature Chain

/chain feature "[feature description]"

Tự động thực hiện:
1. /plan - Tạo implementation plan
2. /code - Implement theo plan
3. /test - Viết và chạy tests
4. /git:cm - Commit với conventional message

Stop conditions:
- Plan needs user approval → stop, wait approval
- Tests fail → stop, show errors
- Review issues → stop, show issues
```

### Chain 2: Bug Fix
```
/debug → /fix → /test → /git:cm
```

```markdown
## AGENTIC PROMPT: Bug Fix Chain

/chain fix "[bug description]"

Tự động thực hiện:
1. /debug - Tìm root cause
2. /fix - Implement fix
3. /test - Verify fix và regression
4. /git:cm - Commit fix

Stop conditions:
- Can't find cause → stop, ask for info
- Fix breaks other tests → stop, show failures
```

### Chain 3: Code Review
```
/review → /refactor → /test → /git:cm
```

```markdown
## AGENTIC PROMPT: Review Chain

/chain review

Tự động thực hiện:
1. /review - Review code quality
2. /refactor - Fix issues found
3. /test - Verify refactoring
4. /git:cm - Commit improvements

Stop conditions:
- Critical issues → stop, report and wait
- Major refactor needed → stop, create plan
```

### Chain 4: Deploy
```
/test → /security-audit → /build → /deploy
```

```markdown
## AGENTIC PROMPT: Deploy Chain

/chain deploy [environment]

Tự động thực hiện:
1. /test - Run full test suite
2. /security-audit - Security check
3. /build - Build production bundle
4. /deploy - Deploy to environment

Stop conditions:
- Tests fail → stop, no deploy
- Security issues → stop, report
- Build fail → stop, fix errors
```

---

## 2. CUSTOM CHAIN CREATION

### Định Nghĩa Chain

```markdown
## AGENTIC PROMPT: Create Custom Chain

/chain:create [chain_name]

Define chain với:

## Chain: [name]
## Purpose: [what it does]

Steps:
1. [command] - [description]
   |__ on_success: continue
   |__ on_fail: [stop/retry/skip]
2. [command] - [description]
   |__ on_success: continue
   |__ on_fail: [action]
3. ...

Save to: .agent/chains/[chain_name].yaml
```

### Chain Configuration
```yaml
# .agent/chains/feature.yaml
name: feature
description: Feature development chain
steps:
  - command: /plan
    on_success: continue
    on_fail: stop
    user_approval: true
    
  - command: /code
    on_success: continue
    on_fail: stop
    
  - command: /test
    on_success: continue
    on_fail: retry_once
    
  - command: /git:cm
    on_success: complete
    on_fail: stop
```

---

## 3. CHAIN CONTROL

### Pause Chain
```
/chain:pause
# Chain pauses, can resume later
```

### Resume Chain
```
/chain:resume
# Continue from where paused
```

### Skip Step
```
/chain:skip
# Skip current step, move to next
```

### Abort Chain
```
/chain:abort
# Cancel entire chain, cleanup
```

---

## 4. AGENTIC PROMPTS FOR CHAINS

### Start Feature Chain
```markdown
/chain feature "User authentication with OAuth"

Chain: feature
Description: Develop feature end-to-end

Expected flow:
1. Plan: Create implementation plan
2. Code: Implement feature
3. Test: Write and run tests
4. Commit: Commit with message

I'll stop if action needed.
```

### Start Deploy Chain
```markdown
/chain deploy production

Chain: deploy
Target: production

Pre-checks:
- Tests must pass
- Security audit must pass
- Build must succeed

Proceed with deployment chain.
```

### Create Custom Chain
```markdown
/chain:create api-development

## Chain: api-development
## Purpose: Develop new API endpoint

Steps:
1. /search:docs - Check best practices
2. /plan - Design API
3. /code - Implement endpoint
4. /test - Write API tests
5. /docs:update - Update API docs
6. /git:cm - Commit
```

---

## 5. BUILT-IN CHAINS

| Chain | Commands | Purpose |
|-------|----------|---------|
| `feature` | plan → code → test → commit | Feature development |
| `fix` | debug → fix → test → commit | Bug fixing |
| `review` | review → refactor → test → commit | Code improvement |
| `deploy` | test → audit → build → deploy | Deployment |
| `docs` | analyze → write → review → commit | Documentation |
| `refactor` | plan → refactor → test → commit | Refactoring |

---

## 6. LỆNH REFERENCE

| Command | Description |
|---------|-------------|
| `/chain [name] [args]` | Run named chain |
| `/chain:create [name]` | Create new chain |
| `/chain:list` | List all chains |
| `/chain:show [name]` | Show chain definition |
| `/chain:pause` | Pause current chain |
| `/chain:resume` | Resume paused chain |
| `/chain:skip` | Skip current step |
| `/chain:abort` | Abort chain |

---

## 7. BEST PRACTICES

### ✅ NÊN
- Use chains cho repetitive workflows
- Define clear stop conditions
- Set user approval points
- Handle failures gracefully

### ❌ KHÔNG NÊN
- Run chains blindly
- Skip approval points
- Ignore stop conditions
- Chain too many steps

---

## 8. EXAMPLES

### Example 1: Full Feature Chain
```
/chain feature "Add user profile page"

Running chain: feature
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Step 1/4: /plan - Created plan
⏸ Waiting for plan approval...
> User: approved
✓ Step 2/4: /code - Implemented
✓ Step 3/4: /test - 24/24 passed
✓ Step 4/4: /git:cm - Committed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Chain completed successfully
```

### Example 2: Chain with Failure
```
/chain fix "Login button not working"

Running chain: fix
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Step 1/4: /debug - Found cause
✓ Step 2/4: /fix - Applied fix
✗ Step 3/4: /test - 2 tests failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏹ Chain stopped: Test failures

Failed tests:
- auth.test.ts: Login redirect
- auth.test.ts: Session handling

Action: Fix tests and /chain:resume
```

---

**Version**: 3.0
**Last Updated**: 2026-01-04
