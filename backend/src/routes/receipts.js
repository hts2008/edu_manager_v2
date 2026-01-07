import { Router } from 'express';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

// GET /api/receipts
router.get('/', (req, res, next) => {
  try {
    const { student_id, month, page = 1, limit = 20 } = req.query;
    let sql = `SELECT r.*, s.full_name as student_name FROM receipts r JOIN students s ON r.student_id = s.id WHERE 1=1`;
    const params = [];
    
    if (student_id) { sql += ' AND r.student_id = ?'; params.push(student_id); }
    if (month) { sql += ' AND r.month = ?'; params.push(month); }
    
    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (page - 1) * limit);
    
    const receipts = query(sql, params);
    res.json({ success: true, data: receipts });
  } catch (error) { next(error); }
});

// GET /api/receipts/:id
router.get('/:id', (req, res, next) => {
  try {
    const receipt = queryOne(`
      SELECT r.*, s.full_name as student_name, s.date_of_birth, p.full_name as parent_name, p.phone as parent_phone
      FROM receipts r
      JOIN students s ON r.student_id = s.id
      JOIN parents p ON s.parent_id = p.id
      WHERE r.id = ?
    `, [req.params.id]);
    if (!receipt) throw new AppError('Receipt not found', 404);
    res.json({ success: true, data: receipt });
  } catch (error) { next(error); }
});

// POST /api/receipts
router.post('/', (req, res, next) => {
  try {
    const { student_id, month, days_count, fee_per_day, amount, payment_method, template_id, notes } = req.body;
    if (!student_id || !month || !days_count || !fee_per_day || !amount || !payment_method || !template_id)
      throw new AppError('Missing required fields', 400);
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM receipts WHERE id LIKE ?', [`PT${today}%`]);
    const id = `PT${today}${String(count.c + 1).padStart(3, '0')}`;
    
    execute(`INSERT INTO receipts (id, student_id, month, days_count, fee_per_day, amount, payment_method, template_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, student_id, month, days_count, fee_per_day, amount, payment_method, template_id, notes, req.userId]);
    
    execute('INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.userId, 'create_receipt', 'receipt', id]);
    
    res.status(201).json({ success: true, data: queryOne('SELECT * FROM receipts WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// DELETE /api/receipts/:id (Admin only)
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    if (!queryOne('SELECT id FROM receipts WHERE id = ?', [req.params.id])) throw new AppError('Receipt not found', 404);
    execute('DELETE FROM receipts WHERE id = ?', [req.params.id]);
    execute('INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.userId, 'delete_receipt', 'receipt', req.params.id]);
    res.json({ success: true, message: 'Receipt deleted' });
  } catch (error) { next(error); }
});

export default router;
