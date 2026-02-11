const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const blogController = require('../controllers/blogController');
const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/blogs/tags — Get all tags (must be before /:id)
router.get('/tags', blogController.getTags);

// GET /api/blogs/counts — Get blog counts
router.get('/counts', blogController.getCounts);

// GET /api/blogs — List blogs
router.get('/', blogController.list);

// GET /api/blogs/:id — Get single blog
router.get('/:id', blogController.getById);

// POST /api/blogs — Create blog
router.post('/', blogController.create);

// PUT /api/blogs/:id — Update blog
router.put('/:id', blogController.update);

// DELETE /api/blogs/:id — Delete blog
router.delete('/:id', blogController.remove);

// PATCH /api/blogs/:id/status — Update status (publish/unpublish)
router.patch('/:id/status', blogController.updateStatus);

module.exports = router;
