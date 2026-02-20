import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Mail, Check, X, Shield, Clock, CreditCard,
    Mic, Calendar, Activity, Eye, Headphones, Globe, Smartphone,
    TrendingUp, TrendingDown, DollarSign, ChevronRight, FileText,
    RefreshCw, Zap, Download, ExternalLink, MessageSquare
} from 'lucide-react';
import { usersService } from '../services/api';

/* ========== Helper formatters ========== */

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtCurrency = (amt, curr = 'USD') => {
    if (amt == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amt / 100);
};
const fmtChannel = (row) => {
    const channelName = typeof row?.channel_name === 'string' ? row.channel_name.trim() : '';
    if (channelName) return channelName;
    if (row?.channel_id != null) return `Channel #${row.channel_id}`;
    return '—';
};
const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

/* ========== Badge Components ========== */

const StatusBadge = ({ status, type = 'default' }) => {
    const colorMap = {
        active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        succeeded: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        canceled: 'bg-red-500/15 text-red-400 border-red-500/20',
        failed: 'bg-red-500/15 text-red-400 border-red-500/20',
        processing: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        trialing: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        past_due: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    };
    const cls = colorMap[status?.toLowerCase()] || 'bg-slate-700/50 text-slate-400 border-slate-600/30';
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
            {status || 'Unknown'}
        </span>
    );
};

