import { Router } from 'express';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

// GET /api/teachers
router.get('/', (req, res, next) => {
  try {
    const teachers = query('SELECT * FROM teachers ORDER BY created_at DESC');
    res.json({ success: true, data: { teachers } });
  } catch (error) { next(error); }
});

// GET /api/teachers/:id
router.get('/:id', (req, res, next) => {
  try {
    const teacher = queryOne('SELECT * FROM teachers WHERE id = ?', [req.params.id]);
    if (!teacher) throw new AppError('Teacher not found', 404, 'NOT_FOUND');
    
    const classes = query('SELECT * FROM classes WHERE teacher_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...teacher, classes } });
  } catch (error) { next(error); }
});

// POST /api/teachers
router.post('/', adminOnly, (req, res, next) => {
  try {
    const { full_name, phone, email, salary_type, salary_amount, notes } = req.body;
    if (!full_name || !phone || !salary_type || !salary_amount) throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM teachers WHERE id LIKE ?', [`TEA${today}%`]);
    const id = `TEA${today}${String(count.c + 1).padStart(3, '0')}`;
    
    execute('INSERT INTO teachers (id, full_name, phone, email, salary_type, salary_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, full_name, phone, email, salary_type, salary_amount, notes]);
    
    res.status(201).json({ success: true, data: queryOne('SELECT * FROM teachers WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// PUT /api/teachers/:id
router.put('/:id', adminOnly, (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, salary_type, salary_amount, status, notes } = req.body;
    
    if (!queryOne('SELECT id FROM teachers WHERE id = ?', [id])) throw new AppError('Teacher not found', 404, 'NOT_FOUND');
    
    execute(`UPDATE teachers SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), email = COALESCE(?, email), 
      salary_type = COALESCE(?, salary_type), salary_amount = COALESCE(?, salary_amount), status = COALESCE(?, status),
      notes = COALESCE(?, notes), updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [full_name, phone, email, salary_type, salary_amount, status, notes, id]);
    
    res.json({ success: true, data: queryOne('SELECT * FROM teachers WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// DELETE /api/teachers/:id
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    if (!queryOne('SELECT id FROM teachers WHERE id = ?', [req.params.id])) throw new AppError('Teacher not found', 404, 'NOT_FOUND');
    execute("UPDATE teachers SET status = 'inactive' WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Teacher deleted' });
  } catch (error) { next(error); }
});

export default router;
