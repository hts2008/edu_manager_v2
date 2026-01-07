import { Router } from 'express';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

// GET /api/parents - List all parents
router.get('/', (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM parents WHERE 1=1';
    const params = [];
    
    if (search) {
      sql += ' AND (full_name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (page - 1) * limit);
    
    const parents = query(sql, params);
    const { total } = queryOne('SELECT COUNT(*) as total FROM parents');
    
    res.json({ success: true, data: { parents, pagination: { page: Number(page), limit: Number(limit), total } } });
  } catch (error) { next(error); }
});

// GET /api/parents/:id
router.get('/:id', (req, res, next) => {
  try {
    const parent = queryOne('SELECT * FROM parents WHERE id = ?', [req.params.id]);
    if (!parent) throw new AppError('Parent not found', 404, 'NOT_FOUND');
    
    const students = query('SELECT * FROM students WHERE parent_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...parent, students } });
  } catch (error) { next(error); }
});

// POST /api/parents
router.post('/', (req, res, next) => {
  try {
    const { full_name, phone, email, address, relationship, notes } = req.body;
    if (!full_name || !phone || !relationship) throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM parents WHERE id LIKE ?', [`PAR${today}%`]);
    const id = `PAR${today}${String(count.c + 1).padStart(3, '0')}`;
    
    execute('INSERT INTO parents (id, full_name, phone, email, address, relationship, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, full_name, phone, email, address, relationship, notes]);
    
    res.status(201).json({ success: true, data: queryOne('SELECT * FROM parents WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// PUT /api/parents/:id
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, address, relationship, notes } = req.body;
    
    if (!queryOne('SELECT id FROM parents WHERE id = ?', [id])) throw new AppError('Parent not found', 404, 'NOT_FOUND');
    
    execute(`UPDATE parents SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), email = COALESCE(?, email), 
      address = COALESCE(?, address), relationship = COALESCE(?, relationship), notes = COALESCE(?, notes), 
      updated_at = datetime('now', 'localtime') WHERE id = ?`, [full_name, phone, email, address, relationship, notes, id]);
    
    res.json({ success: true, data: queryOne('SELECT * FROM parents WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// DELETE /api/parents/:id
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    if (!queryOne('SELECT id FROM parents WHERE id = ?', [req.params.id])) throw new AppError('Parent not found', 404, 'NOT_FOUND');
    execute('DELETE FROM parents WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Parent deleted' });
  } catch (error) { next(error); }
});

export default router;
