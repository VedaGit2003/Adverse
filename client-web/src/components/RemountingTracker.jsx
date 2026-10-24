import React, { useState, useRef } from 'react';
import api from '../services/api';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Camera,
  CreditCard,
  Layers,
  ChevronDown,
  ChevronUp,
  Upload,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Info,
  DollarSign,
  FileText
} from 'lucide-react';

export default function RemountingTracker({
  booking,
  userRole = 'customer',
  onUpdate,
  defaultOpen = false
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [loadingAction, setLoadingAction] = useState(false);

  // Active remounting request selection
  const requests = booking?.remountingRequests || [];
  const [selectedReqIndex, setSelectedReqIndex] = useState(0);
  const activeReq = requests[selectedReqIndex] || null;

  // Pay Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMode, setPayMode] = useState('online_upi');
  const [txnRef, setTxnRef] = useState('');
  const [bankName, setBankName] = useState('');

  // Proof Upload State
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [proofCaptureDateTime, setProofCaptureDateTime] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofGps, setProofGps] = useState(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsFeatureEnabled, setGpsFeatureEnabled] = useState(true);

  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.data?.success && res.data?.settings) {
        setGpsFeatureEnabled(res.data.settings.gpsVerificationEnabled !== false);
      }
    }).catch(() => {});
  }, []);
  const fileInputRef = useRef(null);

  const handleDetectBrowserGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProofGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0)
        });
        setDetectingGps(false);
      },
      (err) => {
        alert('Could not get GPS location: ' + err.message);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Verification Issue Box
  const [showIssueBox, setShowIssueBox] = useState(false);
  const [issueNotes, setIssueNotes] = useState('');

  // Admin Full Rights Control State
  const [adminStatusOverride, setAdminStatusOverride] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  if (!requests.length) return null;

  // Milestone stages for the moving line frontend
  const stages = [
    { key: 'requested', label: 'Requested', icon: FileText, desc: 'Client requested remounting' },
    { key: 'paid', label: 'Paid (₹3/sq.ft)', icon: CreditCard, desc: 'Remounting fee cleared' },
    { key: 'flex_pickup', label: 'Flex Pickup', icon: Truck, desc: 'Printed vinyl collected' },
    { key: 'mounting', label: 'Site Mounting', icon: Wrench, desc: 'Crew fastening new flex' },
    { key: 'completed', label: 'Verified & Live', icon: CheckCircle2, desc: 'New banner live on site' }
  ];

  // Helper to map current status to an index in [0, 4]
  const getStageIndex = (status) => {
    switch (status) {
      case 'requested':
      case 'approved':
        return 0;
      case 'paid':
        return 1;
      case 'flex_pickup':
        return 2;
      case 'mounting':
        return 3;
      case 'proof_uploaded':
        return 3.5; // Proof uploaded, awaiting verification
      case 'completed':
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = activeReq ? getStageIndex(activeReq.status) : 0;

  // Cloudinary image upload handler for proof photo
  const handleProofFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingProof(true);

    try {
      const res = await api.post('/upload/single?folder=adverse/remounting_proofs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.fileUrl) {
        setProofPhotoUrl(res.data.fileUrl);
        if (!proofCaptureDateTime) {
          setProofCaptureDateTime(
            new Date().toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          );
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingProof(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Pay Remounting Fee (Customer / Admin)
  const handlePayRemounting = async (e) => {
    e.preventDefault();
    if (!activeReq) return;
    setLoadingAction(true);
    try {
      await api.post(`/bookings/${booking._id}/remounting/${activeReq.requestId}/pay`, {
        paymentMode: payMode,
        transactionReference: txnRef || `REM-UPI-${Date.now()}`,
        bankName: bankName || (payMode.startsWith('online') ? 'Online Gateway' : 'State Bank of India')
      });
      setShowPayModal(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process remounting payment.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Upload Remounting Proof (Seller / Admin)
  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!activeReq || !proofPhotoUrl.trim()) {
      alert('Please provide or upload a proof photo.');
      return;
    }
    setLoadingAction(true);
    try {
      const res = await api.post(`/bookings/${booking._id}/remounting/${activeReq.requestId}/proof`, {
        proofPhotoUrl: proofPhotoUrl.trim(),
        proofCaptureDateTime: proofCaptureDateTime || new Date().toLocaleString('en-IN'),
        notes: proofNotes,
        latitude: proofGps?.latitude,
        longitude: proofGps?.longitude,
        accuracy: proofGps?.accuracy,
        source: proofGps ? 'web_geolocation' : 'manual'
      });
      if (res.data?.verifiedOnSite) {
        alert(`🟢 On-Site Verified: Remounting proof captured ${res.data.distanceMeters}m from billboard.`);
      }
      setShowProofModal(false);
      setProofPhotoUrl('');
      setProofNotes('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload remounting proof.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Verify Remounting Proof (Customer / Admin)
  const handleVerify = async (verified) => {
    if (!activeReq) return;
    setLoadingAction(true);
    try {
      await api.put(`/bookings/${booking._id}/remounting/${activeReq.requestId}/verify`, {
        verified,
        notes: issueNotes
      });
      setShowIssueBox(false);
      setIssueNotes('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit verification.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Admin Quick Status Override (Admin Full Rights)
  const handleAdminStatusOverride = async () => {
    if (!activeReq || !adminStatusOverride) return;
    setLoadingAction(true);
    try {
      await api.put(`/bookings/${booking._id}/remounting/${activeReq.requestId}/status`, {
        status: adminStatusOverride,
        adminNotes: adminNotes || `Admin updated status to ${adminStatusOverride}`
      });
      setAdminStatusOverride('');
      setAdminNotes('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Admin override failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Seller operational phase updater
  const handleSellerPhaseUpdate = async (nextStatus) => {
    if (!activeReq) return;
    setLoadingAction(true);
    try {
      await api.put(`/bookings/${booking._id}/remounting/${activeReq.requestId}/status`, {
        status: nextStatus
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update phase.');
    } finally {
      setLoadingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200">Requested</span>;
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">Approved • Ready for Pay</span>;
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-indigo-100 text-indigo-900 border border-indigo-200">Fee Paid • Pickup Ready</span>;
      case 'flex_pickup':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200">Flex Collected</span>;
      case 'mounting':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200">Mounting In Progress</span>;
      case 'proof_uploaded':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-teal-100 text-teal-900 border border-teal-200">Proof Uploaded • Verify</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Remounted & Live</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-rose-100 text-rose-900 border border-rose-200">Rejected / Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-xs transition-all my-3">
      {/* Tracker Collapsible Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50 hover:bg-indigo-50/80 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                Flex Remounting
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                ₹3 / sq.ft Charge Flow
              </span>
              {activeReq && getStatusBadge(activeReq.status)}
            </div>
            <h4 className="text-sm font-black text-slate-900 mt-1 flex items-center gap-2">
              Flex Remounting Moving Pipeline
              {requests.length > 1 && (
                <span className="text-xs font-semibold text-slate-500">
                  (Request {selectedReqIndex + 1} of {requests.length})
                </span>
              )}
            </h4>
          </div>
        </div>

        {/* Right side fee pill & toggle button */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {activeReq && (
            <div className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-950 flex items-center gap-2 text-xs font-bold shadow-2xs">
              <span className="text-slate-400 font-normal">Charge:</span>
              <span className="text-emerald-700 font-black">₹{activeReq.totalAmount?.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-semibold text-slate-500">({activeReq.areaSqFt} sq.ft @ ₹3/sq.ft)</span>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 transition"
          >
            <span>{isOpen ? 'Collapse' : 'Expand Flow'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Moving Line Pipeline */}
      {isOpen && activeReq && (
        <div className="p-5 sm:p-6 border-t border-indigo-100 space-y-6 bg-white">
          {/* Multiple Requests Switcher if user requested remounting multiple times */}
          {requests.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 shrink-0">Remounting History:</span>
              {requests.map((r, idx) => (
                <button
                  key={r.requestId || idx}
                  onClick={() => setSelectedReqIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                    idx === selectedReqIndex
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{r.requestId} ({r.status})
                </button>
              ))}
            </div>
          )}

          {/* ================================================================= */}
          {/* THE MOVING LINE FRONTEND STEPPER */}
          {/* ================================================================= */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Live Moving Progress Line
              </span>
              <span className="text-xs font-bold text-indigo-700">
                Request ID: <span className="font-mono">{activeReq.requestId}</span>
              </span>
            </div>

            {/* Stepper with Moving Connection Line */}
            <div className="relative py-2">
              <div className="grid grid-cols-5 relative z-10">
                {stages.map((stage, idx) => {
                  const Icon = stage.icon;
                  const isDone = currentStageIndex > idx;
                  const isActive = Math.floor(currentStageIndex) === idx || (idx === 3 && currentStageIndex === 3.5);
                  const isPending = currentStageIndex < idx;

                  return (
                    <div key={stage.key} className="flex flex-col items-center text-center px-1">
                      {/* Node Circle */}
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                            : isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 ring-4 ring-indigo-200 ring-offset-2 animate-pulse'
                            : 'bg-white border-2 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        ) : (
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}

                        {/* Pulsing indicator badge for active node */}
                        {isActive && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                          </span>
                        )}
                      </div>

                      {/* Stage Label */}
                      <div className="mt-2.5">
                        <span
                          className={`text-xs font-black block leading-tight ${
                            isActive
                              ? 'text-indigo-900'
                              : isDone
                              ? 'text-emerald-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </span>
                        <span className="hidden sm:block text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          {stage.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* The Horizontal Line Behind Nodes */}
              <div className="absolute top-[26px] sm:top-[30px] left-[10%] right-[10%] h-1.5 -z-0 bg-slate-200 rounded-full overflow-hidden">
                {/* Completed solid progress line */}
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (currentStageIndex / 4) * 100)}%`
                  }}
                />

                {/* Animated Moving Line Current (shows moving light gradient if not fully completed) */}
                {currentStageIndex < 4 && (
                  <div
                    className="absolute inset-y-0 h-full bg-gradient-to-r from-emerald-500 via-indigo-400 to-amber-400 animate-pulse transition-all duration-300 opacity-80"
                    style={{
                      left: `${Math.max(0, ((currentStageIndex - 0.25) / 4) * 100)}%`,
                      width: '25%'
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* PRICING & CALCULATION DETAIL CARD (₹3 / sq.ft itemization) */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Billboard Specifications
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensions:</span>
                  <span className="font-bold text-slate-800">
                    {activeReq.dimensions?.width} ft × {activeReq.dimensions?.height} ft
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calculated Area:</span>
                  <span className="font-black text-indigo-900 font-mono">
                    {activeReq.areaSqFt} sq.ft
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100 shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> Platform Pricing Formula
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Standard Rate:</span>
                  <span className="font-bold text-emerald-800">₹3 per square foot</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Calculation:</span>
                  <span className="font-black text-emerald-900 font-mono">
                    {activeReq.areaSqFt} × ₹3 = ₹{activeReq.totalAmount?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50/50 to-white border border-purple-100 shadow-2xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Payment Status
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-black capitalize">
                    {activeReq.paymentStatus === 'paid' ? (
                      <span className="text-emerald-700">✓ Paid (Cleared)</span>
                    ) : (
                      <span className="text-amber-700">Pending</span>
                    )}
                  </span>
                </div>
                {activeReq.paymentDetails?.transactionReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Txn Ref:</span>
                    <span className="font-mono text-purple-900 text-[11px] truncate max-w-[140px]">
                      {activeReq.paymentDetails.transactionReference}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New Creative Graphic Preview if attached */}
          {activeReq.newCreativeUrl && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={activeReq.newCreativeUrl}
                  alt="New Flex Creative"
                  className="w-20 h-14 object-cover rounded-lg border border-slate-300 shadow-2xs"
                />
                <div>
                  <h5 className="text-xs font-bold text-slate-900">
                    {activeReq.campaignName || 'New Campaign Creative Attached'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Vinyl flex artwork ready for printing & remounting.
                  </p>
                </div>
              </div>
              <a
                href={activeReq.newCreativeUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-50 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Artwork
              </a>
            </div>
          )}

          {/* Replacement Proof Photo Display (when uploaded) */}
          {activeReq.proofPhotoUrl && (
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={activeReq.proofPhotoUrl}
                alt="Remounted Hoarding Proof"
                className="w-36 h-24 object-cover rounded-lg border border-purple-300 shadow-xs shrink-0"
              />
              <div className="text-xs space-y-1.5">
                <div className="font-black text-purple-950 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-700" />
                  Remounted Site Proof Photo
                </div>
                <div className="text-slate-700">
                  Stamped Timestamp: <span className="font-mono font-bold text-purple-900">{activeReq.proofCaptureDateTime}</span>
                </div>
                {activeReq.proofNotes && (
                  <p className="text-slate-600 italic">"{activeReq.proofNotes}"</p>
                )}
                <a
                  href={activeReq.proofPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Inspect Full Resolution Photo
                </a>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ROLE-BASED ACTION PANELS */}
          {/* ================================================================= */}

          {/* 1. CUSTOMER ACTIONS */}
          {(userRole === 'customer' || userRole === 'admin') && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {activeReq.status === 'requested' || activeReq.status === 'approved' ? (
                  <span>Awaiting payment of <strong>₹{activeReq.totalAmount}</strong> to dispatch the remounting crew.</span>
                ) : activeReq.status === 'proof_uploaded' ? (
                  <span>Please inspect the replacement proof photo and confirm installation.</span>
                ) : activeReq.status === 'completed' ? (
                  <span className="text-emerald-700 font-bold">✓ Remounting successfully completed & verified!</span>
                ) : (
                  <span>Crew is executing flex pickup and site mounting.</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Pay button */}
                {activeReq.paymentStatus !== 'paid' && ['requested', 'approved'].includes(activeReq.status) && (
                  <button
                    type="button"
                    onClick={() => setShowPayModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay ₹{activeReq.totalAmount} Remounting Fee
                  </button>
                )}

                {/* Proof Verification Buttons */}
                {activeReq.status === 'proof_uploaded' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowIssueBox(!showIssueBox)}
                      className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
                    >
                      Report Quality Issue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(true)}
                      disabled={loadingAction}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Verify & Activate New Banner
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Issue report box */}
          {showIssueBox && (
            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2 text-xs">
              <label className="font-bold text-rose-900 block">Describe remounting defect (e.g. flex loose, wrinkled, misalignment)</label>
              <textarea
                rows={2}
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="The flex appears tilted or wrinkled at top right corner..."
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIssueBox(false)}
                  className="px-3 py-1 text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify(false)}
                  disabled={loadingAction}
                  className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg"
                >
                  Submit Issue Report
                </button>
              </div>
            </div>
          )}

          {/* 2. SELLER ACTIONS */}
          {(userRole === 'seller' || userRole === 'admin') && activeReq.paymentStatus === 'paid' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                Site Owner Operations
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {activeReq.status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => handleSellerPhaseUpdate('flex_pickup')}
                    disabled={loadingAction}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-2xs flex items-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" /> Mark Flex Picked Up
                  </button>
                )}

                {activeReq.status === 'flex_pickup' && (
                  <button
                    type="button"
                    onClick={() => handleSellerPhaseUpdate('mounting')}
                    disabled={loadingAction}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-2xs flex items-center gap-1"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Start Site Remounting
                  </button>
                )}

                {['mounting', 'flex_pickup'].includes(activeReq.status) && (
                  <button
                    type="button"
                    onClick={() => setShowProofModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition shadow-2xs flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" /> Upload Replacement Proof Photo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3. ADMIN FULL RIGHTS STATUS OVERRIDE PANEL */}
          {/* User requirement: "make sure admin have all right to set the status" */}
          {/* ================================================================= */}
          {userRole === 'admin' && (
            <div className="p-4 rounded-xl bg-purple-50/80 border-2 border-dashed border-purple-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-700" />
                  Admin Full Rights Status Override
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  Super Admin Authority
                </span>
              </div>
              <p className="text-xs text-purple-800">
                As Admin, you have unrestricted rights to instantly change the remounting status to any stage or waive requirements.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <select
                  value={adminStatusOverride || activeReq.status}
                  onChange={(e) => setAdminStatusOverride(e.target.value)}
                  className="p-2 text-xs border border-purple-300 rounded-lg bg-white font-bold text-slate-800 w-full sm:w-auto"
                >
                  <option value="requested">requested (Client Submitted Request)</option>
                  <option value="approved">approved (Approved - Ready for Payment)</option>
                  <option value="paid">paid (Fee Paid - Ready for Pickup)</option>
                  <option value="flex_pickup">flex_pickup (Flex Banner Picked Up)</option>
                  <option value="mounting">mounting (Crew Mounting On Site)</option>
                  <option value="proof_uploaded">proof_uploaded (Proof Photo Uploaded)</option>
                  <option value="completed">completed (Verified & Remounting Completed)</option>
                  <option value="rejected">rejected (Rejected by Admin)</option>
                  <option value="cancelled">cancelled (Cancelled)</option>
                </select>

                <input
                  type="text"
                  placeholder="Admin override reason / notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="p-2 text-xs border border-purple-300 rounded-lg bg-white flex-1 w-full"
                />

                <button
                  type="button"
                  onClick={handleAdminStatusOverride}
                  disabled={loadingAction || !adminStatusOverride}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-lg shadow-xs transition shrink-0"
                >
                  Set Status
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PAY REMOUNTING FEE */}
      {/* ===================================================================== */}
      {showPayModal && activeReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Pay Flex Remounting Fee
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Rate: ₹3 per sq.ft • Billboard Area: {activeReq.areaSqFt} sq.ft
            </p>

            <div className="my-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-600 block">Total Remounting Charge</span>
                <span className="text-2xl font-black text-indigo-900 font-mono">
                  ₹{activeReq.totalAmount?.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase bg-indigo-200 text-indigo-900">
                ₹3 / sq.ft
              </span>
            </div>

            <form onSubmit={handlePayRemounting} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                >
                  <option value="online_upi">Instant UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="online_card">Credit / Debit Card</option>
                  <option value="net_banking">Internet Banking</option>
                  <option value="bank_transfer">Direct NEFT / RTGS</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transaction Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-9843274293"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg shadow-sm"
                >
                  {loadingAction ? 'Processing...' : `Confirm & Pay ₹${activeReq.totalAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: UPLOAD PROOF PHOTO (SELLER / ADMIN) */}
      {/* ===================================================================== */}
      {showProofModal && activeReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              Upload Remounted Proof Photo
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload clear photo of the newly mounted vinyl flex stamped with capture date & time.
            </p>

            <form onSubmit={handleUploadProof} className="space-y-3.5 my-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Proof Photo File</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleProofFileUpload}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
                {uploadingProof && <span className="text-[11px] text-purple-700 font-bold">Uploading to Cloudinary...</span>}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Or Photo URL</label>
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/.../proof.jpg"
                  value={proofPhotoUrl}
                  onChange={(e) => setProofPhotoUrl(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Capture Date & Time</label>
                <input
                  type="text"
                  placeholder="e.g. 18 Oct 2026, 03:30 PM"
                  value={proofCaptureDateTime}
                  onChange={(e) => setProofCaptureDateTime(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Rigging complete, all edges tensioned securely..."
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction || !proofPhotoUrl.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-lg shadow-sm"
                >
                  {loadingAction ? 'Submitting...' : 'Submit Proof Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

