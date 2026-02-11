import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, CreditCard, DollarSign, Mic, RefreshCw, UserPlus
} from 'lucide-react';
import { usersService } from '../services/api';

const ICON_MAP = {
  UserPlus,
  Mic,
  DollarSign,
  CreditCard
};

const COLOR_MAP = {
  emerald: 'bg-emerald-500/20 text-emerald-400',
  indigo: 'bg-indigo-500/20 text-indigo-400',
  amber: 'bg-amber-500/20 text-amber-400',
  violet: 'bg-violet-500/20 text-violet-400'
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'users', label: 'Users' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'payments', label: 'Payments' },
  { key: 'subscriptions', label: 'Subscriptions' }
];

const CATEGORY_LABELS = {
  users: 'Users',
  meetings: 'Meetings',
  payments: 'Payments',
  subscriptions: 'Subscriptions'
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const getCategoryFromFilter = (filter) => {
  return ['users', 'meetings', 'payments', 'subscriptions'].includes(filter) ? filter : null;
};

export default function Notifications() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingReadState, setUpdatingReadState] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 200 };
      if (activeFilter === 'unread') {
        params.unreadOnly = true;
      } else {
        const category = getCategoryFromFilter(activeFilter);
        if (category) params.category = category;
      }

      const res = await usersService.getNotifications(params);
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      setUpdatingReadState(true);
      await usersService.markAllNotificationsRead();
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark all notifications as read');
    } finally {
      setUpdatingReadState(false);
    }
  };

  const handleMarkFilterRead = async () => {
    const category = getCategoryFromFilter(activeFilter);
    if (!category) return;
    try {
      setUpdatingReadState(true);
      await usersService.markNotificationsRead({ categories: [category] });
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to mark ${CATEGORY_LABELS[category]} notifications as read`);
    } finally {
      setUpdatingReadState(false);
    }
  };

  const handleNotificationClick = (notif) => {
    if (notif.category === 'users' && notif.meta?.userId) {
      navigate(`/users/${notif.meta.userId}`);
      return;
    }
    if (notif.category === 'payments' || notif.category === 'subscriptions') {
      navigate('/pricing');
      return;
    }
    navigate('/');
  };

  const visibleUnreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);
  const categoryFilter = getCategoryFromFilter(activeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Notifications</h1>
          <p className="text-slate-400">Admin events across users, meetings, payments, and subscriptions.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={updatingReadState || unreadCount === 0}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-dark p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Global Unread</p>
          <p className="text-2xl font-bold text-white mt-1">{unreadCount}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Visible Notifications</p>
          <p className="text-2xl font-bold text-white mt-1">{notifications.length}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Visible Unread</p>
          <p className="text-2xl font-bold text-white mt-1">{visibleUnreadCount}</p>
        </div>
      </div>

      <div className="card-dark p-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  active
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-800/30 border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                {filter.label}
              </button>
            );
          })}

          {categoryFilter && (
            <button
              onClick={handleMarkFilterRead}
              disabled={updatingReadState || visibleUnreadCount === 0}
              className="ml-auto px-3 py-1.5 text-sm rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Mark {CATEGORY_LABELS[categoryFilter]} read
            </button>
          )}
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Bell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No notifications found for this filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {notifications.map((notif) => {
              const IconComp = ICON_MAP[notif.icon] || Bell;
              const colorCls = COLOR_MAP[notif.color] || 'bg-slate-700/50 text-slate-400';

              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full px-5 py-4 text-left hover:bg-slate-800/30 transition-colors ${
                    notif.unread ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${colorCls}`}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                          {notif.unread && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 flex-shrink-0">{timeAgo(notif.timestamp)}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{notif.description}</p>
                      <p className="text-[11px] text-slate-600 mt-1 uppercase tracking-wide">
                        {CATEGORY_LABELS[notif.category] || notif.category}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
