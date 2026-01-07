import jwt from 'jsonwebtoken';
import { queryOne } from '../database/index.js';
import { AppError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'edu-manager-secret-key-change-in-production';

/**
 * Verify JWT token
 */
export function verifyToken(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401, 'NO_TOKEN');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = queryOne('SELECT id, username, role, full_name, status FROM users WHERE id = ?', [decoded.userId]);
    
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }
    
    if (user.status !== 'active') {
      throw new AppError('User account is inactive', 403, 'ACCOUNT_INACTIVE');
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' }
      });
    }
    
    next(error);
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' }
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'FORBIDDEN', 
          message: `This action requires one of these roles: ${roles.join(', ')}` 
        }
      });
    }
    
    next();
  };
}

/**
 * Admin only middleware
 */
export const adminOnly = requireRole('admin');

/**
 * Generate JWT token
 */
export function generateToken(userId, role) {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}
