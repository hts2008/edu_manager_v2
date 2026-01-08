import { Router } from 'express';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

// GET /api/classes
router.get('/', (req, res, next) => {
  try {
    const classes = query(`
      SELECT c.*, t.full_name as teacher_name,
        (SELECT COUNT(*) FROM student_classes WHERE class_id = c.id AND status = 'active') as student_count
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, data: { classes } });
  } catch (error) { next(error); }
});

// GET /api/classes/:id
router.get('/:id', (req, res, next) => {
  try {
    const cls = queryOne(`
      SELECT c.*, t.full_name as teacher_name
      FROM classes c LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `, [req.params.id]);
    if (!cls) throw new AppError('Class not found', 404, 'NOT_FOUND');
    
    const students = query(`
      SELECT s.*, sc.enrollment_date, sc.status as enrollment_status, sc.fee_per_day_snapshot
      FROM students s JOIN student_classes sc ON s.id = sc.student_id
      WHERE sc.class_id = ? AND sc.status = 'active'
    `, [req.params.id]);
    
    // Safely parse schedule_days
    let scheduleDays = cls.schedule_days;
    if (typeof scheduleDays === 'string') {
      try {
        scheduleDays = JSON.parse(scheduleDays);
      } catch {
        scheduleDays = [];
      }
    }
    if (!Array.isArray(scheduleDays)) {
      scheduleDays = [];
    }
    
    res.json({ success: true, data: { ...cls, schedule_days: scheduleDays, students } });
  } catch (error) { next(error); }
});

// POST /api/classes
router.post('/', adminOnly, (req, res, next) => {
  try {
    const { class_name, schedule_days, start_time, end_time, fee_per_day, max_students, teacher_id, notes } = req.body;
    if (!class_name || !schedule_days || !start_time || !end_time || !fee_per_day) 
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM classes WHERE id LIKE ?', [`CLS${today}%`]);
    const id = `CLS${today}${String(count.c + 1).padStart(3, '0')}`;
    
    execute(`INSERT INTO classes (id, class_name, schedule_days, start_time, end_time, fee_per_day, max_students, teacher_id, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, class_name, JSON.stringify(schedule_days), start_time, end_time, fee_per_day, max_students || 50, teacher_id, notes]);
    
    res.status(201).json({ success: true, data: queryOne('SELECT * FROM classes WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// PUT /api/classes/:id
router.put('/:id', adminOnly, (req, res, next) => {
  try {
    const { id } = req.params;
    const { class_name, schedule_days, start_time, end_time, fee_per_day, max_students, teacher_id, status, notes } = req.body;
    
    if (!queryOne('SELECT id FROM classes WHERE id = ?', [id])) throw new AppError('Class not found', 404, 'NOT_FOUND');
    
    const scheduleDaysJson = schedule_days ? JSON.stringify(schedule_days) : null;
    execute(`UPDATE classes SET class_name = COALESCE(?, class_name), schedule_days = COALESCE(?, schedule_days),
      start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time), fee_per_day = COALESCE(?, fee_per_day),
      max_students = COALESCE(?, max_students), teacher_id = COALESCE(?, teacher_id), status = COALESCE(?, status),
      notes = COALESCE(?, notes), updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [class_name, scheduleDaysJson, start_time, end_time, fee_per_day, max_students, teacher_id, status, notes, id]);
    
    res.json({ success: true, data: queryOne('SELECT * FROM classes WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// DELETE /api/classes/:id
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    if (!queryOne('SELECT id FROM classes WHERE id = ?', [req.params.id])) throw new AppError('Class not found', 404, 'NOT_FOUND');
    execute("UPDATE classes SET status = 'inactive' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Class deleted' });
  } catch (error) { next(error); }
});

// POST /api/classes/:id/enroll - Enroll student in class
router.post('/:id/enroll', (req, res, next) => {
  try {
    const { student_id } = req.body;
    const class_id = req.params.id;
    
    if (!queryOne('SELECT id FROM classes WHERE id = ?', [class_id])) throw new AppError('Class not found', 404);
    if (!queryOne('SELECT id FROM students WHERE id = ?', [student_id])) throw new AppError('Student not found', 404);
    
    execute(`INSERT INTO student_classes (student_id, class_id, enrollment_date) VALUES (?, ?, date('now'))`, [student_id, class_id]);
    res.status(201).json({ success: true, message: 'Student enrolled' });
  } catch (error) { next(error); }
});

export default router;
