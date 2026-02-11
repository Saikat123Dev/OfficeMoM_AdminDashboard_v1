const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authenticate a JWT token from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

/**
 * Verify that the authenticated user is a valid admin.
 * Must be used AFTER authenticateToken.
 * Checks that the admin still exists in the admins table.
 */
async function requireAdmin(req, res, next) {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    req.admin = admin;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
}

module.exports = { authenticateToken, requireAdmin };