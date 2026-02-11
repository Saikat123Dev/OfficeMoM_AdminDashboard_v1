import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Shield, Building2, Users, CreditCard, HelpCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  const features = [
    { icon: Users, title: 'User Management', description: 'Manage all user accounts and permissions' },
    { icon: CreditCard, title: 'Pricing Plans', description: 'Configure subscription plans and pricing' },
    { icon: HelpCircle, title: 'FAQ System', description: 'Manage help content and support materials' },
    { icon: Building2, title: 'Business Insights', description: 'Monitor key metrics and performance' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Authentication service unavailable. Please try again later.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  const FeatureIcon = features[activeFeature].icon;

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/8 rounded-full blur-[100px] animate-orb-1" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-600/8 rounded-full blur-[100px] animate-orb-2" />
        <div className="absolute top-2/3 left-1/2 w-72 h-72 bg-cyan-600/5 rounded-full blur-[80px] animate-orb-1 animation-delay-4000" />
      </div>

      {/* Left Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative z-10">
        <div className="mx-auto w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">OfficeMoM</h1>
                <p className="text-indigo-400 font-medium text-sm">Admin Console</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400">Sign in to access the administration dashboard</p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/40 p-8 animate-glow-pulse">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 animate-fade-in">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-red-300 text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="block w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-slate-600/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} OfficeMoM. All rights reserved.
              <br />
              Secure administrative access only.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel — Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900 border-l border-slate-800/40 relative z-10">
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="max-w-md">
            {/* Feature Display */}
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto mb-6 transform hover:scale-105 transition-transform duration-300">
                <FeatureIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {features[activeFeature].title}
              </h3>
              <p className="text-slate-400 text-lg">
                {features[activeFeature].description}
              </p>
            </div>

            {/* Feature Indicators */}
            <div className="flex justify-center space-x-2 mb-12">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === activeFeature
                      ? 'bg-indigo-500 w-8'
                      : 'bg-slate-700 hover:bg-slate-600 w-2'
                    }`}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '99.9%', label: 'Uptime', color: 'text-indigo-400' },
                { value: '256-bit', label: 'Encryption', color: 'text-emerald-400' },
                { value: '24/7', label: 'Monitoring', color: 'text-violet-400' },
                { value: 'SOC 2', label: 'Compliant', color: 'text-amber-400' },
              ].map((stat, index) => (
                <div key={index} className="text-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                  <div className={`text-xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Feature Toggle */}
      <div className="lg:hidden fixed bottom-6 right-6 z-20">
        <button
          onClick={() => setActiveFeature((prev) => (prev + 1) % features.length)}
          className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform"
        >
          <FeatureIcon className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
}