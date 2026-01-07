import { Router } from 'express';
import { query, queryOne, execute, getDb } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

// GET /api/attendance-periods - List periods with filters
router.get('/', (req, res, next) => {
  try {
    const { class_id, month, status } = req.query;
    
    let sql = `
      SELECT ap.*, c.class_name, c.fee_per_day,
             (SELECT COUNT(*) FROM students s 
              JOIN student_classes sc ON s.id = sc.student_id 
              WHERE sc.class_id = ap.class_id AND sc.status = 'active') as student_count
      FROM attendance_periods ap
      JOIN classes c ON ap.class_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (class_id) { sql += ' AND ap.class_id = ?'; params.push(class_id); }
    if (month) { sql += ' AND ap.period_month = ?'; params.push(month); }
    if (status) { sql += ' AND ap.status = ?'; params.push(status); }
    
    sql += ' ORDER BY ap.period_month DESC, c.class_name';
    
    res.json({ success: true, data: { periods: query(sql, params) } });
  } catch (error) { next(error); }
});

// GET /api/attendance-periods/:id
router.get('/:id', (req, res, next) => {
  try {
    const period = queryOne(`
      SELECT ap.*, c.class_name, c.fee_per_day
      FROM attendance_periods ap
      JOIN classes c ON ap.class_id = c.id
      WHERE ap.id = ?
    `, [req.params.id]);
    
    if (!period) throw new AppError('Period not found', 404);
    
    // Get attendance records for this period
    const attendance = query(`
      SELECT a.*, s.full_name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.class_id = ? AND strftime('%Y-%m', a.attendance_date) = ?
      ORDER BY s.full_name, a.attendance_date
    `, [period.class_id, period.period_month]);
    
    res.json({ success: true, data: { period, attendance } });
  } catch (error) { next(error); }
});

// POST /api/attendance-periods - Create or get period for class/month
router.post('/', (req, res, next) => {
  try {
    const { class_id, month } = req.body;
    if (!class_id || !month) throw new AppError('class_id and month required', 400);
    
    // Check if exists
    let period = queryOne(
      'SELECT * FROM attendance_periods WHERE class_id = ? AND period_month = ?',
      [class_id, month]
    );
    
    if (!period) {
      const id = `AP${month.replace('-', '')}${class_id.slice(-4)}`;
      execute(`
        INSERT INTO attendance_periods (id, class_id, period_month)
        VALUES (?, ?, ?)
      `, [id, class_id, month]);
      period = queryOne('SELECT * FROM attendance_periods WHERE id = ?', [id]);
    }
    
    res.json({ success: true, data: { period } });
  } catch (error) { next(error); }
});

// POST /api/attendance-periods/:id/submit - Teacher submits for approval
router.post('/:id/submit', (req, res, next) => {
  try {
    const period = queryOne('SELECT * FROM attendance_periods WHERE id = ?', [req.params.id]);
    if (!period) throw new AppError('Period not found', 404);
    if (period.status !== 'open') throw new AppError(`Cannot submit: current status is ${period.status}`, 400);
    
    // Calculate totals
    const stats = queryOne(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent_with_fee' THEN 1 ELSE 0 END) as absent_fee,
        SUM(CASE WHEN status = 'absent_no_fee' THEN 1 ELSE 0 END) as absent_no_fee
      FROM attendance
      WHERE class_id = ? AND strftime('%Y-%m', attendance_date) = ?
    `, [period.class_id, period.period_month]);
    
    execute(`
      UPDATE attendance_periods SET 
        status = 'submitted',
        submitted_by = ?,
        submitted_at = datetime('now', 'localtime'),
        total_sessions = ?,
        total_present = ?,
        total_absent_fee = ?,
        total_absent_no_fee = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [req.userId, stats.total_sessions, stats.present, stats.absent_fee, stats.absent_no_fee, req.params.id]);
    
    res.json({ success: true, message: 'Period submitted for approval' });
  } catch (error) { next(error); }
});

// POST /api/attendance-periods/:id/approve - Admin approves
router.post('/:id/approve', adminOnly, (req, res, next) => {
  try {
    const period = queryOne('SELECT * FROM attendance_periods WHERE id = ?', [req.params.id]);
    if (!period) throw new AppError('Period not found', 404);
    if (period.status !== 'submitted') throw new AppError(`Cannot approve: current status is ${period.status}`, 400);
    
    execute(`
      UPDATE attendance_periods SET 
        status = 'approved',
        approved_by = ?,
        approved_at = datetime('now', 'localtime'),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [req.userId, req.params.id]);
    
    res.json({ success: true, message: 'Period approved' });
  } catch (error) { next(error); }
});

// POST /api/attendance-periods/:id/lock - Admin locks permanently
router.post('/:id/lock', adminOnly, (req, res, next) => {
  try {
    const period = queryOne('SELECT * FROM attendance_periods WHERE id = ?', [req.params.id]);
    if (!period) throw new AppError('Period not found', 404);
    if (period.status !== 'approved') throw new AppError(`Cannot lock: current status is ${period.status}`, 400);
    
    execute(`
      UPDATE attendance_periods SET 
        status = 'locked',
        locked_by = ?,
        locked_at = datetime('now', 'localtime'),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [req.userId, req.params.id]);
    
    // Trigger monthly fee calculations for all students in this class
    const students = query(`
      SELECT sc.student_id 
      FROM student_classes sc 
      WHERE sc.class_id = ? AND sc.status = 'active'
    `, [period.class_id]);
    
    students.forEach(s => {
      // Create or update monthly fee record
      const existing = queryOne(
        'SELECT * FROM monthly_fees WHERE student_id = ? AND month = ?',
        [s.student_id, period.period_month]
      );
      
      if (!existing) {
        const feeId = `MF${period.period_month.replace('-', '')}${s.student_id.slice(-4)}`;
        execute(`
          INSERT INTO monthly_fees (id, student_id, month, status)
          VALUES (?, ?, ?, 'ready')
        `, [feeId, s.student_id, period.period_month]);
      }
    });
    
    res.json({ success: true, message: 'Period locked and fee records created' });
  } catch (error) { next(error); }
});

// POST /api/attendance-periods/:id/unlock - Admin unlocks (rollback)
router.post('/:id/unlock', adminOnly, (req, res, next) => {
  try {
    const period = queryOne('SELECT * FROM attendance_periods WHERE id = ?', [req.params.id]);
    if (!period) throw new AppError('Period not found', 404);
    if (period.status === 'open') throw new AppError('Already open', 400);
    
    execute(`
      UPDATE attendance_periods SET 
        status = 'open',
        submitted_by = NULL, submitted_at = NULL,
        approved_by = NULL, approved_at = NULL,
        locked_by = NULL, locked_at = NULL,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [req.params.id]);
    
    execute('INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.userId, 'unlock_period', 'attendance_period', req.params.id]);
    
    res.json({ success: true, message: 'Period unlocked' });
  } catch (error) { next(error); }
});

export default router;
