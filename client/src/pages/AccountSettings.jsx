import React, { useEffect, useState } from 'react';
import { Mail, Save, Shield, User } from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AccountSettings() {
  const { user, updateUser, setAuthToken } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'admin');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await authService.getMe();
        if (res.data?.success) {
          const admin = res.data.user;
          setName(admin.name || '');
          setEmail(admin.email || '');
          setRole(admin.role || 'admin');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load account profile.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await authService.updateProfile({
        name: name.trim(),
        email: email.trim()
      });

      if (res.data?.success) {
        if (res.data.token) {
          setAuthToken(res.data.token);
        }
        if (res.data.user) {
          updateUser(res.data.user);
          setRole(res.data.user.role || role);
        }
        setSuccess('Account settings updated successfully.');
      } else {
        setError('Failed to update account settings.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update account settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        <p className="text-slate-400 mt-1">Update your admin profile details.</p>
      </div>

      <div className="card-dark p-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Full Name</label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-dark pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-dark pl-10"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Role</label>
                <div className="input-dark flex items-center gap-2 text-slate-300 bg-slate-800/40">
                  <Shield className="h-4 w-4 text-indigo-400" />
                  <span className="capitalize">{role || 'admin'}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
