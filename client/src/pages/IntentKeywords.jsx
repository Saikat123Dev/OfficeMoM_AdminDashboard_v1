import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  AlertCircle,
  Tag
} from 'lucide-react';
import CreatableSelect from '../components/CreatableSelect';
import { intentKeywordsService } from '../services/api';

const normalizeStatus = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return 'active';
  return 'inactive';
};

const parseListForInput = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value;
  return '';
};

const parseListForPayload = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const StatusBadge = ({ status }) => {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        isActive
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
          : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
      }`}
    >
      {isActive ? <CheckCircle className="w-3 h-3 mr-1.5" /> : <AlertCircle className="w-3 h-3 mr-1.5" />}
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

const IntentKeywordItem = ({ item, expanded, onToggle, onEdit, onDelete }) => (
  <div
    className={`rounded-xl border transition-all duration-200 ${
      expanded
        ? 'bg-slate-800/40 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
        : 'bg-slate-800/20 border-slate-700/40 hover:border-slate-600/50'
    }`}
  >
    <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left">
      <div className="flex-1 pr-4">
        <h3 className={`text-sm font-medium ${expanded ? 'text-indigo-300' : 'text-white'} transition-colors`}>
          {item.intent_name}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-500/15 text-indigo-400 border-indigo-500/20">
            <Tag className="w-3 h-3 mr-1.5" />
            Priority {item.priority}
          </span>
          <StatusBadge status={item.status} />
          <span className="text-xs text-slate-500">{item.keywords.length} keywords</span>
        </div>
        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.keywords.join(', ')}</p>
      </div>
      <div className={`p-1 rounded-lg transition-all duration-200 ${expanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500'}`}>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </button>

    {expanded && (
      <div className="px-5 pb-4 animate-fade-in">
        <div className="pt-3 border-t border-slate-700/40">
          <div className="flex flex-wrap gap-2">
            {item.keywords.length > 0 ? (
              item.keywords.map((keyword, index) => (
                <span
                  key={`${item.id}-${keyword}-${index}`}
                  className="px-2 py-1 text-[11px] rounded-md bg-slate-700/40 text-slate-300 border border-slate-600/30"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No keywords</span>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <button
              onClick={() => onEdit(item)}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <Edit className="h-3 w-3 mr-1.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="h-3 w-3 mr-1.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

const IntentKeywordFormModal = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  intentNameOptions,
  submitting,
  error
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
      <div className="flex items-center justify-between p-6 border-b border-slate-700/40 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">{isEditing ? 'Edit Intent Keyword' : 'Add Intent Keyword'}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{error}</div>
        )}

        <div>
          <CreatableSelect
            label="Intent Name"
            value={formData.intent_name}
            onChange={(val) => setFormData({ ...formData, intent_name: val })}
            options={intentNameOptions}
            placeholder="Select or type intent name..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Keywords (comma separated)</label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="input-dark"
            placeholder="hello, hi, greeting..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="input-dark"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input-dark"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700/40 flex-shrink-0">
        <button onClick={onClose} className="btn-secondary" disabled={submitting}>
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="btn-gradient disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : isEditing ? 'Update Intent' : 'Add Intent'}
        </button>
      </div>
    </div>
  </div>
);

export default function IntentKeywords() {
  const [intentKeywords, setIntentKeywords] = useState([]);
  const [intentNameOptions, setIntentNameOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIntentName, setSelectedIntentName] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingIntentKeyword, setEditingIntentKeyword] = useState(null);
  const [pageError, setPageError] = useState('');
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    intent_name: '',
    keywords: '',
    priority: 0,
    status: 'active'
  });

  const loadOptions = useCallback(async () => {
    try {
      const response = await intentKeywordsService.getOptions();
      if (response.data?.success) {
        const names = Array.isArray(response.data.intent_names) ? response.data.intent_names : [];
        setIntentNameOptions(names);
      }
    } catch (error) {
      console.error('Error loading intent keyword options:', error);
      setIntentNameOptions([]);
    }
  }, []);

  const loadIntentKeywords = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await intentKeywordsService.getIntentKeywords();
      const rawItems = Array.isArray(response.data) ? response.data : (response.data?.intent_keywords || []);
      const mappedItems = rawItems.map((item) => ({
        ...item,
        intent_name: String(item.intent_name || '').trim(),
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 0,
        status: normalizeStatus(item.is_active)
      }));
      setIntentKeywords(mappedItems);
    } catch (error) {
      console.error('Error loading intent keywords:', error);
      setPageError(error.response?.data?.error || 'Failed to load intent keywords');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntentKeywords();
    loadOptions();
  }, [loadIntentKeywords, loadOptions]);

  const intentNameList = useMemo(
    () => ['All', ...new Set([...intentNameOptions, ...intentKeywords.map((item) => item.intent_name).filter(Boolean)])],
    [intentNameOptions, intentKeywords]
  );

  const modalIntentNameOptions = useMemo(
    () => [...new Set([...intentNameOptions, ...intentKeywords.map((item) => item.intent_name).filter(Boolean)])],
    [intentNameOptions, intentKeywords]
  );

  const handleSubmit = async () => {
    const intentName = String(formData.intent_name || '').trim();
    const keywordsList = parseListForPayload(formData.keywords);
    const priority = Number.isFinite(Number(formData.priority)) ? Number(formData.priority) : 0;

    if (!intentName || keywordsList.length === 0) {
      setModalError('Intent Name and at least one keyword are required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      const payload = {
        intent_name: intentName,
        keywords: keywordsList,
        priority,
        is_active: formData.status === 'active'
      };

      if (editingIntentKeyword) {
        await intentKeywordsService.updateIntentKeyword(editingIntentKeyword.id, payload);
      } else {
        await intentKeywordsService.createIntentKeyword(payload);
      }

      setShowModal(false);
      setEditingIntentKeyword(null);
      setFormData({
        intent_name: '',
        keywords: '',
        priority: 0,
        status: 'active'
      });
      await Promise.all([loadIntentKeywords(), loadOptions()]);
    } catch (error) {
      console.error('Error saving intent keyword:', error);
      setModalError(error.response?.data?.error || 'Failed to save intent keyword');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingIntentKeyword(item);
    setModalError('');
    setFormData({
      intent_name: item.intent_name || '',
      keywords: parseListForInput(item.keywords),
      priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 0,
      status: item.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this intent keyword?')) {
      try {
        await intentKeywordsService.deleteIntentKeyword(id);
        await Promise.all([loadIntentKeywords(), loadOptions()]);
      } catch (error) {
        console.error('Error deleting intent keyword:', error);
        setPageError(error.response?.data?.error || 'Failed to delete intent keyword');
      }
    }
  };

  const openNewModal = () => {
    setEditingIntentKeyword(null);
    setModalError('');
    setFormData({
      intent_name: '',
      keywords: '',
      priority: 0,
      status: 'active'
    });
    setShowModal(true);
  };

  const filteredIntentKeywords = intentKeywords
    .filter((item) => selectedIntentName === 'All' || item.intent_name === selectedIntentName)
    .filter((item) => selectedStatus === 'all' || item.status === selectedStatus)
    .filter((item) => {
      const query = search.toLowerCase();
      const keywordsText = (item.keywords || []).join(' ').toLowerCase();
      return (
        String(item.intent_name || '').toLowerCase().includes(query) ||
        keywordsText.includes(query)
      );
    });

  const activeCount = intentKeywords.filter((item) => item.status === 'active').length;
  const inactiveCount = Math.max(0, intentKeywords.length - activeCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Brain className="h-5 w-5 text-violet-400" />
            </div>
            Intent Keywords
          </h1>
          <p className="text-slate-400 mt-1 ml-12">{filteredIntentKeywords.length} entries</p>
        </div>
        <button onClick={openNewModal} className="btn-gradient mt-4 sm:mt-0 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Intent Keyword
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-dark p-4">
          <p className="text-xs text-slate-500">Total Intents</p>
          <p className="text-2xl font-bold text-white mt-1">{intentKeywords.length}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-xs text-slate-500">Inactive</p>
          <p className="text-2xl font-bold text-slate-400 mt-1">{inactiveCount}</p>
        </div>
      </div>

      <div className="card-dark p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search intent keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={selectedIntentName}
            onChange={(e) => setSelectedIntentName(e.target.value)}
            className="input-dark"
          >
            {intentNameList.map((intentName) => (
              <option key={intentName} value={intentName}>
                {intentName === 'All' ? 'All Intent Names' : intentName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-dark"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              setSelectedIntentName('All');
              setSelectedStatus('all');
            }}
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
      ) : filteredIntentKeywords.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <Brain className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No intent keywords found</p>
          <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or add a new intent</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIntentKeywords.map((item) => (
            <IntentKeywordItem
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <IntentKeywordFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingIntentKeyword(null);
            setModalError('');
          }}
          isEditing={!!editingIntentKeyword}
          intentNameOptions={modalIntentNameOptions}
          submitting={submitting}
          error={modalError}
        />
      )}
    </div>
  );
}
