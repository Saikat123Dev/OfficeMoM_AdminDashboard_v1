import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookOpenText,
  X,
  Tag,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import CreatableSelect from '../components/CreatableSelect';
import { officemomDetailsService } from '../services/api';

const DEFAULT_DETAIL_TYPES = [
  'about',
  'mission',
  'company_info',
  'how_it_works',
  'languages',
  'integrations',
  'security',
  'support_info'
];

const DEFAULT_CATEGORIES = ['general'];

const normalizeStatus = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return 'active';
  return 'inactive';
};

const parseKeywordsForInput = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value;
  return '';
};

const parseKeywordsForPayload = (value) => {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const DetailTypeBadge = ({ detailType }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-500/15 text-indigo-400 border-indigo-500/20">
    <Tag className="w-3 h-3 mr-1.5" />
    {detailType}
  </span>
);

const CategoryBadge = ({ category }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-cyan-500/15 text-cyan-400 border-cyan-500/20">
    {category}
  </span>
);

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

const DetailAccordionItem = ({ detail, expanded, onToggle, onEdit, onDelete }) => (
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
          {detail.title}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <DetailTypeBadge detailType={detail.detail_type} />
          <CategoryBadge category={detail.category} />
          <StatusBadge status={detail.status} />
          <span className="text-xs text-slate-500">Order: {detail.display_order}</span>
        </div>
      </div>
      <div className={`p-1 rounded-lg transition-all duration-200 ${expanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500'}`}>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </button>

    {expanded && (
      <div className="px-5 pb-4 animate-fade-in">
        <div className="pt-3 border-t border-slate-700/40">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{detail.content}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {detail.keywords?.length > 0 ? (
              detail.keywords.map((keyword, index) => (
                <span
                  key={`${detail.id}-${keyword}-${index}`}
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
              onClick={() => onEdit(detail)}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <Edit className="h-3 w-3 mr-1.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(detail.id)}
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

const DetailsFormModal = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  detailTypeOptions,
  categoryOptions,
  submitting,
  error
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
      <div className="flex items-center justify-between p-6 border-b border-slate-700/40 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit OfficeMoM Detail' : 'Add OfficeMoM Detail'}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CreatableSelect
            label="Detail Type"
            value={formData.detail_type}
            onChange={(val) => setFormData({ ...formData, detail_type: val })}
            options={detailTypeOptions}
            placeholder="Select or type detail type..."
          />
          <CreatableSelect
            label="Category"
            value={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val })}
            options={categoryOptions}
            placeholder="Select or type category..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input-dark"
            placeholder="Enter title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Content</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="input-dark min-h-[140px] resize-y"
            placeholder="Enter full content..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Keywords (comma separated)</label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="input-dark"
            placeholder="about, purpose, platform..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Order</label>
            <input
              type="number"
              min="0"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
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
          {submitting ? 'Saving...' : isEditing ? 'Update Detail' : 'Add Detail'}
        </button>
      </div>
    </div>
  </div>
);

export default function OfficemomDetails() {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDetailType, setSelectedDetailType] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDetail, setEditingDetail] = useState(null);
  const [pageError, setPageError] = useState('');
  const [modalError, setModalError] = useState('');
  const [detailOptions, setDetailOptions] = useState({ detail_types: [], categories: [] });
  const [formData, setFormData] = useState({
    detail_type: '',
    title: '',
    content: '',
    keywords: '',
    category: 'general',
    display_order: 0,
    status: 'active'
  });

  const detailTypeList = useMemo(
    () => ['All', ...new Set([...detailOptions.detail_types, ...details.map((item) => item.detail_type).filter(Boolean)])],
    [detailOptions.detail_types, details]
  );

  const categoryList = useMemo(
    () => ['All', ...new Set([...detailOptions.categories, ...details.map((item) => item.category).filter(Boolean)])],
    [detailOptions.categories, details]
  );

  const modalDetailTypeOptions = useMemo(
    () => [...new Set([...detailOptions.detail_types, ...DEFAULT_DETAIL_TYPES])],
    [detailOptions.detail_types]
  );

  const modalCategoryOptions = useMemo(
    () => [...new Set([...detailOptions.categories, ...DEFAULT_CATEGORIES])],
    [detailOptions.categories]
  );

  const loadOptions = useCallback(async () => {
    try {
      const response = await officemomDetailsService.getOptions();
      if (response.data?.success) {
        const typesFromDb = Array.isArray(response.data.detail_types) ? response.data.detail_types : [];
        const categoriesFromDb = Array.isArray(response.data.categories) ? response.data.categories : [];
        setDetailOptions({
          detail_types: typesFromDb.length > 0 ? typesFromDb : DEFAULT_DETAIL_TYPES,
          categories: categoriesFromDb.length > 0 ? categoriesFromDb : DEFAULT_CATEGORIES
        });
      }
    } catch (error) {
      console.error('Error loading OfficeMoM detail options:', error);
      setDetailOptions({
        detail_types: DEFAULT_DETAIL_TYPES,
        categories: DEFAULT_CATEGORIES
      });
    }
  }, []);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await officemomDetailsService.getDetails();
      const rawDetails = Array.isArray(response.data) ? response.data : (response.data?.details || []);
      const mappedDetails = rawDetails.map((detail) => ({
        ...detail,
        detail_type: (detail.detail_type || '').trim(),
        category: (detail.category || 'general').trim() || 'general',
        display_order: Number.isFinite(Number(detail.display_order)) ? Number(detail.display_order) : 0,
        status: normalizeStatus(detail.is_active),
        keywords: Array.isArray(detail.keywords) ? detail.keywords : []
      }));
      setDetails(mappedDetails);
    } catch (error) {
      console.error('Error loading OfficeMoM details:', error);
      setPageError(error.response?.data?.error || 'Failed to load OfficeMoM details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDetails();
    loadOptions();
  }, [loadDetails, loadOptions]);

  const handleSubmit = async () => {
    const detailType = String(formData.detail_type || '').trim();
    const title = String(formData.title || '').trim();
    const content = String(formData.content || '').trim();
    const category = String(formData.category || '').trim() || 'general';
    const displayOrder = Number.isFinite(Number(formData.display_order)) ? Number(formData.display_order) : 0;

    if (!detailType || !title || !content) {
      setModalError('Detail Type, Title, and Content are required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      const payload = {
        detail_type: detailType,
        title,
        content,
        keywords: parseKeywordsForPayload(formData.keywords),
        category,
        display_order: displayOrder,
        is_active: formData.status === 'active'
      };

      if (editingDetail) {
        await officemomDetailsService.updateDetail(editingDetail.id, payload);
      } else {
        await officemomDetailsService.createDetail(payload);
      }

      setShowModal(false);
      setEditingDetail(null);
      setFormData({
        detail_type: '',
        title: '',
        content: '',
        keywords: '',
        category: 'general',
        display_order: 0,
        status: 'active'
      });
      await Promise.all([loadDetails(), loadOptions()]);
    } catch (error) {
      console.error('Error saving OfficeMoM detail:', error);
      setModalError(error.response?.data?.error || 'Failed to save detail');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (detail) => {
    setEditingDetail(detail);
    setModalError('');
    setFormData({
      detail_type: detail.detail_type || '',
      title: detail.title || '',
      content: detail.content || '',
      keywords: parseKeywordsForInput(detail.keywords),
      category: detail.category || 'general',
      display_order: Number.isFinite(Number(detail.display_order)) ? Number(detail.display_order) : 0,
      status: detail.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this detail?')) {
      try {
        await officemomDetailsService.deleteDetail(id);
        await Promise.all([loadDetails(), loadOptions()]);
      } catch (error) {
        console.error('Error deleting OfficeMoM detail:', error);
        setPageError(error.response?.data?.error || 'Failed to delete detail');
      }
    }
  };

  const openNewModal = () => {
    setEditingDetail(null);
    setModalError('');
    setFormData({
      detail_type: '',
      title: '',
      content: '',
      keywords: '',
      category: 'general',
      display_order: 0,
      status: 'active'
    });
    setShowModal(true);
  };

  const filteredDetails = details
    .filter((item) => selectedDetailType === 'All' || item.detail_type === selectedDetailType)
    .filter((item) => selectedCategory === 'All' || item.category === selectedCategory)
    .filter((item) => selectedStatus === 'all' || item.status === selectedStatus)
    .filter((item) => {
      const query = search.toLowerCase();
      const keywordString = Array.isArray(item.keywords) ? item.keywords.join(' ').toLowerCase() : '';
      return (
        String(item.title || '').toLowerCase().includes(query) ||
        String(item.content || '').toLowerCase().includes(query) ||
        String(item.detail_type || '').toLowerCase().includes(query) ||
        keywordString.includes(query)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <BookOpenText className="h-5 w-5 text-indigo-400" />
            </div>
            OfficeMoM Details
          </h1>
          <p className="text-slate-400 mt-1 ml-12">{filteredDetails.length} entries</p>
        </div>
        <button onClick={openNewModal} className="btn-gradient mt-4 sm:mt-0 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Detail
        </button>
      </div>

      <div className="card-dark p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={selectedDetailType}
            onChange={(e) => setSelectedDetailType(e.target.value)}
            className="input-dark"
          >
            {detailTypeList.map((type) => (
              <option key={type} value={type}>
                {type === 'All' ? 'All Detail Types' : type}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-dark"
          >
            {categoryList.map((category) => (
              <option key={category} value={category}>
                {category === 'All' ? 'All Categories' : category}
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
      ) : filteredDetails.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <BookOpenText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No details found</p>
          <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or add a new entry</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDetails.map((detail) => (
            <DetailAccordionItem
              key={detail.id}
              detail={detail}
              expanded={expandedId === detail.id}
              onToggle={() => setExpandedId(expandedId === detail.id ? null : detail.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <DetailsFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingDetail(null);
            setModalError('');
          }}
          isEditing={!!editingDetail}
          detailTypeOptions={modalDetailTypeOptions}
          categoryOptions={modalCategoryOptions}
          submitting={submitting}
          error={modalError}
        />
      )}
    </div>
  );
}
