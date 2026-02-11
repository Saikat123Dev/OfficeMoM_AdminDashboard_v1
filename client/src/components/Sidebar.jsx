import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  X,
  LayoutDashboard,
  Users,
  HelpCircle,
  CreditCard,
  FileText,
  Bell,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'FAQs', href: '/faqs', icon: HelpCircle },
  { name: 'Blog Posts', href: '/blogs', icon: FileText },
  { name: 'Pricing', href: '/pricing', icon: CreditCard },
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

export default function Sidebar({ open, setOpen }) {
  const location = useLocation();
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/60
        transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <LayoutDashboard className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">OfficeMoM</h1>
              <p className="text-[10px] text-indigo-400 font-medium -mt-0.5">Admin Console</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`
                  group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-500/10 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  {/* Active indicator bar */}
                  <div className={`w-1 h-5 rounded-full transition-all duration-200 ${isActive ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-slate-600'
                    }`} />
                  <Icon className={`h-[18px] w-[18px] transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>

                {isActive && (
                  <ChevronRight className="h-4 w-4 text-indigo-400/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-4 left-3 right-3">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-[11px] text-slate-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