const SourceBadge = ({ source }) => {
    const map = {
        'face-to-face': { bg: 'bg-violet-500/15 text-violet-400 border-violet-500/20', label: 'Face-to-Face' },
        'online': { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/20', label: 'Online' },
        'bot': { bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20', label: 'Bot' },
        'upload': { bg: 'bg-teal-500/15 text-teal-400 border-teal-500/20', label: 'Upload' },
    };
    const s = map[source?.toLowerCase()] || { bg: 'bg-slate-700/50 text-slate-400 border-slate-600/30', label: source || 'Unknown' };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg}`}>{s.label}</span>;
};

/* ========== Stat Card ========== */

const MiniStat = ({ icon: Icon, title, value, subtext, color }) => (
    <div className="card-dark p-5 hover:border-slate-600/50 transition-all duration-300 group">
        <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm text-slate-400 font-medium">{title}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
);

/* ========== Empty State ========== */

const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 mb-4">
            <Icon className="h-8 w-8 text-slate-500" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300 mb-1">{title}</h4>
        <p className="text-xs text-slate-500 max-w-xs">{description}</p>
    </div>
);

/* ========== Data Tables ========== */

const DataTable = ({ columns, data, emptyIcon, emptyTitle, emptyDesc, onRowClick, getRowClassName }) => {
    if (!data || data.length === 0) {
        return <EmptyState icon={emptyIcon || Activity} title={emptyTitle || 'No data'} description={emptyDesc || 'No records found.'} />;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-700/50">
                        {columns.map((col, i) => (
                            <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {data.map((row, i) => {
                        const interactive = typeof onRowClick === 'function';
                        const extraClass = typeof getRowClassName === 'function' ? getRowClassName(row) : '';
                        return (
                        <tr
                            key={row.id || i}
                            className={`hover:bg-slate-800/20 transition-colors ${interactive ? 'cursor-pointer' : ''} ${extraClass}`.trim()}
                            onClick={interactive ? () => onRowClick(row) : undefined}
                            onKeyDown={interactive ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onRowClick(row);
                                }
                            } : undefined}
                            role={interactive ? 'button' : undefined}
                            tabIndex={interactive ? 0 : undefined}
                        >
                            {columns.map((col, j) => (
                                <td key={j} className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/* ========== Tab Components ========== */

const TABS = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'meetings', label: 'Meetings', icon: Calendar },
    { key: 'minutes', label: 'Minutes & Usage', icon: Clock },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'sessions', label: 'Sessions', icon: Globe },
    { key: 'channels', label: 'Channels', icon: MessageSquare },
    { key: 'audio', label: 'Audio Files', icon: Headphones },
];

/* ========== Tab Content: Overview ========== */

const OverviewTab = ({ subscription, usageSummary, meetings, payments }) => (
    <div className="space-y-6">
        {/* Subscription Details */}
        <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-400" />
                Subscription Details
            </h3>
            {subscription ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoRow label="Plan" value={subscription.subscription_plan} />
                    <InfoRow label="Billing Cycle" value={subscription.billing_cycle} />
                    <InfoRow label="Status" value={<StatusBadge status={subscription.status} />} />
                    <InfoRow label="Limit" value={`${subscription.subscription_limit || 0} min`} />
                    <InfoRow label="Remaining" value={`${subscription.subscription_remaining || 0} min`} />
                    <InfoRow label="Used" value={`${subscription.subscription_used || 0} min`} />
                    <InfoRow label="Recharge Remaining" value={`${subscription.recharge_remaining || 0} min`} />
                    <InfoRow label="Auto-Pay" value={subscription.auto_pay_enabled ? 'Enabled' : 'Disabled'} />
                    <InfoRow label="Period" value={`${fmtDate(subscription.current_period_start)} – ${fmtDate(subscription.current_period_end)}`} />
                </div>
            ) : (
                <p className="text-sm text-slate-500 italic">No active subscription</p>
            )}
        </div>

        {/* Usage Summary */}
        <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-400" />
                Usage Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <UsageStat label="Total Actions" value={usageSummary?.total_actions || 0} color="text-white" />
                <UsageStat label="Deducted" value={`${usageSummary?.total_deducted || 0} min`} color="text-red-400" />
                <UsageStat label="Refunded" value={`${usageSummary?.total_refunded || 0} min`} color="text-amber-400" />
                <UsageStat label="Bonus" value={`${usageSummary?.total_bonus || 0} min`} color="text-emerald-400" />
                <UsageStat label="Purchased" value={`${usageSummary?.total_purchased || 0} min`} color="text-blue-400" />
            </div>
        </div>

        {/* Recent Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-dark p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Recent Meetings</h3>
                {meetings?.length > 0 ? (
                    <div className="space-y-2">
                        {meetings.slice(0, 5).map((m) => {
                            const channelLabel = fmtChannel(m);
                            return (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 hover:bg-slate-700/20 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Calendar className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate">{m.title || 'Untitled Meeting'}</p>
                                            <p className="text-xs text-slate-500">
                                                {fmtDate(m.date || m.created_at)}
                                                {channelLabel !== '—' ? ` • ${channelLabel}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <SourceBadge source={m.source} />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic py-4 text-center">No meetings yet</p>
                )}
            </div>

            <div className="card-dark p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Recent Payments</h3>
                {payments?.length > 0 ? (
                    <div className="space-y-2">
                        {payments.slice(0, 5).map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 hover:bg-slate-700/20 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <DollarSign className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-white">{fmtCurrency(p.amount, p.currency)} — {p.plan_name || p.payment_type || 'Payment'}</p>
                                        <p className="text-xs text-slate-500">{fmtDate(p.paid_at || p.created_at)}</p>
                                    </div>
                                </div>
                                <StatusBadge status={p.payment_status} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic py-4 text-center">No payments yet</p>
                )}
            </div>
        </div>
    </div>
);

const InfoRow = ({ label, value }) => (
    <div className="p-3 rounded-xl bg-slate-800/20">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <div className="text-sm font-medium text-white">{value}</div>
    </div>
);

const UsageStat = ({ label, value, color }) => (
    <div className="text-center p-3 rounded-xl bg-slate-800/20">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
);

/* ========== Tab Content: Meetings ========== */

