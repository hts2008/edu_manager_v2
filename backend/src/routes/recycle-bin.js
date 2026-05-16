import express from 'express';
import { execute, query, queryOne, transaction } from '../database/index.js';
import { ensureSoftDeleteColumns } from '../database/soft-delete.js';
import { adminOnly, verifyToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(verifyToken, adminOnly);

const supportedResources = ['students', 'parents', 'receipts', 'payments'];

function validateResource(resource) {
  if (!supportedResources.includes(resource)) {
    throw new AppError('Invalid recycle-bin resource', 400, 'INVALID_RESOURCE');
  }
  return resource;
}

function listStudents() {
  return query(`
    SELECT 'students' as resource, s.id, s.full_name as label, s.full_name,
           p.full_name as parent_name, s.status, s.deleted_at, s.created_at
    FROM students s
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE s.deleted_at IS NOT NULL
    ORDER BY s.deleted_at DESC
  `);
}

function listParents() {
  return query(`
    SELECT 'parents' as resource, p.id, p.full_name as label, p.full_name, p.phone,
           p.relationship, p.deleted_at, p.created_at,
           (SELECT COUNT(*) FROM students s WHERE s.parent_id = p.id AND s.deleted_at IS NULL) as children_count
    FROM parents p
    WHERE p.deleted_at IS NOT NULL
    ORDER BY p.deleted_at DESC
  `);
}

function listReceipts() {
  return query(`
    SELECT 'receipts' as resource, r.id,
           COALESCE(s.full_name || ' ' || r.month, r.id) as label,
           s.full_name as student_name, r.month, r.amount, r.deleted_at, r.created_at
    FROM receipts r
    LEFT JOIN students s ON r.student_id = s.id
    WHERE r.deleted_at IS NOT NULL
    ORDER BY r.deleted_at DESC
  `);
}

function listPayments() {
  return query(`
    SELECT 'payments' as resource, id, recipient_name as label, category,
           recipient_name, amount, deleted_at, created_at
    FROM payments
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `);
}

function listByResource(resource) {
  if (resource === 'students') return listStudents();
  if (resource === 'parents') return listParents();
  if (resource === 'receipts') return listReceipts();
  if (resource === 'payments') return listPayments();
  return [];
}

function restore(resource, id) {
  const table = resource;
  const row = queryOne(`SELECT id FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  if (!row) throw new AppError('Deleted record not found', 404, 'NOT_FOUND');
  if (resource === 'students') {
    execute("UPDATE students SET deleted_at = NULL, status = 'active', updated_at = datetime('now', 'localtime') WHERE id = ?", [id]);
    return;
  }
  execute(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, [id]);
}

function purge(resource, id) {
  const table = resource;
  const row = queryOne(`SELECT id FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  if (!row) throw new AppError('Deleted record not found', 404, 'NOT_FOUND');

  if (resource === 'students') {
    const dependencies =
      queryOne('SELECT COUNT(*) as c FROM attendance WHERE student_id = ?', [id]).c +
      queryOne('SELECT COUNT(*) as c FROM monthly_fees WHERE student_id = ?', [id]).c +
      queryOne('SELECT COUNT(*) as c FROM receipts WHERE student_id = ?', [id]).c +
      queryOne('SELECT COUNT(*) as c FROM student_classes WHERE student_id = ?', [id]).c;
    if (dependencies > 0) {
      throw new AppError('Student has operational records and cannot be permanently purged', 400, 'HAS_DEPENDENCIES');
    }
  }

  if (resource === 'parents') {
    const children = queryOne('SELECT COUNT(*) as c FROM students WHERE parent_id = ?', [id]).c;
    if (children > 0) {
      throw new AppError('Parent still has linked students', 400, 'HAS_DEPENDENCIES');
    }
  }

  if (resource === 'receipts') {
    transaction(() => {
      execute(
        "UPDATE monthly_fees SET receipt_id = NULL, status = 'confirmed', paid_at = NULL, updated_at = datetime('now', 'localtime') WHERE receipt_id = ?",
        [id]
      );
      execute('DELETE FROM receipts WHERE id = ?', [id]);
    });
    return;
  }

  execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

router.get('/', (req, res, next) => {
  try {
    ensureSoftDeleteColumns();
    const resource = req.query.resource ? validateResource(String(req.query.resource)) : null;
    const resources = resource ? [resource] : supportedResources;
    const byResource = {
      students: [],
      parents: [],
      receipts: [],
      payments: [],
    };
    for (const item of resources) {
      byResource[item] = listByResource(item);
    }
    res.json({
      success: true,
      data: {
        resource: resource || 'all',
        items: resources.flatMap((item) => byResource[item]),
        by_resource: byResource,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    ensureSoftDeleteColumns();
    const resource = validateResource(req.body?.resource);
    const action = req.body?.action;
    const id = String(req.body?.id || '').trim();
    if (!['restore', 'purge'].includes(action) || !id) {
      throw new AppError('resource, action, and id are required', 400, 'VALIDATION_ERROR');
    }

    if (action === 'restore') restore(resource, id);
    if (action === 'purge') purge(resource, id);

    res.json({
      success: true,
      data: { resource, action, id, message: `${action} completed` },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
