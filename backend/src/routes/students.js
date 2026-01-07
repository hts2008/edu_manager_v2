import { Router } from 'express';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Apply auth to all routes
router.use(verifyToken);

/**
 * GET /api/students
 * List all students with optional filters
 */
router.get('/', (req, res, next) => {
  try {
    const { status, class_id, search, page = 1, limit = 20 } = req.query;
    
    let sql = `
      SELECT s.*, p.full_name as parent_name, p.phone as parent_phone
      FROM students s
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    
    if (search) {
      sql += ' AND (s.full_name LIKE ? OR s.id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (class_id) {
      sql += ' AND s.id IN (SELECT student_id FROM student_classes WHERE class_id = ?)';
      params.push(class_id);
    }
    
    sql += ' ORDER BY s.created_at DESC';
    
    // Pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const students = query(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM students WHERE 1=1';
    if (status) countSql += ` AND status = '${status}'`;
    const { total } = queryOne(countSql);
    
    res.json({
      success: true,
      data: {
        students,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/students/:id
 * Get student by ID
 */
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    
    const student = queryOne(`
      SELECT s.*, p.full_name as parent_name, p.phone as parent_phone, p.email as parent_email
      FROM students s
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = ?
    `, [id]);
    
    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }
    
    // Get enrolled classes
    const classes = query(`
      SELECT c.*, sc.enrollment_date, sc.status as enrollment_status
      FROM classes c
      JOIN student_classes sc ON c.id = sc.class_id
      WHERE sc.student_id = ?
    `, [id]);
    
    res.json({
      success: true,
      data: { ...student, classes }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/students
 * Create new student
 */
router.post('/', (req, res, next) => {
  try {
    const { 
      full_name, date_of_birth, gender, parent_id, 
      phone, email, address, enrollment_date, notes, class_ids 
    } = req.body;
    
    // Validation
    if (!full_name || !date_of_birth || !gender || !parent_id || !enrollment_date) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    // Check parent exists
    const parent = queryOne('SELECT id FROM parents WHERE id = ?', [parent_id]);
    if (!parent) {
      throw new AppError('Parent not found', 404, 'PARENT_NOT_FOUND');
    }
    
    // Generate ID
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM students WHERE id LIKE ?', [`STU${today}%`]);
    const id = `STU${today}${String(count.c + 1).padStart(3, '0')}`;
    
    // Insert student
    execute(`
      INSERT INTO students (id, full_name, date_of_birth, gender, parent_id, phone, email, address, enrollment_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, full_name, date_of_birth, gender, parent_id, phone, email, address, enrollment_date, notes]);
    
    // Enroll in classes if provided
    if (class_ids && class_ids.length > 0) {
      class_ids.forEach(class_id => {
        execute(`
          INSERT INTO student_classes (student_id, class_id, enrollment_date)
          VALUES (?, ?, ?)
        `, [id, class_id, enrollment_date]);
      });
    }
    
    // Log activity
    execute(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES (?, ?, ?, ?)
    `, [req.userId, 'create', 'student', id]);
    
    const student = queryOne('SELECT * FROM students WHERE id = ?', [id]);
    
    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/students/:id
 * Update student
 */
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      full_name, date_of_birth, gender, parent_id, 
      phone, email, address, graduation_date, status, notes 
    } = req.body;
    
    // Check student exists
    const existing = queryOne('SELECT id FROM students WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }
    
    execute(`
      UPDATE students SET
        full_name = COALESCE(?, full_name),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        parent_id = COALESCE(?, parent_id),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        graduation_date = COALESCE(?, graduation_date),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [full_name, date_of_birth, gender, parent_id, phone, email, address, graduation_date, status, notes, id]);
    
    // Log activity
    execute(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES (?, ?, ?, ?)
    `, [req.userId, 'update', 'student', id]);
    
    const student = queryOne('SELECT * FROM students WHERE id = ?', [id]);
    
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/students/:id
 * Soft delete student (set status to inactive)
 */
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existing = queryOne('SELECT id FROM students WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }
    
    execute(`UPDATE students SET status = 'inactive', updated_at = datetime('now', 'localtime') WHERE id = ?`, [id]);
    
    // Log activity
    execute(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES (?, ?, ?, ?)
    `, [req.userId, 'delete', 'student', id]);
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
