# Student Progress Assessment Expansion - Implementation Plan

## Closeout Status - 2026-06-14

Status: IMPLEMENTED and deployed to production.

Evidence:
- `receipts/2026-06-14-student-progress-assessment-expansion.md`
- `docs/artifacts/playwright/student-progress-assessment-local-final-20260614/`
- `docs/artifacts/playwright/student-progress-assessment-production-20260614/`

Production:
- `https://edu-manager-gules.vercel.app`
- Vercel inspect `https://vercel.com/hts2008s-projects/edu-manager/2ZxVKk5NGPq64xhe7H2zokBurm3C`

Implemented scope:
- monthly teacher assessment input
- progress persistence
- track-aware scoring engine
- report merge
- analytics and parent print smoke

Follow-up:
- dedicated class-wide bulk/copy-last-month grid
- dependency-security pass for npm audit warnings

## Goal
Turn the current evidence-first monthly student progress report into a real teacher-facing progress-update system for English-center operations, so the report can show actual monthly skill growth, focus areas, homework/practice load, and Cambridge-track readiness without fabricating scores.

## Why This Phase Exists
The current `/student-progress` feature already answers:
- who is progressing,
- what class/month they belong to,
- how attendance/tuition evidence supports the report,
- and which academic inputs are still missing.

What it does **not** yet answer is:
- where the teacher enters progress updates,
- how Listening/Speaking/Reading/Writing/Homework are scored,
- how exam-track classes use shields/points and track-specific weightings,
- which skill the student must focus on next month,
- and how the parent report changes when real academic inputs exist.

That means the current page is a **report view**, not a **progress update workflow**. This phase adds the missing write path and the scoring engine behind it.

## Design Principles
1. **No fabricated academic scores**. If a skill has no teacher input, it must remain `missing_input`.
2. **One monthly truth per student-class-month**. All inputs roll up to the month view, but teachers may enter daily evidence.
3. **Track-aware scoring**. Starter/Movers/Flyers use shield-style progress; KET/PET use section-weighted progress and Cambridge-style readiness mapping.
4. **Class-type aware scoring**. Communicative classes and exam-prep classes must not share the same formula blindly.
5. **Teacher-friendly input first**. The system must reduce admin work, not add it.
6. **Parent-readable output second**. The printable report must stay honest and understandable.

## Phase 0 - Research and Rubric Design
### Objective
Define the measurable inputs and scoring rules for English progress in a way that is useful for EDU_MANAGER_V2 and honest about what the system can measure today.

### Tasks
| Task ID | Description | Output | Owner | Depends on |
| --- | --- | --- | --- | --- |
| SPRX-2026-06-12-01 | Research English-center progress indicators for Listening, Speaking, Reading, Writing, Homework, Daily Practice, and mock-test performance | Rubric draft and evidence vocabulary | product-manager + research | Existing student-progress report |
| SPRX-2026-06-12-02 | Define Cambridge-track variants for Starter, Mover, Flyer, KET, PET | Track matrix with weights and display rules | product-manager + domain reviewer | SPRX-01 |
| SPRX-2026-06-12-03 | Decide class-type scoring modes: communicative, exam-prep, mixed | Scoring-mode matrix | product-manager + backend-specialist | SPRX-01 |
| SPRX-2026-06-12-04 | Define monthly parent-facing output fields and teacher-facing input fields | Approved field inventory | product-manager + frontend-specialist | SPRX-01..03 |

### Key research questions
- Which fields are teacher-entered versus system-derived?
- Which domains should be required for each track?
- What is the minimum viable monthly rubric for immediate production use?
- How do shields/points map to monthly progress without pretending to be a formal certificate result?
- What threshold should mark `on_track`, `watch`, and `needs_support`?

### Deliverable
An approved rubric matrix that lists:
- track,
- class type,
- skill domain,
- score scale,
- weight,
- evidence source,
- and parent-visible wording.

## Phase 1 - Data Model and Storage
### Objective
Persist teacher-entered progress evidence in the database so the current report can stop depending only on operational proxy data.

### Data to store
- student-class-month progress snapshot
- per-skill monthly score
- daily practice / shield entries
- homework completion
- teacher note / focus area
- mock-test / checkpoint result
- class type and track weight profile
- parent-facing summary text

### Recommended schema direction
| Entity | Purpose |
| --- | --- |
| `StudentProgressMonth` | Monthly rollup for one student-class pair |
| `StudentProgressSkill` | One row per skill domain per month |
| `StudentProgressDailyEntry` | Daily practice / shield / homework evidence |
| `ProgressRubricTemplate` | Track/class-type weighting configuration |
| `ProgressFocusNote` | Teacher notes and recommendation text |

