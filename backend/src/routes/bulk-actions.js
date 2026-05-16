import express from 'express';
import { execute, queryOne, transaction } from '../database/index.js';
import { ensureSoftDeleteColumns } from '../database/soft-delete.js';
import { adminOnly, verifyToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

const supportedActions = {
  students: ['archive', 'delete'],
  parents: ['delete'],
  receipts: ['delete'],
  payments: ['delete'],
};

function validateBody(body) {
  const { resource, action, ids } = body || {};
  if (!supportedActions[resource]) {
    throw new AppError('Invalid bulk resource', 400, 'VALIDATION_ERROR');
  }
  if (!supportedActions[resource].includes(action)) {
    throw new AppError(`${action} is not supported for ${resource}`, 400, 'UNSUPPORTED_ACTION');
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids must include at least one id', 400, 'VALIDATION_ERROR');
  }
  if (ids.length > 100) {
    throw new AppError('bulk actions are limited to 100 records', 400, 'VALIDATION_ERROR');
  }
  return { resource, action, ids: [...new Set(ids.map(String).filter(Boolean))] };
}

function notFound(id, action) {
  return {
    id,
    action,
    success: false,
    error_code: 'NOT_FOUND',
    message: 'Record not found',
  };
}

function dependencyError(id, action, message) {
  return {
    id,
    action,
    success: false,
    error_code: 'HAS_DEPENDENCIES',
    message,
  };
}

function archiveStudent(id) {
  ensureSoftDeleteColumns();
  const student = queryOne('SELECT id FROM students WHERE id = ?', [id]);
  if (!student) return notFound(id, 'archive');
  execute("UPDATE students SET status = 'inactive', updated_at = datetime('now', 'localtime') WHERE id = ?", [id]);
  return { id, action: 'archive', success: true };
}

function deleteStudent(id) {
  ensureSoftDeleteColumns();
  const student = queryOne('SELECT id FROM students WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!student) return notFound(id, 'delete');

  execute("UPDATE student_classes SET status = 'inactive' WHERE student_id = ? AND status = 'active'", [id]);
  execute("UPDATE students SET status = 'inactive', deleted_at = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime') WHERE id = ?", [id]);
  return { id, action: 'delete', success: true };
}

function deleteParent(id) {
  ensureSoftDeleteColumns();
  const parent = queryOne('SELECT id FROM parents WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!parent) return notFound(id, 'delete');

  const children = queryOne('SELECT COUNT(*) as c FROM students WHERE parent_id = ? AND deleted_at IS NULL', [id]).c;
  if (children > 0) {
    return dependencyError(id, 'delete', 'Parent has linked students');
  }

  execute("UPDATE parents SET deleted_at = datetime('now', 'localtime') WHERE id = ?", [id]);
  return { id, action: 'delete', success: true };
}

function deleteReceipt(id) {
  ensureSoftDeleteColumns();
  const receipt = queryOne('SELECT id FROM receipts WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!receipt) return notFound(id, 'delete');

  transaction(() => {
    execute(
      "UPDATE monthly_fees SET receipt_id = NULL, status = 'confirmed', paid_at = NULL, updated_at = datetime('now', 'localtime') WHERE receipt_id = ?",
      [id]
    );
    execute("UPDATE receipts SET deleted_at = datetime('now', 'localtime') WHERE id = ?", [id]);
  });
  return { id, action: 'delete', success: true };
}

function deletePayment(id) {
  ensureSoftDeleteColumns();
  const payment = queryOne('SELECT id FROM payments WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!payment) return notFound(id, 'delete');

  execute("UPDATE payments SET deleted_at = datetime('now', 'localtime') WHERE id = ?", [id]);
  return { id, action: 'delete', success: true };
}

function runAction(resource, action, id) {
  try {
    if (resource === 'students' && action === 'archive') return archiveStudent(id);
    if (resource === 'students' && action === 'delete') return deleteStudent(id);
    if (resource === 'parents' && action === 'delete') return deleteParent(id);
    if (resource === 'receipts' && action === 'delete') return deleteReceipt(id);
    if (resource === 'payments' && action === 'delete') return deletePayment(id);
  } catch (error) {
    return {
      id,
      action,
      success: false,
      error_code: 'SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Bulk action failed',
    };
  }

  return {
    id,
    action,
    success: false,
    error_code: 'UNSUPPORTED_ACTION',
    message: 'Unsupported bulk action',
  };
}

router.post('/', verifyToken, adminOnly, (req, res, next) => {
  try {
    const { resource, action, ids } = validateBody(req.body);
    const results = ids.map((id) => runAction(resource, action, id));
    const succeeded = results.filter((result) => result.success).length;

    res.json({
      success: true,
      data: {
        resource,
        action,
        requested: ids.length,
        succeeded,
        failed: results.length - succeeded,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
