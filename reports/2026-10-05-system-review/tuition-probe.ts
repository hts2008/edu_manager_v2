import assert from 'node:assert/strict';
import { buildStudentTuitionV3 } from '../../lib/tuition-v3-service.js';

// Synthetic domain input; no database queries or mutations.
const result = buildStudentTuitionV3({
  month: '2026-09', classData: { id: 'review-class', billingPolicy: 'per_session', feePerDay: 90000 },
  enrollment: { startedAt: '2026-09-01' },
  sessions: [
    { id: 'regular', classId: 'review-class', sessionDate: '2026-09-01', kind: 'regular', status: 'scheduled' },
    { id: 'extra', classId: 'review-class', sessionDate: '2026-09-02', kind: 'extra', status: 'scheduled', extraFeeMode: 'surcharge' },
  ],
  attendance: [
    { classSessionId: 'regular', attendanceDate: '2026-09-01', status: 'present' },
    { classSessionId: 'extra', attendanceDate: '2026-09-02', status: 'present' },
  ],
});
assert.equal(result.amount, 90000);
assert.equal(result.calculationSnapshot.ledger[1].disposition, 'included_extra');
process.stdout.write(JSON.stringify({ scope: 'Current local domain service; default settings; no DB queries',
  rate: 90000, expectedIfSurchargeUsesSessionRate: 180000, actual: result.amount,
  ledger: result.calculationSnapshot.ledger }, null, 2) + '\n');
