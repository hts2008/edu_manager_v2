import { Router } from 'express';
import { query, queryOne } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

// GET /api/reports/dashboard - Dashboard statistics
router.get('/dashboard', (req, res, next) => {
  try {
    const stats = {
      students: {
        total: queryOne('SELECT COUNT(*) as c FROM students').c,
        active: queryOne("SELECT COUNT(*) as c FROM students WHERE status = 'active'").c,
      },
      classes: {
        total: queryOne("SELECT COUNT(*) as c FROM classes WHERE status = 'active'").c,
      },
      parents: {
        total: queryOne('SELECT COUNT(*) as c FROM parents').c,
      },
      teachers: {
        total: queryOne("SELECT COUNT(*) as c FROM teachers WHERE status = 'active'").c,
      },
      finance: {
        receipts_this_month: queryOne(`
          SELECT COALESCE(SUM(amount), 0) as total FROM receipts 
          WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `).total,
        payments_this_month: queryOne(`
          SELECT COALESCE(SUM(amount), 0) as total FROM payments 
          WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `).total,
      }
    };
    
    // Recent transactions
    const recentTransactions = query(`
      SELECT 'receipt' as type, id, amount, created_at FROM receipts
      UNION ALL
      SELECT 'payment' as type, id, amount, created_at FROM payments
      ORDER BY created_at DESC LIMIT 5
    `);
    
    // Unpaid students (students with attendance but no receipt this month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const unpaidStudents = query(`
      SELECT DISTINCT s.id, s.full_name, c.class_name, c.fee_per_day,
        (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND strftime('%Y-%m', a.attendance_date) = ? 
         AND a.status IN ('present', 'absent_with_fee')) as days_count
      FROM students s
      JOIN student_classes sc ON s.id = sc.student_id
      JOIN classes c ON sc.class_id = c.id
      WHERE s.status = 'active'
      AND s.id NOT IN (SELECT student_id FROM receipts WHERE month = ?)
      AND s.id IN (SELECT DISTINCT student_id FROM attendance WHERE strftime('%Y-%m', attendance_date) = ?)
      LIMIT 10
    `, [currentMonth, currentMonth, currentMonth]);
    
    res.json({ success: true, data: { stats, recentTransactions, unpaidStudents } });
  } catch (error) { next(error); }
});

// GET /api/reports/financial
router.get('/financial', adminOnly, (req, res, next) => {
  try {
    const { start_date, end_date, period = 'daily' } = req.query;
    
    let dateFormat = '%Y-%m-%d';
    if (period === 'weekly') dateFormat = '%Y-%W';
    if (period === 'monthly') dateFormat = '%Y-%m';
    
    let dateFilter = '1=1';
    const params = [];
    if (start_date) { dateFilter += ' AND date(created_at) >= ?'; params.push(start_date); }
    if (end_date) { dateFilter += ' AND date(created_at) <= ?'; params.push(end_date); }
    
    const receipts = query(`
      SELECT strftime('${dateFormat}', created_at) as period, SUM(amount) as total
      FROM receipts WHERE ${dateFilter}
      GROUP BY strftime('${dateFormat}', created_at) ORDER BY period
    `, params);
    
    const payments = query(`
      SELECT strftime('${dateFormat}', created_at) as period, SUM(amount) as total
      FROM payments WHERE ${dateFilter}
      GROUP BY strftime('${dateFormat}', created_at) ORDER BY period
    `, params);
    
    const paymentsByCategory = query(`
      SELECT category, SUM(amount) as total FROM payments WHERE ${dateFilter} GROUP BY category
    `, params);
    
    const summary = {
      total_receipts: receipts.reduce((sum, r) => sum + r.total, 0),
      total_payments: payments.reduce((sum, p) => sum + p.total, 0),
    };
    summary.balance = summary.total_receipts - summary.total_payments;
    
    res.json({ success: true, data: { receipts, payments, paymentsByCategory, summary } });
  } catch (error) { next(error); }
});

// GET /api/reports/unpaid-students
router.get('/unpaid-students', (req, res, next) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    
    const unpaidStudents = query(`
      SELECT s.id, s.full_name, p.full_name as parent_name, p.phone as parent_phone,
        GROUP_CONCAT(c.class_name) as classes,
        (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND strftime('%Y-%m', a.attendance_date) = ? 
         AND a.status IN ('present', 'absent_with_fee')) as days_count
      FROM students s
      JOIN parents p ON s.parent_id = p.id
      JOIN student_classes sc ON s.id = sc.student_id
      JOIN classes c ON sc.class_id = c.id
      WHERE s.status = 'active'
      AND s.id NOT IN (SELECT student_id FROM receipts WHERE month = ?)
      AND s.id IN (SELECT DISTINCT student_id FROM attendance WHERE strftime('%Y-%m', attendance_date) = ?)
      GROUP BY s.id
      ORDER BY s.full_name
    `, [targetMonth, targetMonth, targetMonth]);
    
    res.json({ success: true, data: { month: targetMonth, students: unpaidStudents } });
  } catch (error) { next(error); }
});

export default router;
