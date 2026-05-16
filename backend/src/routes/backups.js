import express from 'express';
import { queryOne } from '../database/index.js';
import { adminOnly, verifyToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(verifyToken, adminOnly);

const tables = [
  'users',
  'parents',
  'students',
  'teachers',
  'classes',
  'student_classes',
  'attendance',
  'attendance_periods',
  'monthly_fees',
  'templates',
  'receipts',
  'payments',
  'activity_logs',
  'center_settings',
];

function tableCounts() {
  return Object.fromEntries(
    tables.map((table) => [table, queryOne(`SELECT COUNT(*) as c FROM ${table}`).c])
  );
}

router.post('/', (req, res, next) => {
  try {
    const action = req.body?.action || 'run';
    if (action === 'verify') {
      if (!req.body?.url) {
        throw new AppError('backup url is required', 400, 'URL_REQUIRED');
      }
      res.json({
        success: true,
        data: {
          valid: false,
          restore_drill: 'not_available_in_reference_backend',
          counts: {},
        },
      });
      return;
    }

    const dryRun = req.body?.dry_run !== false;
    res.json({
      success: true,
      data: {
        dry_run: dryRun,
        uploaded: false,
        encrypted: true,
        created_at: new Date().toISOString(),
        counts: tableCounts(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
