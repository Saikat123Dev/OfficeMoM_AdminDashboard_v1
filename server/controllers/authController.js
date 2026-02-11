const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for an admin
 */
function generateToken(admin) {
    return jwt.sign(
        {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Format admin data for API response (excludes sensitive fields)
 */
function formatAdminResponse(admin) {
    return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
    };
}

/**
 * POST /api/auth/login
 * Authenticate admin with email and password
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Find admin by email
        const admin = await Admin.findByEmail(email);
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await Admin.verifyPassword(password, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(admin);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: formatAdminResponse(admin)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during login'
        });
    }
}

/**
 * POST /api/auth/verify
 * Verify an existing JWT token and return admin data
 */
async function verifyToken(req, res) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify admin still exists in database
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin account no longer exists'
            });
        }

        res.json({
            success: true,
            user: formatAdminResponse(admin)
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token has expired'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
}

/**
 * POST /api/auth/logout
 * Stateless logout — client removes token
 */
function logout(req, res) {
    res.json({
        success: true,
        message: 'Logout successful'
    });
}

module.exports = {
    login,
    verifyToken,
    logout
};
