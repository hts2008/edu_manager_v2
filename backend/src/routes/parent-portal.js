import express from 'express';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../database/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'edu-manager-secret-key-change-in-production';

function normalizePhone(value) {
  return String(value || '').trim().replace(/[^\d+]/g, '');
}

function toDateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function signParentToken(parentId) {
  return jwt.sign({ parentId, type: 'parent_portal' }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyParentToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError('Parent portal token is required', 401, 'UNAUTHORIZED');
  }
  const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  if (decoded.type !== 'parent_portal' || !decoded.parentId) {
    throw new AppError('Invalid parent portal token', 401, 'TOKEN_INVALID');
  }
  return decoded.parentId;
}

router.post('/login', (req, res, next) => {
  try {
    const phone = normalizePhone(req.body?.parent_phone || req.body?.phone);
    const dob = String(req.body?.student_date_of_birth || req.body?.date_of_birth || '').trim();
    if (!phone || !dob) {
      throw new AppError('parent_phone and student_date_of_birth are required', 400, 'VALIDATION_ERROR');
    }

    const parents = query('SELECT * FROM parents');
    const parent = parents.find((item) => normalizePhone(item.phone) === phone);
    if (!parent) {
      throw new AppError('Invalid parent credentials', 401, 'PARENT_PORTAL_LOGIN_FAILED');
    }
    const students = query('SELECT * FROM students WHERE parent_id = ?', [parent.id]);
    if (!students.some((student) => toDateOnly(student.date_of_birth) === dob)) {
      throw new AppError('Invalid parent credentials', 401, 'PARENT_PORTAL_LOGIN_FAILED');
    }

    res.json({
      success: true,
      data: {
        token: signParentToken(parent.id),
        parent: {
          id: parent.id,
          full_name: parent.full_name,
          phone: parent.phone,
          email: parent.email,
          relationship: parent.relationship,
        },
        students: students.map((student) => ({
          id: student.id,
          full_name: student.full_name,
          date_of_birth: toDateOnly(student.date_of_birth),
          status: student.status,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', (req, res, next) => {
  try {
    const parentId = verifyParentToken(req);
    const parent = queryOne('SELECT * FROM parents WHERE id = ?', [parentId]);
    if (!parent) throw new AppError('Parent not found', 404, 'PARENT_NOT_FOUND');

    const students = query('SELECT * FROM students WHERE parent_id = ? ORDER BY full_name', [parentId]).map((student) => {
      const fees = query('SELECT * FROM monthly_fees WHERE student_id = ? ORDER BY month DESC LIMIT 24', [student.id]);
      const receipts = query('SELECT * FROM receipts WHERE student_id = ? ORDER BY created_at DESC LIMIT 24', [student.id]);
      const attendance = query(
        "SELECT * FROM attendance WHERE student_id = ? AND attendance_date >= date('now', '-365 days') ORDER BY attendance_date DESC LIMIT 500",
        [student.id]
      );
      return {
        id: student.id,
        full_name: student.full_name,
        date_of_birth: toDateOnly(student.date_of_birth),
        status: student.status,
        fees,
        receipts,
        attendance: attendance.map((record) => ({
          id: record.id,
          date: toDateOnly(record.attendance_date),
          status: record.status,
          class_id: record.class_id,
          notes: record.reason,
        })),
      };
    });

    res.json({
      success: true,
      data: {
        parent: {
          id: parent.id,
          full_name: parent.full_name,
          phone: parent.phone,
          email: parent.email,
          relationship: parent.relationship,
        },
        students,
        summary: {
          student_count: students.length,
          unpaid_fee_count: students.reduce(
            (sum, student) => sum + student.fees.filter((fee) => fee.status !== 'paid').length,
            0
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
