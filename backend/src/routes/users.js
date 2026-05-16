import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { execute, query, queryOne } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken, adminOnly);

function userToDto(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    status: user.status,
    last_login: user.last_login,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

router.get('/', (req, res, next) => {
  try {
    const clauses = [];
    const params = [];
    if (req.query.role) {
      clauses.push('role = ?');
      params.push(req.query.role);
    }
    if (req.query.status) {
      clauses.push('status = ?');
      params.push(req.query.status);
    }
    if (req.query.search) {
      clauses.push('(username LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const search = `%${req.query.search}%`;
      params.push(search, search, search, search);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const users = query(`
      SELECT id, username, role, full_name, email, phone, status, last_login, created_at, updated_at
      FROM users
      ${where}
      ORDER BY status ASC, created_at DESC
    `, params);

    res.json({ success: true, data: { users: users.map(userToDto), total: users.length } });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, password, full_name, role, email, phone, status = 'active' } = req.body;
    if (!username) throw new AppError('username is required', 400, 'VALIDATION_ERROR');
    if (!password || password.length < 6) {
      throw new AppError('password must be at least 6 characters', 400, 'VALIDATION_ERROR');
    }
    if (!full_name) throw new AppError('full_name is required', 400, 'VALIDATION_ERROR');
    if (!['admin', 'receptionist'].includes(role)) {
      throw new AppError('role must be admin or receptionist', 400, 'VALIDATION_ERROR');
    }

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) throw new AppError('username already exists', 409, 'USERNAME_EXISTS');

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    execute(`
      INSERT INTO users (id, username, password_hash, role, full_name, email, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, username, passwordHash, role, full_name, email || null, phone || null, status]);

    const user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: { user: userToDto(user) } });
  } catch (error) { next(error); }
});

router.get('/:id', (req, res, next) => {
  try {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    res.json({ success: true, data: { user: userToDto(user) } });
  } catch (error) { next(error); }
});

router.put('/:id', (req, res, next) => {
  try {
    const { full_name, role, email, phone, status } = req.body;
    if (req.params.id === req.user.id && status === 'inactive') {
      throw new AppError('Cannot deactivate your own account', 400, 'SELF_DEACTIVATE_FORBIDDEN');
    }

    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    execute(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          role = COALESCE(?, role),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [
      full_name || null,
      role || null,
      email === undefined ? null : email,
      phone === undefined ? null : phone,
      status || null,
      req.params.id,
    ]);

    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { user: userToDto(user) } });
  } catch (error) { next(error); }
});

router.delete('/:id', (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      throw new AppError('Cannot deactivate your own account', 400, 'SELF_DEACTIVATE_FORBIDDEN');
    }
    execute("UPDATE users SET status = 'inactive', updated_at = datetime('now', 'localtime') WHERE id = ?", [
      req.params.id,
    ]);
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    res.json({ success: true, data: { user: userToDto(user), message: 'User deactivated' } });
  } catch (error) { next(error); }
});

router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      throw new AppError('password must be at least 6 characters', 400, 'VALIDATION_ERROR');
    }
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const passwordHash = await bcrypt.hash(password, 10);
    execute("UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", [
      passwordHash,
      req.params.id,
    ]);
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { user: userToDto(user), message: 'Password reset' } });
  } catch (error) { next(error); }
});

export default router;
