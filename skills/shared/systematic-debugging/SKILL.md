---
name: Systematic Debugging
description: Structured debugging: reproduce, isolate, diagnose, fix, verify
---

# Systematic Debugging

## 5-Step Process
1. REPRODUCE: create reliable reproduction (test case or steps)
2. ISOLATE: narrow down to smallest failing unit
3. DIAGNOSE: find root cause (not just symptoms)
4. FIX: minimal change that addresses root cause
5. VERIFY: confirm fix works and no regressions

## Reproduction Techniques
- Write a failing test that demonstrates the bug
- Document exact steps to reproduce manually
- Note environment details (OS, versions, config)
- Check if bug is consistent or intermittent

## Isolation Techniques
- Binary search: comment out half the code, see if bug persists
- Minimal reproduction: strip away unrelated code
- git bisect: find exact commit that introduced bug
- Logging: add structured logs at decision points

## Root Cause Analysis
- 5 Whys: ask why 5 times to reach root cause
- Read the error message carefully (surprisingly often skipped)
- Check recent changes (git log)
- Check assumptions (is the data what you think it is?)

## Fix Guidelines
- Smallest possible change
- Fix the cause, not the symptom
- Add test that would catch regression
- Document the fix in commit message
