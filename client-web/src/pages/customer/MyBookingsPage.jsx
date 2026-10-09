import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import MountingTracker from '../../components/MountingTracker';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  // Pay Modal State
  const [payModalBooking, setPayModalBooking] = useState(null);
  const [paymentMode, setPaymentMode] = useState('online_upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [bankName, setBankName] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/bookings');
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setPayError('');
    setPayLoading(true);

    try {
      const res = await api.post(`/bookings/${payModalBooking._id}/pay`, {
        paymentMode,
        transactionReference: transactionRef || `UPI-${Date.now()}`,
        bankName: bankName || (paymentMode.startsWith('online') ? 'Online Gateway' : 'State Bank of India')
      });

      if (res.data.success) {
        setPayModalBooking(null);
        setTransactionRef('');
        setBankName('');
        fetchBookings(true);
      }
    } catch (err) {
      setPayError(err.response?.data?.message || 'Failed to complete payment.');
    } finally {
      setPayLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
            Waiting for Seller Approval
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            Approved • Payment Available
          </span>
        );
      case 'mounting_window':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-700" />
            3-Day Mounting Window Active
          </span>
        );
      case 'verification_pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1.5 animate-pulse">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            4-Hour Verification Window
          </span>
        );
      case 'active':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Subscription Active
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
            Completed (Campaign Expired)
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-100 text-rose-900 border border-rose-200">
            Cancelled
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-100 text-rose-900 border border-rose-200">
            Rejected by Seller
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Advertiser Portal
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">Live Campaigns & Reservations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <Bookmark className="w-7 h-7 text-emerald-600" />
              My Hoarding Bookings ({bookings.length})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track seller approvals, pay for approved slots, monitor the 3-day mounting window, and verify installations.
            </p>
          </div>

          <button
            onClick={() => fetchBookings(true)}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-xs transition self-start sm:self-auto"
            title="Refresh Bookings"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold text-slate-600">Loading your reservations...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-black text-slate-900">No Hoarding Bookings Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven't requested any hoarding sites yet. Search the marketplace to reserve prime billboard inventory.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((b) => {
              const isApproved = b.bookingStatus === 'approved';
              const isRequested = b.bookingStatus === 'requested';
              const isCompleted = b.bookingStatus === 'completed';
              const isMountingOrLater = ['mounting_window', 'verification_pending', 'active', 'confirmed', 'completed'].includes(b.bookingStatus);
              const isExpanded = expandedBookingId === b._id || isMountingOrLater || isApproved;

              return (
                <div
                  key={b._id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition"
                >
                  {/* Top Summary Card */}
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Hoarding Info */}
                      <div className="flex items-start gap-4">
                        <img
                          src={
                            b.hoardingId?.photos?.[0] ||
                            'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={b.hoardingId?.title}
                          className="w-20 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              #{b.bookingNumber}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-500">
                              {b.campaignName || 'Brand Awareness Campaign'}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                            {b.hoardingId?.title || 'Hoarding Space'}
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                              {b.hoardingId?.location?.city || 'Kolkata'}
                            </span>
                            <span>•</span>
                            <span>{b.durationDays} Days</span>
                            <span>•</span>
                            <span>
                              {new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} —{' '}
                              {new Date(b.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Status Badge & Actions */}
                      <div className="flex flex-col lg:items-end justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Amount</span>
                            <div className="text-xl font-black text-slate-900">
                              ₹{b.totalAmount?.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div>{getStatusBadge(b.bookingStatus)}</div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {/* PAY NOW BUTTON (Available ONLY after seller approves) */}
                          {isApproved && (
                            <button
                              onClick={() => {
                                setPayModalBooking(b);
                                setPayError('');
                              }}
                              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 animate-pulse"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Pay Now (₹{b.totalAmount?.toLocaleString('en-IN')})</span>
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setExpandedBookingId(expandedBookingId === b._id ? null : b._id)
                            }
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                          >
                            <span>Details</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Explanatory banner for requested status */}
                    {isRequested && (
                      <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Waiting for Seller Approval:</strong> The media owner ({b.sellerId?.companyDetails?.companyName || b.sellerId?.name || 'Seller'}) has been notified. The payment option will be enabled immediately once they approve your slot.
                        </span>
                      </div>
                    )}

                    {/* Explanatory banner for completed status */}
                    {isCompleted && (
                      <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>
                          <strong>Campaign Completed:</strong> This billboard campaign subscription has run its full duration and expired. The hoarding site is now released and open for new bookings.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Section (Mounting Tracker, Timeline, Specs) */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
                      {/* MOUNTING TRACKER (Visible during mounting window, verification, or active) */}
                      {isMountingOrLater && (
                        <div>
                          <MountingTracker
                            booking={b}
                            userRole="customer"
                            onUpdate={() => fetchBookings(true)}
                          />
                        </div>
                      )}

                      {/* Payment Confirmation Details */}
                      {b.paymentConfirmation?.paidAt && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                              ✓
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                Payment Received & Verified
                              </div>
                              <p className="text-slate-500 text-[11px] mt-0.5">
                                Mode: {b.paymentConfirmation.paymentMode?.toUpperCase()} • Ref: {b.paymentConfirmation.transactionReference || 'N/A'} • Paid on {new Date(b.paymentConfirmation.paidAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200">
                            Confirmed to Seller & Admin
                          </span>
                        </div>
                      )}

                      {/* Timeline Audit Trail */}
                      {b.timeline && b.timeline.length > 0 && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Booking Activity Timeline
                          </h4>
                          <div className="space-y-3 pl-2 border-l-2 border-indigo-100">
                            {b.timeline.slice().reverse().map((t, idx) => (
                              <div key={idx} className="relative pl-4 text-xs">
                                <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs"></div>
                                <div className="font-bold text-slate-900">{t.title}</div>
                                <div className="text-slate-500 mt-0.5 text-[11px]">{t.description}</div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                  {new Date(t.timestamp).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* PAY NOW MODAL (ONLINE & OFFLINE OPTIONS) */}
      {/* ============================================================== */}
      {payModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPayModalBooking(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800">
                Payment Desk
              </span>
              <span className="text-xs text-slate-400">• Booking Approved</span>
            </div>

            <h3 className="text-xl font-black text-slate-900">
              Pay for #{payModalBooking.bookingNumber}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-5">
              Upon completing payment, confirmation will be dispatched to the site owner and admin, and the <strong>3-Day Mounting Window</strong> will begin immediately.
            </p>

            {payError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            {/* Total Amount Callout */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between mb-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Amount Payable</span>
                <span className="text-2xl font-black text-emerald-900">
                  ₹{payModalBooking.totalAmount?.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-white text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 shadow-2xs">
                {payModalBooking.durationDays} Days Campaign
              </span>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Payment Mode *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('online_upi')}
                    className={`p-3 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      paymentMode === 'online_upi'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>⚡ Instant UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('online_card')}
                    className={`p-3 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      paymentMode === 'online_card'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>💳 Credit/Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('neft_rtgs_upi')}
                    className={`p-3 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      paymentMode === 'neft_rtgs_upi'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>🏦 Bank NEFT / RTGS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('cheque')}
                    className={`p-3 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      paymentMode === 'cheque'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>📄 Bank Cheque</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transaction Reference / Cheque UTR Number (Optional for test simulation)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/2026/0928192 or Cheque #49281"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalBooking(null)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {payLoading ? 'Processing...' : `Confirm & Pay ₹${payModalBooking.totalAmount?.toLocaleString('en-IN')}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
