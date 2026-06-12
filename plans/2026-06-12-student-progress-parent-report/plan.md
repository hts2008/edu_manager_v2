# Student Progress Parent Report - Implementation Plan

## Goal
Build a monthly student progress report for parents that is useful immediately from real EDU_MANAGER_V2 operational data and ready to expand into Cambridge-style academic assessment later.

## Research Basis
- Cambridge Young Learners uses Pre A1 Starters, A1 Movers, and A2 Flyers as staged milestones. Their result statement reports shields by test part plus strengths and improvement areas.
- A2 Key/KET and B1 Preliminary/PET report Reading/Writing, Listening, and Speaking components through the Cambridge English Scale.
- CEFR is the reference framework for describing language ability and progression.

## Current Data Reality
- Existing production schema has operational evidence: students, parents, classes, class enrollment, attendance, monthly fee lines, receipts.
- Existing schema does not yet have academic assessment evidence: skill scores, homework, speaking rubric, writing rubric, vocabulary quiz, mock-test sections.
- Therefore Phase 1 must not fabricate learning scores. It must clearly label operational indicators and learning-evidence coverage.

## Feature Scope - Phase 1
1. Add backend report engine:
   - Build on existing `student_class_month` cube.
   - Group by student + class + month.
   - Infer exam track from class name where possible: Starters, Movers, Flyers, KET, PET.
   - Compute attendance quality, month-over-month trend, consistency, tuition status, and report risk flags.
   - Return skill-score placeholders as `status: "missing_input"` rather than fake scores.
   - Return a printable parent-report payload with narrative summary and next-action recommendations.
2. Add Vercel API route:
   - `GET /api/reports/student-progress`
   - Admin-only in Phase 1.
   - Query: `from`, `to`, `class_id`, `student_id`, `q`, `page`, `page_size`.
   - Response envelope: `{ success, data }`.
3. Add frontend page:
   - Route `/student-progress`.
   - Sidebar item under Bao cao: `Tien bo hoc vien`.
   - BA/PI dashboard cards: learners, class-month rows, attendance average, learning evidence coverage, students needing attention.
   - Charts: monthly progress trend, exam-track mix, attendance distribution, evidence coverage.
   - Table: one row per student-class-month with detail/print actions.
   - Printable parent report panel using browser print.
4. Add API client:
   - `reportsService.getStudentProgress(params)`.
5. Add regression tests:
   - Unit tests for report engine: track detection, missing academic input honesty, trend calculation, recommendations.
   - Contract smoke for API route wiring.

## Out of Scope - Phase 1
- No Prisma migration for assessment tables.
- No production data mutation.
- No fake academic scores.
- No Cambridge official result replacement; this is a monthly center progress report, not a formal Cambridge certificate.

## Phase 2 - Assessment Input Model
After Phase 1 is stable, plan a migration for:
- `StudentAssessment`
- `AssessmentSkillScore`
- `AssessmentRubric`
- `LearningOutcomeEvidence`
- teacher-entered comments and parent-visible recommendations.

## Acceptance Criteria
- API returns rows from real students/classes/attendance/fee lines.
- Page loads with clear loading/empty/error states.
- Parent report can be printed and includes data-source honesty.
- Missing assessment input is visible and not treated as zero achievement.
- Unit + type/build checks pass before production deployment consideration.

## Implementation Order
1. Add pure report engine in `lib/student-progress-report.ts`.
2. Add tests in `tests/student-progress-report.test.ts`.
3. Add API endpoint and router mapping.
4. Add frontend service and page route.
5. Add sidebar navigation.
6. Run static/unit/build gates.
7. Update KANBAN/memory/receipt after verification.
