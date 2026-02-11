import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CreditCard, Check, X, Star, Crown, Zap } from 'lucide-react';
import { pricingService } from '../services/api';

/* ========== Sub-Components ========== */

const PlanBadge = ({ type }) => {
  if (type === 'popular') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Crown className="w-3 h-3 mr-1.5" /> Most Popular
      </span>
    );
  }
  if (type === 'highlighted') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
        <Star className="w-3 h-3 mr-1.5" /> Featured
      </span>
    );
  }
  return null;
};

const PlanCard = ({ plan, onEdit, onDelete }) => {
  const isPopular = plan.isPopular;
  const isHighlighted = plan.isHighlighted;

  return (
    <div className={`rounded-2xl border backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group relative overflow-hidden ${isPopular
        ? 'bg-gradient-to-b from-amber-500/5 to-slate-800/30 border-amber-500/30 shadow-lg shadow-amber-500/5'
        : isHighlighted
          ? 'bg-gradient-to-b from-indigo-500/5 to-slate-800/30 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
          : 'bg-slate-800/30 border-slate-700/40 hover:border-slate-600/40'
      }`}>
      {/* Gradient top strip */}
      {(isPopular || isHighlighted) && (
        <div className={`h-0.5 bg-gradient-to-r ${isPopular ? 'from-amber-400 to-orange-500' : 'from-indigo-500 to-violet-500'
          }`} />
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="text-sm text-slate-400 mt-1">{plan.description || 'Subscription plan'}</p>
          </div>
          <PlanBadge type={isPopular ? 'popular' : isHighlighted ? 'highlighted' : null} />
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-white">₹{plan.price}</span>
            <span className="text-sm text-slate-500 ml-2">
              / {plan.billingCycle || 'month'}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {plan.features?.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className={`p-0.5 rounded-full mt-0.5 ${isPopular ? 'text-amber-400' : 'text-indigo-400'
                }`}>
                <Check className="h-4 w-4" />
              </div>
              <span className="text-sm text-slate-300">{feature}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-4 border-t border-slate-700/30">
          <button
            onClick={() => onEdit(plan)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-colors"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={() => onDelete(plan._id)}
            className="flex items-center justify-center p-2.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========== Plan Form Modal ========== */

const PlanFormModal = ({ formData, setFormData, onSubmit, onClose, isEditing }) => {
  const addFeature = () => {
    setFormData({ ...formData, features: [...(formData.features || []), ''] });
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/40 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Plan' : 'Add New Plan'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark"
              placeholder="e.g. Professional Plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-dark min-h-[80px] resize-y"
              placeholder="Brief plan description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Price (₹)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input-dark"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Billing Cycle</label>
              <select
                value={formData.billingCycle || 'monthly'}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                className="input-dark"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">Features</label>
              <button
                onClick={addFeature}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Feature
              </button>
            </div>
            <div className="space-y-2">
              {formData.features?.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="input-dark flex-1"
                    placeholder={`Feature ${index + 1}`}
                  />
                  <button
                    onClick={() => removeFeature(index)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.isPopular || false}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Popular</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.isHighlighted || false}
                onChange={(e) => setFormData({ ...formData, isHighlighted: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Highlighted</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700/40 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSubmit} className="btn-gradient">{isEditing ? 'Update Plan' : 'Add Plan'}</button>
        </div>
      </div>
    </div>
  );
};

/* ========== Main Pricing Component ========== */

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', billingCycle: 'monthly', features: [''], isPopular: false, isHighlighted: false
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await pricingService.getPlans();
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const cleanData = {
        ...formData,
        features: formData.features.filter(f => f.trim() !== ''),
        price: Number(formData.price)
      };

      if (editingPlan) {
        await pricingService.updatePlan(editingPlan._id, cleanData);
      } else {
        await pricingService.createPlan(cleanData);
      }
      setShowModal(false);
      setEditingPlan(null);
      setFormData({ name: '', description: '', price: '', billingCycle: 'monthly', features: [''], isPopular: false, isHighlighted: false });
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      billingCycle: plan.billingCycle || 'monthly',
      features: plan.features || [''],
      isPopular: plan.isPopular || false,
      isHighlighted: plan.isHighlighted || false
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await pricingService.deletePlan(id);
        loadPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
      }
    }
  };

  const openNewModal = () => {
    setEditingPlan(null);
    setFormData({ name: '', description: '', price: '', billingCycle: 'monthly', features: [''], isPopular: false, isHighlighted: false });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <CreditCard className="h-5 w-5 text-amber-400" />
            </div>
            Pricing Plans
          </h1>
          <p className="text-slate-400 mt-1 ml-12">{plans.length} plans configured</p>
        </div>
        <button onClick={openNewModal} className="btn-gradient mt-4 sm:mt-0 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <CreditCard className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No pricing plans</p>
          <p className="text-slate-600 text-sm mt-1">Create your first subscription plan</p>
          <button onClick={openNewModal} className="btn-gradient mt-4">
            <Plus className="h-4 w-4 mr-2 inline" /> Add Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <PlanCard key={plan._id} plan={plan} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PlanFormModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => { setShowModal(false); setEditingPlan(null); }}
          isEditing={!!editingPlan}
        />
      )}
    </div>
  );
}