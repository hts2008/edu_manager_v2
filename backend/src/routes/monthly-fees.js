import { Router } from 'express';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseDryRun(value) {
  if (value === undefined || value === null || value === '') return true;
  return String(value) !== 'false';
}

function validateMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError('month must be YYYY-MM', 400, 'INVALID_MONTH');
  }
}

function summarizeGenerated(items, dryRun) {
  return {
    dry_run: dryRun,
    total_students: items.length,
    created: items.filter((item) => item.action === 'created').length,
    updated: items.filter((item) => item.action === 'updated').length,
    skipped: items.filter((item) => item.action === 'skipped').length,
    would_create: items.filter((item) => item.action === 'would_create').length,
    would_update: items.filter((item) => item.action === 'would_update').length,
    total_amount: items.reduce((sum, item) => sum + (item.total_amount || 0), 0),
  };
}

function calculateStudentFee(studentId, month) {
  const classes = query(`
    SELECT c.id as class_id, c.class_name, c.fee_per_day
    FROM student_classes sc
    JOIN classes c ON sc.class_id = c.id
    WHERE sc.student_id = ? AND sc.status = 'active'
  `, [studentId]);

  let totalDays = 0;
  let totalAmount = 0;
  const breakdown = classes.map((cls) => {
    const daysCount = queryOne(`
      SELECT COUNT(*) as c
      FROM attendance
      WHERE student_id = ?
        AND class_id = ?
        AND strftime('%Y-%m', attendance_date) = ?
        AND status IN ('present', 'absent_with_fee')
    `, [studentId, cls.class_id, month]).c;
    const amount = daysCount * cls.fee_per_day;
    totalDays += daysCount;
    totalAmount += amount;
    return { ...cls, days_count: daysCount, amount };
  });

  return { breakdown, totalDays, totalAmount };
}

// GET /api/monthly-fees - List with filters
router.get('/', (req, res, next) => {
  try {
    const { month, status, student_id } = req.query;
    
    let sql = `
      SELECT mf.*, s.full_name as student_name,
             (SELECT GROUP_CONCAT(c.class_name, ', ') 
              FROM student_classes sc 
              JOIN classes c ON sc.class_id = c.id 
              WHERE sc.student_id = mf.student_id AND sc.status = 'active') as class_names
      FROM monthly_fees mf
      JOIN students s ON mf.student_id = s.id
      WHERE 1=1
    `;
    const params = [];
    
    if (month) { sql += ' AND mf.month = ?'; params.push(month); }
    if (status) { sql += ' AND mf.status = ?'; params.push(status); }
    if (student_id) { sql += ' AND mf.student_id = ?'; params.push(student_id); }
    
    sql += ' ORDER BY mf.status, s.full_name';
    
    const fees = query(sql, params);
    
    // Calculate summary
    const summary = {
      total: fees.length,
      pending: fees.filter(f => f.status === 'pending').length,
      ready: fees.filter(f => f.status === 'ready').length,
      confirmed: fees.filter(f => f.status === 'confirmed').length,
      paid: fees.filter(f => f.status === 'paid').length,
      totalAmount: fees.reduce((sum, f) => sum + (f.total_amount || 0), 0),
      paidAmount: fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.total_amount || 0), 0),
    };
    
    res.json({ success: true, data: { fees, summary } });
  } catch (error) { next(error); }
});

