import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  X,
  Tag,
  CheckCircle,
  AlertCircle,
  Star
} from 'lucide-react';
import CreatableSelect from '../components/CreatableSelect';
import { rechargePackagesService } from '../services/api';

const DEFAULT_PACKAGE_NAMES = ['Recharge_500', 'Recharge_1000', 'Recharge_2000', 'Recharge_5000'];
const DEFAULT_CURRENCIES = ['usd'];

const normalizeStatus = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return 'active';
  return 'inactive';
};

const normalizePopular = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return 'yes';
  return 'no';
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

const formatPrice = (price, currency) => {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return '—';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'usd').toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericPrice);
  } catch (error) {
    return `${numericPrice.toFixed(2)} ${String(currency || 'usd').toUpperCase()}`;
  }
};

const PackageBadge = ({ packageName }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-500/15 text-indigo-400 border-indigo-500/20">
    <Tag className="w-3 h-3 mr-1.5" />
    {packageName}
  </span>
);

const CurrencyBadge = ({ currency }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-cyan-500/15 text-cyan-400 border-cyan-500/20">
    {String(currency || 'usd').toUpperCase()}
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

const PopularBadge = ({ popular }) => {
  const isPopular = popular === 'yes';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        isPopular
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
          : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
      }`}
    >
      <Star className="w-3 h-3 mr-1.5" />
      {isPopular ? 'Popular' : 'Standard'}
    </span>
  );
};

const RechargePackageAccordionItem = ({ item, expanded, onToggle, onEdit, onDelete }) => (
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
          {item.display_name}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {item.minutes} minutes • {formatPrice(item.price, item.currency)}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <PackageBadge packageName={item.package_name} />
          <CurrencyBadge currency={item.currency} />
          <PopularBadge popular={item.popular} />
          <StatusBadge status={item.status} />
          <span className="text-xs text-slate-500">Order: {item.sort_order}</span>
        </div>
      </div>
      <div className={`p-1 rounded-lg transition-all duration-200 ${expanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500'}`}>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </button>

    {expanded && (
      <div className="px-5 pb-4 animate-fade-in">
        <div className="pt-3 border-t border-slate-700/40 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {item.description || 'No description'}
          </p>

          <div className="text-xs text-slate-400">
            Stripe Price ID: <span className="text-slate-300 font-mono">{item.stripe_price_id || 'Not set'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {item.features?.length > 0 ? (
              item.features.map((feature, index) => (
                <span
                  key={`${item.id}-feature-${feature}-${index}`}
                  className="px-2 py-1 text-[11px] rounded-md bg-slate-700/40 text-slate-300 border border-slate-600/30"
                >
                  {feature}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No feature bullets</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
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

const RechargePackageFormModal = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  packageNameOptions,
  currencyOptions,
  submitting,
  error
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
      <div className="flex items-center justify-between p-6 border-b border-slate-700/40 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit Recharge Package' : 'Add Recharge Package'}
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
            label="Package Name"
            value={formData.package_name}
            onChange={(val) => setFormData({ ...formData, package_name: val })}
            options={packageNameOptions}
            placeholder="Select or type package name..."
          />
          <CreatableSelect
            label="Currency"
            value={formData.currency}
            onChange={(val) => setFormData({ ...formData, currency: val })}
            options={currencyOptions}
            placeholder="usd"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Name</label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            className="input-dark"
            placeholder="500 Minutes Top-up"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-dark min-h-[100px] resize-y"
            placeholder="Enter package description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Stripe Price ID</label>
          <input
            type="text"
            value={formData.stripe_price_id}
            onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
            className="input-dark"
            placeholder="price_..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Minutes</label>
            <input
              type="number"
              min="1"
              value={formData.minutes}
              onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
              className="input-dark"
              placeholder="500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="input-dark"
              placeholder="5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Features (comma separated)</label>
          <input
            type="text"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            className="input-dark"
            placeholder="500 minutes, no expiry"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Sort Order</label>
            <input
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Popular</label>
            <select
              value={formData.popular}
              onChange={(e) => setFormData({ ...formData, popular: e.target.value })}
              className="input-dark"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
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
          {submitting ? 'Saving...' : isEditing ? 'Update Package' : 'Add Package'}
        </button>
      </div>
    </div>
  </div>
);

export default function RechargePackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPopular, setSelectedPopular] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [pageError, setPageError] = useState('');
  const [modalError, setModalError] = useState('');
  const [options, setOptions] = useState({ package_names: [], currencies: [] });
  const [formData, setFormData] = useState({
    package_name: '',
    display_name: '',
    description: '',
    stripe_price_id: '',
    minutes: 500,
    price: 5,
    currency: 'usd',
    features: '',
    sort_order: 0,
    status: 'active',
    popular: 'no'
  });

  const currencyList = useMemo(
    () => ['All', ...new Set([...options.currencies, ...packages.map((item) => item.currency).filter(Boolean)])],
    [options.currencies, packages]
  );

  const modalPackageNameOptions = useMemo(
    () => [...new Set([...options.package_names, ...DEFAULT_PACKAGE_NAMES])],
    [options.package_names]
  );

  const modalCurrencyOptions = useMemo(
    () => [...new Set([...options.currencies, ...DEFAULT_CURRENCIES])],
    [options.currencies]
  );

  const loadOptions = useCallback(async () => {
    try {
      const response = await rechargePackagesService.getOptions();
      if (response.data?.success) {
        const packageNamesFromDb = Array.isArray(response.data.package_names) ? response.data.package_names : [];
        const currenciesFromDb = Array.isArray(response.data.currencies) ? response.data.currencies : [];

        setOptions({
          package_names: packageNamesFromDb.length > 0 ? packageNamesFromDb : DEFAULT_PACKAGE_NAMES,
          currencies: currenciesFromDb.length > 0 ? currenciesFromDb : DEFAULT_CURRENCIES
        });
      }
    } catch (error) {
      console.error('Error loading recharge package options:', error);
      setOptions({
        package_names: DEFAULT_PACKAGE_NAMES,
        currencies: DEFAULT_CURRENCIES
      });
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await rechargePackagesService.getPackages();
      const rawPackages = Array.isArray(response.data) ? response.data : (response.data?.packages || []);
      const mappedPackages = rawPackages.map((item) => ({
        ...item,
        package_name: String(item.package_name || '').trim(),
        display_name: String(item.display_name || '').trim(),
        description: String(item.description || '').trim(),
        stripe_price_id: String(item.stripe_price_id || '').trim(),
        minutes: Number.isFinite(Number(item.minutes)) ? Number(item.minutes) : 0,
        price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
        currency: String(item.currency || 'usd').trim().toLowerCase(),
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 0,
        status: normalizeStatus(item.is_active),
        popular: normalizePopular(item.is_popular),
        features: Array.isArray(item.features) ? item.features : []
      }));
      setPackages(mappedPackages);
    } catch (error) {
      console.error('Error loading recharge packages:', error);
      setPageError(error.response?.data?.error || 'Failed to load recharge packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
    loadOptions();
  }, [loadPackages, loadOptions]);

  const handleSubmit = async () => {
    const packageName = String(formData.package_name || '').trim();
    const displayName = String(formData.display_name || '').trim();
    const description = String(formData.description || '').trim();
    const stripePriceId = String(formData.stripe_price_id || '').trim();
    const minutes = Number(formData.minutes);
    const price = Number(formData.price);
    const currency = String(formData.currency || '').trim().toLowerCase();
    const sortOrder = Number.isFinite(Number(formData.sort_order)) ? Number(formData.sort_order) : 0;

    if (!packageName || !displayName || !currency || !Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(price) || price < 0) {
      setModalError('Package Name, Display Name, Currency, Minutes (>0), and Price (>=0) are required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      const payload = {
        package_name: packageName,
        display_name: displayName,
        description,
        stripe_price_id: stripePriceId,
        minutes,
        price,
        currency,
        features: parseListForPayload(formData.features),
        sort_order: sortOrder,
        is_active: formData.status === 'active',
        is_popular: formData.popular === 'yes'
      };

      if (editingPackage) {
        await rechargePackagesService.updatePackage(editingPackage.id, payload);
      } else {
        await rechargePackagesService.createPackage(payload);
      }

      setShowModal(false);
      setEditingPackage(null);
      setFormData({
        package_name: '',
        display_name: '',
        description: '',
        stripe_price_id: '',
        minutes: 500,
        price: 5,
        currency: 'usd',
        features: '',
        sort_order: 0,
        status: 'active',
        popular: 'no'
      });

      await Promise.all([loadPackages(), loadOptions()]);
    } catch (error) {
      console.error('Error saving recharge package:', error);
      setModalError(error.response?.data?.error || 'Failed to save recharge package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingPackage(item);
    setModalError('');
    setFormData({
      package_name: item.package_name || '',
      display_name: item.display_name || '',
      description: item.description || '',
      stripe_price_id: item.stripe_price_id || '',
      minutes: Number.isFinite(Number(item.minutes)) ? Number(item.minutes) : 0,
      price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
      currency: item.currency || 'usd',
      features: parseListForInput(item.features),
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 0,
      status: item.status || 'active',
      popular: item.popular || 'no'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recharge package?')) {
      try {
        await rechargePackagesService.deletePackage(id);
        await Promise.all([loadPackages(), loadOptions()]);
      } catch (error) {
        console.error('Error deleting recharge package:', error);
        setPageError(error.response?.data?.error || 'Failed to delete recharge package');
      }
    }
  };

  const openNewModal = () => {
    setEditingPackage(null);
    setModalError('');
    setFormData({
      package_name: '',
      display_name: '',
      description: '',
      stripe_price_id: '',
      minutes: 500,
      price: 5,
      currency: 'usd',
      features: '',
      sort_order: 0,
      status: 'active',
      popular: 'no'
    });
    setShowModal(true);
  };

  const filteredPackages = packages
    .filter((item) => selectedCurrency === 'All' || item.currency === selectedCurrency)
    .filter((item) => selectedStatus === 'all' || item.status === selectedStatus)
    .filter((item) => selectedPopular === 'all' || item.popular === selectedPopular)
    .filter((item) => {
      const query = search.toLowerCase();
      const featureText = (item.features || []).join(' ').toLowerCase();
      return (
        String(item.package_name || '').toLowerCase().includes(query) ||
        String(item.display_name || '').toLowerCase().includes(query) ||
        String(item.description || '').toLowerCase().includes(query) ||
        String(item.stripe_price_id || '').toLowerCase().includes(query) ||
        String(item.currency || '').toLowerCase().includes(query) ||
        featureText.includes(query)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Package className="h-5 w-5 text-amber-400" />
            </div>
            Recharge Packages
          </h1>
          <p className="text-slate-400 mt-1 ml-12">{filteredPackages.length} entries</p>
        </div>
        <button onClick={openNewModal} className="btn-gradient mt-4 sm:mt-0 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Package
        </button>
      </div>

      <div className="card-dark p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search recharge packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="input-dark"
          >
            {currencyList.map((currency) => (
              <option key={currency} value={currency}>
                {currency === 'All' ? 'All Currencies' : currency.toUpperCase()}
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

          <select
            value={selectedPopular}
            onChange={(e) => setSelectedPopular(e.target.value)}
            className="input-dark"
          >
            <option value="all">All Popularity</option>
            <option value="yes">Popular</option>
            <option value="no">Standard</option>
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
      ) : filteredPackages.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No recharge packages found</p>
          <p className="text-slate-600 text-sm mt-1">Try adjusting filters or add a new package</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPackages.map((item) => (
            <RechargePackageAccordionItem
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
        <RechargePackageFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingPackage(null);
            setModalError('');
          }}
          isEditing={!!editingPackage}
          packageNameOptions={modalPackageNameOptions}
          currencyOptions={modalCurrencyOptions}
          submitting={submitting}
          error={modalError}
        />
      )}
    </div>
  );
}
