import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  Search,
  Mail,
  User,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { contactsService } from '../services/api';

const fmtDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const ContactItem = ({ contact, expanded, onToggle }) => (
  <div
    className={`rounded-xl border transition-all duration-200 ${
      expanded
        ? 'bg-slate-800/40 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
        : 'bg-slate-800/20 border-slate-700/40 hover:border-slate-600/50'
    }`}
  >
    <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left">
      <div className="flex-1 pr-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${expanded ? 'text-indigo-300' : 'text-white'} transition-colors`}>
            {contact.name || 'Unknown'}
          </span>
          {isToday(contact.created_at) && (
            <span className="px-2 py-0.5 text-[10px] rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Today
            </span>
          )}
        </div>

        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Mail className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{contact.email || 'No email'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            {fmtDateTime(contact.created_at)}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-2 line-clamp-2">
          {contact.message || 'No message'}
        </p>
      </div>

      <div className={`p-1 rounded-lg transition-all duration-200 ${expanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500'}`}>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </button>

    {expanded && (
      <div className="px-5 pb-4 animate-fade-in">
        <div className="pt-3 border-t border-slate-700/40">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{contact.message || 'No message'}</p>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await contactsService.getContacts();
      const rawContacts = Array.isArray(response.data) ? response.data : (response.data?.contacts || []);
      const mapped = rawContacts.map((item) => ({
        id: Number(item.id),
        name: String(item.name || '').trim(),
        email: String(item.email || '').trim(),
        message: String(item.message || '').trim(),
        created_at: item.created_at || null
      }));
      setContacts(mapped);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setPageError(error.response?.data?.error || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const emailList = useMemo(() => {
    const unique = [...new Set(contacts.map((item) => item.email).filter(Boolean))];
    return ['All', ...unique];
  }, [contacts]);

  const filteredContacts = contacts
    .filter((item) => selectedEmail === 'All' || item.email === selectedEmail)
    .filter((item) => {
      const query = search.toLowerCase();
      return (
        String(item.name || '').toLowerCase().includes(query) ||
        String(item.email || '').toLowerCase().includes(query) ||
        String(item.message || '').toLowerCase().includes(query)
      );
    });

  const totalContacts = contacts.length;
  const uniqueEmails = emailList.length > 0 ? Math.max(0, emailList.length - 1) : 0;
  const todaysContacts = contacts.filter((item) => isToday(item.created_at)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Inbox className="h-5 w-5 text-cyan-400" />
            </div>
            Contact Messages
          </h1>
          <p className="text-slate-400 mt-1 ml-12">Read-only inbox from `contacts` table</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-dark p-4">
          <p className="text-xs text-slate-500">Total Messages</p>
          <p className="text-2xl font-bold text-white mt-1">{totalContacts}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-xs text-slate-500">Unique Emails</p>
          <p className="text-2xl font-bold text-white mt-1">{uniqueEmails}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-xs text-slate-500">Today</p>
          <p className="text-2xl font-bold text-white mt-1">{todaysContacts}</p>
        </div>
      </div>

      <div className="card-dark p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, email, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
            className="input-dark"
          >
            {emailList.map((email) => (
              <option key={email} value={email}>
                {email === 'All' ? 'All Emails' : email}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setSelectedEmail('All');
            }}
            className="btn-secondary"
            type="button"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : pageError ? (
        <div className="card-dark p-12 text-center">
          <p className="text-red-300 text-base font-medium">{pageError}</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <Inbox className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No contact messages found</p>
          <p className="text-slate-600 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              expanded={expandedId === contact.id}
              onToggle={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
            />
          ))}
        </div>
      )}

      {!loading && !pageError && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          Showing {filteredContacts.length} of {totalContacts} messages
        </p>
      )}
    </div>
  );
}
