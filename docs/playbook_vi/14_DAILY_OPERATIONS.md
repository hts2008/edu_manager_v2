# 📅 DAILY OPERATIONS PLAYBOOK
<!-- VI: Playbook vận hành hàng ngày cho Product Team -->

> **Mục tiêu**: Các agentic prompts sẵn sàng copy-paste cho hoạt động hàng ngày của Product Team

---

## 📋 MỤC LỤC

1. [Sprint Planning](#1-sprint-planning)
2. [Daily Standup](#2-daily-standup)
3. [Feature Development](#3-feature-development)
4. [Bug Fix](#4-bug-fix)
5. [Code Review](#5-code-review)
6. [Deployment](#6-deployment)
7. [Performance Optimization](#7-performance-optimization)
8. [Security Audit](#8-security-audit)
9. [Documentation](#9-documentation)
10. [Emergency Response](#10-emergency-response)

---

## 1. SPRINT PLANNING

### Agentic Prompt: Khởi Động Sprint

```markdown
@file .agent/ORCHESTRATOR.instructions.md
@file PROJECT_CONTEXT.md
@file KANBAN.md

Bạn là ORCHESTRATOR Agent. Thực hiện Sprint Planning cho Sprint mới:

1. Đọc backlog từ KANBAN.md (cột BACKLOG)
2. Đọc PROJECT_CONTEXT.md để hiểu goals hiện tại
3. Prioritize tasks theo:
   - Business value (High/Medium/Low)
   - Technical dependencies
   - Risk level
4. Estimate effort (story points: 1, 2, 3, 5, 8, 13)
5. Assign tasks cho agents phù hợp:
   - @backend: API, database, server logic
   - @frontend: UI, UX, client logic
   - @fullstack: Features end-to-end
   - @qa: Testing
   - @security: Security review
6. Update KANBAN.md với sprint mới
7. Update PROJECT_CONTEXT.md với sprint goals

Output mong đợi:
- Sprint name và dates
- Sprint goals (2-3 objectives)
- Task list với story points và assignees
- Capacity planning
```

### Lệnh nhanh
```
/start-session
Thực hiện Sprint Planning cho sprint mới.
```

---

## 2. DAILY STANDUP

### Agentic Prompt: Standup Buổi Sáng

```markdown
@file .agent/ORCHESTRATOR.instructions.md
@file PROJECT_CONTEXT.md
@file KANBAN.md

Thực hiện Daily Standup:

1. **Yesterday** - Hôm qua làm được gì:
   - Đọc KANBAN.md cột DONE
   - Tóm tắt tasks đã hoàn thành

2. **Today** - Hôm nay làm gì:
   - Đọc KANBAN.md cột IN_PROGRESS và TODO
   - List tasks planned cho hôm nay

3. **Blockers** - Có gì đang chặn:
   - Tìm items có tag [BLOCKED]
   - Đề xuất giải pháp

4. **Update Status**:
   - Di chuyển tasks đúng cột
   - Update progress %
   - Flag risks nếu có

Output format:
✅ Yesterday: [list]
📋 Today: [list]
🚧 Blockers: [list hoặc "None"]
```

### Lệnh nhanh
```
/status
```

---

## 3. FEATURE DEVELOPMENT

### Agentic Prompt: Phát Triển Feature Mới

```markdown
@file .agent/ORCHESTRATOR.instructions.md
@file .agent/workflows/09_cook.md

Yêu cầu phát triển tính năng: [FEATURE_NAME]

## Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Tech Constraints
- Tech stack: [từ PROJECT_CONTEXT.md]
- Architecture: [từ .shared/tech_stacks/architectures/]

## Acceptance Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] [Criteria 3]

Workflow yêu cầu:
1. /plan - Lập kế hoạch implementation
2. /code - Implement code
3. /test - Viết và chạy tests
4. /review - Code review
5. /git:cm - Commit với conventional message
```

### Lệnh nhanh
```
/cook "[feature description]"
```

### Autocook (không cần review plan)
```
/cook:auto "[feature description]"
```

### Fast cook (skip research)
```
/cook:auto:fast "[feature description]"
```

---

## 4. BUG FIX

### Agentic Prompt: Sửa Bug

```markdown
@file .agent/EMERGENCY_RCA.md
@file .agent/agents/qa_engineer.agent.md

## Bug Report
- **ID**: BUG-[XXX]
- **Severity**: [critical/high/medium/low]
- **Component**: [component name]

## Description
[Mô tả lỗi chi tiết]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[Kết quả mong đợi]

## Actual Behavior
[Kết quả thực tế]

## Environment
- Browser/Device: [info]
- Version: [info]

---

Workflow yêu cầu:
1. Reproduce bug
2. Identify root cause (5 Whys)
3. Fix bug
4. Write regression test
5. Update bug status
6. Document lessons learned
```

### Lệnh nhanh
```
/fix:hard "[bug description]"
```

### Fix từ logs
```
/fix:logs
```

### Fix failing tests
```
/fix:test
```

### Fix CI failures
```
/fix:ci [ci_job_url]
```

---

## 5. CODE REVIEW

### Agentic Prompt: Review Code

```markdown
@file .agent/agents/tech_lead.agent.md
@file .agent/agents/security.agent.md

Review code changes trong PR/commit sau:

## Files Changed
- [file1.ts]
- [file2.ts]

## Review Checklist

### Code Quality
- [ ] Follows coding standards
- [ ] Clean, readable code
- [ ] Proper naming conventions
- [ ] No code duplication (DRY)
- [ ] Proper error handling

### Security
- [ ] No hardcoded secrets
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Proper authentication/authorization

### Performance
- [ ] No N+1 queries
- [ ] Proper caching
- [ ] Efficient algorithms
- [ ] Optimized bundle size

### Testing
- [ ] Unit tests added
- [ ] Integration tests if needed
- [ ] Edge cases covered
- [ ] Test coverage maintained

### Documentation
- [ ] Code comments where needed
- [ ] API docs updated
- [ ] README updated if needed
```

### Lệnh nhanh
```
/review
```

---

## 6. DEPLOYMENT

### Agentic Prompt: Triển Khai

```markdown
@file .agent/agents/devops_engineer.agent.md
@file .agent/workflows/07_deployment.md

Deploy to environment: [staging/production]

## Pre-deployment Checklist
- [ ] All tests passing
- [ ] Code review approved
- [ ] Security audit passed
- [ ] Performance benchmarks OK
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Rollback plan documented

## Deployment Steps
1. Backup current version
2. Run database migrations
3. Deploy new version
4. Health check
5. Smoke test
6. Monitor for 30 minutes

## Rollback Plan
1. Identify rollback trigger
2. Execute rollback script
3. Verify rollback success
4. Notify stakeholders
```

### Lệnh nhanh
```
/deploy staging
/deploy production
```

---

## 7. PERFORMANCE OPTIMIZATION

### Agentic Prompt: Tối Ưu Performance

```markdown
@file .agent/agents/performance.agent.md

Analyze và optimize performance cho: [component/feature]

## Current Metrics
- Load time: [X]s
- API response: [X]ms
- Bundle size: [X]KB
- Memory usage: [X]MB

## Target Metrics
- Load time: < 3s
- API response: < 200ms
- Bundle size: < 200KB
- Memory usage: stable

## Analysis Areas
1. Frontend
   - Bundle analysis
   - Lazy loading opportunities
   - Image optimization
   - Caching strategy

2. Backend
   - Database query optimization
   - N+1 query detection
   - Caching implementation
   - Connection pooling

3. Infrastructure
   - CDN configuration
   - Compression
   - Load balancing
```

### Lệnh nhanh
```
/perf-check [component]
```

---

## 8. SECURITY AUDIT

### Agentic Prompt: Audit Bảo Mật

```markdown
@file .agent/agents/security.agent.md
@file .agent/workflows/08_security_audit.md

Thực hiện Security Audit cho: [feature/component]

## Audit Scope
- [ ] Authentication
- [ ] Authorization
- [ ] Input validation
- [ ] Data encryption
- [ ] API security
- [ ] Dependency vulnerabilities

## OWASP Top 10 Check
1. [ ] Injection
2. [ ] Broken Authentication
3. [ ] Sensitive Data Exposure
4. [ ] XML External Entities (XXE)
5. [ ] Broken Access Control
6. [ ] Security Misconfiguration
7. [ ] Cross-Site Scripting (XSS)
8. [ ] Insecure Deserialization
9. [ ] Using Components with Known Vulnerabilities
10. [ ] Insufficient Logging & Monitoring

## Deliverables
- Security report với findings
- Risk rating (Critical/High/Medium/Low)
- Remediation recommendations
- Timeline for fixes
```

### Lệnh nhanh
```
/security-audit [component]
```

---

## 9. DOCUMENTATION

### Agentic Prompt: Cập Nhật Documentation

```markdown
@file .agent/agents/docs_manager.agent.md

Update documentation cho feature: [feature name]

## Documentation Types
- [ ] API documentation
- [ ] User guide
- [ ] Developer guide
- [ ] Architecture docs
- [ ] README updates

## Content Requirements
- Clear descriptions
- Code examples
- Screenshots if UI
- API request/response samples
- Common errors & solutions
```

### Lệnh nhanh
```
/docs:update [feature]
```

---

## 10. EMERGENCY RESPONSE

### Agentic Prompt: Xử Lý Sự Cố

```markdown
@file .agent/EMERGENCY_RCA.md

🚨 EMERGENCY: [Incident description]

## Incident Details
- **Time detected**: [timestamp]
- **Severity**: [P0/P1/P2/P3]
- **Impact**: [description]
- **Affected users**: [count/percentage]

## Immediate Actions
1. [ ] Acknowledge incident
2. [ ] Notify stakeholders
3. [ ] Assess impact
4. [ ] Implement hotfix or rollback
5. [ ] Monitor recovery

## Root Cause Analysis (After resolution)
- 5 Whys analysis
- Timeline of events
- Contributing factors
- Prevention measures

## Communication
- Internal: [channel]
- External: [if needed]
```

### Lệnh nhanh
```
/emergency "[incident description]"
```

---

## 📚 QUICK REFERENCE

### Lệnh Theo Workflow

| Phase | Command | Mô tả |
|-------|---------|-------|
| Planning | `/start-session` | Khởi động session |
| Planning | `/status` | Xem status |
| Development | `/cook [feature]` | Develop feature |
| Development | `/code [task]` | Implement code |
| Testing | `/test [component]` | Run tests |
| Review | `/review` | Code review |
| Deployment | `/deploy [env]` | Deploy |
| Bugfix | `/fix:hard [bug]` | Fix bug |
| Security | `/security-audit` | Security audit |
| Docs | `/docs:update` | Update docs |
| End | `/handover` | Bàn giao session |

---

**Version**: 3.0
**Last Updated**: 2026-01-04
