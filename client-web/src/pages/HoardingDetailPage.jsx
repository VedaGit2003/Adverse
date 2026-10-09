import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Zap, Calendar, ShieldCheck, CheckCircle2,
  Building2, AlertCircle, ArrowLeft, CreditCard, ExternalLink
} from 'lucide-react';

export default function HoardingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [hoarding, setHoarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [includePrinting, setIncludePrinting] = useState(false);
  const [includeMounting, setIncludeMounting] = useState(false);
  const [paymentMode, setPaymentMode] = useState('neft_rtgs_upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [bankName, setBankName] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/hoardings/${id}`);
        setHoarding(res.data.hoarding);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStartDate(tomorrow.toISOString().split('T')[0]);

        const nextMonth = new Date(tomorrow);
        nextMonth.setDate(nextMonth.getDate() + 30);
        setEndDate(nextMonth.toISOString().split('T')[0]);
      } catch (err) {
        console.error('Failed to load:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  let durationDays = 0;
  let rentTotal = 0;
  let printTotal = 0;
  let mountTotal = 0;
  let grandTotal = 0;

  if (hoarding && startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e > s) {
      durationDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
      const dailyRate = hoarding.pricing.baseRatePerDay || Math.round(hoarding.pricing.baseRatePerMonth / 30);
      rentTotal = dailyRate * durationDays;
      printTotal = includePrinting ? (hoarding.pricing.printingCostEstimate || 0) : 0;
      mountTotal = includeMounting ? (hoarding.pricing.mountingCostEstimate || 0) : 0;
      grandTotal = rentTotal + printTotal + mountTotal;
    }
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (durationDays < (hoarding.pricing.minimumBookingDays || 1)) {
      setBookingError(`Minimum booking duration is ${hoarding.pricing.minimumBookingDays} days.`);
      return;
    }

    setBookingLoading(true);
    try {
      const payload = {
        hoardingId: hoarding._id,
        startDate,
        endDate,
        bookingType: 'online',
        campaignName,
        clientNotes,
        includePrinting,
        includeMounting
      };

      const res = await api.post('/bookings', payload);
      setBookingSuccess(res.data.booking);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to submit booking request.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hoarding) return null;

  const photos = hoarding.photos && hoarding.photos.length > 0
    ? hoarding.photos
    : ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/search" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Search Results
        </Link>

        {bookingSuccess ? (
          <div className="bg-white rounded-3xl p-8 max-w-2xl mx-auto border border-emerald-200 shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Booking Request Placed!</h2>
            <p className="text-sm text-slate-600 mt-2">
              Booking Reference: <strong className="text-slate-900 font-mono">#{bookingSuccess.bookingNumber}</strong>
            </p>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left text-xs text-slate-600 space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span>Duration:</span>
                <strong className="text-slate-900">{bookingSuccess.durationDays} Days</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <strong className="text-slate-900">₹{bookingSuccess.totalAmount.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <strong className="text-amber-700 font-bold uppercase">Requested (Awaiting Seller Approval)</strong>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              The media owner has been notified. As soon as they review and approve your request, the <strong>Pay Now</strong> option will be unlocked in your <strong>My Bookings</strong> dashboard.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Link to="/my-bookings" className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl">
                Go to My Bookings
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="relative aspect-[16/9] bg-slate-900">
                  <img src={photos[activePhoto]} alt="" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  <span>{hoarding.location.city} • {hoarding.location.district || 'West Bengal'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{hoarding.title}</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{hoarding.description || hoarding.location.address}</p>

                {/* Google Maps Location Redirect Box */}
                <div className="mt-4 p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px] block">
                      Physical Hoarding Location
                    </span>
                    <p className="text-slate-800 font-semibold mt-0.5">{hoarding.location?.address}</p>
                    {hoarding.location?.landmark && (
                      <p className="text-slate-500 text-[11px] mt-0.5">Landmark: {hoarding.location.landmark}</p>
                    )}
                  </div>
                  <a
                    href={
                      hoarding.location?.googleMapsUrl ||
                      (hoarding.location?.geo?.coordinates?.length === 2
                        ? `https://www.google.com/maps?q=${hoarding.location.geo.coordinates[1]},${hoarding.location.geo.coordinates[0]}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hoarding.title}, ${hoarding.location?.address || ''}, ${hoarding.location?.city || 'Kolkata'}`)}`)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Dimensions</span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {hoarding.dimensions.width} × {hoarding.dimensions.height} ft
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Illumination</span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block flex items-center gap-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      {hoarding.lightingType}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Min Booking</span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-brand-600" />
                      {hoarding.pricing.minimumBookingDays || 15} Days
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Status</span>
                    <span className="text-base font-extrabold text-emerald-600 mt-0.5 block capitalize">
                      {hoarding.availabilityStatus}
                    </span>
                  </div>
                </div>

                {hoarding.sellerId && (
                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{hoarding.sellerId.name}</h4>
                        <p className="text-[11px] text-slate-500">Verified Site Owner</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-4 h-4" /> Adverse Verified
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xl sticky top-24">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Monthly Rental</span>
                    <div className="text-2xl font-extrabold text-slate-900">
                      ₹{hoarding.pricing.baseRatePerMonth.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {bookingError && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Start Date</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium" />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">End Date</label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium" />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block text-slate-600 font-semibold mb-1">Campaign Title (Optional)</label>
                    <input type="text" placeholder="e.g. Durga Puja Launch" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium" />
                  </div>

                  {/* Flow Guide Notice */}
                  <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-indigo-950">
                      <span>📌 Booking & Approval Journey:</span>
                    </div>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      1. Submit request ➔ 2. Site owner reviews & approves ➔ 3. Payment unlocks in your portal ➔ 4. 3-Day Mounting window begins!
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Duration:</span>
                      <strong className="text-slate-800">{durationDays} days</strong>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-extrabold text-slate-900">
                      <span>Estimated Total:</span>
                      <span className="text-brand-600">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading || durationDays <= 0}
                    className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>{bookingLoading ? 'Submitting...' : 'Submit Booking Request for Approval'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