// POST /api/monthly-fees/generate - Idempotent dry-run/default monthly fee generation
router.post('/generate', adminOnly, (req, res, next) => {
  try {
    const month = req.body?.month || req.query.month || currentMonth();
    const dryRun = parseDryRun(req.body?.dry_run ?? req.query.dry_run);
    validateMonth(month);

    const students = query(
      "SELECT id, full_name FROM students WHERE status = 'active' ORDER BY full_name"
    );
    const items = [];

    students.forEach((student) => {
      const existing = queryOne(
        'SELECT * FROM monthly_fees WHERE student_id = ? AND month = ?',
        [student.id, month]
      );
      const { breakdown, totalDays, totalAmount } = calculateStudentFee(student.id, month);

      if (breakdown.length === 0) {
        items.push({
          student_id: student.id,
          student_name: student.full_name,
          month,
          total_days: 0,
          total_amount: 0,
          existing_status: existing?.status || null,
          action: 'skipped',
          reason: 'NO_ACTIVE_CLASS',
        });
        return;
      }

      if (existing && !['pending', 'ready'].includes(existing.status)) {
        items.push({
          student_id: student.id,
          student_name: student.full_name,
          month,
          total_days: existing.total_days,
          total_amount: existing.total_amount,
          existing_status: existing.status,
          action: 'skipped',
          reason: `STATUS_${existing.status.toUpperCase()}`,
        });
        return;
      }

      if (dryRun) {
        items.push({
          student_id: student.id,
          student_name: student.full_name,
          month,
          total_days: totalDays,
          total_amount: totalAmount,
          existing_status: existing?.status || null,
          action: existing ? 'would_update' : 'would_create',
        });
        return;
      }

      if (existing) {
        execute(`
          UPDATE monthly_fees
          SET total_days = ?, total_amount = ?, status = 'ready', receipt_id = NULL,
              paid_at = NULL, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `, [totalDays, totalAmount, existing.id]);
        items.push({
          student_id: student.id,
          student_name: student.full_name,
          month,
          total_days: totalDays,
          total_amount: totalAmount,
          existing_status: existing.status,
          action: 'updated',
        });
        return;
      }

      const id = `MF${month.replace('-', '')}${student.id}`;
      execute(`
        INSERT INTO monthly_fees (id, student_id, month, total_days, total_amount, status)
        VALUES (?, ?, ?, ?, ?, 'ready')
      `, [id, student.id, month, totalDays, totalAmount]);
      items.push({
        student_id: student.id,
        student_name: student.full_name,
        month,
        total_days: totalDays,
        total_amount: totalAmount,
        existing_status: null,
        action: 'created',
      });
    });

    res.json({
      success: true,
      data: {
        month,
        dry_run: dryRun,
        items,
        summary: summarizeGenerated(items, dryRun),
      },
    });
  } catch (error) { next(error); }
});

// GET /api/monthly-fees/:id - Get single with details
router.get('/:id', (req, res, next) => {
  try {
    const fee = queryOne(`
      SELECT mf.*, s.full_name as student_name,
             p.full_name as parent_name, p.phone as parent_phone
      FROM monthly_fees mf
      JOIN students s ON mf.student_id = s.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE mf.id = ?
    `, [req.params.id]);
    
    if (!fee) throw new AppError('Monthly fee not found', 404);
    
    // Get breakdown by class
    const breakdown = query(`
      SELECT c.class_name, c.fee_per_day, sc.fee_per_day_snapshot,
             COUNT(a.id) as days_count,
             COUNT(a.id) * COALESCE(sc.fee_per_day_snapshot, c.fee_per_day) as amount
      FROM student_classes sc
      JOIN classes c ON sc.class_id = c.id
      LEFT JOIN attendance a ON a.student_id = sc.student_id 
        AND a.class_id = sc.class_id 
        AND strftime('%Y-%m', a.attendance_date) = ?
        AND a.status IN ('present', 'absent_with_fee')
      WHERE sc.student_id = ? AND sc.status = 'active'
      GROUP BY c.id
    `, [fee.month, fee.student_id]);
    
    res.json({ success: true, data: { fee, breakdown } });
  } catch (error) { next(error); }
});

