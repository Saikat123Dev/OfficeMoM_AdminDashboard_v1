const bcrypt = require('bcryptjs');
const pool = require('../config/database');

class Admin {
    /**
     * Find an admin by email address
     * @param {string} email
     * @returns {Promise<object|null>}
     */
    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT id, email, password_hash, name, role, created_at, updated_at FROM admins WHERE email = ?',
            [email]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Find an admin by ID
     * @param {number} id
     * @returns {Promise<object|null>}
     */
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, email, name, role, created_at, updated_at FROM admins WHERE id = ?',
            [id]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Verify a plaintext password against a bcrypt hash
     * @param {string} plainPassword
     * @param {string} hashedPassword
     * @returns {Promise<boolean>}
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Hash a plaintext password
     * @param {string} plainPassword
     * @returns {Promise<string>}
     */
    static async hashPassword(plainPassword) {
        const salt = await bcrypt.genSalt(12);
        return bcrypt.hash(plainPassword, salt);
    }
}

module.exports = Admin;
