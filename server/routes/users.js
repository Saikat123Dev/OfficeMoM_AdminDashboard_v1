const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const { getUserDetails, getDashboardStats, getRecentActivity, getAdminNotifications, markNotificationsRead } = require('../controllers/userController');
const router = express.Router();

router.use(authenticateToken, requireAdmin);

// Dashboard aggregate stats
router.get('/stats', getDashboardStats);

// Recent activity for dashboard
router.get('/recent-activity', getRecentActivity);

// Admin notifications
router.get('/notifications', getAdminNotifications);
router.post('/notifications/read', markNotificationsRead);

// Get cancellation requests with summary analytics
router.get('/cancellation-requests', async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const cancellationType = String(req.query.cancellation_type || '').trim();

    const baseFrom = `
      FROM cancel_subscription_requests csr
      LEFT JOIN users u ON u.id = csr.user_id
    `;

    let whereClause = ` WHERE 1=1`;
    const whereParams = [];

    if (status) {
      whereClause += ` AND csr.status = ?`;
      whereParams.push(status);
    }

    if (cancellationType) {
      whereClause += ` AND csr.cancellation_type = ?`;
      whereParams.push(cancellationType);
    }

    if (search) {
      whereClause += ` AND (
        csr.user_email LIKE ? OR
        csr.plan_name LIKE ? OR
        csr.reason LIKE ? OR
        csr.stripe_subscription_id LIKE ? OR
        u.fullName LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      whereParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const listQuery = `
      SELECT csr.id, csr.user_id, csr.user_email,
             u.fullName AS user_name,
             csr.stripe_subscription_id, csr.plan_name, csr.billing_cycle,
             csr.amount, csr.currency, csr.current_period_end,
             csr.total_minutes, csr.total_remaining_time, csr.total_used_time, csr.total_used_balance,
             csr.status, csr.reason, csr.cancellation_type, csr.canceled_at AS cancelled_at, csr.refund_estimate,
             csr.created_at, csr.updated_at
      ${baseFrom}
      ${whereClause}
      ORDER BY csr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS totalRequests
      ${baseFrom}
      ${whereClause}
    `;

    const summaryQuery = `
      SELECT
        COUNT(*) AS totalRequests,
        COUNT(DISTINCT csr.user_id) AS uniqueUsers,
        SUM(CASE WHEN csr.status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN csr.status = 'processed' THEN 1 ELSE 0 END) AS processedCount,
        SUM(CASE WHEN csr.status = 'refunded' THEN 1 ELSE 0 END) AS refundedCount
      ${baseFrom}
      ${whereClause}
    `;

    const reasonBreakdownQuery = `
      SELECT
        COALESCE(NULLIF(TRIM(csr.reason), ''), 'Not specified') AS reason,
        COUNT(*) AS count
      ${baseFrom}
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM(csr.reason), ''), 'Not specified')
      ORDER BY count DESC
      LIMIT 12
    `;

    const cancellationTypeBreakdownQuery = `
      SELECT
        COALESCE(NULLIF(TRIM(csr.cancellation_type), ''), 'unknown') AS cancellation_type,
        COUNT(*) AS count
      ${baseFrom}
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM(csr.cancellation_type), ''), 'unknown')
      ORDER BY count DESC
    `;

    const planBreakdownQuery = `
      SELECT
        COALESCE(NULLIF(TRIM(csr.plan_name), ''), 'Unknown Plan') AS plan_name,
        COUNT(*) AS count
      ${baseFrom}
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM(csr.plan_name), ''), 'Unknown Plan')
      ORDER BY count DESC
    `;

    const [
      [requests],
      [countRows],
      [summaryRows],
      [reasonBreakdown],
      [cancellationTypeBreakdown],
      [planBreakdown]
    ] = await Promise.all([
      pool.execute(listQuery, [...whereParams, limitNum, offset]),
      pool.execute(countQuery, whereParams),
      pool.execute(summaryQuery, whereParams),
      pool.execute(reasonBreakdownQuery, whereParams),
      pool.execute(cancellationTypeBreakdownQuery, whereParams),
      pool.execute(planBreakdownQuery, whereParams)
    ]);

    const totalRequests = Number(countRows[0]?.totalRequests || 0);
    const totalPages = totalRequests === 0 ? 1 : Math.ceil(totalRequests / limitNum);

    res.json({
      success: true,
      requests,
      summary: {
        totalRequests: Number(summaryRows[0]?.totalRequests || 0),
        uniqueUsers: Number(summaryRows[0]?.uniqueUsers || 0),
        pendingCount: Number(summaryRows[0]?.pendingCount || 0),
        processedCount: Number(summaryRows[0]?.processedCount || 0),
        refundedCount: Number(summaryRows[0]?.refundedCount || 0)
      },
      reasonBreakdown,
      cancellationTypeBreakdown,
      planBreakdown,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRequests,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        success: true,
        requests: [],
        summary: {
          totalRequests: 0,
          uniqueUsers: 0,
          pendingCount: 0,
          processedCount: 0,
          refundedCount: 0
        },
        reasonBreakdown: [],
        cancellationTypeBreakdown: [],
        planBreakdown: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalRequests: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    console.error('Error fetching cancellation requests:', error);
    res.status(500).json({ success: false, error: 'Failed to load cancellation requests' });
  }
});

// Get all users with search and pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.fullName, u.email, u.isVerified, u.profilePic,
             u.isGoogleUser, u.isFacebookUser, u.created_at,
             usd.subscription_plan,
             usd.billing_cycle AS subscription_billing_cycle,
             usd.status AS subscription_status,
             usd.current_period_end AS subscription_period_end
      FROM users u
      LEFT JOIN (
        SELECT user_id, MAX(id) AS latest_subscription_id
        FROM user_subscription_details
        GROUP BY user_id
      ) latest_sub ON latest_sub.user_id = u.id
      LEFT JOIN user_subscription_details usd ON usd.id = latest_sub.latest_subscription_id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      query += ` AND (u.fullName LIKE ? OR u.email LIKE ?)`;
      countQuery += ` AND (fullName LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [users] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user full details (aggregated from multiple tables)
router.get('/:id/details', getUserDetails);

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, fullName, email, isVerified, profilePic, 
              isGoogleUser, isFacebookUser, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