// POST /api/monthly-fees/calculate - Calculate fee for student/month
router.post('/calculate', (req, res, next) => {
  try {
    const { student_id, month } = req.body;
    if (!student_id || !month) throw new AppError('student_id and month required', 400);
    
    // Get all classes with attendance
    const breakdown = query(`
      SELECT c.id as class_id, c.class_name, 
             COALESCE(sc.fee_per_day_snapshot, c.fee_per_day) as fee_per_day,
             COUNT(a.id) as days_count
      FROM student_classes sc
      JOIN classes c ON sc.class_id = c.id
      LEFT JOIN attendance a ON a.student_id = sc.student_id 
        AND a.class_id = sc.class_id 
        AND strftime('%Y-%m', a.attendance_date) = ?
        AND a.status IN ('present', 'absent_with_fee')
      WHERE sc.student_id = ? AND sc.status = 'active'
      GROUP BY c.id
    `, [month, student_id]);
    
    let totalDays = 0;
    let totalAmount = 0;
    
    breakdown.forEach(b => {
      b.amount = b.days_count * b.fee_per_day;
      totalDays += b.days_count;
      totalAmount += b.amount;
    });
    
    // Create or update monthly fee record
    let fee = queryOne(
      'SELECT * FROM monthly_fees WHERE student_id = ? AND month = ?',
      [student_id, month]
    );
    
    if (!fee) {
      const id = `MF${month.replace('-', '')}${student_id.slice(-4)}`;
      execute(`
        INSERT INTO monthly_fees (id, student_id, month, total_days, total_amount, breakdown)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, student_id, month, totalDays, totalAmount, JSON.stringify(breakdown)]);
      fee = queryOne('SELECT * FROM monthly_fees WHERE id = ?', [id]);
    } else if (fee.status === 'pending') {
      execute(`
        UPDATE monthly_fees SET total_days = ?, total_amount = ?, breakdown = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `, [totalDays, totalAmount, JSON.stringify(breakdown), fee.id]);
      fee = queryOne('SELECT * FROM monthly_fees WHERE id = ?', [fee.id]);
    }
    
    res.json({ success: true, data: { fee, breakdown, totalDays, totalAmount } });
  } catch (error) { next(error); }
});

// POST /api/monthly-fees/:id/confirm - Confirm fee amount
router.post('/:id/confirm', (req, res, next) => {
  try {
    const fee = queryOne('SELECT * FROM monthly_fees WHERE id = ?', [req.params.id]);
    if (!fee) throw new AppError('Not found', 404);
    if (fee.status !== 'ready' && fee.status !== 'pending') {
      throw new AppError(`Cannot confirm: current status is ${fee.status}`, 400);
    }
    
    execute(`
      UPDATE monthly_fees SET 
        status = 'confirmed',
        confirmed_by = ?,
        confirmed_at = datetime('now', 'localtime'),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [req.userId, req.params.id]);
    
    res.json({ success: true, message: 'Fee confirmed' });
  } catch (error) { next(error); }
});

// POST /api/monthly-fees/:id/pay - Mark as paid and create receipt
router.post('/:id/pay', (req, res, next) => {
  try {
    const { payment_method, notes } = req.body;
    if (!payment_method) throw new AppError('payment_method required', 400);
    
    const fee = queryOne(`
      SELECT mf.*, s.full_name as student_name
      FROM monthly_fees mf
      JOIN students s ON mf.student_id = s.id
      WHERE mf.id = ?
    `, [req.params.id]);
    
    if (!fee) throw new AppError('Not found', 404);
    if (fee.status !== 'confirmed') {
      throw new AppError(`Cannot pay: current status is ${fee.status}`, 400);
    }
    
    // Create receipt
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM receipts WHERE id LIKE ?', [`PT${today}%`]);
    const receiptId = `PT${today}${String(count.c + 1).padStart(3, '0')}`;
    
    // Get default template
    const template = queryOne("SELECT id FROM templates WHERE type = 'receipt' AND is_default = 1");
    const templateId = template?.id || 'TPL_DEFAULT_RECEIPT';
    
    // Parse breakdown for fee_per_day
    let feePerDay = 0;
    if (fee.breakdown) {
      try {
        const breakdown = JSON.parse(fee.breakdown);
        if (breakdown.length > 0) feePerDay = breakdown[0].fee_per_day;
      } catch (e) {}
    }
    
    execute(`
      INSERT INTO receipts (id, student_id, month, days_count, fee_per_day, amount, payment_method, template_id, notes, created_by, monthly_fee_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [receiptId, fee.student_id, fee.month, fee.total_days, feePerDay, fee.total_amount, payment_method, templateId, notes, req.userId, fee.id]);
    
    // Update monthly fee
    execute(`
      UPDATE monthly_fees SET 
        status = 'paid',
        payment_method = ?,
        receipt_id = ?,
        paid_by = ?,
        paid_at = datetime('now', 'localtime'),
        notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [payment_method, receiptId, req.userId, notes, req.params.id]);
    
    execute('INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.userId, 'collect_fee', 'monthly_fee', req.params.id]);
    
    res.json({ success: true, data: { receiptId }, message: 'Payment recorded' });
  } catch (error) { next(error); }
});

// POST /api/monthly-fees/:id/cancel - Cancel confirmation (back to ready)
router.post('/:id/cancel', (req, res, next) => {
  try {
    const fee = queryOne('SELECT * FROM monthly_fees WHERE id = ?', [req.params.id]);
    if (!fee) throw new AppError('Not found', 404);
    if (fee.status !== 'confirmed') throw new AppError('Can only cancel confirmed fees', 400);
    
    execute(`
      UPDATE monthly_fees SET 
        status = 'ready',
        confirmed_by = NULL, confirmed_at = NULL,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [req.params.id]);
    
    res.json({ success: true, message: 'Confirmation cancelled' });
  } catch (error) { next(error); }
});

export default router;
