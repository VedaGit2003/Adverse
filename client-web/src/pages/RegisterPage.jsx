import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, Building, UserPlus, AlertCircle } from 'lucide-react';

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

  const { register } = useAuth();
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

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`flex-1 py-2.5 rounded-xl transition-all ${role === 'customer' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'}`}
          >
            Advertiser (Customer)
          </button>
          <button
            type="button"
            onClick={() => setRole('seller')}
            className={`flex-1 py-2.5 rounded-xl transition-all ${role === 'seller' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'}`}
          >
            Hoarding Owner (Seller)
          </button>
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
            <input type="text" required placeholder="Subhashish Das" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input type="email" required placeholder="das@kolkatamedia.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
            <input type="tel" required placeholder="9830012345" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
            <input type="text" placeholder="Bengal Media LLP" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all mt-4">
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
    </div>
  );
}
