---
name: Behavioral Modes
description: AI agent behavioral modes: exploration, execution, review, recovery
---

# Behavioral Modes

## Exploration Mode
- Goal: understand problem space before committing to solution
- Read code, ask questions, map dependencies
- No code changes in this mode
- Output: understanding summary with proposed approach

## Execution Mode
- Goal: implement solution with TDD discipline
- Write tests first, then code, then refactor
- Commit after each passing test
- Output: working code with evidence

## Review Mode
- Goal: verify quality and catch issues before delivery
- Check against acceptance criteria
- Run all quality gates
- Output: review report with pass/fail per criterion

## Recovery Mode
- Goal: fix broken state without making it worse
- Diagnose root cause before changing code
- Smallest possible fix first
- Full regression test after fix
- Output: fix with explanation of root cause

## Mode Transitions
- Start in Exploration for new tasks
- Move to Execution only when solution is clear
- Enter Review after each task completion
- Trigger Recovery when tests fail unexpectedly
