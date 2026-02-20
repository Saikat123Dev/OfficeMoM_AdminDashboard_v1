const pool = require('../config/database');
const NOTIFICATION_CATEGORIES = ['users', 'meetings', 'payments', 'subscriptions'];

async function ensureAdminNotificationReadsTable() {
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
}

async function safeQuery(query, params = []) {
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return [];
        }
        throw error;
    }
}

/**
 * GET /api/users/:id/details
 * Aggregates user data from all related tables.
 */
async function getUserDetails(req, res) {
    const userId = req.params.id;

    try {
        // 1. Basic user info
        const [users] = await pool.execute(
            `SELECT id, fullName, email, isVerified, profilePic,
                    isGoogleUser, isFacebookUser, created_at
             FROM users WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = users[0];

        // 2. Subscription details
        const subscriptions = await safeQuery(
            `SELECT id, stripe_customer_id, stripe_subscription_id,
                    subscription_plan, billing_cycle, stripe_price_id,
                    subscription_limit, subscription_remaining, subscription_used,
                    recharge_remaining, current_period_start, current_period_end,
                    status, auto_pay_enabled, cancel_at_period_end,
                    created_at, updated_at
             FROM user_subscription_details WHERE user_id = ?
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        // 3. Minutes usage summary
        const usageSummaryRows = await safeQuery(
            `SELECT 
                COUNT(*) as total_actions,
                COALESCE(SUM(CASE WHEN action = 'deducted' THEN minutes_used ELSE 0 END), 0) as total_deducted,
                COALESCE(SUM(CASE WHEN action = 'refunded' THEN minutes_used ELSE 0 END), 0) as total_refunded,
                COALESCE(SUM(CASE WHEN action = 'bonus' THEN minutes_used ELSE 0 END), 0) as total_bonus,
                COALESCE(SUM(CASE WHEN action = 'purchase' THEN minutes_used ELSE 0 END), 0) as total_purchased
             FROM minutes_usage_log WHERE user_id = ?`,
            [userId]
        );

        // 4. Recent minutes usage log (last 50)
        const minutesLog = await safeQuery(
            `SELECT id, audio_id, minutes_used, source, action, created_at, reason
             FROM minutes_usage_log WHERE user_id = ?
             ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );

        // 5. Minutes transactions (last 50)
        const minutesTransactions = await safeQuery(
            `SELECT id, amount, type, description, balance_after, created_at
             FROM minutes_transactions WHERE user_id = ?
             ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );

        // 6. Meeting/MoM history (latest first)
        const meetings = await safeQuery(
            `SELECT h.id, h.meeting_id, h.room_id, h.channel_id, h.source, h.title,
                    c.name AS channel_name,
                    h.isMoMGenerated, h.date, h.processing_status,
                    h.deducted_minutes, h.minutes_refunded, h.refunded_minutes,
                    h.summary, h.created_at
             FROM history h
             LEFT JOIN channels c ON c.id = h.channel_id AND c.user_id = h.user_id
             WHERE h.user_id = ?
             ORDER BY h.created_at DESC`,
            [userId]
        );

        // 7. Payment history (last 50)
        const payments = await safeQuery(
            `SELECT id, amount, currency, payment_status, payment_type,
                    plan_name, billing_cycle, minutes_purchased,
                    invoice_pdf, receipt_url, invoice_number,
                    created_at, paid_at
             FROM stripe_payments WHERE user_id = ?
             ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );

        // 8. Recharge transactions (last 30)
        const recharges = await safeQuery(
            `SELECT id, amount, minutes, rate, status, created_at
             FROM recharge_transactions WHERE user_id = ?
             ORDER BY created_at DESC LIMIT 30`,
            [userId]
        );

        // 9. Active sessions (last 20)
        const sessions = await safeQuery(
            `SELECT id, device_info, ip_address, user_agent,
                    created_at, last_activity, expires_at, is_active
             FROM user_sessions WHERE user_id = ?
             ORDER BY last_activity DESC LIMIT 20`,
            [userId]
        );

        // 10. Audio files (last 30)
        const audios = await safeQuery(
            `SELECT id, title, audioUrl, source, uploadedAt
             FROM user_audios WHERE userId = ?
             ORDER BY uploadedAt DESC LIMIT 30`,
            [userId]
        );

        // 11. User channels
        const channels = await safeQuery(
            `SELECT id, name, created_at, updated_at, deleted_at
             FROM channels
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        const activeChannels = channels
            .filter((channel) => {
                if (!channel.deleted_at) return true;
                return String(channel.deleted_at).startsWith('0000-00-00');
            })
            .map((channel) => ({
                id: channel.id,
                name: channel.name,
                created_at: channel.created_at,
                updated_at: channel.updated_at
            }));

        const channelSummary = {
            totalChannels: channels.length,
            activeChannels: activeChannels.length,
            deletedChannels: Math.max(0, channels.length - activeChannels.length)
        };

        const usageSummary = usageSummaryRows[0] || {
            total_actions: 0,
            total_deducted: 0,
            total_refunded: 0,
            total_bonus: 0,
            total_purchased: 0
        };

        res.json({
            success: true,
            user,
            subscription: subscriptions[0] || null,
            usageSummary,
            minutesLog,
            minutesTransactions,
            meetings,
            payments,
            recharges,
            sessions,
            audios,
            channels: activeChannels,
            channelSummary
        });

    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ success: false, error: 'Failed to load user details' });
    }
}

