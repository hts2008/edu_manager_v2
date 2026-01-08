import { Router } from 'express';
import { query, queryOne, execute, transaction, getDb } from '../database/index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

// GET /api/attendance?class_id=&date=
router.get('/', (req, res, next) => {
  try {
    const { class_id, date, student_id, month } = req.query;
    
    let sql = `SELECT a.*, s.full_name as student_name, c.class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE 1=1`;
    const params = [];
    
    if (class_id) { sql += ' AND a.class_id = ?'; params.push(class_id); }
    if (date) { sql += ' AND a.attendance_date = ?'; params.push(date); }
    if (student_id) { sql += ' AND a.student_id = ?'; params.push(student_id); }
    if (month) { sql += " AND strftime('%Y-%m', a.attendance_date) = ?"; params.push(month); }
    
    sql += ' ORDER BY a.attendance_date DESC, s.full_name';
    const records = query(sql, params);
    res.json({ success: true, data: records });
  } catch (error) { next(error); }
});

// POST /api/attendance - Single record
router.post('/', (req, res, next) => {
  try {
    const { student_id, class_id, attendance_date, status, reason } = req.body;
    if (!student_id || !class_id || !attendance_date || !status) throw new AppError('Missing required fields', 400);
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM attendance WHERE id LIKE ?', [`ATT${today}%`]);
    const id = `ATT${today}${String(count.c + 1).padStart(3, '0')}`;
    
    execute(`INSERT INTO attendance (id, student_id, class_id, attendance_date, status, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, student_id, class_id, attendance_date, status, reason, req.userId]);
    
    res.status(201).json({ success: true, data: queryOne('SELECT * FROM attendance WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// POST /api/attendance/bulk - Multiple records (support multiple dates for SAP timesheet)
router.post('/bulk', (req, res, next) => {
  try {
    const { records } = req.body;
    if (!records || !records.length) throw new AppError('records are required', 400);
    
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let count = queryOne('SELECT COUNT(*) as c FROM attendance WHERE id LIKE ?', [`ATT${today}%`]).c;
    
    // Group records by class_id and date for efficient deletion
    const deleteKeys = new Set();
    records.forEach(r => {
      if (r.class_id && r.attendance_date) {
        deleteKeys.add(`${r.class_id}|${r.attendance_date}`);
      }
    });
    
    // Delete existing records for each class/date combination
    deleteKeys.forEach(key => {
      const [class_id, date] = key.split('|');
      execute('DELETE FROM attendance WHERE class_id = ? AND attendance_date = ?', [class_id, date]);
    });
    
    // Insert new records
    const insertStmt = db.prepare(`INSERT INTO attendance (id, student_id, class_id, attendance_date, status, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    records.forEach(r => {
      if (r.status && r.student_id && r.class_id && r.attendance_date) {
        count++;
        const id = `ATT${today}${String(count).padStart(3, '0')}`;
        insertStmt.run(id, r.student_id, r.class_id, r.attendance_date, r.status, r.reason || null, req.userId);
      }
    });
    
    res.json({ success: true, message: `Saved ${records.length} attendance records` });
  } catch (error) { next(error); }
});

// GET /api/attendance/calculate-fee?student_id=&month=
router.get('/calculate-fee', (req, res, next) => {
  try {
    const { student_id, month } = req.query;
    if (!student_id || !month) throw new AppError('student_id and month are required', 400);
    
    // Get all classes the student is enrolled in
    const enrollments = query(`
      SELECT sc.class_id, c.class_name, c.fee_per_day
      FROM student_classes sc
      JOIN classes c ON sc.class_id = c.id
      WHERE sc.student_id = ? AND sc.status = 'active'
    `, [student_id]);
    
    let totalDays = 0;
    let totalAmount = 0;
    const breakdown = [];
    
    enrollments.forEach(e => {
      // Count days with fee (present or absent_with_fee)
      const { count } = queryOne(`
        SELECT COUNT(*) as count FROM attendance
        WHERE student_id = ? AND class_id = ? AND strftime('%Y-%m', attendance_date) = ?
        AND status IN ('present', 'absent_with_fee')
      `, [student_id, e.class_id, month]);
      
      const amount = count * e.fee_per_day;
      totalDays += count;
      totalAmount += amount;
      
      breakdown.push({
        class_id: e.class_id,
        class_name: e.class_name,
        days_count: count,
        fee_per_day: e.fee_per_day,
        amount
      });
    });
    
    res.json({
      success: true,
      data: {
        student_id,
        month,
        total_days: totalDays,
        total_amount: totalAmount,
        breakdown
      }
    });
  } catch (error) { next(error); }
});

// GET /api/attendance/month?class_id=&month=YYYY-MM - Get all attendance for a class in a month
router.get('/month', (req, res, next) => {
  try {
    const { class_id, month } = req.query;
    if (!class_id || !month) throw new AppError('class_id and month are required', 400);
    
    const attendance = query(`
      SELECT a.*, s.full_name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.class_id = ? AND strftime('%Y-%m', a.attendance_date) = ?
      ORDER BY a.attendance_date, s.full_name
    `, [class_id, month]);
    
    res.json({ success: true, data: { attendance } });
  } catch (error) { next(error); }
});

export default router;

