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
     * Find admin by ID including password hash
     * @param {number} id
     * @returns {Promise<object|null>}
     */
    static async findByIdWithPassword(id) {
        const [rows] = await pool.execute(
            'SELECT id, email, password_hash, name, role, created_at, updated_at FROM admins WHERE id = ?',
            [id]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Find another admin by email excluding a specific ID
     * @param {string} email
     * @param {number} excludeId
     * @returns {Promise<object|null>}
     */
    static async findByEmailExcludingId(email, excludeId) {
        const [rows] = await pool.execute(
            'SELECT id, email FROM admins WHERE email = ? AND id != ? LIMIT 1',
            [email, excludeId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Update admin profile fields
     * @param {number} id
     * @param {{name: string, email: string}} data
     * @returns {Promise<void>}
     */
    static async updateProfile(id, data) {
        await pool.execute(
            `UPDATE admins
             SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [data.name, data.email, id]
        );
    }

    /**
     * Update admin password hash
     * @param {number} id
     * @param {string} passwordHash
     * @returns {Promise<void>}
     */
    static async updatePassword(id, passwordHash) {
        await pool.execute(
            `UPDATE admins
             SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [passwordHash, id]
        );
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