const MeetingsTab = ({ meetings, channelFilter }) => {
    const columns = [
        { header: 'Title', render: (r) => <span className="text-white font-medium">{r.title || 'Untitled'}</span> },
        { header: 'Channel', render: (r) => <span className="text-slate-300">{fmtChannel(r)}</span> },
        { header: 'Source', render: (r) => <SourceBadge source={r.source} /> },
        { header: 'Date', render: (r) => fmtDate(r.date || r.created_at) },
        { header: 'Status', render: (r) => <StatusBadge status={r.processing_status} /> },
        {
            header: 'MoM', render: (r) => (
                <span className={`inline-flex items-center gap-1 text-xs ${r.isMoMGenerated ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {r.isMoMGenerated ? <><Check className="h-3 w-3" /> Generated</> : <><X className="h-3 w-3" /> Pending</>}
                </span>
            )
        },
        {
            header: 'Minutes', render: (r) => (
                <div className="space-y-0.5">
                    {r.deducted_minutes > 0 && <span className="text-red-400 text-xs">-{r.deducted_minutes}</span>}
                    {r.refunded_minutes > 0 && <span className="text-emerald-400 text-xs ml-2">+{r.refunded_minutes}</span>}
                    {!r.deducted_minutes && !r.refunded_minutes && <span className="text-slate-500 text-xs">—</span>}
                </div>
            )
        },
    ];
    const selectedLabel = channelFilter?.name || (channelFilter?.id != null ? `Channel #${channelFilter.id}` : null);
    const emptyDesc = selectedLabel
        ? `No history found for ${selectedLabel}.`
        : "This user hasn't had any meetings yet.";

    return <DataTable columns={columns} data={meetings} emptyIcon={Calendar} emptyTitle="No meetings" emptyDesc={emptyDesc} />;
};

/* ========== Tab Content: Minutes & Usage ========== */

const MinutesTab = ({ minutesLog, minutesTransactions }) => (
    <div className="space-y-6">
        <div className="card-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    Minutes Usage Log
                </h3>
            </div>
            <DataTable
                columns={[
                    { header: 'Action', render: (r) => <StatusBadge status={r.action} /> },
                    {
                        header: 'Minutes', render: (r) => (
                            <span className={r.action === 'deducted' ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                                {r.action === 'deducted' ? '-' : '+'}{r.minutes_used}
                            </span>
                        )
                    },
                    { header: 'Source', key: 'source' },
                    { header: 'Reason', render: (r) => <span className="text-slate-400 max-w-[200px] truncate block">{r.reason || '—'}</span> },
                    { header: 'Date', render: (r) => fmtDateTime(r.created_at) },
                ]}
                data={minutesLog}
                emptyIcon={Clock}
                emptyTitle="No usage log"
                emptyDesc="No minutes usage recorded yet."
            />
        </div>

        <div className="card-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Minutes Transactions
                </h3>
            </div>
            <DataTable
                columns={[
                    { header: 'Type', render: (r) => <StatusBadge status={r.type} /> },
                    { header: 'Amount', render: (r) => <span className="text-white font-medium">{r.amount}</span> },
                    { header: 'Description', render: (r) => <span className="text-slate-400 max-w-[250px] truncate block">{r.description || '—'}</span> },
                    { header: 'Balance After', render: (r) => <span className="text-blue-400 font-medium">{r.balance_after}</span> },
                    { header: 'Date', render: (r) => fmtDateTime(r.created_at) },
                ]}
                data={minutesTransactions}
                emptyIcon={Zap}
                emptyTitle="No transactions"
                emptyDesc="No minutes transactions recorded yet."
            />
        </div>
    </div>
);

/* ========== Tab Content: Payments ========== */

const PaymentsTab = ({ payments, recharges }) => (
    <div className="space-y-6">
        <div className="card-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-400" />
                    Stripe Payments
                </h3>
            </div>
            <DataTable
                columns={[
                    { header: 'Amount', render: (r) => <span className="text-white font-semibold">{fmtCurrency(r.amount, r.currency)}</span> },
                    { header: 'Status', render: (r) => <StatusBadge status={r.payment_status} /> },
                    { header: 'Type', render: (r) => <span className="text-slate-300">{r.payment_type || '—'}</span> },
                    { header: 'Plan', render: (r) => <span className="text-slate-300">{r.plan_name || '—'}</span> },
                    { header: 'Minutes', render: (r) => <span className="text-blue-400">{r.minutes_purchased || '—'}</span> },
                    {
                        header: 'Invoice', render: (r) => r.invoice_pdf ? (
                            <a href={r.invoice_pdf} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                <Download className="h-4 w-4" />
                            </a>
                        ) : '—'
                    },
                    { header: 'Date', render: (r) => fmtDate(r.paid_at || r.created_at) },
                ]}
                data={payments}
                emptyIcon={CreditCard}
                emptyTitle="No payments"
                emptyDesc="This user hasn't made any payments yet."
            />
        </div>

        <div className="card-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                    Recharge Transactions
                </h3>
            </div>
            <DataTable
                columns={[
                    { header: 'Amount', render: (r) => <span className="text-white font-semibold">${(r.amount / 100).toFixed(2)}</span> },
                    { header: 'Minutes', render: (r) => <span className="text-blue-400 font-medium">{r.minutes}</span> },
                    { header: 'Rate', render: (r) => <span className="text-slate-400">{r.rate ? `$${r.rate}/min` : '—'}</span> },
                    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                    { header: 'Date', render: (r) => fmtDate(r.created_at) },
                ]}
                data={recharges}
                emptyIcon={RefreshCw}
                emptyTitle="No recharges"
                emptyDesc="This user hasn't purchased any recharge packs."
            />
        </div>
    </div>
);

/* ========== Tab Content: Sessions ========== */

const SessionsTab = ({ sessions }) => {
    const columns = [
        {
            header: 'Device', render: (r) => (
                <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-300 max-w-[250px] truncate block">{r.device_info || 'Unknown device'}</span>
                </div>
            )
        },
        { header: 'IP Address', render: (r) => <span className="text-slate-400 font-mono text-xs">{r.ip_address || '—'}</span> },
        {
            header: 'Status', render: (r) => (
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${r.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${r.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    {r.is_active ? 'Active' : 'Expired'}
                </span>
            )
        },
        { header: 'Last Activity', render: (r) => <span className="text-slate-400">{timeAgo(r.last_activity)}</span> },
        { header: 'Created', render: (r) => fmtDateTime(r.created_at) },
        { header: 'Expires', render: (r) => fmtDateTime(r.expires_at) },
    ];
    return <DataTable columns={columns} data={sessions} emptyIcon={Globe} emptyTitle="No sessions" emptyDesc="No session records found for this user." />;
};

/* ========== Tab Content: Channels ========== */

const ChannelsTab = ({ channels, selectedChannelId, onSelectChannel, meetingCountsByChannel }) => {
    const columns = [
        {
            header: 'Channel Name',
            render: (r) => (
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{r.name || 'Unnamed Channel'}</span>
                    {selectedChannelId != null && String(r.id) === String(selectedChannelId) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">selected</span>
                    )}
                </div>
            )
        },
        {
            header: 'History',
            render: (r) => <span className="text-cyan-400 font-medium">{meetingCountsByChannel?.[String(r.id)] || 0} items</span>
        },
        { header: 'Created', render: (r) => fmtDateTime(r.created_at) },
        { header: 'Updated', render: (r) => fmtDateTime(r.updated_at) },
    ];
    return (
        <DataTable
            columns={columns}
            data={channels}
            emptyIcon={MessageSquare}
            emptyTitle="No channels"
            emptyDesc="This user has no active channels."
            onRowClick={onSelectChannel}
            getRowClassName={(row) => (selectedChannelId != null && String(row.id) === String(selectedChannelId) ? 'bg-indigo-500/10' : '')}
        />
    );
};

/* ========== Tab Content: Audio ========== */

const AudioTab = ({ audios }) => {
    const columns = [
        { header: 'Title', render: (r) => <span className="text-white font-medium">{r.title || 'Untitled'}</span> },
        { header: 'Source', render: (r) => <SourceBadge source={r.source} /> },
        { header: 'Uploaded', render: (r) => fmtDate(r.uploadedAt) },
        {
            header: 'Audio', render: (r) => r.audioUrl ? (
                <a href={r.audioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors text-xs">
                    <ExternalLink className="h-3.5 w-3.5" /> Listen
                </a>
            ) : '—'
        },
    ];
    return <DataTable columns={columns} data={audios} emptyIcon={Headphones} emptyTitle="No audio files" emptyDesc="No audio files recorded for this user." />;
};

/* ========== Main Component ========== */

export default function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedChannelFilter, setSelectedChannelFilter] = useState(null);

    useEffect(() => {
        setSelectedChannelFilter(null);
        loadUserDetails();
    }, [id]);

    const loadUserDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await usersService.getUserDetails(id);
            setData(res.data);
        } catch (err) {
            console.error('Error loading user details:', err);
            setError(err.response?.data?.error || 'Failed to load user details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                <p className="text-sm text-slate-400">Loading user details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <X className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Error Loading User</h2>
                <p className="text-sm text-slate-400">{error}</p>
                <div className="flex gap-3 mt-2">
                    <button onClick={() => navigate('/users')} className="btn-secondary text-sm">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
                    </button>
                    <button onClick={loadUserDetails} className="btn-primary text-sm">
                        <RefreshCw className="h-4 w-4 mr-1" /> Retry
                    </button>
                </div>
            </div>
        );
    }

    const {
        user,
        subscription,
        usageSummary,
        minutesLog,
        minutesTransactions,
        meetings,
        payments,
        recharges,
        sessions,
        audios,
        channels = [],
        channelSummary = {}
    } = data;
    const activeChannels = Array.isArray(channels) ? channels : [];
    const allMeetings = Array.isArray(meetings) ? meetings : [];
    const filteredMeetings = selectedChannelFilter?.id == null
        ? allMeetings
        : allMeetings.filter((meeting) => String(meeting?.channel_id ?? '') === String(selectedChannelFilter.id));
    const meetingCountsByChannel = allMeetings.reduce((acc, meeting) => {
        if (meeting?.channel_id == null) return acc;
        const key = String(meeting.channel_id);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const channelsTotal = Number(channelSummary.totalChannels ?? activeChannels.length);
    const channelsDeleted = Number(channelSummary.deletedChannels ?? 0);
    const isGoogleUser = user.isGoogleUser === true || user.isGoogleUser === 1 || user.isGoogleUser === '1';
    const isFacebookUser = user.isFacebookUser === true || user.isFacebookUser === 1 || user.isFacebookUser === '1';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back button + Header */}
            <div className="flex items-start gap-4">
                <button
                    onClick={() => navigate('/users')}
                    className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white text-slate-400 transition-all mt-1 flex-shrink-0"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/10 shadow-lg shadow-indigo-500/5">
                                {user.profilePic ? (
                                    <img className="h-16 w-16 rounded-2xl object-cover" src={user.profilePic} alt="" />
                                ) : (
                                    <User className="h-8 w-8 text-indigo-400" />
                                )}
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-white">{user.fullName || 'No Name'}</h1>
                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                                    <Mail className="h-3.5 w-3.5" />
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 ml-20 sm:ml-0">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${user.isVerified
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                                }`}>
                                {user.isVerified ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                                {user.isVerified ? 'Verified' : 'Not Verified'}
                            </span>

                            {isGoogleUser && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">Google</span>
                            )}
                            {isFacebookUser && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">Facebook</span>
                            )}

                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/30">
                                <Calendar className="w-3 h-3 mr-1" />
                                Joined {fmtDate(user.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MiniStat
                    icon={CreditCard}
                    title="Plan"
                    value={subscription?.subscription_plan || 'Free'}
                    subtext={subscription ? `${subscription.status}` : 'No subscription'}
                    color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                />
                <MiniStat
                    icon={Clock}
                    title="Minutes Left"
                    value={(subscription?.subscription_remaining || 0) + (subscription?.recharge_remaining || 0)}
                    subtext={`${usageSummary?.total_deducted || 0} used total`}
                    color="bg-gradient-to-br from-violet-500 to-violet-600"
                />
                <MiniStat
                    icon={Calendar}
                    title="Meetings"
                    value={allMeetings.length}
                    subtext={allMeetings.length > 0 ? `Last: ${timeAgo(allMeetings[0]?.created_at)}` : 'None yet'}
                    color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                />
                <MiniStat
                    icon={DollarSign}
                    title="Payments"
                    value={payments?.length || 0}
                    subtext={recharges?.length > 0 ? `${recharges.length} recharges` : 'No recharges'}
                    color="bg-gradient-to-br from-amber-500 to-amber-600"
                />
                <MiniStat
                    icon={MessageSquare}
                    title="Channels"
                    value={activeChannels.length}
                    subtext={channelsDeleted > 0 ? `${channelsDeleted} deleted (${channelsTotal} total)` : `${channelsTotal} total`}
                    color="bg-gradient-to-br from-cyan-500 to-cyan-600"
                />
            </div>

            {/* Tab Bar */}
            <div className="card-dark p-1.5 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {TABS.map(({ key, label, icon: TabIcon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${activeTab === key
                                    ? 'bg-indigo-500/15 text-indigo-400 shadow-sm border border-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                                }`}
                        >
                            <TabIcon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === 'overview' && (
                    <OverviewTab subscription={subscription} usageSummary={usageSummary} meetings={allMeetings} payments={payments} />
                )}
                {activeTab === 'meetings' && (
                    <div className="card-dark overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-700/50">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-indigo-400" />
                                    Meeting & MoM History
                                </h3>
                                {selectedChannelFilter?.id != null && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Channel: {selectedChannelFilter?.name || `Channel #${selectedChannelFilter.id}`}
                                    </span>
                                )}
                                {selectedChannelFilter?.id != null && (
                                    <button
                                        onClick={() => setSelectedChannelFilter(null)}
                                        className="text-xs px-2 py-1 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                                    >
                                        Clear filter
                                    </button>
                                )}
                                <span className="text-xs text-slate-500 ml-auto">
                                    {filteredMeetings.length} records
                                </span>
                            </div>
                        </div>
                        <MeetingsTab meetings={filteredMeetings} channelFilter={selectedChannelFilter} />
                    </div>
                )}
                {activeTab === 'minutes' && (
                    <MinutesTab minutesLog={minutesLog} minutesTransactions={minutesTransactions} />
                )}
                {activeTab === 'payments' && (
                    <PaymentsTab payments={payments} recharges={recharges} />
                )}
                {activeTab === 'sessions' && (
                    <div className="card-dark overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-700/50">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Globe className="h-4 w-4 text-indigo-400" />
                                Active Sessions
                                <span className="text-xs text-slate-500 ml-auto">{sessions?.length || 0} sessions</span>
                            </h3>
                        </div>
                        <SessionsTab sessions={sessions} />
                    </div>
                )}
                {activeTab === 'channels' && (
                    <div className="card-dark overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-700/50">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-indigo-400" />
                                User Channels
                                <span className="text-xs text-slate-500 ml-auto">{activeChannels.length} channels</span>
                            </h3>
                        </div>
                        <ChannelsTab
                            channels={activeChannels}
                            selectedChannelId={selectedChannelFilter?.id ?? null}
                            meetingCountsByChannel={meetingCountsByChannel}
                            onSelectChannel={(channel) => {
                                setSelectedChannelFilter({
                                    id: channel.id,
                                    name: channel.name || `Channel #${channel.id}`
                                });
                                setActiveTab('meetings');
                            }}
                        />
                    </div>
                )}
                {activeTab === 'audio' && (
                    <div className="card-dark overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-700/50">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Headphones className="h-4 w-4 text-indigo-400" />
                                Audio Files
                                <span className="text-xs text-slate-500 ml-auto">{audios?.length || 0} files</span>
                            </h3>
                        </div>
                        <AudioTab audios={audios} />
                    </div>
                )}
            </div>
        </div>
    );
}