/**
 * GET /api/users/stats
 * Dashboard aggregate stats across all users.
 */
async function getDashboardStats(req, res) {
    try {
        const [userCounts] = await pool.execute(
            `SELECT 
                COUNT(*) as totalUsers,
                SUM(CASE WHEN isVerified = 1 THEN 1 ELSE 0 END) as verifiedUsers,
                SUM(CASE WHEN isGoogleUser = 1 THEN 1 ELSE 0 END) as googleUsers,
                SUM(CASE WHEN isFacebookUser = 1 THEN 1 ELSE 0 END) as facebookUsers
             FROM users`
        );

        const meetingCounts = await safeQuery(
            `SELECT COUNT(*) as totalMeetings FROM history`
        );

        const paymentStats = await safeQuery(
            `SELECT 
                COUNT(*) as totalPayments,
                COALESCE(SUM(CASE WHEN payment_status = 'succeeded' THEN amount ELSE 0 END), 0) as totalRevenue
             FROM stripe_payments`
        );

        const minuteStats = await safeQuery(
            `SELECT 
                COALESCE(SUM(CASE WHEN action = 'deducted' THEN minutes_used ELSE 0 END), 0) as totalMinutesUsed,
                COALESCE(SUM(CASE WHEN action = 'purchase' THEN minutes_used ELSE 0 END), 0) as totalMinutesPurchased
             FROM minutes_usage_log`
        );

        const activeSubs = await safeQuery(
            `SELECT COUNT(*) as activeSubscriptions FROM user_subscription_details WHERE status = 'active'`
        );

        const faqCounts = await safeQuery(
            `SELECT COUNT(*) as totalFaqs FROM faqs`
        );

        const planCounts = await safeQuery(
            `SELECT COUNT(*) as totalPlans FROM plans`
        );

        res.json({
            success: true,
            stats: {
                ...userCounts[0],
                totalMeetings: meetingCounts[0]?.totalMeetings ?? 0,
                totalPayments: paymentStats[0]?.totalPayments ?? 0,
                totalRevenue: paymentStats[0]?.totalRevenue ?? 0,
                totalMinutesUsed: minuteStats[0]?.totalMinutesUsed ?? 0,
                totalMinutesPurchased: minuteStats[0]?.totalMinutesPurchased ?? 0,
                activeSubscriptions: activeSubs[0]?.activeSubscriptions ?? 0,
                totalFaqs: faqCounts[0]?.totalFaqs ?? null,
                totalPlans: planCounts[0]?.totalPlans ?? null
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, error: 'Failed to load dashboard stats' });
    }
}

/**
 * GET /api/users/recent-activity
 * Returns recent registrations and meetings for the dashboard.
 */
async function getRecentActivity(req, res) {
    try {
        const recentUsers = await safeQuery(
            `SELECT id, fullName, email, profilePic, isVerified, isGoogleUser, isFacebookUser, created_at
             FROM users ORDER BY created_at DESC LIMIT 10`
        );

        const recentMeetings = await safeQuery(
            `SELECT h.id, h.title, h.source, h.date, h.processing_status, h.isMoMGenerated,
                    h.deducted_minutes, h.created_at, u.fullName as userName, u.email as userEmail
             FROM history h
             LEFT JOIN users u ON h.user_id = u.id
             ORDER BY h.created_at DESC LIMIT 10`
        );

        const recentPayments = await safeQuery(
            `SELECT sp.id, sp.amount, sp.currency, sp.payment_status, sp.payment_type,
                    sp.plan_name, sp.minutes_purchased, sp.created_at, sp.paid_at,
                    u.fullName as userName, u.email as userEmail
             FROM stripe_payments sp
             LEFT JOIN users u ON sp.user_id = u.id
             ORDER BY sp.created_at DESC LIMIT 10`
        );

        res.json({
            success: true,
            recentUsers,
            recentMeetings,
            recentPayments
        });
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ success: false, error: 'Failed to load recent activity' });
    }
}

