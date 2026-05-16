import express from 'express';
import { getDb, query } from '../database/index.js';
import { adminOnly, verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken, adminOnly);

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function buildReminders(month) {
  const columns = getDb().prepare('PRAGMA table_info(monthly_fees)').all().map((column) => column.name);
  const amountColumn = columns.includes('total_amount')
    ? 'mf.total_amount'
    : columns.includes('final_amount')
      ? 'mf.final_amount'
      : 'mf.calculated_amount';
  const rows = query(`
    SELECT mf.id as fee_id, mf.student_id, s.full_name as student_name,
           p.id as parent_id, p.full_name as parent_name, p.phone as parent_phone,
           mf.month, mf.status, ${amountColumn} as total_amount
    FROM monthly_fees mf
    JOIN students s ON mf.student_id = s.id
    JOIN parents p ON s.parent_id = p.id
    WHERE mf.month = ?
      AND mf.status IN ('pending', 'ready', 'confirmed')
      AND ${amountColumn} > 0
      AND p.phone IS NOT NULL
    ORDER BY s.full_name
  `, [month]);

  const items = rows.map((row) => ({
    ...row,
    message: `Trung tam thong bao hoc phi thang ${row.month} cua ${row.student_name}: ${formatCurrency(row.total_amount)}. Vui long thanh toan khi thuan tien. Cam on quy phu huynh.`,
  }));

  return {
    month,
    items,
    summary: {
      total: items.length,
      total_amount: items.reduce((sum, item) => sum + (item.total_amount || 0), 0),
    },
  };
}

router.get('/', (req, res, next) => {
  try {
    res.json({ success: true, data: buildReminders(req.query.month || currentMonth()) });
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const month = req.body?.month || currentMonth();
    const dryRun = req.body?.dry_run !== false;
    const preview = buildReminders(month);
    res.json({
      success: true,
      data: {
        dry_run: dryRun,
        ...preview,
        results: preview.items.map((item) => ({
          ...item,
          send_status: dryRun ? 'preview' : 'not_configured',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
