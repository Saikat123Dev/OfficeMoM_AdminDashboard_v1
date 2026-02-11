const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const router = express.Router();

const toTinyIntBoolean = (value, defaultValue = 1) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true') return 1;
    if (lower === 'false') return 0;
  }
  const num = Number(value);
  if (Number.isNaN(num)) return defaultValue;
  return num === 0 ? 0 : 1;
};

const normalizeFaqPayload = (body = {}, { forUpdate = false } = {}) => {
  const question = (body.question || '').trim();
  const answer = (body.answer || '').trim();
  const category = (body.category || '').trim();
  const need_for = (body.need_for || 'mainPage').trim() || 'mainPage';
  const display_order = Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0;
  const is_active = toTinyIntBoolean(body.is_active, 1);

  if (!forUpdate || body.question !== undefined) {
    if (!question) return { error: 'Question is required' };
  }
  if (!forUpdate || body.answer !== undefined) {
    if (!answer) return { error: 'Answer is required' };
  }
  if (!forUpdate || body.category !== undefined) {
    if (!category) return { error: 'Category is required' };
  }

  return {
    question,
    answer,
    category,
    need_for,
    display_order,
    is_active
  };
};

// Get all FAQs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, need_for, search = '', is_active } = req.query;

    let query = `
      SELECT id, question, answer, category, need_for, 
             display_order, is_active, created_at, updated_at
      FROM faqs 
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (need_for) {
      query += ` AND need_for = ?`;
      params.push(need_for);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(toTinyIntBoolean(is_active, 1));
    }

    if (search) {
      query += ` AND (question LIKE ? OR answer LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY display_order ASC, created_at DESC`;

    const [faqs] = await pool.execute(query, params);
    res.json({ success: true, faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ success: false, error: 'Failed to load FAQs' });
  }
});

// Create FAQ
router.post('/', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeFaqPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `INSERT INTO faqs (question, answer, category, need_for, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.question,
        payload.answer,
        payload.category,
        payload.need_for,
        payload.display_order,
        payload.is_active
      ]
    );

    const [createdRows] = await pool.execute(
      `SELECT id, question, answer, category, need_for, display_order, is_active, created_at, updated_at
       FROM faqs WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ 
      success: true, 
      message: 'FAQ created successfully',
      faq: createdRows[0]
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to create FAQ' });
  }
});

// Update FAQ
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const faqId = Number(req.params.id);
    if (!faqId || Number.isNaN(faqId)) {
      return res.status(400).json({ success: false, error: 'Invalid FAQ id' });
    }

    const payload = normalizeFaqPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `UPDATE faqs 
       SET question = ?, answer = ?, category = ?, need_for = ?, 
           display_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.question,
        payload.answer,
        payload.category,
        payload.need_for,
        payload.display_order,
        payload.is_active,
        faqId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }

    const [updatedRows] = await pool.execute(
      `SELECT id, question, answer, category, need_for, display_order, is_active, created_at, updated_at
       FROM faqs WHERE id = ?`,
      [faqId]
    );

    res.json({ success: true, message: 'FAQ updated successfully', faq: updatedRows[0] });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to update FAQ' });
  }
});

// Delete FAQ
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const faqId = Number(req.params.id);
    if (!faqId || Number.isNaN(faqId)) {
      return res.status(400).json({ success: false, error: 'Invalid FAQ id' });
    }

    const [result] = await pool.execute(
      'DELETE FROM faqs WHERE id = ?',
      [faqId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }

    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to delete FAQ' });
  }
});

module.exports = router;