### Tasks
| Task ID | Description | Output | Owner | Depends on |
| --- | --- | --- | --- | --- |
| SPRX-2026-06-12-05 | Design Prisma models for monthly progress and skill entries | Schema proposal + migration plan | database-architect | SPRX-01..04 |
| SPRX-2026-06-12-06 | Define Prisma relations and indexes for student/class/month lookups | Query-safe model structure | database-architect | SPRX-05 |
| SPRX-2026-06-12-07 | Decide whether any existing report cube can be extended or whether a new progress cube is needed | Data model boundary decision | backend-specialist | SPRX-05..06 |

### Rules
- Do not overwrite the current operational report tables.
- Keep progress entries append-friendly.
- Make class-month the atomic lookup unit.
- Support teacher edits without breaking historical snapshots.

## Phase 2 - Progress Engine and Scoring Rules
### Objective
Compute monthly progress from real teacher input, attendance evidence, homework, daily practice, and track-specific checkpoints.

### Engine outputs
- `progress_score`
- `skill_scores[]`
- `track_readiness`
- `focus_skill`
- `focus_components[]`
- `monthly_delta`
- `shield_or_points_total`
- `teacher_action_hint`
- `parent_summary`
- `evidence_coverage`

### Scoring model
#### Common domains
- Listening
- Speaking
- Reading
- Writing
- Homework
- Daily Practice
- Mock Test / Checkpoint

#### Track-specific variants
- Starter / Mover / Flyer:
  - use shield-oriented track progress,
  - show daily/weekly completion plus shield accumulation,
  - convert to a monthly normalized progress score for the report.
- KET / PET:
  - use section-weighted performance,
  - keep raw section input visible,
  - normalize to the month score for reporting.

#### Class-type variants
- Communicative classes:
  - emphasize listening/speaking/homework consistency
  - lower weight on mock test sections unless the teacher flags them
- Exam-prep classes:
  - emphasize reading/writing, mock test, shield/points, and track readiness
- Mixed classes:
  - use a balanced profile with teacher override allowed

### Tasks
| Task ID | Description | Output | Owner | Depends on |
| --- | --- | --- | --- | --- |
| SPRX-2026-06-12-08 | Build scoring engine for monthly progress and per-skill breakdown | Pure function/service | backend-specialist | SPRX-05..07 |
| SPRX-2026-06-12-09 | Build focus-skill detector and recommendation generator | Rules for weak-skill detection and next actions | backend-specialist + product-manager | SPRX-08 |
| SPRX-2026-06-12-10 | Add trend comparison month-over-month and class-over-class where available | Monthly delta/trend output | backend-specialist | SPRX-08 |
| SPRX-2026-06-12-11 | Add data honesty flags for missing input vs zero progress | `missing_input` policy engine | backend-specialist + QA | SPRX-08..10 |

### Acceptance rules for the engine
- If no teacher rubric exists, skill scores stay `missing_input`.
- If a student has a track but no checkpoints, the system still returns operational progress with a clear disclaimer.
- Focus skill must be deterministic from evidence, not arbitrary AI text.
- The same inputs must always produce the same monthly score.

## Phase 3 - Teacher Update Workflow
### Objective
Give teachers a real place to enter and edit progress so the report can show updated academic progress instead of read-only placeholders.

### UX requirement
The current page must gain a true **Cập nhật tiến độ** surface, not just a report card.

### Recommended UX shape
1. Overview tab
2. Update/Input tab
3. Student detail drawer
4. Print preview / parent report tab

### Teacher inputs to support
- monthly skill scores
- daily lesson / shield / checkpoint input
- homework completion
- teacher note
- focus skill selection
- class-type override if needed
- monthly mock-test evidence

### Input shortcuts
- bulk update by class and month
- row-level quick edit
- copy last month values forward
- mark skill as missing input
- save draft before final submit

### Tasks
| Task ID | Description | Output | Owner | Depends on |
| --- | --- | --- | --- | --- |
| SPRX-2026-06-12-12 | Design teacher-facing progress update screen or drawer | UI spec and state model | frontend-specialist | SPRX-01..11 |
| SPRX-2026-06-12-13 | Add API endpoints for create/update/delete/list progress entries | CRUD contract | backend-specialist | SPRX-05..11 |
| SPRX-2026-06-12-14 | Wire update workflow to class, student, and month filters | usable teacher flow | frontend-specialist | SPRX-12..13 |
| SPRX-2026-06-12-15 | Add bulk entry and draft-save support | reduced admin workload | frontend + backend | SPRX-13..14 |