/**
 * GET /api/users/notifications
 * Generates admin notifications from real database events.
 */
async function getAdminNotifications(req, res) {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return res.status(401).json({ success: false, error: 'Unauthorized admin session' });
        }

        await ensureAdminNotificationReadsTable();

        const { category = 'all', unreadOnly = 'false', limit = '50' } = req.query;
        const categoryFilter = category === 'all' ? null : category;
        if (categoryFilter && !NOTIFICATION_CATEGORIES.includes(categoryFilter)) {
            return res.status(400).json({ success: false, error: 'Invalid notification category filter' });
        }

        const unreadFilter = unreadOnly === true || unreadOnly === 'true';
        const numericLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));

        // Get last-read timestamps per category
        const [reads] = await pool.execute(
            `SELECT category, last_read_at FROM admin_notification_reads WHERE admin_id = ?`,
            [adminId]
        );
        const lastRead = {};
        reads.forEach(r => { lastRead[r.category] = new Date(r.last_read_at); });

        const now = new Date();
        const defaultLastRead = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago default

        // 1. Recent user registrations (last 7 days)
        const newUsers = await safeQuery(
            `SELECT id, fullName, email, profilePic, isGoogleUser, isFacebookUser, created_at
             FROM users
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY created_at DESC LIMIT 20`
        );

        // 2. Recent meetings (last 7 days)
        const recentMeetings = await safeQuery(
            `SELECT h.id, h.title, h.source, h.processing_status, h.isMoMGenerated,
                    h.deducted_minutes, h.created_at,
                    u.fullName as userName, u.email as userEmail
             FROM history h
             LEFT JOIN users u ON h.user_id = u.id
             WHERE h.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY h.created_at DESC LIMIT 20`
        );

        // 3. Recent payments (last 7 days)
        const recentPayments = await safeQuery(
            `SELECT sp.id, sp.amount, sp.currency, sp.payment_status, sp.payment_type,
                    sp.plan_name, sp.minutes_purchased, sp.created_at,
                    u.fullName as userName, u.email as userEmail
             FROM stripe_payments sp
             LEFT JOIN users u ON sp.user_id = u.id
             WHERE sp.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY sp.created_at DESC LIMIT 20`
        );

        // 4. Recent subscription changes (last 7 days)
        const subChanges = await safeQuery(
            `SELECT usd.id, usd.subscription_plan, usd.status, usd.billing_cycle,
                    usd.updated_at, usd.created_at,
                    u.fullName as userName, u.email as userEmail
             FROM user_subscription_details usd
             LEFT JOIN users u ON usd.user_id = u.id
             WHERE usd.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY usd.updated_at DESC LIMIT 20`
        );

        // Build unified notification list
        const notifications = [];

        const userLastRead = lastRead['users'] || defaultLastRead;
        newUsers.forEach(u => {
            const createdAt = new Date(u.created_at);
            notifications.push({
                id: `user_${u.id}`,
                category: 'users',
                type: 'user_registered',
                title: `${u.fullName || 'New user'} registered`,
                description: u.email,
                icon: 'UserPlus',
                color: 'emerald',
                timestamp: u.created_at,
                unread: createdAt > userLastRead,
                meta: { userId: u.id, profilePic: u.profilePic, isGoogle: u.isGoogleUser, isFacebook: u.isFacebookUser }
            });
        });

        const meetingLastRead = lastRead['meetings'] || defaultLastRead;
        recentMeetings.forEach(m => {
            const createdAt = new Date(m.created_at);
            const statusText = m.isMoMGenerated ? 'MoM generated' : (m.processing_status || 'recorded');
            notifications.push({
                id: `meeting_${m.id}`,
                category: 'meetings',
                type: 'meeting_created',
                title: `${m.title || 'Meeting'} — ${statusText}`,
                description: `by ${m.userName || 'Unknown'} via ${m.source || 'unknown'}`,
                icon: 'Mic',
                color: 'indigo',
                timestamp: m.created_at,
                unread: createdAt > meetingLastRead,
                meta: { deductedMinutes: m.deducted_minutes, source: m.source }
            });
        });

        const paymentLastRead = lastRead['payments'] || defaultLastRead;
        recentPayments.forEach(p => {
            const createdAt = new Date(p.created_at);
            const amt = p.amount ? `$${(p.amount / 100).toFixed(2)}` : '';
            notifications.push({
                id: `payment_${p.id}`,
                category: 'payments',
                type: 'payment_received',
                title: `${amt} payment ${p.payment_status || 'received'}`,
                description: `${p.plan_name || p.payment_type || 'Payment'} — ${p.userName || 'Unknown'}`,
                icon: 'DollarSign',
                color: 'amber',
                timestamp: p.created_at,
                unread: createdAt > paymentLastRead,
                meta: { amount: p.amount, currency: p.currency, status: p.payment_status }
            });
        });

        const subLastRead = lastRead['subscriptions'] || defaultLastRead;
        subChanges.forEach(s => {
            const updatedAt = new Date(s.updated_at);
            notifications.push({
                id: `sub_${s.id}`,
                category: 'subscriptions',
                type: 'subscription_changed',
                title: `${s.userName || 'User'} — ${s.subscription_plan} (${s.status})`,
                description: `${s.billing_cycle || ''} subscription`,
                icon: 'CreditCard',
                color: 'violet',
                timestamp: s.updated_at,
                unread: updatedAt > subLastRead,
                meta: { plan: s.subscription_plan, status: s.status }
            });
        });

        // Sort by timestamp descending
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let filteredNotifications = notifications;
        if (categoryFilter) {
            filteredNotifications = filteredNotifications.filter(n => n.category === categoryFilter);
        }
        if (unreadFilter) {
            filteredNotifications = filteredNotifications.filter(n => n.unread);
        }

        const unreadCount = notifications.filter(n => n.unread).length;
        const filteredUnreadCount = filteredNotifications.filter(n => n.unread).length;

        res.json({
            success: true,
            notifications: filteredNotifications.slice(0, numericLimit),
            unreadCount,
            filteredUnreadCount,
            totalCount: filteredNotifications.length,
            appliedFilters: {
                category: categoryFilter || 'all',
                unreadOnly: unreadFilter,
                limit: numericLimit
            }
        });
    } catch (error) {
        console.error('Error fetching admin notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to load notifications' });
    }
}

