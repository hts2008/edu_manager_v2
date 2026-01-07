import { Router } from 'express';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

// GET /api/payments
router.get('/', (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM payments WHERE 1=1';
    const params = [];
    
    if (category) { sql += ' AND category = ?'; params.push(category); }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (page - 1) * limit);
    
    res.json({ success: true, data: query(sql, params) });
  } catch (error) { next(error); }
});

// GET /api/payments/:id
router.get('/:id', (req, res, next) => {
  try {
    const payment = queryOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (!payment) throw new AppError('Payment not found', 404);
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
});

// POST /api/payments (Admin only for create)
router.post('/', adminOnly, (req, res, next) => {
  try {
    const { category, amount, recipient_name, recipient_phone, template_id, notes } = req.body;
    if (!category || !amount || !recipient_name || !template_id) throw new AppError('Missing required fields', 400);
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM payments WHERE id LIKE ?', [`PC${today}%`]);
    const id = `PC${today}${String(count.c + 1).padStart(3, '0')}`;
    
    execute(`INSERT INTO payments (id, category, amount, recipient_name, recipient_phone, template_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, category, amount, recipient_name, recipient_phone, template_id, notes, req.userId]);
    
    execute('INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.userId, 'create_payment', 'payment', id]);
    
    res.status(201).json({ success: true, data: queryOne('SELECT * FROM payments WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// DELETE /api/payments/:id (Admin only)
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    if (!queryOne('SELECT id FROM payments WHERE id = ?', [req.params.id])) throw new AppError('Payment not found', 404);
    execute('DELETE FROM payments WHERE id = ?', [req.params.id]);
    execute('INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.userId, 'delete_payment', 'payment', req.params.id]);
    res.json({ success: true, message: 'Payment deleted' });
  } catch (error) { next(error); }
});

export default router;
