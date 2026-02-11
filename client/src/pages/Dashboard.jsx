import React, { useState, useEffect } from 'react';
import { Users, HelpCircle, CreditCard, TrendingUp, Eye, UserPlus, FileText, Settings, ArrowUpRight, Calendar, Clock, Activity } from 'lucide-react';
import { usersService, faqsService, pricingService } from '../services/api';
import { useNavigate } from 'react-router-dom';

/* ========== Sub-Components ========== */

const StatCard = ({ title, value, icon: Icon, color, trend, description }) => (
  <div className="card-dark p-6 hover:border-slate-600/50 transition-all duration-300 hover:scale-[1.02] group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white mb-2">{value}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
        {trend && (
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

const ActivityItem = ({ icon: Icon, title, time, description, color }) => (
  <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-800/20 hover:bg-slate-700/20 transition-colors duration-200 group">
    <div className={`p-2 rounded-lg ${color} mt-0.5 group-hover:scale-110 transition-transform duration-200`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      <p className="text-xs text-slate-600 mt-1.5 flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        {time}
      </p>
    </div>
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

/* ========== Main Dashboard ========== */

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFaqs: 0,
    totalPlans: 0,
    verifiedUsers: 0,
    activeUsers: 0
  });

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [usersRes, faqsRes, plansRes] = await Promise.all([
        usersService.getUsers({ limit: 1 }),
        faqsService.getFaqs(),
        pricingService.getPlans()
      ]);

      const verifiedUsersCount = usersRes.data.users?.filter(user => user.isVerified)?.length || 0;

      setStats({
        totalUsers: usersRes.data.pagination?.totalUsers || 0,
        totalFaqs: faqsRes.data.length,
        totalPlans: plansRes.data.length,
        verifiedUsers: verifiedUsersCount,
        activeUsers: Math.floor((usersRes.data.pagination?.totalUsers || 0) * 0.75)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentActivities = [
    { icon: UserPlus, title: 'New user registration', description: 'A new user joined the platform', time: '2 minutes ago', color: 'bg-emerald-500/20' },
    { icon: FileText, title: 'FAQ content updated', description: 'Pricing section modified', time: '1 hour ago', color: 'bg-indigo-500/20' },
    { icon: Settings, title: 'System maintenance', description: 'Database optimization completed', time: '3 hours ago', color: 'bg-violet-500/20' },
    { icon: Activity, title: 'Performance improved', description: 'API response time decreased by 15%', time: '5 hours ago', color: 'bg-amber-500/20' }
  ];

  const quickActions = [
    { icon: Users, title: 'Manage Users', description: 'View and manage all users', color: 'bg-gradient-to-br from-indigo-500 to-cyan-500', onClick: () => navigate('/users') },
    { icon: HelpCircle, title: 'FAQ System', description: 'Manage help content', color: 'bg-gradient-to-br from-violet-500 to-pink-500', onClick: () => navigate('/faqs') },
    { icon: CreditCard, title: 'Pricing Plans', description: 'Configure subscriptions', color: 'bg-gradient-to-br from-amber-500 to-orange-500', onClick: () => navigate('/pricing') },
    { icon: TrendingUp, title: 'Blog Posts', description: 'Manage blog content', color: 'bg-gradient-to-br from-emerald-500 to-teal-500', onClick: () => navigate('/blogs') }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="from-indigo-500 to-indigo-600" trend={12.5} description="Active platform users" />
        <StatCard title="Verified Users" value={stats.verifiedUsers} icon={Eye} color="from-emerald-500 to-emerald-600" trend={8.2} description="Email verified accounts" />
        <StatCard title="FAQs" value={stats.totalFaqs} icon={HelpCircle} color="from-violet-500 to-violet-600" description="Help articles published" />
        <StatCard title="Pricing Plans" value={stats.totalPlans} icon={CreditCard} color="from-amber-500 to-amber-600" trend={5.7} description="Active subscription plans" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activity & Quick Actions */}
        <div className="xl:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium">View All</button>
            </div>
            <div className="space-y-2">
              {recentActivities.map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
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

        {/* System Status & Performance */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-white mb-5">System Status</h3>
            <div className="space-y-3">
              {[
                { name: 'API Server', status: 'operational', response: '45ms' },
                { name: 'Database', status: 'operational', response: '12ms' },
                { name: 'File Storage', status: 'degraded', response: '230ms' },
                { name: 'Email Service', status: 'operational', response: '89ms' }
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20">
                  <div>
                    <p className="text-sm font-medium text-white">{service.name}</p>
                    <p className="text-xs text-slate-500">Response: {service.response}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${service.status === 'operational'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                    }`}>
                    {service.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Performance</h3>
            <div className="space-y-4">
              {[
                { metric: 'Uptime', value: '99.9%', trend: 'positive' },
                { metric: 'Load Time', value: '1.2s', trend: 'positive' },
                { metric: 'Error Rate', value: '0.2%', trend: 'neutral' },
                { metric: 'Active Sessions', value: stats.activeUsers, trend: 'positive' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{item.metric}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">{item.value}</span>
                    {item.trend === 'positive' && (
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    )}
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