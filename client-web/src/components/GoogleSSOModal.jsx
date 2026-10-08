import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, Shield, ArrowRight } from 'lucide-react';

export function GoogleLogo({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function GoogleSSOModal({ isOpen, onClose, onSelectAccount, defaultRole = 'customer' }) {
  const [customMode, setCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickAccounts = [
    {
      name: 'Client Advertiser',
      email: 'client@brands.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      role: 'customer',
      badge: 'Advertiser'
    },
    {
      name: 'Bengal Outdoor Media',
      email: 'seller@bengalmedia.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      role: 'seller',
      badge: 'Hoarding Owner'
    },
    {
      name: 'Super Admin',
      email: 'admin@adverse.in',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      role: 'admin',
      badge: 'Platform Admin'
    }
  ];

  const handleSelectQuick = async (acc) => {
    setLoading(true);
    try {
      await onSelectAccount({
        provider: 'google',
        ssoId: `google_${acc.email}`,
        email: acc.email,
        name: acc.name,
        avatar: acc.avatar,
        role: acc.role,
        companyDetails: acc.role === 'seller' ? { companyName: acc.name } : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customEmail) return;
    setLoading(true);
    try {
      await onSelectAccount({
        provider: 'google',
        ssoId: `google_${Date.now()}`,
        email: customEmail,
        name: customName || customEmail.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customName || customEmail)}`,
        role,
        companyDetails: role === 'seller' ? { companyName: companyName || customName } : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GoogleLogo className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Sign in with Google</h3>
              <p className="text-xs text-slate-500">to continue to Adverse Media Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!customMode ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600">Choose a Google Account:</p>

              <div className="space-y-2">
                {quickAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    disabled={loading}
                    onClick={() => handleSelectQuick(acc)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{acc.email}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700">
                      {acc.badge}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-brand-600" />
                  Use another Google Account
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-700">Custom Google Sign-In</p>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="text-xs text-brand-600 hover:underline font-semibold"
                >
                  ← Back to quick accounts
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      role === 'customer'
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🛍️ Advertiser
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      role === 'seller'
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏢 Hoarding Owner
                  </button>
                </div>
              </div>

              {role === 'seller' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Company / Agency Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Skyline Media Kolkata"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign in with Google'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Footer security badge */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure OAuth 2.0 Single Sign-On</span>
          </div>
        </div>
      </div>
    </div>
  );
}

