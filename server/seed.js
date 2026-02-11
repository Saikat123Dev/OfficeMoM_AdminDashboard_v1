/**
 * Seed script for the Admin Dashboard
 * Creates the `admins`, `blogs`, `tags`, and `blog_tags` tables
 * and inserts the default admin user.
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
    // 1. Create the admins table
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

    // 1b. Create admin_notification_reads table
    console.log('📦 Creating admin_notification_reads table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_notification_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        category VARCHAR(50) NOT NULL,
        last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_admin_category (admin_id, category),
        INDEX idx_admin_notif (admin_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ admin_notification_reads table ready.\n');

    // 2. Create blogs table
    console.log('📦 Creating blogs table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(600) NOT NULL,
        content LONGTEXT NOT NULL,
        excerpt TEXT,
        featured_image VARCHAR(1000),
        status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
        author_id INT,
        meta_description VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        published_at TIMESTAMP NULL,
        INDEX idx_blog_status (status),
        INDEX idx_blog_slug (slug),
        INDEX idx_blog_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ blogs table ready.\n');

    // 3. Create tags table
    console.log('📦 Creating tags table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(120) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tag_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ tags table ready.\n');

    // 4. Create blog_tags junction table
    console.log('📦 Creating blog_tags table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS blog_tags (
        blog_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (blog_id, tag_id),
        FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ blog_tags table ready.\n');

    // 5. Hash and insert admin user
    console.log('🔐 Hashing admin password...');
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);
    console.log('   ✅ Password hashed.\n');

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

    // 6. Seed some default tags
    console.log('🏷️  Inserting default tags...');
    const defaultTags = ['Technology', 'Business', 'Updates', 'Tutorial', 'News', 'Tips & Tricks'];
    for (const tag of defaultTags) {
      const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await pool.execute('INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)', [tag, slug]);
    }
    console.log('   ✅ Default tags ready.\n');

    // 7. Verify
    const [admins] = await pool.execute(
      'SELECT id, email, name, role, created_at FROM admins WHERE email = ?',
      [ADMIN_EMAIL]
    );
    if (admins.length > 0) {
      console.log('📋 Admin record:');
      console.log(`   ID:    ${admins[0].id}`);
      console.log(`   Email: ${admins[0].email}`);
      console.log(`   Name:  ${admins[0].name}`);
      console.log(`   Role:  ${admins[0].role}\n`);
    }

    const [tags] = await pool.execute('SELECT COUNT(*) AS count FROM tags');
    const [blogs] = await pool.execute('SELECT COUNT(*) AS count FROM blogs');
    console.log(`📊 Summary: ${tags[0].count} tags, ${blogs[0].count} blogs\n`);

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
