const pool = require('../config/database');

class Blog {
    /**
     * List blogs with filtering, search, and pagination
     */
    static async findAll({ status, search, page = 1, limit = 10 } = {}) {
        const offset = (page - 1) * limit;
        let query = `
      SELECT b.id, b.title, b.slug, b.excerpt, b.featured_image, b.status,
             b.author_id, b.meta_description, b.created_at, b.updated_at, b.published_at,
             GROUP_CONCAT(t.name) AS tags
      FROM blogs b
      LEFT JOIN blog_tags bt ON b.id = bt.blog_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE 1=1
    `;
        let countQuery = `SELECT COUNT(DISTINCT b.id) AS total FROM blogs b WHERE 1=1`;
        const params = [];
        const countParams = [];

        if (status && status !== 'all') {
            query += ` AND b.status = ?`;
            countQuery += ` AND b.status = ?`;
            params.push(status);
            countParams.push(status);
        }

        if (search) {
            query += ` AND (b.title LIKE ? OR b.excerpt LIKE ?)`;
            countQuery += ` AND (b.title LIKE ? OR b.excerpt LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term);
            countParams.push(term, term);
        }

        query += ` GROUP BY b.id ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [blogs] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Parse tags from comma-separated string to array
        const blogsWithTags = blogs.map(blog => ({
            ...blog,
            tags: blog.tags ? blog.tags.split(',') : []
        }));

        return {
            blogs: blogsWithTags,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalBlogs: total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        };
    }

    /**
     * Find a single blog by ID with its tags
     */
    static async findById(id) {
        const [blogs] = await pool.execute(
            `SELECT b.*, GROUP_CONCAT(t.name) AS tag_names, GROUP_CONCAT(t.id) AS tag_ids
       FROM blogs b
       LEFT JOIN blog_tags bt ON b.id = bt.blog_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       WHERE b.id = ?
       GROUP BY b.id`,
            [id]
        );

        if (blogs.length === 0) return null;

        const blog = blogs[0];
        blog.tags = blog.tag_names ? blog.tag_names.split(',') : [];
        blog.tagIds = blog.tag_ids ? blog.tag_ids.split(',').map(Number) : [];
        delete blog.tag_names;
        delete blog.tag_ids;

        return blog;
    }

    /**
     * Create a new blog post
     */
    static async create({ title, slug, content, excerpt, featured_image, status, author_id, meta_description, tags }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(
                `INSERT INTO blogs (title, slug, content, excerpt, featured_image, status, author_id, meta_description, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    title, slug, content, excerpt || null, featured_image || null,
                    status || 'draft', author_id || null, meta_description || null,
                    status === 'published' ? new Date() : null
                ]
            );

            const blogId = result.insertId;

            // Handle tags
            if (tags && tags.length > 0) {
                await Blog._syncTags(connection, blogId, tags);
            }

            await connection.commit();
            return blogId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update an existing blog post
     */
    static async update(id, { title, slug, content, excerpt, featured_image, status, meta_description, tags }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Build dynamic update
            const fields = [];
            const values = [];

            if (title !== undefined) { fields.push('title = ?'); values.push(title); }
            if (slug !== undefined) { fields.push('slug = ?'); values.push(slug); }
            if (content !== undefined) { fields.push('content = ?'); values.push(content); }
            if (excerpt !== undefined) { fields.push('excerpt = ?'); values.push(excerpt); }
            if (featured_image !== undefined) { fields.push('featured_image = ?'); values.push(featured_image); }
            if (status !== undefined) {
                fields.push('status = ?');
                values.push(status);
                if (status === 'published') {
                    fields.push('published_at = COALESCE(published_at, NOW())');
                }
            }
            if (meta_description !== undefined) { fields.push('meta_description = ?'); values.push(meta_description); }

            fields.push('updated_at = NOW()');
            values.push(id);

            const [result] = await connection.execute(
                `UPDATE blogs SET ${fields.join(', ')} WHERE id = ?`,
                values
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return false;
            }

            // Sync tags
            if (tags !== undefined) {
                await Blog._syncTags(connection, id, tags);
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete a blog post and its tag associations
     */
    static async delete(id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM blog_tags WHERE blog_id = ?', [id]);
            const [result] = await connection.execute('DELETE FROM blogs WHERE id = ?', [id]);
            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update blog status (draft / published)
     */
    static async updateStatus(id, status) {
        const publishedAt = status === 'published' ? 'COALESCE(published_at, NOW())' : 'published_at';
        const [result] = await pool.execute(
            `UPDATE blogs SET status = ?, published_at = ${publishedAt}, updated_at = NOW() WHERE id = ?`,
            [status, id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Get all tags
     */
    static async getAllTags() {
        const [tags] = await pool.execute('SELECT id, name, slug, created_at FROM tags ORDER BY name ASC');
        return tags;
    }

    /**
     * Sync tags for a blog — creates new tags if needed
     * @param {Connection} connection - DB connection (for transactions)
     * @param {number} blogId
     * @param {string[]} tagNames - Array of tag name strings
     */
    static async _syncTags(connection, blogId, tagNames) {
        // Remove existing associations
        await connection.execute('DELETE FROM blog_tags WHERE blog_id = ?', [blogId]);

        if (!tagNames || tagNames.length === 0) return;

        for (const name of tagNames) {
            const trimmed = name.trim();
            if (!trimmed) continue;

            const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

            // Upsert tag
            await connection.execute(
                'INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)',
                [trimmed, slug]
            );

            // Get tag ID
            const [tagRows] = await connection.execute('SELECT id FROM tags WHERE slug = ?', [slug]);
            if (tagRows.length > 0) {
                await connection.execute(
                    'INSERT IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)',
                    [blogId, tagRows[0].id]
                );
            }
        }
    }

    /**
     * Get blog counts by status
     */
    static async getCounts() {
        const [rows] = await pool.execute(`
      SELECT 
        COUNT(*) AS total,
        SUM(status = 'published') AS published,
        SUM(status = 'draft') AS draft
      FROM blogs
    `);
        return rows[0];
    }
}

module.exports = Blog;
