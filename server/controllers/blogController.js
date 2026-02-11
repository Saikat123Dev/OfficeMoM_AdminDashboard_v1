const Blog = require('../models/Blog');

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 200);
}

/**
 * GET /api/blogs
 * List blogs with optional filters
 */
async function list(req, res) {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;
        const result = await Blog.findAll({ status, search, page: parseInt(page), limit: parseInt(limit) });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Blog list error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch blogs' });
    }
}

/**
 * GET /api/blogs/tags
 * Get all available tags
 */
async function getTags(req, res) {
    try {
        const tags = await Blog.getAllTags();
        res.json({ success: true, tags });
    } catch (error) {
        console.error('Tags fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tags' });
    }
}

/**
 * GET /api/blogs/counts
 * Get blog counts by status
 */
async function getCounts(req, res) {
    try {
        const counts = await Blog.getCounts();
        res.json({ success: true, counts });
    } catch (error) {
        console.error('Counts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch counts' });
    }
}

/**
 * GET /api/blogs/:id
 * Get a single blog by ID
 */
async function getById(req, res) {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, error: 'Blog not found' });
        }
        res.json({ success: true, blog });
    } catch (error) {
        console.error('Blog fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch blog' });
    }
}

/**
 * POST /api/blogs
 * Create a new blog post
 */
async function create(req, res) {
    try {
        const { title, content, excerpt, featured_image, status, meta_description, tags } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Title and content are required' });
        }

        const slug = generateSlug(title);
        const blogId = await Blog.create({
            title,
            slug,
            content,
            excerpt,
            featured_image,
            status: status || 'draft',
            author_id: req.user?.id || null,
            meta_description,
            tags
        });

        const blog = await Blog.findById(blogId);

        res.status(201).json({
            success: true,
            message: `Blog ${status === 'published' ? 'published' : 'saved as draft'} successfully`,
            blog
        });
    } catch (error) {
        console.error('Blog create error:', error);
        res.status(500).json({ success: false, error: 'Failed to create blog' });
    }
}

/**
 * PUT /api/blogs/:id
 * Update an existing blog post
 */
async function update(req, res) {
    try {
        const { title, content, excerpt, featured_image, status, meta_description, tags } = req.body;

        const slug = title ? generateSlug(title) : undefined;
        const updated = await Blog.update(req.params.id, {
            title,
            slug,
            content,
            excerpt,
            featured_image,
            status,
            meta_description,
            tags
        });

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Blog not found' });
        }

        const blog = await Blog.findById(req.params.id);

        res.json({
            success: true,
            message: 'Blog updated successfully',
            blog
        });
    } catch (error) {
        console.error('Blog update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update blog' });
    }
}

/**
 * DELETE /api/blogs/:id
 * Delete a blog post
 */
async function remove(req, res) {
    try {
        const deleted = await Blog.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Blog not found' });
        }
        res.json({ success: true, message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Blog delete error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete blog' });
    }
}

/**
 * PATCH /api/blogs/:id/status
 * Update blog status (publish / unpublish)
 */
async function updateStatus(req, res) {
    try {
        const { status } = req.body;

        if (!['draft', 'published'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status. Must be "draft" or "published".' });
        }

        const updated = await Blog.updateStatus(req.params.id, status);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Blog not found' });
        }

        res.json({
            success: true,
            message: `Blog ${status === 'published' ? 'published' : 'unpublished'} successfully`
        });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update blog status' });
    }
}

module.exports = {
    list,
    getTags,
    getCounts,
    getById,
    create,
    update,
    remove,
    updateStatus
};
