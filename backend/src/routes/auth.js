import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, generateToken, generateRefreshToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
      throw new AppError('Username and password are required', 400, 'VALIDATION_ERROR');
    }
    
    // Find user
    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }
    
    // Check status
    if (user.status !== 'active') {
      throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }
    
    // Update last login
    execute("UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?", [user.id]);
    
    // Log activity
    execute(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES (?, ?, ?, ?)
    `, [user.id, 'login', 'user', user.id]);
    
    // Generate tokens
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);
    
    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          email: user.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', verifyToken, (req, res, next) => {
  try {
    // Log activity
    execute(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES (?, ?, ?, ?)
    `, [req.userId, 'logout', 'user', req.userId]);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', verifyToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // Validation
    if (!oldPassword || !newPassword) {
      throw new AppError('Old password and new password are required', 400, 'VALIDATION_ERROR');
    }
    
    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400, 'VALIDATION_ERROR');
    }
    
    // Get current user with password
    const user = queryOne('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
    
    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }
    
    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    execute("UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", 
      [newHash, req.userId]);
    
    // Log activity
    execute(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES (?, ?, ?, ?)
    `, [req.userId, 'change_password', 'user', req.userId]);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
