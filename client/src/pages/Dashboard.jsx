import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, HelpCircle, CreditCard, TrendingUp, Eye, UserPlus, FileText,
  ArrowUpRight, Calendar, Clock, Activity, DollarSign, Mic, BarChart3, BookOpenText, Layers, UserMinus, Package, Inbox, Brain
} from 'lucide-react';
import { usersService } from '../services/api';
import { useNavigate } from 'react-router-dom';

/* ========== Sub-Components ========== */

const StatCard = ({ title, value, icon: Icon, color, trend, description }) => (
  <div className="card-dark p-6 hover:border-slate-600/50 transition-all duration-300 hover:scale-[1.02] group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white mb-2">{value}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
        {trend != null && (
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${trend > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${trend > 0 ? '' : 'rotate-180'}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

const ActivityItem = ({ icon: Icon, title, time, description, color, onClick }) => (
  <div
    className={`flex items-start space-x-4 p-4 rounded-xl bg-slate-800/20 hover:bg-slate-700/20 transition-colors duration-200 group ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className={`p-2 rounded-lg ${color} mt-0.5 group-hover:scale-110 transition-transform duration-200`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors truncate">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>}
      <p className="text-xs text-slate-600 mt-1.5 flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        {time}
      </p>
    </div>
    {onClick && <ArrowUpRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors mt-1 flex-shrink-0" />}
  </div>
);

const QuickAction = ({ icon: Icon, title, description, color, onClick }) => (
  <button
    onClick={onClick}
    className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-700/20 transition-all duration-300 group text-left"
  >
    <div className={`p-3 rounded-xl ${color} w-12 h-12 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
    <p className="text-xs text-slate-500">{description}</p>
    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <ArrowUpRight className="h-4 w-4 text-slate-400" />
    </div>
  </button>
);

/* ========== Helpers ========== */

const timeAgo = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const toNumberOrNull = (value) => {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const fmtValue = (value) => {
  return value == null ? 'N/A' : value;
};

const fmtCurrency = (amt) => {
  const amount = toNumberOrNull(amt);
  if (amount == null) return 'N/A';
  return `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

/* ========== Main Dashboard ========== */

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState({ recentUsers: [], recentMeetings: [], recentPayments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, activityRes] = await Promise.all([
        usersService.getDashboardStats(),
        usersService.getRecentActivity()
      ]);

      const s = statsRes.data?.stats;
      if (!s || typeof s !== 'object') {
        throw new Error('Invalid dashboard stats response');
      }

      setStats({
        totalUsers: toNumberOrNull(s.totalUsers),
        verifiedUsers: toNumberOrNull(s.verifiedUsers),
        totalFaqs: toNumberOrNull(s.totalFaqs),
        totalPlans: toNumberOrNull(s.totalPlans),
        totalMeetings: toNumberOrNull(s.totalMeetings),
        totalPayments: toNumberOrNull(s.totalPayments),
        totalRevenue: toNumberOrNull(s.totalRevenue),
        totalMinutesUsed: toNumberOrNull(s.totalMinutesUsed),
        activeSubscriptions: toNumberOrNull(s.activeSubscriptions)
      });

      const activityData = activityRes.data || {};
      setActivity({
        recentUsers: Array.isArray(activityData.recentUsers) ? activityData.recentUsers : [],
        recentMeetings: Array.isArray(activityData.recentMeetings) ? activityData.recentMeetings : [],
        recentPayments: Array.isArray(activityData.recentPayments) ? activityData.recentPayments : []
      });
    } catch (loadError) {
      console.error('Error loading dashboard data:', loadError);
      setError(loadError.response?.data?.error || 'Failed to load dashboard data.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const quickActions = [
    { icon: Users, title: 'Manage Users', description: 'View and manage all users', color: 'bg-gradient-to-br from-indigo-500 to-cyan-500', onClick: () => navigate('/users') },
    { icon: Inbox, title: 'Contacts', description: 'Read contact form messages', color: 'bg-gradient-to-br from-sky-500 to-cyan-500', onClick: () => navigate('/contacts') },
    { icon: Brain, title: 'Intent Keywords', description: 'Manage NLP intent keywords', color: 'bg-gradient-to-br from-violet-500 to-indigo-500', onClick: () => navigate('/intent-keywords') },
    { icon: HelpCircle, title: 'FAQ System', description: 'Manage help content', color: 'bg-gradient-to-br from-violet-500 to-pink-500', onClick: () => navigate('/faqs') },
    { icon: BookOpenText, title: 'OfficeMoM Details', description: 'Manage detail content blocks', color: 'bg-gradient-to-br from-cyan-500 to-blue-500', onClick: () => navigate('/officemom-details') },
    { icon: Layers, title: 'Features', description: 'Manage product feature list', color: 'bg-gradient-to-br from-emerald-500 to-teal-500', onClick: () => navigate('/features') },
    { icon: Package, title: 'Recharge Packs', description: 'Manage minute top-up packages', color: 'bg-gradient-to-br from-amber-500 to-yellow-500', onClick: () => navigate('/recharge-packages') },
    { icon: UserMinus, title: 'Cancellations', description: 'Track why users cancel plans', color: 'bg-gradient-to-br from-rose-500 to-red-500', onClick: () => navigate('/subscription-cancellations') },
    { icon: CreditCard, title: 'Pricing Plans', description: 'Configure subscriptions', color: 'bg-gradient-to-br from-amber-500 to-orange-500', onClick: () => navigate('/pricing') },
    { icon: FileText, title: 'Blog Posts', description: 'Manage blog content', color: 'bg-gradient-to-br from-violet-500 to-fuchsia-500', onClick: () => navigate('/blogs') }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-dark p-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  // Build real activity items from data
  const activityItems = [];

  activity.recentUsers.slice(0, 4).forEach((u) => {
    activityItems.push({
      icon: UserPlus,
      title: `${u.fullName || 'New user'} registered`,
      description: u.email,
      time: timeAgo(u.created_at),
      color: 'bg-emerald-500/20',
      onClick: () => navigate(`/users/${u.id}`)
    });
  });

  activity.recentMeetings.slice(0, 4).forEach((m) => {
    activityItems.push({
      icon: Mic,
      title: m.title || 'Meeting recorded',
      description: `by ${m.userName || 'Unknown'} (${m.source || 'unknown'})`,
      time: timeAgo(m.created_at),
      color: 'bg-indigo-500/20',
      onClick: null
    });
  });

  activity.recentPayments.slice(0, 3).forEach((p) => {
    activityItems.push({
      icon: DollarSign,
      title: `${fmtCurrency(p.amount)} — ${p.plan_name || p.payment_type || 'Payment'}`,
      description: `by ${p.userName || 'Unknown'}`,
      time: timeAgo(p.paid_at || p.created_at),
      color: 'bg-amber-500/20',
      onClick: null
    });
  });

  // Sort by most recent
  activityItems.sort(() => {
    // Just keep the interleaved order, it's already recent-first per type
    return 0;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard Overview</h1>
          <p className="text-slate-400">Welcome back. Here's what's happening with your platform today.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <div className="flex items-center px-3.5 py-2 rounded-xl bg-slate-800/30 border border-slate-700/30">
            <Calendar className="h-4 w-4 text-slate-500 mr-2" />
            <span className="text-sm text-slate-300">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid — 2 rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Users" value={fmtValue(stats?.totalUsers)} icon={Users} color="from-indigo-500 to-indigo-600" description={stats?.verifiedUsers == null ? 'Verified users unavailable' : `${stats.verifiedUsers} verified`} />
        <StatCard title="Total Meetings" value={fmtValue(stats?.totalMeetings)} icon={Mic} color="from-violet-500 to-violet-600" description="Across all users" />
        <StatCard title="Revenue" value={fmtCurrency(stats?.totalRevenue)} icon={DollarSign} color="from-emerald-500 to-emerald-600" description={stats?.totalPayments == null ? 'Payments unavailable' : `${stats.totalPayments} payments`} />
        <StatCard title="Active Subs" value={fmtValue(stats?.activeSubscriptions)} icon={BarChart3} color="from-amber-500 to-amber-600" description={stats?.totalMinutesUsed == null ? 'Usage unavailable' : `${stats.totalMinutesUsed} min used`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="FAQs" value={fmtValue(stats?.totalFaqs)} icon={HelpCircle} color="from-cyan-500 to-cyan-600" description="Help articles published" />
        <StatCard title="Pricing Plans" value={fmtValue(stats?.totalPlans)} icon={CreditCard} color="from-pink-500 to-pink-600" description="Active subscription plans" />
        <StatCard title="Verified Users" value={fmtValue(stats?.verifiedUsers)} icon={Eye} color="from-teal-500 to-teal-600" description={stats?.totalUsers == null ? 'Total users unavailable' : `of ${stats.totalUsers} total`} />

      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="xl:col-span-2 space-y-6">
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <span className="text-xs text-slate-500 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/30">Live</span>
            </div>
            <div className="space-y-2">
              {activityItems.length > 0 ? (
                activityItems.slice(0, 8).map((act, index) => (
                  <ActivityItem key={index} {...act} />
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <QuickAction key={index} {...action} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Users */}
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">New Users</h3>
              <button onClick={() => navigate('/users')} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium">View All</button>
            </div>
            <div className="space-y-3">
              {activity.recentUsers.slice(0, 6).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 hover:bg-slate-700/20 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/users/${user.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 h-9 w-9 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-indigo-500/10">
                      {user.profilePic ? (
                        <img className="h-9 w-9 rounded-xl object-cover" src={user.profilePic} alt="" />
                      ) : (
                        <span className="text-xs font-bold text-indigo-400">
                          {(user.fullName || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{user.fullName || 'No Name'}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 flex-shrink-0 ml-2">{timeAgo(user.created_at)}</span>
                </div>
              ))}
              {activity.recentUsers.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4 italic">No users yet</p>
              )}
            </div>
          </div>

          {/* Platform Stats */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Platform Health</h3>
            <div className="space-y-4">
              {[
                { metric: 'Total Users', value: fmtValue(stats?.totalUsers) },
                { metric: 'Active Subscriptions', value: fmtValue(stats?.activeSubscriptions) },
                { metric: 'Total Revenue', value: fmtCurrency(stats?.totalRevenue) },
                { metric: 'Total Meetings', value: fmtValue(stats?.totalMeetings) }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{item.metric}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
