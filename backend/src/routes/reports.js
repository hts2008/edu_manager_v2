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

// GET /api/reports/advanced
router.get('/advanced', adminOnly, (req, res, next) => {
  try {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString().slice(0, 10);
    const from = req.query.from || req.query.start_date || defaultFrom;
    const to = req.query.to || req.query.end_date || today.toISOString().slice(0, 10);
    const groupBy = req.query.group_by || req.query.groupBy || req.query.period || 'month';

    let dateFormat = '%Y-%m';
    if (groupBy === 'day' || groupBy === 'daily') dateFormat = '%Y-%m-%d';
    if (groupBy === 'week' || groupBy === 'weekly') dateFormat = '%Y-W%W';
    if (groupBy === 'year' || groupBy === 'yearly') dateFormat = '%Y';

    const receiptRows = query(`
      SELECT strftime('${dateFormat}', created_at) as period, COALESCE(SUM(amount), 0) as total
      FROM receipts
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      GROUP BY strftime('${dateFormat}', created_at)
    `, [from, to]);
    const paymentRows = query(`
      SELECT strftime('${dateFormat}', created_at) as period, COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      GROUP BY strftime('${dateFormat}', created_at)
    `, [from, to]);

    const revenueMap = new Map();
    for (const row of receiptRows) {
      revenueMap.set(row.period, {
        period: row.period,
        total_receipts: row.total || 0,
        total_payments: 0,
        net_revenue: row.total || 0,
      });
    }
    for (const row of paymentRows) {
      const current = revenueMap.get(row.period) || {
        period: row.period,
        total_receipts: 0,
        total_payments: 0,
        net_revenue: 0,
      };
      current.total_payments += row.total || 0;
      current.net_revenue = current.total_receipts - current.total_payments;
      revenueMap.set(row.period, current);
    }

    const teacherUtilization = query(`
      SELECT
        t.id as teacher_id,
        COALESCE(t.full_name, 'Chua phan cong') as teacher_name,
        COUNT(DISTINCT c.id) as active_classes,
        COUNT(DISTINCT sc.student_id) as active_students,
        COUNT(a.id) as total_sessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_sessions,
        SUM(CASE WHEN a.status = 'absent_with_fee' THEN 1 ELSE 0 END) as absent_with_fee,
        SUM(CASE WHEN a.status = 'absent_no_fee' THEN 1 ELSE 0 END) as absent_no_fee,
        SUM(CASE WHEN a.status = 'holiday' THEN 1 ELSE 0 END) as holiday
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN student_classes sc ON sc.class_id = c.id AND sc.status = 'active'
      LEFT JOIN attendance a ON a.class_id = c.id AND date(a.attendance_date) >= ? AND date(a.attendance_date) <= ?
      WHERE c.status = 'active'
      GROUP BY t.id, t.full_name
      ORDER BY active_classes DESC, teacher_name ASC
    `, [from, to]).map((row) => ({
      ...row,
      teacher_id: row.teacher_id || null,
      utilization_rate: row.total_sessions ? Math.round((row.present_sessions / row.total_sessions) * 100) : 0,
    }));

    const retentionCohort = query(`
      SELECT
        strftime('%Y-%m', enrollment_date) as cohort,
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students,
        SUM(CASE WHEN status = 'graduated' THEN 1 ELSE 0 END) as graduated_students
      FROM students
      WHERE date(enrollment_date) >= ? AND date(enrollment_date) <= ?
      GROUP BY strftime('%Y-%m', enrollment_date)
      ORDER BY cohort ASC
    `, [from, to]).map((row) => ({
      ...row,
      retention_rate: row.total_students ? Math.round((row.active_students / row.total_students) * 100) : 0,
    }));

    const totalReceipts = receiptRows.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalPayments = paymentRows.reduce((sum, row) => sum + (row.total || 0), 0);

    res.json({
      success: true,
      data: {
        from,
        to,
        group_by: groupBy,
        revenue_trend: Array.from(revenueMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
        teacher_utilization: teacherUtilization,
        retention_cohort: retentionCohort,
        summary: {
          total_receipts: totalReceipts,
          total_payments: totalPayments,
          net_revenue: totalReceipts - totalPayments,
          receipt_count: receiptRows.length,
          payment_count: paymentRows.length,
          active_teacher_count: teacherUtilization.filter((item) => item.teacher_id).length,
          active_class_count: teacherUtilization.reduce((sum, item) => sum + (item.active_classes || 0), 0),
          cohort_student_count: retentionCohort.reduce((sum, item) => sum + (item.total_students || 0), 0),
        },
      },
    });
  } catch (error) { next(error); }
});

export default router;