### Guardrails
- Teachers can edit only permitted months/classes.
- Progress updates must be auditable.
- The teacher flow must never silently overwrite parent report history.

## Phase 4 - Parent Report and Printable Output
### Objective
Upgrade the current parent-facing report so the printed monthly report clearly explains progress, focus areas, and what changed this month.

### Parent-facing output must show
- monthly progress score
- monthly delta
- current track and class type
- skill breakdown
- strengths
- weaknesses
- focus skill for next month
- homework / practice consistency
- attendance quality
- daily shield/points summary for exam-prep classes
- explanation of what is `missing_input`

### Tasks
| Task ID | Description | Output | Owner | Depends on |
| --- | --- | --- | --- | --- |
| SPRX-2026-06-12-16 | Extend `/student-progress` report payload to include skill and checkpoint updates | richer report API | backend-specialist | SPRX-08..15 |
| SPRX-2026-06-12-17 | Redesign parent printable panel for the new score and skill layout | printable UI | frontend-specialist | SPRX-16 |
| SPRX-2026-06-12-18 | Add monthly comparison and focus-section cards | parent-readable insight blocks | frontend-specialist | SPRX-16..17 |

### Parent report rules
- Never show fabricated exam scores.
- If a skill is not entered, show it clearly as missing data.
- Focus suggestions must be actionable and short.

## Phase 5 - BA / PI Dashboard and Analytics
### Objective
Make the report center behave like a BA/PI dashboard, not just a list.

### Analytics views
- center-wide monthly progress overview
- class comparison
- track distribution
- skill weakness distribution
- homework completion trend
- daily practice / shield accumulation trend
- student risk heatmap
- teacher input coverage quality

### Tasks
| Task ID | Description | Output | Owner | Depends on |
| --- | --- | --- | --- | --- |
| SPRX-2026-06-12-19 | Add charts for progress trend, skill mix, track readiness, and focus areas | analytics panels | frontend-specialist | SPRX-16..18 |
| SPRX-2026-06-12-20 | Add filters for class, track, month, teacher, and risk band | dashboard controls | frontend-specialist + backend-specialist | SPRX-19 |
| SPRX-2026-06-12-21 | Add server-side aggregation for dashboard metrics | scalable analytics endpoint | backend-specialist | SPRX-19..20 |

### Minimum chart set
- line chart: monthly progress trend
- bar chart: skill score comparison
- donut chart: track distribution
- heatmap or matrix: at-risk students by class/month
- stacked bar: homework/practice completion

## Phase 6 - Validation, QA, and Release
### Objective
Verify that the update workflow, scoring engine, report output, and dashboard all work together before production release.

### Test plan
1. Unit tests for scoring engine and focus detection
2. Unit tests for missing-input honesty
3. API contract tests for update/list/report endpoints
4. Browser tests for teacher update flow
5. Browser tests for parent printable report
6. Browser tests for analytics filters and charts
7. Production smoke after deploy

### Tasks
| Task ID | Description | Output | Owner | Depends on |
| --- | --- | --- | --- | --- |
| SPRX-2026-06-12-22 | Add unit tests for engine formulas and track weights | deterministic coverage | test-engineer | SPRX-08..11 |
| SPRX-2026-06-12-23 | Add integration/browser smoke for teacher update and parent print | end-to-end proof | qa-automation-engineer | SPRX-12..18 |
| SPRX-2026-06-12-24 | Run staging/local verification and production smoke | release evidence | release-manager | SPRX-19..23 |

## Out of Scope For This Phase
- No fake Cambridge certificate claims.
- No replacing the existing operational report until the new update flow is verified.
- No bulk migration of historical academic grades without a rubric mapping.
- No SMS/Zalo or parent notification expansion unless explicitly approved later.

## Definition of Done
- Teachers can enter monthly progress updates for Listening, Speaking, Reading, Writing, Homework, and daily practice.
- Exam-prep classes can capture shields/points and monthly checkpoint totals.
- The report shows which skill needs focus and why.
- Parent print output is clear, honest, and monthly.
- BA/PI dashboard includes charts and filters that actually change the view.
- Tests, browser smoke, and deploy evidence are present.
- Current Phase 1 report behavior remains intact for existing users.

## Implementation Order
1. Agree rubric and scoring matrix.
2. Add schema and API storage for progress inputs.
3. Build scoring engine and honesty policy.
4. Build teacher update UX.
5. Enhance parent report and print view.
6. Expand BA/PI dashboard charts and filters.
7. Add tests, smoke, and release evidence.
