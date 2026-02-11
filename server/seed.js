/**
 * Seed script for the Admin Dashboard
 * Creates the `admins` table and inserts the default admin user.
 *
 * Usage: node seed.js
 */
const bcrypt = require('bcryptjs');
const pool = require('./config/database');
require('dotenv').config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_NAME = 'Admin';

async function seed() {
    console.log('🌱 Starting database seed...\n');

    try {
        // 1. Create the admins table if it doesn't exist
        console.log('📦 Creating admins table...');
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL DEFAULT 'Admin',
        role ENUM('super_admin', 'admin', 'moderator') NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('   ✅ admins table ready.\n');

        // 2. Hash the password
        console.log('🔐 Hashing admin password...');
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);
        console.log('   ✅ Password hashed.\n');

        // 3. Insert the admin user (skip if email already exists)
        console.log(`👤 Inserting admin user (${ADMIN_EMAIL})...`);
        const [result] = await pool.execute(
            `INSERT IGNORE INTO admins (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
            [ADMIN_EMAIL, passwordHash, ADMIN_NAME, 'super_admin']
        );

        if (result.affectedRows > 0) {
            console.log(`   ✅ Admin user created with ID: ${result.insertId}\n`);
        } else {
            console.log(`   ⚠️  Admin user already exists — skipped.\n`);
        }

        // 4. Verify the admin was inserted
        const [admins] = await pool.execute(
            'SELECT id, email, name, role, created_at FROM admins WHERE email = ?',
            [ADMIN_EMAIL]
        );

        if (admins.length > 0) {
            console.log('📋 Admin record:');
            console.log(`   ID:    ${admins[0].id}`);
            console.log(`   Email: ${admins[0].email}`);
            console.log(`   Name:  ${admins[0].name}`);
            console.log(`   Role:  ${admins[0].role}`);
            console.log(`   Created: ${admins[0].created_at}\n`);
        }

        console.log('🎉 Seed completed successfully!');
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

seed();
