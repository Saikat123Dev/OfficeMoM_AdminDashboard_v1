import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
  Tag,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import CreatableSelect from '../components/CreatableSelect';
import { featuresService } from '../services/api';

const DEFAULT_PLANS = ['free', 'professional', 'professional_plus', 'business', 'business_plus'];

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

const CategoryBadge = ({ category }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-500/15 text-indigo-400 border-indigo-500/20">
    <Tag className="w-3 h-3 mr-1.5" />
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

const FeatureAccordionItem = ({ feature, expanded, onToggle, onEdit, onDelete }) => (
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
          {feature.feature_name}
        </h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{feature.short_description}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <CategoryBadge category={feature.feature_category} />
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-cyan-500/15 text-cyan-400 border-cyan-500/20">
            icon: {feature.icon_name}
          </span>
          <StatusBadge status={feature.status} />
          <span className="text-xs text-slate-500">Order: {feature.display_order}</span>
        </div>
      </div>
      <div className={`p-1 rounded-lg transition-all duration-200 ${expanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500'}`}>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </button>

    {expanded && (
      <div className="px-5 pb-4 animate-fade-in">
        <div className="pt-3 border-t border-slate-700/40">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{feature.detailed_description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {feature.keywords?.length > 0 ? (
              feature.keywords.map((keyword, index) => (
                <span
                  key={`${feature.id}-kw-${keyword}-${index}`}
                  className="px-2 py-1 text-[11px] rounded-md bg-slate-700/40 text-slate-300 border border-slate-600/30"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No keywords</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {feature.available_in_plans?.length > 0 ? (
              feature.available_in_plans.map((plan, index) => (
                <span
                  key={`${feature.id}-plan-${plan}-${index}`}
                  className="px-2 py-1 text-[11px] rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20"
                >
                  {plan}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No plan mapping</span>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <button
              onClick={() => onEdit(feature)}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <Edit className="h-3 w-3 mr-1.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(feature.id)}
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

const FeatureFormModal = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  categoryOptions,
  iconOptions,
  planOptions,
  submitting,
  error
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
      <div className="flex items-center justify-between p-6 border-b border-slate-700/40 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit Feature' : 'Add Feature'}
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

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Feature Name</label>
          <input
            type="text"
            value={formData.feature_name}
            onChange={(e) => setFormData({ ...formData, feature_name: e.target.value })}
            className="input-dark"
            placeholder="Enter feature name..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CreatableSelect
            label="Feature Category"
            value={formData.feature_category}
            onChange={(val) => setFormData({ ...formData, feature_category: val })}
            options={categoryOptions}
            placeholder="Select or type category..."
          />
          <CreatableSelect
            label="Icon Name"
            value={formData.icon_name}
            onChange={(val) => setFormData({ ...formData, icon_name: val })}
            options={iconOptions}
            placeholder="Select or type icon name..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Short Description</label>
          <textarea
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            className="input-dark min-h-[90px] resize-y"
            placeholder="Enter short description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Detailed Description</label>
          <textarea
            value={formData.detailed_description}
            onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
            className="input-dark min-h-[140px] resize-y"
            placeholder="Enter detailed description..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Keywords (comma separated)</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="input-dark"
              placeholder="recording, meeting..."
            />
          </div>
          <div>
            <CreatableSelect
              label="Available In Plans"
              value={formData.available_in_plans}
              onChange={(val) => setFormData({ ...formData, available_in_plans: val })}
              options={planOptions}
              placeholder="Type comma separated plans..."
            />
          </div>
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
          {submitting ? 'Saving...' : isEditing ? 'Update Feature' : 'Add Feature'}
        </button>
      </div>
    </div>
  </div>
);

export default function Features() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [pageError, setPageError] = useState('');
  const [modalError, setModalError] = useState('');
  const [featureOptions, setFeatureOptions] = useState({
    feature_categories: [],
    icon_names: [],
    available_plans: []
  });
  const [formData, setFormData] = useState({
    feature_name: '',
    feature_category: '',
    short_description: '',
    detailed_description: '',
    keywords: '',
    available_in_plans: '',
    icon_name: '',
    display_order: 0,
    status: 'active'
  });

  const categoryList = useMemo(
    () => ['All', ...new Set([...featureOptions.feature_categories, ...features.map((item) => item.feature_category).filter(Boolean)])],
    [featureOptions.feature_categories, features]
  );

  const planList = useMemo(
    () => ['All', ...new Set([...featureOptions.available_plans, ...features.flatMap((item) => item.available_in_plans || [])])],
    [featureOptions.available_plans, features]
  );

  const modalCategoryOptions = useMemo(
    () => [...new Set([...featureOptions.feature_categories])],
    [featureOptions.feature_categories]
  );

  const modalIconOptions = useMemo(
    () => [...new Set([...featureOptions.icon_names])],
    [featureOptions.icon_names]
  );

  const modalPlanOptions = useMemo(
    () => [...new Set([...featureOptions.available_plans, ...DEFAULT_PLANS])],
    [featureOptions.available_plans]
  );

  const loadOptions = useCallback(async () => {
    try {
      const response = await featuresService.getOptions();
      if (response.data?.success) {
        const categoriesFromDb = Array.isArray(response.data.feature_categories) ? response.data.feature_categories : [];
        const iconsFromDb = Array.isArray(response.data.icon_names) ? response.data.icon_names : [];
        const plansFromDb = Array.isArray(response.data.available_plans) ? response.data.available_plans : [];

        setFeatureOptions({
          feature_categories: categoriesFromDb,
          icon_names: iconsFromDb,
          available_plans: plansFromDb.length > 0 ? plansFromDb : DEFAULT_PLANS
        });
      }
    } catch (error) {
      console.error('Error loading feature options:', error);
      setFeatureOptions({
        feature_categories: [],
        icon_names: [],
        available_plans: DEFAULT_PLANS
      });
    }
  }, []);

  const loadFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await featuresService.getFeatures();
      const rawFeatures = Array.isArray(response.data) ? response.data : (response.data?.features || []);
      const mappedFeatures = rawFeatures.map((feature) => ({
        ...feature,
        feature_name: String(feature.feature_name || '').trim(),
        feature_category: String(feature.feature_category || '').trim(),
        short_description: String(feature.short_description || '').trim(),
        detailed_description: String(feature.detailed_description || '').trim(),
        icon_name: String(feature.icon_name || '').trim(),
        display_order: Number.isFinite(Number(feature.display_order)) ? Number(feature.display_order) : 0,
        status: normalizeStatus(feature.is_active),
        keywords: Array.isArray(feature.keywords) ? feature.keywords : [],
        available_in_plans: Array.isArray(feature.available_in_plans) ? feature.available_in_plans : []
      }));
      setFeatures(mappedFeatures);
    } catch (error) {
      console.error('Error loading features:', error);
      setPageError(error.response?.data?.error || 'Failed to load features');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
    loadOptions();
  }, [loadFeatures, loadOptions]);

  const handleSubmit = async () => {
    const featureName = String(formData.feature_name || '').trim();
    const featureCategory = String(formData.feature_category || '').trim();
    const iconName = String(formData.icon_name || '').trim();
    const shortDescription = String(formData.short_description || '').trim();
    const detailedDescription = String(formData.detailed_description || '').trim();
    const displayOrder = Number.isFinite(Number(formData.display_order)) ? Number(formData.display_order) : 0;

    if (!featureName || !featureCategory || !iconName || !shortDescription || !detailedDescription) {
      setModalError('Feature Name, Category, Icon Name, Short Description, and Detailed Description are required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      const payload = {
        feature_name: featureName,
        feature_category: featureCategory,
        short_description: shortDescription,
        detailed_description: detailedDescription,
        keywords: parseListForPayload(formData.keywords),
        available_in_plans: parseListForPayload(formData.available_in_plans),
        icon_name: iconName,
        display_order: displayOrder,
        is_active: formData.status === 'active'
      };

      if (editingFeature) {
        await featuresService.updateFeature(editingFeature.id, payload);
      } else {
        await featuresService.createFeature(payload);
      }

      setShowModal(false);
      setEditingFeature(null);
      setFormData({
        feature_name: '',
        feature_category: '',
        short_description: '',
        detailed_description: '',
        keywords: '',
        available_in_plans: '',
        icon_name: '',
        display_order: 0,
        status: 'active'
      });

      await Promise.all([loadFeatures(), loadOptions()]);
    } catch (error) {
      console.error('Error saving feature:', error);
      setModalError(error.response?.data?.error || 'Failed to save feature');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature);
    setModalError('');
    setFormData({
      feature_name: feature.feature_name || '',
      feature_category: feature.feature_category || '',
      short_description: feature.short_description || '',
      detailed_description: feature.detailed_description || '',
      keywords: parseListForInput(feature.keywords),
      available_in_plans: parseListForInput(feature.available_in_plans),
      icon_name: feature.icon_name || '',
      display_order: Number.isFinite(Number(feature.display_order)) ? Number(feature.display_order) : 0,
      status: feature.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this feature?')) {
      try {
        await featuresService.deleteFeature(id);
        await Promise.all([loadFeatures(), loadOptions()]);
      } catch (error) {
        console.error('Error deleting feature:', error);
        setPageError(error.response?.data?.error || 'Failed to delete feature');
      }
    }
  };

  const openNewModal = () => {
    setEditingFeature(null);
    setModalError('');
    setFormData({
      feature_name: '',
      feature_category: '',
      short_description: '',
      detailed_description: '',
      keywords: '',
      available_in_plans: '',
      icon_name: '',
      display_order: 0,
      status: 'active'
    });
    setShowModal(true);
  };

  const filteredFeatures = features
    .filter((item) => selectedCategory === 'All' || item.feature_category === selectedCategory)
    .filter((item) => selectedStatus === 'all' || item.status === selectedStatus)
    .filter((item) => selectedPlan === 'All' || (item.available_in_plans || []).includes(selectedPlan))
    .filter((item) => {
      const query = search.toLowerCase();
      const keywords = (item.keywords || []).join(' ').toLowerCase();
      const plans = (item.available_in_plans || []).join(' ').toLowerCase();

      return (
        String(item.feature_name || '').toLowerCase().includes(query) ||
        String(item.short_description || '').toLowerCase().includes(query) ||
        String(item.detailed_description || '').toLowerCase().includes(query) ||
        String(item.feature_category || '').toLowerCase().includes(query) ||
        String(item.icon_name || '').toLowerCase().includes(query) ||
        keywords.includes(query) ||
        plans.includes(query)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Layers className="h-5 w-5 text-emerald-400" />
            </div>
            Features Management
          </h1>
          <p className="text-slate-400 mt-1 ml-12">{filteredFeatures.length} entries</p>
        </div>
        <button onClick={openNewModal} className="btn-gradient mt-4 sm:mt-0 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Feature
        </button>
      </div>

      <div className="card-dark p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="input-dark"
          >
            {planList.map((plan) => (
              <option key={plan} value={plan}>
                {plan === 'All' ? 'All Plans' : plan}
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
      ) : filteredFeatures.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <Layers className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No features found</p>
          <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or add a new feature</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFeatures.map((feature) => (
            <FeatureAccordionItem
              key={feature.id}
              feature={feature}
              expanded={expandedId === feature.id}
              onToggle={() => setExpandedId(expandedId === feature.id ? null : feature.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <FeatureFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingFeature(null);
            setModalError('');
          }}
          isEditing={!!editingFeature}
          categoryOptions={modalCategoryOptions}
          iconOptions={modalIconOptions}
          planOptions={modalPlanOptions}
          submitting={submitting}
          error={modalError}
        />
      )}
    </div>
  );
}
