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

// GET /api/receipts/:id/pdf - Generate PDF for receipt
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { generatePdf, numberToWords } = await import('../services/pdfService.js');
    
    const receipt = queryOne(`
      SELECT r.*, s.full_name as student_name, s.date_of_birth, 
             p.full_name as parent_name, p.phone as parent_phone,
             c.class_name, c.fee_per_day as class_fee
      FROM receipts r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN parents p ON s.parent_id = p.id
      LEFT JOIN student_classes sc ON s.id = sc.student_id
      LEFT JOIN classes c ON sc.class_id = c.id
      WHERE r.id = ?
    `, [req.params.id]);
    
    if (!receipt) throw new AppError('Receipt not found', 404);
    
    // Get template
    let template = null;
    if (receipt.template_id) {
      template = queryOne('SELECT * FROM templates WHERE id = ?', [receipt.template_id]);
    }
    if (!template) {
      template = queryOne('SELECT * FROM templates WHERE type = ? AND is_default = 1', ['receipt']);
    }
    if (!template) {
      template = { type: 'receipt', paper_size: 'a4', orientation: 'portrait', json_config: '{}' };
    }
    
    // Prepare data for PDF
    const data = {
      receipt_id: receipt.id,
      receipt_date: new Date(receipt.created_at).toLocaleDateString('vi-VN'),
      month: receipt.month,
      student_name: receipt.student_name,
      class_name: receipt.class_name || 'N/A',
      days_count: receipt.days_count,
      fee_per_day: receipt.fee_per_day,
      total_amount: receipt.amount,
      amount_in_words: numberToWords(receipt.amount),
      payment_method: receipt.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
      parent_name: receipt.parent_name || 'N/A',
      parent_phone: receipt.parent_phone || 'N/A',
      notes: receipt.notes || 'Học phí',
      center_name: 'Trung tâm dạy thêm',
    };
    
    const pdfBuffer = await generatePdf(template, data);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${receipt.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) { next(error); }
});

export default router;
