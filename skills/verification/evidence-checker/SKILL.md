---
name: Evidence Checker
description: Verifying evidence exists for completed tasks: test output, screenshots, diffs
---

# Evidence Checker

## Required Evidence Types
- Code changes: git diff or file list with line counts
- Test results: pass/fail counts, coverage numbers
- UI changes: screenshots or browser recordings
- API changes: request/response examples
- Performance: before/after metrics

## Evidence Quality Criteria
- Reproducible: someone else can verify
- Timestamped: when was this evidence captured?
- Complete: covers all acceptance criteria
- Authentic: from actual execution, not fabricated

## Verification Process
1. List all acceptance criteria for the task
2. For each criterion, locate evidence
3. If evidence missing, mark task as incomplete
4. If evidence weak, request stronger proof

## Where Evidence Lives
- Test output: captured in CI or terminal output
- Screenshots: artifacts directory or browser recordings
- Diffs: git log or file change summary
- Metrics: documented in progress.md or receipts/
