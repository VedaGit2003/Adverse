import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, Building, AlertCircle } from 'lucide-react';
import GoogleSSOModal, { GoogleLogo } from '../components/GoogleSSOModal';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get('role') === 'seller' ? 'seller' : 'customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSSOModal, setShowSSOModal] = useState(false);

  const { register, ssoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register({
        name,
        email,
        phone,
        password,
        role,
        companyDetails: { companyName }
      });
      if (user.role === 'seller') navigate('/seller/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSSOAccountSelected = async (ssoPayload) => {
    setError('');
    setLoading(true);
    try {
      // Ensure the selected role and company name from the register page are passed
      const finalPayload = {
        ...ssoPayload,
        role: ssoPayload.role || role,
        companyDetails: (ssoPayload.role || role) === 'seller'
          ? (ssoPayload.companyDetails || { companyName: companyName || ssoPayload.name })
          : undefined
      };

      const user = await ssoLogin(finalPayload);
      setShowSSOModal(false);
      if (user.role === 'seller') navigate('/seller/dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Google Single Sign-On failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md mb-3">
            AD
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Create an Account</h2>
          <p className="text-xs text-slate-500 mt-1">Join West Bengal's digital hoarding network</p>
        </div>

        {/* Role Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              role === 'customer' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'
            }`}
          >
            Advertiser (Customer)
          </button>
          <button
            type="button"
            onClick={() => setRole('seller')}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              role === 'seller' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'
            }`}
          >
            Hoarding Owner (Seller)
          </button>
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={() => setShowSSOModal(true)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-bold text-sm rounded-xl border border-slate-300 shadow-sm hover:shadow transition-all mb-4"
        >
          <GoogleLogo className="w-5 h-5 shrink-0" />
          Sign up with Google as {role === 'seller' ? 'Seller' : 'Advertiser'}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-white px-2.5 text-slate-400 font-bold">Or register with email</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="Subhashish Das"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="das@kolkatamedia.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              placeholder="9830012345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {role === 'seller' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Agency Name</label>
              <input
                type="text"
                placeholder="Bengal Media LLP"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all mt-4 disabled:opacity-50"
          >
            Register as {role === 'seller' ? 'Hoarding Owner' : 'Advertiser'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:underline">
            Sign In here
          </Link>
        </div>
      </div>

      <GoogleSSOModal
        isOpen={showSSOModal}
        onClose={() => setShowSSOModal(false)}
        onSelectAccount={handleSSOAccountSelected}
        defaultRole={role}
      />
    </div>
  );
}
