import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Users,
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  X,
  CreditCard,
  Maximize2
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('hoardings'); // 'hoardings' | 'bookings' | 'users' | 'sellers'
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hoardings tab state
  const [hoardings, setHoardings] = useState([]);
  const [hoardingSearch, setHoardingSearch] = useState('');
  const [hoardingCityFilter, setHoardingCityFilter] = useState('');
  const [hoardingApprovalFilter, setHoardingApprovalFilter] = useState('');
  const [selectedHoardingModal, setSelectedHoardingModal] = useState(null);
  const [moderatingId, setModeratingId] = useState(null);

  // Bookings tab state
  const [bookings, setBookings] = useState([]);
  const [bookingFilterStatus, setBookingFilterStatus] = useState('active'); // default to active bookings
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState('all');

  // Users tab state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Sellers tab state
  const [sellers, setSellers] = useState([]);
  const [sellerSearch, setSellerSearch] = useState('');

  // Toast / notification
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [metricsRes, hoardingsRes, bookingsRes, usersRes, sellersRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/hoardings'),
        api.get('/admin/bookings'),
        api.get('/admin/users'),
        api.get('/admin/sellers')
      ]);

      setMetrics(metricsRes.data.metrics);
      setHoardings(hoardingsRes.data.hoardings || []);
      setBookings(bookingsRes.data.bookings || []);
      setUsers(usersRes.data.users || []);
      setSellers(sellersRes.data.sellers || []);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      showToast('Failed to load updated platform data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle Hoarding Moderation Toggle
  const handleModerateHoarding = async (hoardingId, currentApproved) => {
    setModeratingId(hoardingId);
    try {
      const targetState = !currentApproved;
      const res = await api.put(`/admin/hoardings/${hoardingId}/approve`, {
        isApproved: targetState
      });

      if (res.data.success) {
        setHoardings((prev) =>
          prev.map((h) => (h._id === hoardingId ? { ...h, isApprovedByAdmin: targetState } : h))
        );
        if (selectedHoardingModal && selectedHoardingModal._id === hoardingId) {
          setSelectedHoardingModal((prev) => ({ ...prev, isApprovedByAdmin: targetState }));
        }
        showToast(
          targetState
            ? 'Hoarding listing approved and now live on marketplace.'
            : 'Hoarding listing unapproved and hidden from public search.'
        );
        // Refresh metrics in background
        api.get('/admin/metrics').then((r) => setMetrics(r.data.metrics));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update hoarding moderation status.', 'error');
    } finally {
      setModeratingId(null);
    }
  };

  // Filtered Hoardings
  const filteredHoardings = hoardings.filter((h) => {
    const matchesSearch =
      !hoardingSearch ||
      h.title?.toLowerCase().includes(hoardingSearch.toLowerCase()) ||
      h.location?.address?.toLowerCase().includes(hoardingSearch.toLowerCase()) ||
      h.location?.city?.toLowerCase().includes(hoardingSearch.toLowerCase()) ||
      h.sellerId?.companyDetails?.companyName?.toLowerCase().includes(hoardingSearch.toLowerCase()) ||
      h.sellerId?.name?.toLowerCase().includes(hoardingSearch.toLowerCase());

    const matchesCity = !hoardingCityFilter || h.location?.city?.toLowerCase() === hoardingCityFilter.toLowerCase();

    const matchesApproval =
      !hoardingApprovalFilter ||
      (hoardingApprovalFilter === 'approved' && h.isApprovedByAdmin) ||
      (hoardingApprovalFilter === 'pending' && !h.isApprovedByAdmin);

    return matchesSearch && matchesCity && matchesApproval;
  });

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      !bookingSearch ||
      b.bookingNumber?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.campaignName?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.hoardingId?.title?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.customerId?.name?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.customerId?.companyDetails?.companyName?.toLowerCase().includes(bookingSearch.toLowerCase());

    const matchesStatus =
      bookingFilterStatus === 'all'
        ? true
        : bookingFilterStatus === 'active'
        ? ['active', 'confirmed'].includes(b.bookingStatus)
        : b.bookingStatus === bookingFilterStatus;

    const matchesPayment =
      bookingPaymentFilter === 'all' || b.paymentStatus === bookingPaymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Filtered Users (Customers)
  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.companyDetails?.companyName?.toLowerCase().includes(term)
    );
  });

  // Filtered Sellers
  const filteredSellers = sellers.filter((s) => {
    if (!sellerSearch) return true;
    const term = sellerSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.phone?.toLowerCase().includes(term) ||
      s.companyDetails?.companyName?.toLowerCase().includes(term) ||
      s.companyDetails?.gstNumber?.toLowerCase().includes(term)
    );
  });

  const activeBookingsCount = bookings.filter((b) => ['active', 'confirmed'].includes(b.bookingStatus)).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-semibold">Loading Admin Platform Governance Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold transition-all ${
            notification.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header & Quick Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                Super Admin Console
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">West Bengal Region</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Platform Governance & Administration
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Overview Bar */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Hoardings Card */}
            <div
              onClick={() => setActiveTab('hoardings')}
              className={`p-5 rounded-2xl border transition cursor-pointer ${
                activeTab === 'hoardings'
                  ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Hoardings</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {metrics.hoardings.total}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-500">
                <span className="text-emerald-600 font-semibold">{metrics.hoardings.approved} Live</span>
                <span>•</span>
                <span className="text-amber-600 font-semibold">{metrics.hoardings.pendingModeration} Pending</span>
              </div>
            </div>

            {/* Active Bookings Card */}
            <div
              onClick={() => setActiveTab('bookings')}
              className={`p-5 rounded-2xl border transition cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Bookings</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CalendarCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                {activeBookingsCount}
              </div>
              <div className="mt-2 text-xs font-medium text-slate-500">
                {metrics.bookings.total} lifetime bookings
              </div>
            </div>

            {/* Verified Revenue Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Revenue</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                ₹{metrics.financials?.totalVerifiedRevenueINR?.toLocaleString('en-IN') || 0}
              </div>
              <div className="mt-2 text-xs font-medium text-purple-700">Offline & Online verified</div>
            </div>

            {/* Users & Sellers */}
            <div
              onClick={() => setActiveTab('users')}
              className={`p-5 rounded-2xl border transition cursor-pointer ${
                activeTab === 'users' || activeTab === 'sellers'
                  ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Accounts</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {metrics.users.total}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-500">
                <span>{metrics.users.customers} Advertisers</span>
                <span>•</span>
                <span>{metrics.users.sellers} Media Owners</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation Pill Bar */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-1">
          <button
            onClick={() => setActiveTab('hoardings')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'hoardings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hoarding Listings</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'hoardings' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {hoardings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'bookings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Active & All Bookings</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'bookings' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activeBookingsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users (Advertisers)</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'users' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sellers')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'sellers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Sellers (Media Owners)</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'sellers' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {sellers.length}
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: HOARDING LISTINGS DETAILS */}
        {/* ============================================================== */}
        {activeTab === 'hoardings' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search hoardings by title, location, landmark, seller..."
                  value={hoardingSearch}
                  onChange={(e) => setHoardingSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={hoardingCityFilter}
                  onChange={(e) => setHoardingCityFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Cities</option>
                  <option value="Kolkata">Kolkata</option>
                  <option value="Howrah">Howrah</option>
                  <option value="Siliguri">Siliguri</option>
                  <option value="Durgapur">Durgapur</option>
                </select>

                <select
                  value={hoardingApprovalFilter}
                  onChange={(e) => setHoardingApprovalFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Moderation Status</option>
                  <option value="approved">Approved & Live</option>
                  <option value="pending">Pending Moderation</option>
                </select>
              </div>
            </div>

            {/* Hoardings Table / Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-3.5 px-4">Hoarding Site & Specs</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Pricing</th>
                      <th className="py-3.5 px-4">Media Owner (Seller)</th>
                      <th className="py-3.5 px-4 text-center">Active Bookings</th>
                      <th className="py-3.5 px-4 text-center">Moderation</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredHoardings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No hoarding listings found</p>
                          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredHoardings.map((h) => (
                        <tr key={h._id} className="hover:bg-slate-50/70 transition">
                          {/* Site & Specs */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  h.photos?.[0] ||
                                  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80'
                                }
                                alt={h.title}
                                className="w-16 h-12 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0"
                              />
                              <div>
                                <h4 className="font-bold text-slate-900 line-clamp-1">{h.title}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                                    {h.hoardingType}
                                  </span>
                                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                                    {h.dimensions?.width} × {h.dimensions?.height} {h.dimensions?.unit || 'ft'}
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span>{h.lightingType}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4">
                            <div className="text-xs">
                              <div className="font-semibold text-slate-900 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>{h.location?.city || 'West Bengal'}</span>
                              </div>
                              <p className="text-slate-500 mt-0.5 line-clamp-1">{h.location?.address}</p>
                              {h.location?.landmark && (
                                <p className="text-slate-400 text-[11px]">Near: {h.location.landmark}</p>
                              )}
                            </div>
                          </td>

                          {/* Pricing */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              ₹{h.pricing?.baseRatePerMonth?.toLocaleString('en-IN')}{' '}
                              <span className="text-xs font-normal text-slate-500">/mo</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ₹{h.pricing?.baseRatePerDay?.toLocaleString('en-IN') || 0}/day (Min{' '}
                              {h.pricing?.minimumBookingDays || 15}d)
                            </div>
                          </td>

                          {/* Seller Info */}
                          <td className="py-4 px-4">
                            <div className="text-xs">
                              <div className="font-bold text-slate-900">
                                {h.sellerId?.companyDetails?.companyName || h.sellerId?.name || 'Media Owner'}
                              </div>
                              <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{h.sellerId?.phone || 'N/A'}</span>
                              </div>
                              <div className="text-slate-400 text-[11px] truncate max-w-[150px]">
                                {h.sellerId?.email}
                              </div>
                            </div>
                          </td>

                          {/* Active Bookings Count */}
                          <td className="py-4 px-4 text-center">
                            {h.activeBookingsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                {h.activeBookingsCount} Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                None
                              </span>
                            )}
                          </td>

                          {/* Moderation Status */}
                          <td className="py-4 px-4 text-center">
                            {h.isApprovedByAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedHoardingModal(h)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Inspect Full Specifications"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleModerateHoarding(h._id, h.isApprovedByAdmin)}
                                disabled={moderatingId === h._id}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                  h.isApprovedByAdmin
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                }`}
                              >
                                {moderatingId === h._id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : h.isApprovedByAdmin ? (
                                  'Unapprove'
                                ) : (
                                  'Approve'
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ACTIVE & ALL BOOKINGS */}
        {/* ============================================================== */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search by Booking ID, Campaign Name, Customer, or Hoarding..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Active Bookings Quick Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setBookingFilterStatus('active')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      bookingFilterStatus === 'active'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Active Only ({activeBookingsCount})
                  </button>
                  <button
                    onClick={() => setBookingFilterStatus('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      bookingFilterStatus === 'all'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Bookings ({bookings.length})
                  </button>
                </div>

                <select
                  value={bookingPaymentFilter}
                  onChange={(e) => setBookingPaymentFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid & Verified</option>
                  <option value="pending">Pending Payment</option>
                </select>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-3.5 px-4">Booking & Campaign</th>
                      <th className="py-3.5 px-4">Target Hoarding</th>
                      <th className="py-3.5 px-4">Customer (Advertiser)</th>
                      <th className="py-3.5 px-4">Media Owner (Seller)</th>
                      <th className="py-3.5 px-4">Campaign Duration</th>
                      <th className="py-3.5 px-4">Amount & Status</th>
                      <th className="py-3.5 px-4 text-right">Booking State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No matching bookings found</p>
                          <p className="text-xs text-slate-400 mt-1">Switch filter to "All Bookings" or clear search.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b._id} className="hover:bg-slate-50/70 transition">
                          {/* Booking & Campaign */}
                          <td className="py-4 px-4">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {b.bookingNumber}
                            </span>
                            <h4 className="font-bold text-slate-900 mt-1">
                              {b.campaignName || 'Brand Awareness Campaign'}
                            </h4>
                            <span className="text-[11px] text-slate-400 uppercase font-semibold">
                              Type: {b.bookingType || 'Online'}
                            </span>
                          </td>

                          {/* Hoarding Details */}
                          <td className="py-4 px-4">
                            <div className="text-xs">
                              <div className="font-bold text-slate-900 line-clamp-1">
                                {b.hoardingId?.title || 'Hoarding Space'}
                              </div>
                              <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{b.hoardingId?.location?.city || 'Kolkata'}</span>
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                {b.hoardingId?.dimensions?.width} × {b.hoardingId?.dimensions?.height} ft •{' '}
                                {b.hoardingId?.lightingType}
                              </div>
                            </div>
                          </td>

                          {/* Customer Details */}
                          <td className="py-4 px-4">
                            <div className="text-xs">
                              <div className="font-bold text-slate-900">{b.customerId?.name || 'Customer'}</div>
                              <div className="text-slate-600 font-medium">
                                {b.customerId?.companyDetails?.companyName || 'Corporate Client'}
                              </div>
                              <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{b.customerId?.phone || 'N/A'}</span>
                              </div>
                              <div className="text-slate-400 text-[11px] truncate max-w-[140px]">
                                {b.customerId?.email}
                              </div>
                            </div>
                          </td>

                          {/* Seller Details */}
                          <td className="py-4 px-4">
                            <div className="text-xs">
                              <div className="font-bold text-slate-900">
                                {b.sellerId?.companyDetails?.companyName || b.sellerId?.name || 'Media Owner'}
                              </div>
                              <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{b.sellerId?.phone || 'N/A'}</span>
                              </div>
                              <div className="text-slate-400 text-[11px] truncate max-w-[140px]">
                                {b.sellerId?.email}
                              </div>
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="py-4 px-4 text-xs whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              {new Date(b.startDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-slate-500">
                              to{' '}
                              {new Date(b.endDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                              {b.durationDays || 30} Days
                            </div>
                          </td>

                          {/* Amount & Payment */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="font-black text-slate-900">
                              ₹{b.totalAmount?.toLocaleString('en-IN') || 0}
                            </div>
                            <div className="mt-1">
                              {b.paymentStatus === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Paid / Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" /> Pending Payment
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Booking State Badge */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            {['active', 'confirmed'].includes(b.bookingStatus) ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                Active
                              </span>
                            ) : b.bookingStatus === 'completed' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                {b.bookingStatus}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: USERS (CUSTOMERS / ADVERTISERS) DETAILS */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search customers by name, brand, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Total Advertisers: <span className="text-slate-900 font-bold">{users.length}</span>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-3.5 px-4">Customer Details</th>
                      <th className="py-3.5 px-4">Company / Brand</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4 text-center">Bookings Placed</th>
                      <th className="py-3.5 px-4">Total Spent (Verified)</th>
                      <th className="py-3.5 px-4">Member Since</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No customers found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/70 transition">
                          {/* Name & Avatar */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{u.name}</h4>
                                <span className="text-xs text-indigo-600 font-medium">Customer / Brand</span>
                              </div>
                            </div>
                          </td>

                          {/* Company */}
                          <td className="py-4 px-4 text-xs">
                            <div className="font-bold text-slate-900">
                              {u.companyDetails?.companyName || 'Individual Brand'}
                            </div>
                            {u.companyDetails?.gstNumber && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                GST: {u.companyDetails.gstNumber}
                              </div>
                            )}
                            {u.companyDetails?.address && (
                              <div className="text-slate-500 text-[11px] truncate max-w-[200px]">
                                {u.companyDetails.address}
                              </div>
                            )}
                          </td>

                          {/* Contact */}
                          <td className="py-4 px-4 text-xs">
                            <div className="text-slate-900 flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                            <div className="text-slate-600 flex items-center gap-1 mt-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.phone || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Bookings Count */}
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                              {u.bookingsCount || 0} Bookings
                            </span>
                          </td>

                          {/* Total Spent */}
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            ₹{(u.totalSpent || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Joined Date */}
                          <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: SELLERS (MEDIA OWNERS) DETAILS */}
        {/* ============================================================== */}
        {activeTab === 'sellers' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search media owners by agency name, contact person, GST, phone..."
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Registered Media Owners: <span className="text-slate-900 font-bold">{sellers.length}</span>
              </div>
            </div>

            {/* Sellers Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-3.5 px-4">Media Owner Agency</th>
                      <th className="py-3.5 px-4">Contact Person</th>
                      <th className="py-3.5 px-4">Legal & GST Compliance</th>
                      <th className="py-3.5 px-4 text-center">Hoardings Listed</th>
                      <th className="py-3.5 px-4 text-center">Bookings Received</th>
                      <th className="py-3.5 px-4">Total Earnings</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSellers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No media owners found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredSellers.map((s) => (
                        <tr key={s._id} className="hover:bg-slate-50/70 transition">
                          {/* Agency */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-black flex items-center justify-center text-sm">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">
                                  {s.companyDetails?.companyName || s.name}
                                </h4>
                                <span className="text-xs text-slate-500 font-medium">OOH Media Network</span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Person */}
                          <td className="py-4 px-4 text-xs">
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="text-slate-600 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{s.phone}</span>
                            </div>
                            <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{s.email}</span>
                            </div>
                          </td>

                          {/* Legal Compliance */}
                          <td className="py-4 px-4 text-xs">
                            <div className="font-mono text-slate-700">
                              GST: <span className="font-bold">{s.companyDetails?.gstNumber || 'Unregistered'}</span>
                            </div>
                            {s.companyDetails?.tradeLicense && (
                              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                Lic: {s.companyDetails.tradeLicense}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                              {s.companyDetails?.address || 'Kolkata, WB'}
                            </div>
                          </td>

                          {/* Hoardings Listed Count */}
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                              {s.hoardingsCount || 0} Hoardings
                            </span>
                          </td>

                          {/* Bookings Received */}
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {s.bookingsCount || 0} Orders
                            </span>
                          </td>

                          {/* Total Earnings */}
                          <td className="py-4 px-4 font-black text-emerald-600 whitespace-nowrap">
                            ₹{(s.totalEarned || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Verified
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* HOARDING DETAILS MODAL (FULL TECHNICAL INSPECTION) */}
      {/* ============================================================== */}
      {selectedHoardingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSelectedHoardingModal(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 uppercase">
                Hoarding Technical Specification
              </span>
              {selectedHoardingModal.isApprovedByAdmin ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Approved
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Pending Review
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-slate-900">{selectedHoardingModal.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{selectedHoardingModal.description}</p>

            {/* Photo Gallery Thumbnail */}
            {selectedHoardingModal.photos?.length > 0 && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 max-h-56">
                <img
                  src={selectedHoardingModal.photos[0]}
                  alt={selectedHoardingModal.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase">Dimensions</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedHoardingModal.dimensions?.width} × {selectedHoardingModal.dimensions?.height}{' '}
                  {selectedHoardingModal.dimensions?.unit || 'feet'}
                </p>
                <span className="text-[10px] text-slate-500">
                  {(selectedHoardingModal.dimensions?.width || 0) * (selectedHoardingModal.dimensions?.height || 0)} Sq Ft
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase">Structure & Lighting</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedHoardingModal.hoardingType}</p>
                <span className="text-[10px] text-indigo-600 font-semibold">
                  {selectedHoardingModal.lightingType}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase">Monthly Rent</span>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">
                  ₹{selectedHoardingModal.pricing?.baseRatePerMonth?.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">
                  Min {selectedHoardingModal.pricing?.minimumBookingDays || 15} Days
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase">Daily Rate</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  ₹{selectedHoardingModal.pricing?.baseRatePerDay?.toLocaleString('en-IN') || 0}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase">Printing Estimate</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  ₹{selectedHoardingModal.pricing?.printingCostEstimate?.toLocaleString('en-IN') || 0}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase">Mounting Estimate</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  ₹{selectedHoardingModal.pricing?.mountingCostEstimate?.toLocaleString('en-IN') || 0}
                </p>
              </div>
            </div>

            {/* Location & GPS */}
            <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <span className="text-slate-400 font-semibold uppercase">Physical Location & GPS Geo-Point</span>
              <p className="text-slate-800 font-medium mt-1">
                {selectedHoardingModal.location?.address}, {selectedHoardingModal.location?.city},{' '}
                {selectedHoardingModal.location?.district} - {selectedHoardingModal.location?.pincode}
              </p>
              {selectedHoardingModal.location?.geo?.coordinates && (
                <div className="mt-1 font-mono text-[11px] text-indigo-600">
                  Coordinates: [Lng: {selectedHoardingModal.location.geo.coordinates[0]}, Lat:{' '}
                  {selectedHoardingModal.location.geo.coordinates[1]}]
                </div>
              )}
            </div>

            {/* Media Owner Attribution */}
            <div className="mt-4 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase">Site Listed By</span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedHoardingModal.sellerId?.companyDetails?.companyName ||
                    selectedHoardingModal.sellerId?.name ||
                    'Media Owner'}
                </div>
                <div className="text-slate-500">
                  {selectedHoardingModal.sellerId?.phone} • {selectedHoardingModal.sellerId?.email}
                </div>
              </div>

              <Link
                to={`/hoardings/${selectedHoardingModal._id}`}
                target="_blank"
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-1 hover:bg-indigo-700 transition"
              >
                <span>Live View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Footer Actions */}
            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedHoardingModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleModerateHoarding(
                    selectedHoardingModal._id,
                    selectedHoardingModal.isApprovedByAdmin
                  );
                }}
                disabled={moderatingId === selectedHoardingModal._id}
                className={`px-4 py-2 font-bold text-xs rounded-xl transition ${
                  selectedHoardingModal.isApprovedByAdmin
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {selectedHoardingModal.isApprovedByAdmin ? 'Revoke Approval' : 'Approve for Marketplace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
