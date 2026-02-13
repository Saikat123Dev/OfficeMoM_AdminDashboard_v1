import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ChevronDown, ChevronUp, HelpCircle, X, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { faqsService } from '../services/api';
import CreatableSelect from '../components/CreatableSelect';

/* ========== Sub-Components ========== */

const CategoryBadge = ({ category }) => {
  const colors = {
    General: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    Technical: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    Billing: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Account: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    default: 'bg-slate-700/50 text-slate-400 border-slate-600/30'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[category] || colors.default}`}>
      <Tag className="w-3 h-3 mr-1.5" />
      {category}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${isActive
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
      : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
      }`}>
      {isActive ? <CheckCircle className="w-3 h-3 mr-1.5" /> : <AlertCircle className="w-3 h-3 mr-1.5" />}
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

const normalizeStatus = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return 'active';
  return 'inactive';
};

/* ========== FAQ Accordion Item ========== */

const FAQAccordionItem = ({ faq, expanded, onToggle, onEdit, onDelete }) => (
  <div className={`rounded-xl border transition-all duration-200 ${expanded ? 'bg-slate-800/40 border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'bg-slate-800/20 border-slate-700/40 hover:border-slate-600/50'
    }`}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 text-left"
    >
      <div className="flex-1 pr-4">
        <h3 className={`text-sm font-medium ${expanded ? 'text-indigo-300' : 'text-white'} transition-colors`}>
          {faq.question}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <CategoryBadge category={faq.category} />
          <StatusBadge status={faq.status} />
        </div>
      </div>
      <div className={`p-1 rounded-lg transition-all duration-200 ${expanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500'}`}>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </button>

    {expanded && (
      <div className="px-5 pb-4 animate-fade-in">
        <div className="pt-3 border-t border-slate-700/40">
          <p className="text-sm text-slate-300 leading-relaxed">{faq.answer}</p>
          <div className="flex items-center space-x-2 mt-4">
            <button
              onClick={() => onEdit(faq)}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <Edit className="h-3 w-3 mr-1.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(faq.id)}
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

/* ========== FAQ Form Modal ========== */

const FAQFormModal = ({ formData, setFormData, onSubmit, onClose, isEditing, categoryOptions, needForOptions, submitting, error }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-lg animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/40">
        <h2 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit FAQ' : 'Add New FAQ'}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <div className="p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Question</label>
          <input
            type="text"
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            className="input-dark"
            placeholder="Enter the question..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Answer</label>
          <textarea
            value={formData.answer}
            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
            className="input-dark min-h-[120px] resize-y"
            placeholder="Enter the answer..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <CreatableSelect
              label="Category"
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: val })}
              options={categoryOptions}
              placeholder="Select or type category..."
            />
          </div>
          <div>
            <CreatableSelect
              label="Need For"
              value={formData.need_for}
              onChange={(val) => setFormData({ ...formData, need_for: val })}
              options={needForOptions}
              placeholder="Select or type user need..."
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

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700/40">
        <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="btn-gradient disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : (isEditing ? 'Update FAQ' : 'Add FAQ')}
        </button>
      </div>
    </div>
  </div>
);

/* ========== Main FAQs Component ========== */

