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

/**
 * GET /api/auth/me
 * Return current authenticated admin profile
 */
async function getMe(req, res) {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        res.json({
            success: true,
            user: formatAdminResponse(admin)
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load admin profile'
        });
    }
}

/**
 * PUT /api/auth/profile
 * Update authenticated admin profile (name + email)
 */
async function updateProfile(req, res) {
    try {
        const { name, email } = req.body;
        const adminId = req.user.id;

        const existingAdmin = await Admin.findById(adminId);
        if (!existingAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        const duplicateEmail = await Admin.findByEmailExcludingId(email, adminId);
        if (duplicateEmail) {
            return res.status(409).json({
                success: false,
                error: 'Email is already in use by another admin'
            });
        }

        await Admin.updateProfile(adminId, { name, email });
        const updatedAdmin = await Admin.findById(adminId);

        const token = generateToken(updatedAdmin);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            token,
            user: formatAdminResponse(updatedAdmin)
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
}

/**
 * PUT /api/auth/password
 * Change authenticated admin password
 */
async function updatePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminId = req.user.id;

        const admin = await Admin.findByIdWithPassword(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        const isCurrentPasswordValid = await Admin.verifyPassword(currentPassword, admin.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        const isSamePassword = await Admin.verifyPassword(newPassword, admin.password_hash);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                error: 'New password must be different from current password'
            });
        }

        const newPasswordHash = await Admin.hashPassword(newPassword);
        await Admin.updatePassword(adminId, newPasswordHash);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
}

module.exports = {
    login,
    verifyToken,
    logout,
    getMe,
    updateProfile,
    updatePassword
};
