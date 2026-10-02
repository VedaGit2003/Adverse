import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Bookmark, Calendar, CheckCircle2, Clock } from 'lucide-react';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get('/bookings');
        setBookings(res.data.bookings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-emerald-600" />
          My Hoarding Bookings
        </h1>

        {loading ? (
          <p>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="text-slate-500">No bookings found.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b._id} className="bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400">#{b.bookingNumber}</span>
                  <h3 className="font-bold text-slate-900 text-base">{b.hoardingId?.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{b.durationDays} days • {b.hoardingId?.location?.city}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900">₹{b.totalAmount.toLocaleString('en-IN')}</div>
                  <span className="text-xs font-bold text-emerald-600 capitalize">{b.paymentStatus}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
