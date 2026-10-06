import assert from 'node:assert/strict';
import { buildStudentProgressReport } from '../../lib/student-progress-report.js';
import { buildProgressAssessment, summarizeDailyAssessmentRollup } from '../../lib/student-progress-assessment.js';
import { buildStudentProgressTimeline } from '../../lib/student-progress-timeline.js';
import { getDifficultyWeight } from '../../lib/progress-difficulty.js';
import type { ReportCubeRow } from '../../lib/report-cube.js';

// Synthetic in-memory inputs only; this script does not load or modify a database.
const row = (month: string): ReportCubeRow => ({
  student_id: 'review-student', student_name: 'Review student',
  class_id: 'review-class', class_name: 'Movers', month,
  expected_sessions: 8, recorded_sessions: 8, chargeable_sessions: 8,
  actual_sessions: 8, actual_present_rate: 100, chargeable_rate: 100,
  record_completion_rate: 100,
  status_counts: { present: 8, absent_with_fee: 0, absent_no_fee: 0, holiday: 0, make_up: 0 },
  monthly_fee_line_id: null, monthly_fee_id: null, fee_amount: 0,
  fee_status: null, fee_source: 'none', fee_confidence: 'none',
  fee_needs_review: false, risk_flags: [],
} as ReportCubeRow);

const snapshots = new Map(['2026-08', '2026-09'].map((month, index) => [
  `review-student\u0000review-class\u0000${month}`,
  {
    id: month, studentId: 'review-student', classId: 'review-class', month,
    progressScore: index ? 80 : 60, trackKey: 'movers' as const,
    skills: [{ skill_key: 'listening' as const, score: index ? 80 : 60 }],
  },
]));
const report = buildStudentProgressReport({
  rows: [row('2026-08'), row('2026-09')], progressMonthsByKey: snapshots,
});
const september = report.rows.find((item) => item.month === '2026-09')!;
assert.equal(september.trend_delta, -20);
assert.equal(september.trend_label, 'declining');

const crossSkill = summarizeDailyAssessmentRollup([
  { entry_date: '2026-09-01', entry_type: 'skill_assessment', skill_key: 'listening', score: 90 },
  { entry_date: '2026-09-02', entry_type: 'skill_assessment', skill_key: 'speaking', score: 50 },
]);
assert.equal(crossSkill.scoreDelta, -40);
assert.ok(crossSkill.skills.every((skill) => skill.scoreDelta === 0));

const dailySnapshot = {
  id: 'daily', studentId: 'review-student', classId: 'review-class', month: '2026-09',
  trackKey: 'movers' as const, progressScore: 80, skills: [],
  dailyEntries: [{ entry_date: '2026-09-01', entry_type: 'skill_assessment' as const,
    skill_key: 'listening' as const, score: 80 }],
};
const dailyAssessment = buildProgressAssessment({ row: row('2026-09'), progressMonth: dailySnapshot });
assert.equal(dailyAssessment.progressScore, 80);
assert.ok(dailyAssessment.skillScores.every((skill) => skill.score === null));
// Monthly upsert builds a fresh snapshot without the persisted progressScore.
const { progressScore: _persistedScore, ...upsertSnapshot } = dailySnapshot;
const upsertAssessment = buildProgressAssessment({ row: row('2026-09'), progressMonth: upsertSnapshot });
assert.equal(upsertAssessment.progressScore, 100);

const override = { 'academic.difficulty_weights': { delta: 0.3, min: 0.7, max: 1.3 } };
const timeline = buildStudentProgressTimeline([{
  month: '2026-09', trackKey: 'movers', dailyEntries: [{
    entryDate: '2026-09-01', entryType: 'skill_assessment',
    skillKey: 'listening', score: 80, examSetLevel: 'flyers',
  }],
}], '2026-09-01', '2026-09-30');
assert.equal(getDifficultyWeight('flyers', 'movers', null, override), 1.3);
assert.equal(timeline.days[0].weighted_score, 92);

process.stdout.write(JSON.stringify({
  scope: 'Current local domain functions, synthetic in-memory inputs; no DB/HTTP/browser verification',
  trend: { previousAcademic: 60, currentAcademic: 80, intendedComparableDelta: 20,
    actualDelta: september.trend_delta, actualLabel: september.trend_label },
  crossSkillDelta: { actual: crossSkill.scoreDelta, perSkill: crossSkill.skills.map(({ skillKey, scoreDelta }) => ({ skillKey, scoreDelta })) },
  dailyOnly: { storedScore: dailyAssessment.progressScore, missingSkillCount: dailyAssessment.skillScores.filter((skill) => skill.score === null).length,
    monthlyUpsertCalculation: upsertAssessment.progressScore },
  difficulty: { configuredWeight: getDifficultyWeight('flyers', 'movers', null, override),
    timelineWeightedScore: timeline.days[0].weighted_score, configuredWeightedScore: 100 },
}, null, 2) + '\n');
