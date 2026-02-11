import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Bell, User, LogOut, Settings, Search, ChevronDown } from 'lucide-react';

export default function TopNav({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
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

  const notifications = [
    { id: 1, title: 'New user registered', time: '2 minutes ago', unread: true },
    { id: 2, title: 'System backup completed', time: '1 hour ago', unread: true },
    { id: 3, title: 'FAQ updated', time: '3 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

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
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowDropdown(false);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/50 py-2 z-50 animate-scale-in">
                <div className="px-4 py-2.5 border-b border-slate-700/50">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  <p className="text-xs text-slate-500">{unreadCount} unread</p>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-slate-700/30 transition-colors cursor-pointer ${notification.unread ? 'bg-indigo-500/5' : ''
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notification.unread ? 'bg-indigo-500' : 'bg-slate-600'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{notification.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-2 border-t border-slate-700/50">
                  <button className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 py-1.5 transition-colors font-medium">
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
                  <button className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors">
                    <User className="mr-3 h-4 w-4 text-slate-500" />
                    Profile Settings
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors">
                    <Settings className="mr-3 h-4 w-4 text-slate-500" />
                    Account Settings
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