export default function FAQs() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [pageError, setPageError] = useState('');
  const [modalError, setModalError] = useState('');
  const [faqOptions, setFaqOptions] = useState({ categories: [], need_for: [] });
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    need_for: '',
    display_order: 0,
    status: 'active'
  });

  const defaultCategories = ['General', 'Technical', 'Billing', 'Account'];
  const defaultNeedForOptions = ['mainPage', 'dashboard', 'help', 'pricing', 'account', 'support'];

  const categoriesList = ['All', ...new Set([ ...faqOptions.categories, ...faqs.map(f => f.category).filter(Boolean)])];
  const modalCategoryOptions = [...new Set([ ...faqOptions.categories])];
  const modalNeedForOptions = [...new Set([ ...faqOptions.need_for])];

  useEffect(() => {
    loadFaqs();
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const response = await faqsService.getOptions();
      if (response.data?.success) {
        setFaqOptions({
          categories: response.data.categories || [],
          need_for: response.data.need_for || []
        });
      }
    } catch (error) {
      console.error('Error loading FAQ options:', error);
    }
  };

  const loadFaqs = async () => {
    try {
      setLoading(true);
      setPageError('');
      const response = await faqsService.getFaqs();
      const rawFaqs = Array.isArray(response.data) ? response.data : (response.data?.faqs || []);
      const mappedFaqs = rawFaqs.map(f => ({
        ...f,
        need_for: f.need_for || 'mainPage',
        display_order: Number.isFinite(Number(f.display_order)) ? Number(f.display_order) : 0,
        status: normalizeStatus(f.is_active)
      }));
      setFaqs(mappedFaqs);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      setPageError(error.response?.data?.error || 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const question = formData.question.trim();
    const answer = formData.answer.trim();
    const category = formData.category.trim();
    const needFor = formData.need_for.trim();
    const displayOrder = Number.isFinite(Number(formData.display_order)) ? Number(formData.display_order) : 0;

    if (!question || !answer || !category) {
      setModalError('Question, Answer, and Category are required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      const payload = {
        question,
        answer,
        category,
        need_for: needFor || 'mainPage',
        display_order: displayOrder,
        is_active: formData.status === 'active'
      };

      if (editingFaq) {
        await faqsService.updateFaq(editingFaq.id, payload);
      } else {
        await faqsService.createFaq(payload);
      }
      setShowModal(false);
      setEditingFaq(null);
      setFormData({
        question: '',
        answer: '',
        category: '',
        need_for: '',
        display_order: 0,
        status: 'active'
      });
      await Promise.all([loadFaqs(), loadOptions()]);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      setModalError(error.response?.data?.error || 'Failed to save FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (faq) => {
    setEditingFaq(faq);
    setModalError('');
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'General',
      need_for: faq.need_for || 'mainPage',
      display_order: Number.isFinite(Number(faq.display_order)) ? Number(faq.display_order) : 0,
      status: faq.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await faqsService.deleteFaq(id);
        await loadFaqs();
      } catch (error) {
        console.error('Error deleting FAQ:', error);
        setPageError(error.response?.data?.error || 'Failed to delete FAQ');
      }
    }
  };

  const openNewModal = () => {
    setEditingFaq(null);
    setModalError('');
    setFormData({
      question: '',
      answer: '',
      category: '',
      need_for: '',
      display_order: 0,
      status: 'active'
    });
    setShowModal(true);
  };

  const filteredFaqs = faqs
    .filter(faq => selectedCategory === 'All' || faq.category === selectedCategory)
    .filter(faq => faq.question.toLowerCase().includes(search.toLowerCase()) || faq.answer.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <HelpCircle className="h-5 w-5 text-violet-400" />
            </div>
            FAQs Management
          </h1>
          <p className="text-slate-400 mt-1 ml-12">{filteredFaqs.length} questions</p>
        </div>
        <button onClick={openNewModal} className="btn-gradient mt-4 sm:mt-0 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add FAQ
        </button>
      </div>

      {/* Search & Categories */}
      <div className="card-dark p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categoriesList.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${selectedCategory === category
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                : 'bg-slate-800/30 text-slate-400 border-slate-700/40 hover:text-white hover:border-slate-600/50'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : pageError ? (
        <div className="card-dark p-12 text-center">
          <p className="text-red-300 text-base font-medium">{pageError}</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <HelpCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No FAQs found</p>
          <p className="text-slate-600 text-sm mt-1">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFaqs.map((faq) => (
            <FAQAccordionItem
              key={faq.id}
              faq={faq}
              expanded={expandedId === faq.id}
              onToggle={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <FAQFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => { setShowModal(false); setEditingFaq(null); setModalError(''); }}
          isEditing={!!editingFaq}
          categoryOptions={modalCategoryOptions}
          needForOptions={modalNeedForOptions}
          submitting={submitting}
          error={modalError}
        />
      )}
    </div>
  );
}
