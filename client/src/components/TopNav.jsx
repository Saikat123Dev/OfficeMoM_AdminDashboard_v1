import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabaseMode } from '../context/DatabaseModeContext';
import { useNavigate } from 'react-router-dom';
import { usersService } from '../services/api';
import {
  Menu, Bell, User, LogOut, Settings, Search, ChevronDown,
  UserPlus, Mic, DollarSign, CreditCard, CheckCheck
} from 'lucide-react';

/* Icon resolver */
const ICON_MAP = { UserPlus, Mic, DollarSign, CreditCard };
const COLOR_MAP = {
  emerald: 'bg-emerald-500/20 text-emerald-400',
  indigo: 'bg-indigo-500/20 text-indigo-400',
  amber: 'bg-amber-500/20 text-amber-400',
  violet: 'bg-violet-500/20 text-violet-400',
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

export default function TopNav({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { dbMode, setDbMode, dbTargets } = useDatabaseMode();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingNotifs(true);
    try {
      const res = await usersService.getNotifications({ limit: 50 });
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail for polling
    } finally {
      if (!silent) setLoadingNotifs(false);
    }
  }, []);

  // Initial fetch + polling every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications({ silent: true }), 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async (e) => {
    if (e) e.stopPropagation();
    if (unreadCount === 0) return;
    try {
      setLoadingNotifs(true);
      await usersService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleNotificationClick = (notif) => {
    if (notif.category === 'users' && notif.meta?.userId) {
      navigate(`/users/${notif.meta.userId}`);
    } else if (notif.category === 'payments' || notif.category === 'subscriptions') {
      navigate('/pricing');
    } else {
      navigate('/');
    }
    setShowNotifications(false);
  };

  // Open notifications dropdown
  const handleOpenNotifications = async () => {
    const isOpening = !showNotifications;
    setShowNotifications(isOpening);
    setShowDropdown(false);

    if (isOpening) {
      fetchNotifications({ silent: true });
    }
  };

  const handleDbModeChange = useCallback(async (nextMode) => {
    if (nextMode === dbMode) return;

    setDbMode(nextMode);
    setShowDropdown(false);
    setShowNotifications(false);
    await fetchNotifications({ silent: true });
  }, [dbMode, fetchNotifications, setDbMode]);

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search bar */}
          <div className="hidden md:block relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-64 bg-slate-800/40 border border-slate-700/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 focus:bg-slate-800/60 transition-all"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center rounded-xl border border-slate-700/50 bg-slate-800/40 p-1">
            <button
              onClick={() => handleDbModeChange(dbTargets.PRODUCTION)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                dbMode === dbTargets.PRODUCTION
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:bg-slate-700/40'
              }`}
            >
              Production Database
            </button>
            <button
              onClick={() => handleDbModeChange(dbTargets.TEST)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                dbMode === dbTargets.TEST
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:bg-slate-700/40'
              }`}
            >
              Test Database
            </button>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleOpenNotifications}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors relative"
            >
              <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-indigo-400' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-900 px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/50 z-50 animate-scale-in overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    <p className="text-xs text-slate-500">
                      {unreadCount} unread of {notifications.length} events this week
                    </p>
                  </div>
                  {notifications.length > 0 && unreadCount === 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCheck className="h-3.5 w-3.5" /> All read
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications list */}
                <div className="max-h-[400px] overflow-y-auto">
                  {loadingNotifs && notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No notifications yet</p>
                      <p className="text-xs text-slate-600 mt-1">We'll notify you about new events</p>
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((notif) => {
                      const IconComp = ICON_MAP[notif.icon] || Bell;
                      const colorCls = COLOR_MAP[notif.color] || 'bg-slate-700/50 text-slate-400';

                      return (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 hover:bg-slate-700/30 transition-colors cursor-pointer border-b border-slate-800/30 last:border-b-0 ${notif.unread ? 'bg-indigo-500/5' : ''
                            }`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${colorCls}`}>
                              <IconComp className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-white leading-snug">{notif.title}</p>
                                {notif.unread && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{notif.description}</p>
                              <p className="text-xs text-slate-600 mt-1">{timeAgo(notif.timestamp)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-700/50">
                  <button
                    onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                    className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 py-1 transition-colors font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center space-x-3 p-1.5 pr-3 rounded-xl hover:bg-slate-800/60 transition-colors group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">{userInitials}</span>
                )}
              </div>

              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white leading-tight">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-[11px] text-slate-500 flex items-center">
                  Administrator
                  <ChevronDown className={`h-3 w-3 ml-1 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''
                    }`} />
                </p>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-60 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/50 py-2 z-50 animate-scale-in">
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
                      {user?.profilePic ? (
                        <img src={user.profilePic} alt={user.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">{userInitials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@officemom.com'}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1.5">
                  <button
                    onClick={() => { navigate('/settings/profile'); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors"
                  >
                    <User className="mr-3 h-4 w-4 text-slate-500" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => { navigate('/settings/account'); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors"
                  >
                    <Settings className="mr-3 h-4 w-4 text-slate-500" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => { navigate('/notifications'); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors"
                  >
                    <Bell className="mr-3 h-4 w-4 text-slate-500" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-slate-700/50 pt-1.5">
                  <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </button>
                </div>

                {/* Status */}
                <div className="px-4 py-2 border-t border-slate-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Status</span>
                    <div className="flex items-center space-x-1.5 text-emerald-400">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="font-medium">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full bg-slate-800/40 border border-slate-700/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
          />
        </div>
      </div>
    </header>
  );
}
