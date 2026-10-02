import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'seller') {
        navigate('/seller/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(redirect);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md mb-3">
            AD
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Welcome to ADVERSE</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-2 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" /> One-Click Demo Credentials
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@adverse.in', 'Admin@123')}
              className="py-1.5 px-2 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors text-center"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('seller@bengalmedia.com', 'Seller@123')}
              className="py-1.5 px-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors text-center"
            >
              🏢 Seller
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('client@brands.com', 'Client@123')}
              className="py-1.5 px-2 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors text-center"
            >
              🛍️ Client
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm outline-none text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
