import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  PlusCircle,
  Clock,
  AlertCircle,
  Edit3,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  MapPin,
  Building2,
  DollarSign,
  Layers,
  Eye,
  RefreshCw,
  X,
  ExternalLink,
  Power,
  Image as ImageIcon,
  Check,
  Search,
  ShieldCheck,
  ShieldAlert,
  Lock,
  FileText,
  Map as MapIcon,
  Compass,
  LayoutGrid
} from 'lucide-react';
import HoardingMap from '../../components/HoardingMap';

export default function SellerDashboardPage() {
  const { user, updateUser, refreshUser } = useAuth();
  const [hoardings, setHoardings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editHoardingModal, setEditHoardingModal] = useState(null);
  const [photoManagerModal, setPhotoManagerModal] = useState(null);
  const [showBusinessProfileModal, setShowBusinessProfileModal] = useState(false);
  const [businessProfileLoading, setBusinessProfileLoading] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    companyName: '',
    gstNumber: '',
    tradeLicense: '',
    address: '',
    name: '',
    phone: ''
  });

  // Inventory View Mode & Map Picker State
  const [sellerViewMode, setSellerViewMode] = useState('table'); // 'table' | 'map'
  const [showMapPickerModal, setShowMapPickerModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('new'); // 'new' | 'edit'
  const [pickedCoords, setPickedCoords] = useState(null);

  // Form states for Add / Edit
  const [formLoading, setFormLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [notification, setNotification] = useState(null);

  // File upload input ref
  const fileInputRef = useRef(null);
  const [manualPhotoUrl, setManualPhotoUrl] = useState('');

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

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
      showToast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Status Toggle: available / occupied / under_maintenance / inactive
  const handleQuickStatusChange = async (hoardingId, newStatus) => {
    try {
      const res = await api.put(`/hoardings/${hoardingId}/status`, { status: newStatus });
      if (res.data.success) {
        setHoardings((prev) =>
          prev.map((h) => (h._id === hoardingId ? { ...h, availabilityStatus: newStatus } : h))
        );
        showToast(`Hoarding status updated to: ${newStatus.replace('_', ' ')}`);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  // Verify Offline Payment
  const handleVerifyPayment = async (paymentId) => {
    try {
      await api.put(`/payments/${paymentId}/verify`, {
        verificationNotes: 'Verified and confirmed by site owner'
      });
      showToast('Payment verified and booking confirmed!');
      fetchData(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to verify payment.', 'error');
    }
  };

  // Open Edit Modal
  const openEditModal = (hoarding) => {
    setFormError('');
    setEditHoardingModal({
      _id: hoarding._id,
      title: hoarding.title || '',
      description: hoarding.description || '',
      hoardingType: hoarding.hoardingType || 'Billboard',
      lightingType: hoarding.lightingType || 'Frontlit',
      dimensions: {
        width: hoarding.dimensions?.width || '',
        height: hoarding.dimensions?.height || '',
        unit: hoarding.dimensions?.unit || 'feet'
      },
      location: {
        address: hoarding.location?.address || '',
        city: hoarding.location?.city || 'Kolkata',
        landmark: hoarding.location?.landmark || '',
        pincode: hoarding.location?.pincode || '',
        googleMapsUrl: hoarding.location?.googleMapsUrl || ''
      },
      pricing: {
        baseRatePerMonth: hoarding.pricing?.baseRatePerMonth || '',
        baseRatePerDay: hoarding.pricing?.baseRatePerDay || '',
        minimumBookingDays: hoarding.pricing?.minimumBookingDays || 15,
        printingCostEstimate: hoarding.pricing?.printingCostEstimate || 0,
        mountingCostEstimate: hoarding.pricing?.mountingCostEstimate || 0
      },
      availabilityStatus: hoarding.availabilityStatus || 'available'
    });
  };

  // Submit Edit Hoarding (specs, pricing, status)
  const handleUpdateHoarding = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const payload = {
        title: editHoardingModal.title,
        description: editHoardingModal.description,
        hoardingType: editHoardingModal.hoardingType,
        lightingType: editHoardingModal.lightingType,
        dimensions: {
          width: Number(editHoardingModal.dimensions.width),
          height: Number(editHoardingModal.dimensions.height),
          unit: editHoardingModal.dimensions.unit || 'feet'
        },
        location: {
          address: editHoardingModal.location.address,
          city: editHoardingModal.location.city,
          landmark: editHoardingModal.location.landmark,
          pincode: editHoardingModal.location.pincode,
          googleMapsUrl: editHoardingModal.location.googleMapsUrl || ''
        },
        pricing: {
          baseRatePerMonth: Number(editHoardingModal.pricing.baseRatePerMonth),
          baseRatePerDay: Number(editHoardingModal.pricing.baseRatePerDay) || Math.round(Number(editHoardingModal.pricing.baseRatePerMonth) / 30),
          minimumBookingDays: Number(editHoardingModal.pricing.minimumBookingDays) || 15,
          printingCostEstimate: Number(editHoardingModal.pricing.printingCostEstimate) || 0,
          mountingCostEstimate: Number(editHoardingModal.pricing.mountingCostEstimate) || 0
        },
        availabilityStatus: editHoardingModal.availabilityStatus
      };

      const res = await api.put(`/hoardings/${editHoardingModal._id}`, payload);
      if (res.data.success) {
        showToast('Hoarding details & pricing updated successfully!');
        setEditHoardingModal(null);
        fetchData(true);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update hoarding.');
    } finally {
      setFormLoading(false);
    }
  };

  // Open Photo Manager Modal
  const openPhotoManager = (hoarding) => {
    setManualPhotoUrl('');
    setPhotoManagerModal({
      _id: hoarding._id,
      title: hoarding.title,
      photos: [...(hoarding.photos || [])]
    });
  };

  // Upload Photo File from Device
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadLoading(true);
    try {
      const res = await api.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.fileUrl) {
        const updatedPhotos = [...photoManagerModal.photos, res.data.fileUrl];
        setPhotoManagerModal((prev) => ({ ...prev, photos: updatedPhotos }));
        // Automatically save to backend
        await api.put(`/hoardings/${photoManagerModal._id}`, { photos: updatedPhotos });
        setHoardings((prev) =>
          prev.map((h) => (h._id === photoManagerModal._id ? { ...h, photos: updatedPhotos } : h))
        );
        showToast('Photo uploaded and added to hoarding board!');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to upload photo.', 'error');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add Photo via URL
  const handleAddPhotoUrl = async () => {
    if (!manualPhotoUrl.trim()) return;
    const updatedPhotos = [...photoManagerModal.photos, manualPhotoUrl.trim()];
    setPhotoManagerModal((prev) => ({ ...prev, photos: updatedPhotos }));
    setManualPhotoUrl('');

    try {
      await api.put(`/hoardings/${photoManagerModal._id}`, { photos: updatedPhotos });
      setHoardings((prev) =>
        prev.map((h) => (h._id === photoManagerModal._id ? { ...h, photos: updatedPhotos } : h))
      );
      showToast('Photo URL added to hoarding board!');
    } catch (err) {
      showToast('Failed to save photo URL.', 'error');
    }
  };

  // Remove Photo from Hoarding
  const handleRemovePhoto = async (indexToRemove) => {
    const updatedPhotos = photoManagerModal.photos.filter((_, idx) => idx !== indexToRemove);
    setPhotoManagerModal((prev) => ({ ...prev, photos: updatedPhotos }));

    try {
      await api.put(`/hoardings/${photoManagerModal._id}`, { photos: updatedPhotos });
      setHoardings((prev) =>
        prev.map((h) => (h._id === photoManagerModal._id ? { ...h, photos: updatedPhotos } : h))
      );
      showToast('Photo removed.');
    } catch (err) {
      showToast('Failed to remove photo.', 'error');
    }
  };

  // Set Primary Photo
  const handleSetPrimaryPhoto = async (index) => {
    if (index === 0) return;
    const photosCopy = [...photoManagerModal.photos];
    const [selected] = photosCopy.splice(index, 1);
    photosCopy.unshift(selected);
    setPhotoManagerModal((prev) => ({ ...prev, photos: photosCopy }));

    try {
      await api.put(`/hoardings/${photoManagerModal._id}`, { photos: photosCopy });
      setHoardings((prev) =>
        prev.map((h) => (h._id === photoManagerModal._id ? { ...h, photos: photosCopy } : h))
      );
      showToast('Cover photo updated.');
    } catch (err) {
      showToast('Failed to update cover photo.', 'error');
    }
  };

  // Handle Add Hoarding Modal Form
  const [newHoarding, setNewHoarding] = useState({
    title: '',
    description: '',
    hoardingType: 'Billboard',
    lightingType: 'Frontlit',
    width: '',
    height: '',
    address: '',
    city: 'Kolkata',
    landmark: '',
    pincode: '',
    latitude: '',
    longitude: '',
    googleMapsUrl: '',
    baseRatePerMonth: '',
    baseRatePerDay: '',
    minimumBookingDays: 15,
    printingCostEstimate: 0,
    mountingCostEstimate: 0,
    photos: []
  });

  const handlePointPicked = (lat, lng) => {
    setPickedCoords([lat, lng]);
    const mapsUrl = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (pickerTarget === 'new') {
      setNewHoarding((prev) => ({
        ...prev,
        latitude: lat.toFixed(5),
        longitude: lng.toFixed(5),
        googleMapsUrl: mapsUrl,
        landmark: prev.landmark || `Near GPS (${lat.toFixed(3)}, ${lng.toFixed(3)})`
      }));
    } else if (pickerTarget === 'edit' && editHoardingModal) {
      setEditHoardingModal((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          latitude: lat.toFixed(5),
          longitude: lng.toFixed(5),
          googleMapsUrl: mapsUrl
        }
      }));
    }
    showToast(`Location coordinates pinned: ${lat.toFixed(4)}, ${lng.toFixed(4)}! Google Maps link generated.`);
    setShowMapPickerModal(false);
  };

  const handleAddHoardingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const photos = newHoarding.photos.length > 0
        ? newHoarding.photos
        : ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'];

      await api.post('/hoardings', {
        title: newHoarding.title,
        description: newHoarding.description,
        hoardingType: newHoarding.hoardingType,
        lightingType: newHoarding.lightingType,
        dimensions: { width: Number(newHoarding.width), height: Number(newHoarding.height) },
        location: {
          address: newHoarding.address,
          city: newHoarding.city,
          landmark: newHoarding.landmark,
          pincode: newHoarding.pincode,
          geo: (newHoarding.latitude && newHoarding.longitude)
            ? { type: 'Point', coordinates: [parseFloat(newHoarding.longitude), parseFloat(newHoarding.latitude)] }
            : undefined,
          googleMapsUrl: newHoarding.googleMapsUrl || (newHoarding.latitude && newHoarding.longitude ? `https://maps.google.com/?q=${newHoarding.latitude},${newHoarding.longitude}` : '')
        },
        pricing: {
          baseRatePerMonth: Number(newHoarding.baseRatePerMonth),
          baseRatePerDay: Number(newHoarding.baseRatePerDay) || Math.round(Number(newHoarding.baseRatePerMonth) / 30),
          minimumBookingDays: Number(newHoarding.minimumBookingDays) || 15,
          printingCostEstimate: Number(newHoarding.printingCostEstimate) || 0,
          mountingCostEstimate: Number(newHoarding.mountingCostEstimate) || 0
        },
        photos
      });

      showToast('Hoarding site enlisted successfully!');
      setShowAddModal(false);
      setNewHoarding({
        title: '',
        description: '',
        hoardingType: 'Billboard',
        lightingType: 'Frontlit',
        width: '',
        height: '',
        address: '',
        city: 'Kolkata',
        landmark: '',
        pincode: '',
        latitude: '',
        longitude: '',
        googleMapsUrl: '',
        baseRatePerMonth: '',
        baseRatePerDay: '',
        minimumBookingDays: 15,
        printingCostEstimate: 0,
        mountingCostEstimate: 0,
        photos: []
      });
      fetchData(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to enlist hoarding.');
    } finally {
      setFormLoading(false);
    }
  };

  // Approval status check
  const isApprovedSeller = user?.status === 'active';

  // Initialize Business Profile Form
  const initBusinessProfileForm = () => {
    setBusinessForm({
      companyName: user?.companyDetails?.companyName || '',
      gstNumber:
        user?.companyDetails?.gstNumber && user.companyDetails.gstNumber !== 'Unregistered'
          ? user.companyDetails.gstNumber
          : '',
      tradeLicense: user?.companyDetails?.tradeLicense || '',
      address: user?.companyDetails?.address || '',
      name: user?.name || '',
      phone: user?.phone || ''
    });
  };

  // Submit Updated Business Profile
  const handleSaveBusinessProfile = async (e) => {
    e.preventDefault();
    setBusinessProfileLoading(true);
    try {
      const res = await api.put('/auth/profile', {
        name: businessForm.name,
        phone: businessForm.phone,
        companyDetails: {
          companyName: businessForm.companyName,
          gstNumber: businessForm.gstNumber || 'Unregistered',
          tradeLicense: businessForm.tradeLicense,
          address: businessForm.address
        }
      });

      if (res.data.success) {
        if (updateUser) updateUser(res.data.user);
        if (refreshUser) await refreshUser();
        showToast('Business details updated successfully! Super Admin will review your profile credentials.');
        setShowBusinessProfileModal(false);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update business profile.', 'error');
    } finally {
      setBusinessProfileLoading(false);
    }
  };

  // Filtered Hoardings for Seller
  const filteredHoardings = (hoardings || []).filter((h) => {
    if (!h) return false;
    const matchesSearch =
      !searchQuery ||
      h.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.location?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.location?.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || h.availabilityStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Available
          </span>
        );
      case 'occupied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            Booked
          </span>
        );
      case 'under_maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Maintenance (Offline)
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
            <Power className="w-3.5 h-3.5 text-slate-500" />
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-semibold">Loading Media Owner Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold transition-all ${
            notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-100 text-brand-800">
                Media Owner Portal
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {user?.companyDetails?.companyName || 'West Bengal Media Network'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Hoarding Board Inventory & Site Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Update board specs, upload/replace site photos, revise pricing, and toggle site booking status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-xs transition"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                if (!isApprovedSeller) {
                  showToast(
                    'Super Admin verification required before enlisting new hoardings. Please complete or verify your business details.',
                    'error'
                  );
                  initBusinessProfileForm();
                  setShowBusinessProfileModal(true);
                  return;
                }
                setShowAddModal(true);
              }}
              className={`px-5 py-2.5 font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
                isApprovedSeller
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600 border border-slate-300'
              }`}
              title={
                isApprovedSeller
                  ? 'Enlist New Hoarding'
                  : 'Super Admin approval required before enlisting hoarding sites'
              }
            >
              {isApprovedSeller ? <PlusCircle className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-600" />}
              <span>Enlist New Hoarding</span>
              {!isApprovedSeller && (
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold ml-1">
                  Locked
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SELLER VERIFICATION STATUS BANNER & ONBOARDING PROMPT */}
        {/* ============================================================== */}
        {!isApprovedSeller ? (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200/90 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                      Pending Admin Verification
                    </span>
                    <span className="text-xs text-amber-800 font-semibold">• Profile Waiting For Approval</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    Agency Onboarding & Verification In Progress
                  </h2>
                  <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
                    Your media owner account is currently waiting for Super Admin accreditation. Only verified sellers can enlist hoardings on the Adverse platform. Please verify or update your legal details below.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-700 font-medium">
                    <span className="flex items-center gap-1.5 bg-white/80 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <strong>Agency:</strong> {user?.companyDetails?.companyName || user?.name || 'Not set'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/80 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <strong>GST:</strong>{' '}
                      <span className={user?.companyDetails?.gstNumber && user.companyDetails.gstNumber !== 'Unregistered' ? 'font-mono font-bold text-slate-800' : 'text-amber-700 italic'}>
                        {user?.companyDetails?.gstNumber || 'Unregistered'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/80 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <strong>Trade License:</strong>{' '}
                      <span className={user?.companyDetails?.tradeLicense ? 'font-mono font-bold text-slate-800' : 'text-slate-400 italic'}>
                        {user?.companyDetails?.tradeLicense || 'Pending'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={() => {
                    initBusinessProfileForm();
                    setShowBusinessProfileModal(true);
                  }}
                  className="w-full lg:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Update Business / Legal Details</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <span>Verified & Accredited Media Owner</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-black">Authorized</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {user?.companyDetails?.companyName || user?.name} • GST: {user?.companyDetails?.gstNumber || 'Active'} • Hoarding enlistment and booking management active.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                initBusinessProfileForm();
                setShowBusinessProfileModal(true);
              }}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0"
            >
              Update Business Profile
            </button>
          </div>
        )}

        {/* Global Key Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sites</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{(hoardings || []).length}</div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-bold">{(hoardings || []).filter((h) => h?.availabilityStatus === 'available').length} Available</span> •{' '}
              <span className="text-indigo-600 font-bold">{(hoardings || []).filter((h) => h?.availabilityStatus === 'occupied').length} Booked</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bookings</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-indigo-600 mt-2">{(bookings || []).length}</div>
            <div className="text-xs text-slate-500 mt-1">Active & historical leases</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Cheques</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-500 mt-2">
              {(payments || []).filter((p) => p?.paymentStatus === 'pending').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Awaiting bank verification</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Earnings</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2">
              ₹{(payments || [])
                .filter((p) => p && p.paymentStatus === 'verified')
                .reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
                .toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">Reconciled payments</div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION: SELLER'S HOARDING INVENTORY (UPDATE SPECS, PHOTOS, PRICE, STATUS) */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                My Listed Hoarding Boards ({filteredHoardings.length})
              </h2>
              <p className="text-xs text-slate-500">
                Click "Edit Board & Price" to adjust dimensions, lighting, or rates. Use "Photos" to upload real-site images.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search site, city, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="occupied">Booked</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="inactive">Offline / Inactive</option>
              </select>

              {/* View Mode Toggle: Grid Cards vs Inventory Map */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setSellerViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    sellerViewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSellerViewMode('map')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    sellerViewMode === 'map' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Map View</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Display: Map View vs Grid Cards */}
          {sellerViewMode === 'map' ? (
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <MapIcon className="w-4 h-4" /> Visual Geographic Distribution of Your Hoardings ({filteredHoardings.length})
                </span>
                <span className="text-slate-400">Click pins to inspect specs, pricing, and live photos</span>
              </div>
              <HoardingMap
                hoardings={filteredHoardings}
                height="600px"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHoardings.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800">No Hoardings Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No hoarding matches your filter criteria. Try resetting search filters.'
                    : 'You haven’t enlisted any hoarding boards yet. Click "Enlist New Hoarding" to get started.'}
                </p>
              </div>
            ) : (
              filteredHoardings.map((h) => (
                <div
                  key={h._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 transition"
                >
                  {/* Photo Thumbnail + Photo count badge */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden group">
                    <img
                      src={
                        h.photos?.[0] ||
                        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={h.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Status Badge overlay */}
                    <div className="absolute top-3 left-3">{getStatusBadge(h.availabilityStatus)}</div>

                    {/* Photos Count & Quick Photo Manage button */}
                    <button
                      onClick={() => openPhotoManager(h)}
                      className="absolute bottom-3 right-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-900 transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{h.photos?.length || 0} Photos</span>
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Title & Type */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 line-clamp-1">{h.title}</h3>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-medium text-slate-700">{h.location?.city}</span>
                        <span>•</span>
                        <span className="truncate">{h.location?.address}</span>
                      </div>

                      {/* Specs Tags */}
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {h.hoardingType}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700">
                          {h.dimensions?.width} × {h.dimensions?.height} {h.dimensions?.unit || 'ft'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                          {h.lightingType}
                        </span>
                      </div>

                      {/* Pricing Highlight */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Monthly Rent</span>
                          <div className="text-base font-black text-slate-900">
                            ₹{h.pricing?.baseRatePerMonth?.toLocaleString('en-IN')}{' '}
                            <span className="text-xs font-normal text-slate-400">/mo</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Daily Rate</span>
                          <div className="text-xs font-bold text-slate-700">
                            ₹{h.pricing?.baseRatePerDay?.toLocaleString('en-IN') || Math.round((h.pricing?.baseRatePerMonth || 0) / 30)}/day
                          </div>
                        </div>
                      </div>

                      {/* Status Selector Dropdown */}
                      <div className="mt-3 bg-slate-50 p-2 rounded-xl flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] font-bold text-slate-500">Site Status:</span>
                        <select
                          value={h.availabilityStatus}
                          onChange={(e) => handleQuickStatusChange(h._id, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="available">🟢 Available</option>
                          <option value="occupied">🔵 Booked (Occupied)</option>
                          <option value="under_maintenance">🟡 Under Maintenance</option>
                          <option value="inactive">⚪ Offline / Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/hoardings/${h._id}`}
                          target="_blank"
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                          title="View Public Marketplace Listing"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {(h.location?.googleMapsUrl || h.location?.geo?.coordinates?.length === 2) && (
                          <a
                            href={
                              h.location.googleMapsUrl ||
                              `https://www.google.com/maps?q=${h.location.geo.coordinates[1]},${h.location.geo.coordinates[0]}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                            title="View Exact Pin on Google Maps"
                          >
                            <MapPin className="w-4 h-4" />
                            <span className="hidden sm:inline text-[11px]">Maps</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPhotoManager(h)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>Photos</span>
                        </button>

                        <button
                          onClick={() => openEditModal(h)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Board & Price</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* SECTION: OFFLINE CHEQUE / NEFT VERIFICATION DESK */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Offline Cheque / NEFT Verification Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify customer bank slips and cheque payments to automatically activate their hoarding campaigns.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {payments.filter((p) => p.paymentStatus === 'pending').length} Awaiting Verification
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-2">Advertiser</th>
                  <th className="pb-3 px-2">Amount</th>
                  <th className="pb-3 px-2">Payment Mode</th>
                  <th className="pb-3 px-2">Bank / UTR Ref</th>
                  <th className="pb-3 px-2">Payment Slip</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-2 font-bold text-slate-900">
                        {p.customerId?.name}
                        {p.customerId?.companyDetails?.companyName && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {p.customerId.companyDetails.companyName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 font-black text-slate-900">
                        ₹{p.amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 capitalize font-medium text-slate-700">
                        {p.paymentMode?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-600">
                        <div>{p.offlineDetails?.transactionReference || 'N/A'}</div>
                        {p.offlineDetails?.bankName && (
                          <div className="text-[10px] text-slate-400 font-sans">{p.offlineDetails.bankName}</div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {p.offlineDetails?.receiptImageUrl ? (
                          <a
                            href={p.offlineDetails.receiptImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Slip
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No attachment</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {p.paymentStatus === 'verified' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {p.paymentStatus === 'pending' && (
                          <button
                            onClick={() => handleVerifyPayment(p._id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                          >
                            Verify & Confirm
                          </button>
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

      {/* ============================================================== */}
      {/* MODAL 1: EDIT HOARDING BOARD & PRICING */}
      {/* ============================================================== */}
      {editHoardingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setEditHoardingModal(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 uppercase">
                Site Management
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900">Edit Hoarding Board & Pricing</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-5">
              Update structure specifications, physical address, monthly/daily rates, or set site offline/booked.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateHoarding} className="space-y-4 text-xs">
              {/* Title & Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hoarding Title / Landmark Reference *</label>
                <input
                  type="text"
                  required
                  value={editHoardingModal.title}
                  onChange={(e) => setEditHoardingModal({ ...editHoardingModal, title: e.target.value })}
                  placeholder="e.g. Park Street Flyover Mega Unipole"
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Site Description & Audience Reach</label>
                <textarea
                  rows={2}
                  value={editHoardingModal.description}
                  onChange={(e) => setEditHoardingModal({ ...editHoardingModal, description: e.target.value })}
                  placeholder="Traffic density, visibility benefits, viewing angles..."
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Types & Lighting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hoarding Structure Type</label>
                  <select
                    value={editHoardingModal.hoardingType}
                    onChange={(e) => setEditHoardingModal({ ...editHoardingModal, hoardingType: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Billboard">Billboard</option>
                    <option value="Unipole">Unipole</option>
                    <option value="Gantry">Gantry</option>
                    <option value="Bridge Panel">Bridge Panel</option>
                    <option value="Kiosk">Kiosk</option>
                    <option value="LED Digital Screen">LED Digital Screen</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lighting Technology</label>
                  <select
                    value={editHoardingModal.lightingType}
                    onChange={(e) => setEditHoardingModal({ ...editHoardingModal, lightingType: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Frontlit">Frontlit (External Spotlights)</option>
                    <option value="Backlit">Backlit (Internal Glow)</option>
                    <option value="Digital/LED">Digital / Dynamic LED</option>
                    <option value="Non-lit">Non-lit (Daytime only)</option>
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Width (ft) *</label>
                  <input
                    type="number"
                    required
                    value={editHoardingModal.dimensions.width}
                    onChange={(e) =>
                      setEditHoardingModal({
                        ...editHoardingModal,
                        dimensions: { ...editHoardingModal.dimensions, width: e.target.value }
                      })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Height (ft) *</label>
                  <input
                    type="number"
                    required
                    value={editHoardingModal.dimensions.height}
                    onChange={(e) =>
                      setEditHoardingModal({
                        ...editHoardingModal,
                        dimensions: { ...editHoardingModal.dimensions, height: e.target.value }
                      })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Area</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-700 text-center">
                    {(Number(editHoardingModal.dimensions.width) || 0) * (Number(editHoardingModal.dimensions.height) || 0)} Sq Ft
                  </div>
                </div>
              </div>

              {/* Location details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Region *</label>
                  <select
                    value={editHoardingModal.location.city}
                    onChange={(e) =>
                      setEditHoardingModal({
                        ...editHoardingModal,
                        location: { ...editHoardingModal.location, city: e.target.value }
                      })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Kolkata">Kolkata</option>
                    <option value="Howrah">Howrah</option>
                    <option value="Siliguri">Siliguri</option>
                    <option value="Durgapur">Durgapur</option>
                    <option value="Asansol">Asansol</option>
                    <option value="Bardhaman">Bardhaman</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prominent Landmark</label>
                  <input
                    type="text"
                    value={editHoardingModal.location.landmark}
                    onChange={(e) =>
                      setEditHoardingModal({
                        ...editHoardingModal,
                        location: { ...editHoardingModal.location, landmark: e.target.value }
                      })
                    }
                    placeholder="e.g. Beside Allen Park / Junction Mall"
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={editHoardingModal.location.address}
                  onChange={(e) =>
                    setEditHoardingModal({
                      ...editHoardingModal,
                      location: { ...editHoardingModal.location, address: e.target.value }
                    })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Google Maps Location Link</label>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Optional, Highly Recommended ⭐
                  </span>
                </div>
                <input
                  type="url"
                  value={editHoardingModal.location.googleMapsUrl || ''}
                  onChange={(e) =>
                    setEditHoardingModal({
                      ...editHoardingModal,
                      location: { ...editHoardingModal.location, googleMapsUrl: e.target.value }
                    })
                  }
                  placeholder="e.g. https://maps.app.goo.gl/xxx or https://www.google.com/maps?q=..."
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enables advertisers, site managers, and admins to click and view the exact pin on Google Maps.
                </p>
              </div>

              {/* PRICING SECTION (EDIT PRICE LATER) */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900 block">
                  💰 Pricing & Costing Structure
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Monthly Base Rent (₹) *</label>
                    <input
                      type="number"
                      required
                      value={editHoardingModal.pricing.baseRatePerMonth}
                      onChange={(e) =>
                        setEditHoardingModal({
                          ...editHoardingModal,
                          pricing: {
                            ...editHoardingModal.pricing,
                            baseRatePerMonth: e.target.value,
                            baseRatePerDay: Math.round(Number(e.target.value) / 30) || ''
                          }
                        })
                      }
                      className="w-full border border-slate-200 bg-white p-2.5 rounded-xl font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Daily Rate (₹)</label>
                    <input
                      type="number"
                      value={editHoardingModal.pricing.baseRatePerDay}
                      onChange={(e) =>
                        setEditHoardingModal({
                          ...editHoardingModal,
                          pricing: { ...editHoardingModal.pricing, baseRatePerDay: e.target.value }
                        })
                      }
                      className="w-full border border-slate-200 bg-white p-2.5 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Min Days</label>
                    <input
                      type="number"
                      value={editHoardingModal.pricing.minimumBookingDays}
                      onChange={(e) =>
                        setEditHoardingModal({
                          ...editHoardingModal,
                          pricing: { ...editHoardingModal.pricing, minimumBookingDays: e.target.value }
                        })
                      }
                      className="w-full border border-slate-200 bg-white p-2 rounded-xl text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Printing Est (₹)</label>
                    <input
                      type="number"
                      value={editHoardingModal.pricing.printingCostEstimate}
                      onChange={(e) =>
                        setEditHoardingModal({
                          ...editHoardingModal,
                          pricing: { ...editHoardingModal.pricing, printingCostEstimate: e.target.value }
                        })
                      }
                      className="w-full border border-slate-200 bg-white p-2 rounded-xl text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mounting Est (₹)</label>
                    <input
                      type="number"
                      value={editHoardingModal.pricing.mountingCostEstimate}
                      onChange={(e) =>
                        setEditHoardingModal({
                          ...editHoardingModal,
                          pricing: { ...editHoardingModal.pricing, mountingCostEstimate: e.target.value }
                        })
                      }
                      className="w-full border border-slate-200 bg-white p-2 rounded-xl text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* AVAILABILITY / BOOKING / OFFLINE STATUS */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block font-bold text-slate-900 mb-1">
                  Availability & Site Operational Status *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Change status to "Booked" if booked offline, or "Under Maintenance / Offline" to take off search.
                </p>
                <select
                  value={editHoardingModal.availabilityStatus}
                  onChange={(e) =>
                    setEditHoardingModal({ ...editHoardingModal, availabilityStatus: e.target.value })
                  }
                  className="w-full border border-slate-200 bg-white p-2.5 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="available">🟢 Available for Online & Offline Booking</option>
                  <option value="occupied">🔵 Booked (Site Occupied by Active Campaign)</option>
                  <option value="under_maintenance">🟡 Under Maintenance (Temporary Offline)</option>
                  <option value="inactive">⚪ Offline / Inactive (Disabled from Search)</option>
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditHoardingModal(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Board & Price Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PHOTO MANAGER (UPLOAD & UPDATE BOARD PHOTOS) */}
      {/* ============================================================== */}
      {photoManagerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPhotoManagerModal(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 uppercase">
                Photo Gallery
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900">Manage Hoarding Board Photos</h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{photoManagerModal.title}</p>

            {/* Upload Controls */}
            <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Add New Photo</span>

              {/* Device file upload */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
                >
                  {uploadLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{uploadLoading ? 'Uploading...' : 'Upload Photo from Device'}</span>
                </button>
              </div>

              {/* Paste URL */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Or paste image URL (Unsplash, Cloudinary, etc.)..."
                  value={manualPhotoUrl}
                  onChange={(e) => setManualPhotoUrl(e.target.value)}
                  className="flex-1 border border-slate-200 p-2 text-xs rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* Existing Photos Grid */}
            <div className="mt-5">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                Current Photos ({photoManagerModal.photos?.length || 0})
              </span>

              {photoManagerModal.photos?.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  No photos uploaded for this hoarding board yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photoManagerModal.photos.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden border border-slate-200 group h-28 bg-slate-100"
                    >
                      <img src={url} alt={`Site photo ${idx + 1}`} className="w-full h-full object-cover" />

                      {/* Primary Cover Badge */}
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                          Cover
                        </span>
                      )}

                      {/* Overlay action buttons */}
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        {idx !== 0 && (
                          <button
                            onClick={() => handleSetPrimaryPhoto(idx)}
                            className="p-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 text-[10px] font-bold"
                            title="Set as Cover Photo"
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Done button */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPhotoManagerModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ENLIST NEW HOARDING */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">Enlist New Hoarding Board</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add your prime outdoor hoarding spot to Adverse marketplace in West Bengal.
            </p>

            {formError && <p className="text-rose-600 text-xs mb-3 font-semibold">{formError}</p>}

            <form onSubmit={handleAddHoardingSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hoarding Title / Landmark Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Park Street Flyover Mega Unipole"
                  value={newHoarding.title}
                  onChange={(e) => setNewHoarding({ ...newHoarding, title: e.target.value })}
                  className="w-full border border-slate-200 p-2.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Structure Type</label>
                  <select
                    value={newHoarding.hoardingType}
                    onChange={(e) => setNewHoarding({ ...newHoarding, hoardingType: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl focus:outline-none"
                  >
                    <option value="Billboard">Billboard</option>
                    <option value="Unipole">Unipole</option>
                    <option value="Gantry">Gantry</option>
                    <option value="Bridge Panel">Bridge Panel</option>
                    <option value="Kiosk">Kiosk</option>
                    <option value="LED Digital Screen">LED Digital Screen</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lighting</label>
                  <select
                    value={newHoarding.lightingType}
                    onChange={(e) => setNewHoarding({ ...newHoarding, lightingType: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl focus:outline-none"
                  >
                    <option value="Frontlit">Frontlit</option>
                    <option value="Backlit">Backlit</option>
                    <option value="Digital/LED">Digital / LED</option>
                    <option value="Non-lit">Non-lit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Width (ft) *</label>
                  <input
                    type="number"
                    required
                    placeholder="40"
                    value={newHoarding.width}
                    onChange={(e) => setNewHoarding({ ...newHoarding, width: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Height (ft) *</label>
                  <input
                    type="number"
                    required
                    placeholder="20"
                    value={newHoarding.height}
                    onChange={(e) => setNewHoarding({ ...newHoarding, height: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <select
                    value={newHoarding.city}
                    onChange={(e) => setNewHoarding({ ...newHoarding, city: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl"
                  >
                    <option value="Kolkata">Kolkata</option>
                    <option value="Howrah">Howrah</option>
                    <option value="Siliguri">Siliguri</option>
                    <option value="Durgapur">Durgapur</option>
                    <option value="Asansol">Asansol</option>
                    <option value="Bardhaman">Bardhaman</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Landmark</label>
                  <input
                    type="text"
                    placeholder="Near Crossing"
                    value={newHoarding.landmark}
                    onChange={(e) => setNewHoarding({ ...newHoarding, landmark: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Opposite Allen Park, Park Street"
                  value={newHoarding.address}
                  onChange={(e) => setNewHoarding({ ...newHoarding, address: e.target.value })}
                  className="w-full border border-slate-200 p-2 rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Google Maps Location Link</label>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('new');
                      setPickedCoords(
                        newHoarding.latitude && newHoarding.longitude
                          ? [parseFloat(newHoarding.latitude), parseFloat(newHoarding.longitude)]
                          : [22.5726, 88.3639]
                      );
                      setShowMapPickerModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                  >
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>📍 Pin on Free Map</span>
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="e.g. https://maps.app.goo.gl/xxx or https://www.google.com/maps?q=..."
                  value={newHoarding.googleMapsUrl}
                  onChange={(e) => setNewHoarding({ ...newHoarding, googleMapsUrl: e.target.value })}
                  className="w-full border border-slate-200 p-2 rounded-xl font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Click "Pin on Free Map" to click anywhere on the map and auto-fill coordinates + Google Maps URL.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Rent (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="150000"
                    value={newHoarding.baseRatePerMonth}
                    onChange={(e) => setNewHoarding({ ...newHoarding, baseRatePerMonth: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Booking Days</label>
                  <input
                    type="number"
                    placeholder="15"
                    value={newHoarding.minimumBookingDays}
                    onChange={(e) => setNewHoarding({ ...newHoarding, minimumBookingDays: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {formLoading ? 'Publishing...' : 'Publish Hoarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SELLER ONBOARDING & BUSINESS PROFILE MODAL */}
      {/* ============================================================== */}
      {showBusinessProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowBusinessProfileModal(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                Seller Onboarding
              </span>
              <span className="text-xs text-slate-400">• Business Accreditation</span>
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Agency & Legal Credentials
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              These details are verified by the Adverse Super Admin before granting permission to publish hoarding sites.
            </p>

            <form onSubmit={handleSaveBusinessProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Agency / Legal Business Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengal Media Networks LLP"
                    value={businessForm.companyName}
                    onChange={(e) => setBusinessForm({ ...businessForm, companyName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Number (GSTIN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 19AAACA1234A1Z5"
                    value={businessForm.gstNumber}
                    onChange={(e) => setBusinessForm({ ...businessForm, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trade License Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TL-KOL-2026-99"
                    value={businessForm.tradeLicense}
                    onChange={(e) => setBusinessForm({ ...businessForm, tradeLicense: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Office Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Camac Street, Kolkata, West Bengal - 700016"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Authorized Representative Name
                  </label>
                  <input
                    type="text"
                    placeholder="Subhashish Das"
                    value={businessForm.name}
                    onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9830000000"
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBusinessProfileModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={businessProfileLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition"
                >
                  {businessProfileLoading ? 'Saving...' : 'Save & Submit Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* INTERACTIVE MAP LOCATION PICKER MODAL */}
      {/* ============================================================== */}
      {showMapPickerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowMapPickerModal(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 uppercase">
                Interactive Map Pinpoint
              </span>
              <span className="text-xs text-slate-400">• Free & Instant</span>
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Click anywhere on the map to place your hoarding
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Click on the exact road, intersection, or building rooftop to automatically calculate GPS coordinates and generate the Google Maps street link.
            </p>

            <HoardingMap
              pickerMode={true}
              selectedPoint={pickedCoords}
              center={pickedCoords || [22.5726, 88.3639]}
              onPointPicked={handlePointPicked}
              height="450px"
            />

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-semibold">
                {pickedCoords ? (
                  <span className="text-emerald-700">
                    📍 Pinned: {pickedCoords[0].toFixed(5)}, {pickedCoords[1].toFixed(5)}
                  </span>
                ) : (
                  <span>Click anywhere on the map to set location pin</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowMapPickerModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
