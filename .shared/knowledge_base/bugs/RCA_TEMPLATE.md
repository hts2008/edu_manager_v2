# RCA TEMPLATE
<!-- VI: Template phân tích nguyên nhân gốc -->

> **USAGE**: Copy this template when creating a new RCA document

---

# RCA: BUG-{ID} - {Bug Title}

## 1. Incident Summary

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-{ID} |
| **Date Discovered** | {YYYY-MM-DD} |
| **Severity** | 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low |
| **Status** | 🔴 Active / 🟡 Investigating / 🟢 Resolved |
| **Impact** | {Description of impact on users/system} |
| **Duration** | {How long the issue existed before fix} |
| **Affected Users** | {Number or percentage} |

## 2. Timeline

| Time | Event |
|------|-------|
| {Time} | Issue first occurred (estimated) |
| {Time} | Issue reported/detected |
| {Time} | Investigation started |
| {Time} | Root cause identified |
| {Time} | Fix implemented |
| {Time} | Fix deployed |
| {Time} | Confirmed resolved |

## 3. Description

### What happened?
{Clear description of what went wrong}

### Steps to Reproduce
1. {Step 1}
2. {Step 2}
3. {Step 3}

### Expected Behavior
{What should have happened}

### Actual Behavior
{What actually happened}

## 4. Root Cause Analysis

### 5 Whys Analysis

1. **Why did the error occur?**
   → {Answer}

2. **Why?** (dig deeper)
   → {Answer}

3. **Why?** (dig deeper)
   → {Answer}

4. **Why?** (dig deeper)
   → {Answer}

5. **Why?** (ROOT CAUSE)
   → {Final answer - the root cause}

### Technical Details
{Code snippets, logs, or configuration that caused the issue}

```
{Relevant code or logs}
```

### Contributing Factors
- {Factor 1 that contributed}
- {Factor 2 that contributed}
- {Factor 3 that contributed}

## 5. Solution

### Immediate Fix (Hotfix)
{What was done to stop the bleeding}

```
{Code changes or commands}
```

### Long-term Fix
{Permanent solution to prevent recurrence}

### Files Changed
- {path/to/file1.ts}: {description of change}
- {path/to/file2.ts}: {description of change}

## 6. Prevention

### Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add test coverage for this case | {Agent} | {Date} | ⬜ Pending |
| Update documentation | {Agent} | {Date} | ⬜ Pending |
| Add monitoring/alerting | {Agent} | {Date} | ⬜ Pending |
| Code review process update | {Agent} | {Date} | ⬜ Pending |

### Process Improvements
- {Process improvement 1}
- {Process improvement 2}

## 7. Lessons Learned

### What we learned
- {Lesson 1}
- {Lesson 2}

### What went well
- {What helped in resolution}

### What could be improved
- {What could have been better}

### Add to Knowledge Base?
- [ ] Add to BEST_PRACTICES.md
- [ ] Add to ANTI_PATTERNS.md
- [ ] Add to GOTCHAS.md

---

**RCA Completed By**: {Agent / User}
**Date Completed**: {YYYY-MM-DD}
**Reviewed By**: {Reviewer}
