import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Clock, AlertCircle } from 'lucide-react';

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [hoardings, setHoardings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [title, setTitle] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [city, setCity] = useState('Kolkata');
  const [address, setAddress] = useState('');
  const [baseRatePerMonth, setBaseRatePerMonth] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hRes, bRes, pRes] = await Promise.all([
        api.get('/hoardings/my-sites'),
        api.get('/bookings'),
        api.get('/payments')
      ]);
      setHoardings(hRes.data.hoardings || []);
      setBookings(bRes.data.bookings || []);
      setPayments(pRes.data.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddHoarding = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await api.post('/hoardings', {
        title,
        dimensions: { width: Number(width), height: Number(height) },
        location: { address, city },
        pricing: { baseRatePerMonth: Number(baseRatePerMonth) },
        photos: ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80']
      });
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to enlist.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    try {
      await api.put(`/payments/${paymentId}/verify`, {
        verificationNotes: 'Verified and confirmed by site owner'
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify payment.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {user?.companyDetails?.companyName || user?.name} Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your West Bengal hoarding inventory and verify offline cheques
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Enlist New Hoarding
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase">My Hoardings</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{hoardings.length}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase">Bookings</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{bookings.length}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase">Pending Payments</span>
            <div className="text-2xl font-extrabold text-amber-500 mt-1">
              {payments.filter(p => p.paymentStatus === 'pending').length}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase">Verified Earnings</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              ₹{payments.filter(p => p.paymentStatus === 'verified').reduce((acc, p) => acc + p.amount, 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Offline Cheque / NEFT Verification Desk
          </h2>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Mode</th>
                  <th className="pb-3">Reference #</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80">
                    <td className="py-3 font-bold">{p.customerId?.name}</td>
                    <td className="py-3 font-extrabold">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 capitalize">{p.paymentMode.replace(/_/g, ' ')}</td>
                    <td className="py-3 font-mono">{p.offlineDetails?.transactionReference || 'N/A'}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {p.paymentStatus === 'pending' && (
                        <button
                          onClick={() => handleVerifyPayment(p._id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                        >
                          Verify & Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200">
              <h3 className="text-lg font-bold mb-4">Enlist Hoarding</h3>
              {formError && <p className="text-rose-600 text-xs mb-2">{formError}</p>}
              <form onSubmit={handleAddHoarding} className="space-y-3 text-xs">
                <input type="text" required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 rounded-lg" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" required placeholder="Width ft" value={width} onChange={(e) => setWidth(e.target.value)} className="border p-2 rounded-lg" />
                  <input type="number" required placeholder="Height ft" value={height} onChange={(e) => setHeight(e.target.value)} className="border p-2 rounded-lg" />
                </div>
                <input type="text" required placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border p-2 rounded-lg" />
                <input type="number" required placeholder="Monthly Rent" value={baseRatePerMonth} onChange={(e) => setBaseRatePerMonth(e.target.value)} className="w-full border p-2 rounded-lg" />
                <div className="flex gap-2 justify-end pt-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" disabled={formLoading} className="px-4 py-2 bg-brand-600 text-white rounded-lg">Publish</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
