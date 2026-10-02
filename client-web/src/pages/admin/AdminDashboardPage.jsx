import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/admin/metrics');
        setMetrics(res.data.metrics);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Admin Console...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Super Admin Platform Governance</h1>
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Hoardings</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.hoardings.total}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Active Bookings</span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">{metrics.bookings.active}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Verified Revenue</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{metrics.financials.totalVerifiedRevenueINR.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Registered Users</span>
              <div className="text-2xl font-extrabold text-purple-600 mt-1">{metrics.users.total}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