/**
 * POST /api/users/notifications/read
 * Mark notifications as read for the current admin.
 * Body: { categories: ['users', 'meetings', 'payments', 'subscriptions'] } or { all: true }
 */
async function markNotificationsRead(req, res) {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return res.status(401).json({ success: false, error: 'Unauthorized admin session' });
        }

        await ensureAdminNotificationReadsTable();

        const { categories, all } = req.body;
        const inputCategories = Array.isArray(categories) ? [...new Set(categories)] : [];
        const invalidCategories = inputCategories.filter(category => !NOTIFICATION_CATEGORIES.includes(category));

        if (invalidCategories.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid categories: ${invalidCategories.join(', ')}`
            });
        }

        const categoriesToMark = all
            ? NOTIFICATION_CATEGORIES
            : inputCategories;

        if (categoriesToMark.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No categories provided to mark as read'
            });
        }

        for (const category of categoriesToMark) {
            await pool.execute(
                `INSERT INTO admin_notification_reads (admin_id, category, last_read_at)
                 VALUES (?, ?, NOW())
                 ON DUPLICATE KEY UPDATE last_read_at = NOW()`,
                [adminId, category]
            );
        }

        res.json({
            success: true,
            message: 'Notifications marked as read',
            categoriesUpdated: categoriesToMark
        });
    } catch (error) {
        console.error('Error marking notifications read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark notifications read' });
    }
}

module.exports = { getUserDetails, getDashboardStats, getRecentActivity, getAdminNotifications, markNotificationsRead };
