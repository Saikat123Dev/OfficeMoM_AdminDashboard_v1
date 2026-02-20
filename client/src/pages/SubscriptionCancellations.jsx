import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Search,
  UserMinus,
  Users
} from 'lucide-react';
import { usersService } from '../services/api';

const formatLabel = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

const formatAmount = (amount, currency = 'USD') => {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency || 'USD').toUpperCase(),
    maximumFractionDigits: 2
  }).format(num);
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || '').toLowerCase();
  const classes =
    normalized === 'pending'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
      : normalized === 'processed'
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : normalized === 'refunded'
          ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20'
          : 'bg-slate-700/50 text-slate-400 border-slate-600/30';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${classes}`}>
      {normalized ? formatLabel(normalized) : 'Unknown'}
    </span>
  );
};

const CancellationTypeBadge = ({ value }) => {
  const normalized = String(value || '').toLowerCase();
  const classes =
    normalized === 'immediate'
      ? 'bg-red-500/15 text-red-400 border-red-500/20'
      : normalized === 'end_of_period'
        ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
        : 'bg-slate-700/50 text-slate-400 border-slate-600/30';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${classes}`}>
      {normalized ? formatLabel(normalized) : 'Unknown'}
    </span>
  );
};

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className="card-dark p-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

const BreakdownList = ({ title, items, emptyText = 'No data' }) => (
  <div className="card-dark p-4">
    <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
    {items.length === 0 ? (
      <p className="text-xs text-slate-500 italic">{emptyText}</p>
    ) : (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-300 truncate pr-3">{item.label}</span>
            <span className="text-white font-semibold">{item.count}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function SubscriptionCancellations() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    totalRequests: 0,
    uniqueUsers: 0,
    pendingCount: 0,
    processedCount: 0,
    refundedCount: 0
  });
  const [reasonBreakdown, setReasonBreakdown] = useState([]);
  const [cancellationTypeBreakdown, setCancellationTypeBreakdown] = useState([]);
  const [planBreakdown, setPlanBreakdown] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRequests: 0,
    hasNext: false,
    hasPrev: false
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit: 12,
        search: search.trim()
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.cancellation_type = typeFilter;

      const response = await usersService.getCancellationRequests(params);
      const data = response.data || {};

      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setSummary(data.summary || {
        totalRequests: 0,
        uniqueUsers: 0,
        pendingCount: 0,
        processedCount: 0,
        refundedCount: 0
      });
      setReasonBreakdown(Array.isArray(data.reasonBreakdown) ? data.reasonBreakdown : []);
      setCancellationTypeBreakdown(Array.isArray(data.cancellationTypeBreakdown) ? data.cancellationTypeBreakdown : []);
      setPlanBreakdown(Array.isArray(data.planBreakdown) ? data.planBreakdown : []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalRequests: 0,
        hasNext: false,
        hasPrev: false
      });
    } catch (requestError) {
      console.error('Error loading cancellation requests:', requestError);
      setError(requestError.response?.data?.error || 'Failed to load cancellation requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const reasonItems = useMemo(
    () => reasonBreakdown.map((item) => ({ label: item.reason || 'Not specified', count: Number(item.count || 0) })),
    [reasonBreakdown]
  );

  const typeItems = useMemo(
    () => cancellationTypeBreakdown.map((item) => ({ label: formatLabel(item.cancellation_type || 'unknown'), count: Number(item.count || 0) })),
    [cancellationTypeBreakdown]
  );

  const planItems = useMemo(
    () => planBreakdown.map((item) => ({ label: item.plan_name || 'Unknown Plan', count: Number(item.count || 0) })),
    [planBreakdown]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <UserMinus className="h-5 w-5 text-red-400" />
            </div>
            Subscription Cancellations
          </h1>
          <p className="text-slate-400 mt-1 ml-12">Track how many users cancel and why</p>
        </div>
        <span className="mt-3 sm:mt-0 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-300">
          {summary.totalRequests || 0} total requests
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={AlertCircle} title="Total Requests" value={summary.totalRequests || 0} color="bg-red-500/20" />
        <StatCard icon={Users} title="Unique Users" value={summary.uniqueUsers || 0} color="bg-indigo-500/20" />
        <StatCard icon={Clock3} title="Pending" value={summary.pendingCount || 0} color="bg-amber-500/20" />
        <StatCard icon={CheckCircle2} title="Processed" value={summary.processedCount || 0} color="bg-emerald-500/20" />
        <StatCard icon={DollarSign} title="Refunded" value={summary.refundedCount || 0} color="bg-cyan-500/20" />
      </div>

      <div className="card-dark p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, plan, reason..."
              className="input-dark pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-dark"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-dark"
          >
            <option value="all">All Types</option>
            <option value="immediate">Immediate</option>
            <option value="end_of_period">End of Period</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BreakdownList title="Top Cancellation Reasons" items={reasonItems} />
        <BreakdownList title="By Cancellation Type" items={typeItems} />
        <BreakdownList title="By Plan" items={planItems} />
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-300 text-base font-medium">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <UserMinus className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg font-medium">No cancellation requests found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting search or filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">{request.user_name || 'Unknown User'}</p>
                          <p className="text-xs text-slate-500">{request.user_email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-white">{request.plan_name || '—'}</p>
                          <p className="text-xs text-slate-500">
                            {request.billing_cycle ? formatLabel(request.billing_cycle) : '—'}
                            {' · '}
                            {formatAmount(request.amount, request.currency)}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <CancellationTypeBadge value={request.cancellation_type} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-300 max-w-[360px] whitespace-normal break-words">
                          {request.reason || 'Not specified'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400">
                        <div className="space-y-1">
                          <p>{formatDate(request.created_at)}</p>
                          {request.cancelled_at ? (
                            <p className="text-xs text-slate-500">Cancelled: {formatDate(request.cancelled_at)}</p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-slate-700/50 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Page <span className="text-white font-medium">{pagination.currentPage}</span> of{' '}
                <span className="text-white font-medium">{pagination.totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadData(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev || loading}
                  className="px-3.5 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadData(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext || loading}
                  className="px-3.5 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
