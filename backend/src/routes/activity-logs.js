import { Router } from 'express';
import { query, queryOne } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);
router.use(adminOnly);

function activityLogToDto(log) {
  return {
    id: log.id,
    user_id: log.user_id,
    user_name: log.user_name || log.username || null,
    username: log.username || null,
    user_role: log.user_role || null,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    created_at: log.created_at,
  };
}

router.get('/', (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const where = [];
    const params = [];

    if (req.query.user_id) {
      where.push('al.user_id = ?');
      params.push(req.query.user_id);
    }
    if (req.query.action) {
      where.push('LOWER(al.action) LIKE LOWER(?)');
      params.push(`%${req.query.action}%`);
    }
    if (req.query.entity_type) {
      where.push('al.entity_type = ?');
      params.push(req.query.entity_type);
    }
    if (req.query.from || req.query.start_date) {
      where.push('date(al.created_at) >= date(?)');
      params.push(req.query.from || req.query.start_date);
    }
    if (req.query.to || req.query.end_date) {
      where.push('date(al.created_at) <= date(?)');
      params.push(req.query.to || req.query.end_date);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const logs = query(
      `
        SELECT
          al.id,
          al.user_id,
          u.full_name as user_name,
          u.username,
          u.role as user_role,
          al.action,
          al.entity_type,
          al.entity_id,
          al.ip_address,
          al.user_agent,
          al.created_at
        FROM activity_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ${whereSql}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const total = queryOne(
      `SELECT COUNT(*) as total FROM activity_logs al ${whereSql}`,
      params
    ).total;

    res.json({
      success: true,
      data: {
        logs: logs.map(activityLogToDto),
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
