import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, LayoutDashboard, PlusCircle, Bookmark, ShieldCheck, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout, isAdmin, isSeller, isCustomer } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-xl tracking-tight">AD</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">ADVERSE</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  WB OOH
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">West Bengal Hoarding Network</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/search" className="text-sm font-semibold text-slate-700 hover:text-brand-600 flex items-center gap-1.5 transition-colors">
              <MapPin className="w-4 h-4 text-brand-600" />
              Find Hoardings
            </Link>

            {isAuthenticated && isCustomer && (
              <Link to="/my-bookings" className="text-sm font-semibold text-slate-700 hover:text-brand-600 flex items-center gap-1.5 transition-colors">
                <Bookmark className="w-4 h-4 text-emerald-600" />
                My Bookings & Receipts
              </Link>
            )}

            {isAuthenticated && isSeller && (
              <Link to="/seller/dashboard" className="text-sm font-semibold text-slate-700 hover:text-brand-600 flex items-center gap-1.5 transition-colors">
                <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                Seller Portal
              </Link>
            )}

            {isAuthenticated && isAdmin && (
              <Link to="/admin/dashboard" className="text-sm font-semibold text-slate-700 hover:text-brand-600 flex items-center gap-1.5 transition-colors">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Admin Panel
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-bold text-slate-800 leading-tight">{user.name}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">
                    {user.role === 'admin' ? 'Super Admin' : user.role === 'seller' ? 'Site Owner' : 'Advertiser'}
                  </span>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-brand-600 transition-colors">
                  Log In
                </Link>
                <Link to="/register?role=seller" className="px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  List Hoarding
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
