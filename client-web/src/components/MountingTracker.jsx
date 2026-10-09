import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wrench,
  Camera,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Upload,
  AlertTriangle,
  Layers
} from 'lucide-react';

export default function MountingTracker({
  booking,
  userRole = 'customer',
  onUpdate,
  defaultOpen = false
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [loadingAction, setLoadingAction] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [proofCaptureDateTime, setProofCaptureDateTime] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [timeLeftMounting, setTimeLeftMounting] = useState('');
  const [timeLeftVerification, setTimeLeftVerification] = useState('');

  const m = booking?.mountingDetails || {};
  const isSellerOrAdmin = userRole === 'seller' || userRole === 'admin';
  const isCustomerOrAdmin = userRole === 'customer' || userRole === 'admin';

  // Compute countdowns
  useEffect(() => {
    const updateCountdowns = () => {
      // 3-Day Mounting Window Countdown
      if (m.windowEndsAt && (['mounting_window', 'verification_pending', 'confirmed'].includes(booking.bookingStatus))) {
        const diff = new Date(m.windowEndsAt) - new Date();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeftMounting(`${hours}h ${mins}m`);
        } else {
          setTimeLeftMounting('Mounting window elapsed');
        }
      }

      // 4-Hour Customer Verification Countdown
      if (m.verificationWindowExpiresAt && booking.bookingStatus === 'verification_pending') {
        const diff = new Date(m.verificationWindowExpiresAt) - new Date();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeftVerification(`${hours}h ${mins}m ${secs}s`);
        } else {
          setTimeLeftVerification('Verification window expired (Auto-activating)');
        }
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [m.windowEndsAt, m.verificationWindowExpiresAt, booking.bookingStatus]);

  // Phase 1 / Phase 2 status updater
  const handleUpdatePhase = async (phase, status) => {
    setLoadingAction(true);
    try {
      await api.put(`/bookings/${booking._id}/mounting-phase`, {
        phase,
        status
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update phase');
    } finally {
      setLoadingAction(false);
    }
  };

  // Phase 3 Proof Upload
  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!proofPhotoUrl.trim()) {
      alert('Please provide a photo URL or upload an image.');
      return;
    }
    setLoadingAction(true);
    try {
      const captureTime = proofCaptureDateTime || new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await api.post(`/bookings/${booking._id}/mounting-proof`, {
        proofPhotoUrl: proofPhotoUrl.trim(),
        proofCaptureDateTime: captureTime,
        notes: proofNotes
      });
      setProofPhotoUrl('');
      setProofCaptureDateTime('');
      setProofNotes('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload proof');
    } finally {
      setLoadingAction(false);
    }
  };

  // Verify mounting proof
  const handleVerify = async (verified) => {
    setLoadingAction(true);
    try {
      await api.put(`/bookings/${booking._id}/verify-mounting`, {
        verified,
        notes: verifyNotes
      });
      setShowRejectBox(false);
      setVerifyNotes('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit verification');
    } finally {
      setLoadingAction(false);
    }
  };

  const getPhaseBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
          </span>
        );
      case 'in_progress':
      case 'proof_uploaded':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-indigo-100 text-indigo-800 flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3 text-indigo-600" /> In Progress
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-rose-100 text-rose-800 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Issue Reported
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-500">
            Pending
          </span>
        );
    }
  };

  const getCurrentPhaseBadge = () => {
    if (booking.bookingStatus === 'active') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified & Active
        </span>
      );
    }
    if (booking.bookingStatus === 'verification_pending') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 text-purple-800 flex items-center gap-1">
          <Clock className="w-3 h-3 text-purple-600 animate-spin" /> Phase 3: Verification Window
        </span>
      );
    }
    if (m.mountingStatus === 'completed') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
          <Camera className="w-3 h-3 text-amber-600" /> Phase 3: Proof Photo Needed
        </span>
      );
    }
    if (m.flexPickupStatus === 'completed') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-100 text-blue-800 flex items-center gap-1">
          <Wrench className="w-3 h-3 text-blue-600" /> Phase 2: Mounting In Progress
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700 flex items-center gap-1">
        <Truck className="w-3 h-3 text-slate-600" /> Phase 1: Flex Pick up
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all">
      {/* Collapsible Dropdown Clickable Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 transition"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
              isOpen ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                Mounting Pipeline
              </span>
              {getCurrentPhaseBadge()}
            </div>
            <h4 className="text-sm font-black text-slate-900 mt-0.5">
              Mounting & Verification Pipeline (3 Phases)
            </h4>
          </div>
        </div>

        {/* Right side: Countdown timers & Dropdown toggle button */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {booking.bookingStatus === 'mounting_window' && timeLeftMounting && (
            <div className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-1.5 text-xs font-bold shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Mounting: <strong>{timeLeftMounting}</strong> left</span>
            </div>
          )}

          {booking.bookingStatus === 'verification_pending' && timeLeftVerification && (
            <div className="px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center gap-1.5 text-xs font-bold shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-purple-600 animate-spin" />
              <span>Verify: <strong className="font-mono text-purple-700">{timeLeftVerification}</strong></span>
            </div>
          )}

          {booking.bookingStatus === 'active' && (
            <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-1.5 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Campaign Active</span>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
              isOpen
                ? 'bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
            }`}
          >
            <span>{isOpen ? 'Close Pipeline' : 'Open Pipeline'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </div>

      {/* Expanded Pipeline Details */}
      {isOpen && (
        <div className="p-5 sm:p-6 border-t border-slate-100 space-y-5 bg-white">

      {/* 3 PHASES PIPELINE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PHASE 1: FLEX PICK UP */}
        <div className={`p-4 rounded-xl border transition-all ${
          m.flexPickupStatus === 'completed'
            ? 'bg-emerald-50/50 border-emerald-200'
            : m.flexPickupStatus === 'in_progress'
            ? 'bg-indigo-50/40 border-indigo-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            {getPhaseBadge(m.flexPickupStatus)}
          </div>

          <div className="mt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phase 1</span>
            <h4 className="text-sm font-black text-slate-900">Flex Pick up</h4>
            <p className="text-xs text-slate-500 mt-1">
              Seller picks up printed vinyl flex banner from customer.
            </p>
            {m.flexPickupCompletedAt && (
              <p className="text-[11px] font-semibold text-emerald-700 mt-2">
                ✓ Picked up: {new Date(m.flexPickupCompletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>

          {/* Seller / Admin controls for Phase 1 */}
          {isSellerOrAdmin && booking.bookingStatus === 'mounting_window' && m.flexPickupStatus !== 'completed' && (
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
              {m.flexPickupStatus !== 'in_progress' && (
                <button
                  onClick={() => handleUpdatePhase('flex_pickup', 'in_progress')}
                  disabled={loadingAction}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Start Pickup
                </button>
              )}
              <button
                onClick={() => handleUpdatePhase('flex_pickup', 'completed')}
                disabled={loadingAction}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
              >
                Mark Done
              </button>
            </div>
          )}
        </div>

        {/* PHASE 2: MOUNTING */}
        <div className={`p-4 rounded-xl border transition-all ${
          m.mountingStatus === 'completed'
            ? 'bg-emerald-50/50 border-emerald-200'
            : m.mountingStatus === 'in_progress'
            ? 'bg-indigo-50/40 border-indigo-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Wrench className="w-5 h-5" />
            </div>
            {getPhaseBadge(m.mountingStatus)}
          </div>

          <div className="mt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phase 2</span>
            <h4 className="text-sm font-black text-slate-900">Hoarding Mounting</h4>
            <p className="text-xs text-slate-500 mt-1">
              Field rigging crew mounts and fastens flex onto hoarding structure.
            </p>
            {m.mountingCompletedAt && (
              <p className="text-[11px] font-semibold text-emerald-700 mt-2">
                ✓ Mounted: {new Date(m.mountingCompletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>

          {/* Seller / Admin controls for Phase 2 */}
          {isSellerOrAdmin && booking.bookingStatus === 'mounting_window' && m.mountingStatus !== 'completed' && (
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
              {m.mountingStatus !== 'in_progress' && (
                <button
                  onClick={() => handleUpdatePhase('mounting', 'in_progress')}
                  disabled={loadingAction}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Start Mounting
                </button>
              )}
              <button
                onClick={() => handleUpdatePhase('mounting', 'completed')}
                disabled={loadingAction}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
              >
                Mark Done
              </button>
            </div>
          )}
        </div>

        {/* PHASE 3: CONFIRMATION (PROOF PHOTO WITH DATE & TIME) */}
        <div className={`p-4 rounded-xl border transition-all ${
          m.confirmationStatus === 'verified'
            ? 'bg-emerald-50/50 border-emerald-200'
            : m.confirmationStatus === 'proof_uploaded'
            ? 'bg-purple-50/50 border-purple-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-purple-600 shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>
            {getPhaseBadge(m.confirmationStatus)}
          </div>

          <div className="mt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phase 3</span>
            <h4 className="text-sm font-black text-slate-900">Confirmation</h4>
            <p className="text-xs text-slate-500 mt-1">
              Seller uploads high-res proof photo stamped with capture date & time.
            </p>

            {m.proofPhotoUrl ? (
              <div className="mt-3 pt-2 border-t border-slate-200/60">
                <a
                  href={m.proofPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <Camera className="w-3.5 h-3.5" /> View Uploaded Proof Photo <ExternalLink className="w-3 h-3" />
                </a>
                <div className="text-[11px] font-semibold text-slate-700 mt-1">
                  📅 Photo Date/Time: <span className="font-mono text-purple-700 font-bold">{m.proofCaptureDateTime || 'Stamptime recorded'}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic mt-2">
                Awaiting installation photo upload by site owner.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SELLER PROOF UPLOAD FORM (IF IN MOUNTING WINDOW OR NOT YET UPLOADED) */}
      {isSellerOrAdmin && !m.proofPhotoUrl && booking.bookingStatus === 'mounting_window' && (
        <form onSubmit={handleUploadProof} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-black uppercase text-slate-800">
              Seller Action: Upload Hoarding Proof Picture (Phase 3)
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Once uploaded, a <strong>4-hour verification window</strong> will begin for customer and admin.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Proof Photo URL or Cloud Link *</label>
              <input
                type="url"
                required
                placeholder="https://images.unsplash.com/... or /uploads/..."
                value={proofPhotoUrl}
                onChange={(e) => setProofPhotoUrl(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Capture Date & Time Stamp *</label>
              <input
                type="text"
                placeholder={new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                value={proofCaptureDateTime}
                onChange={(e) => setProofCaptureDateTime(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">Notes / Rigging Remarks (Optional)</label>
            <input
              type="text"
              placeholder="Flawless vinyl stretch, night spotlights tested and functional"
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loadingAction}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{loadingAction ? 'Uploading...' : 'Submit Mounting Proof & Start 4-Hour Timer'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 4-HOUR VERIFICATION WINDOW BAR FOR CUSTOMER & ADMIN */}
      {booking.bookingStatus === 'verification_pending' && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-200 text-purple-900">
                  Verification Window Active
                </span>
                <span className="text-xs font-bold text-purple-700">• 4 Hours Allowed</span>
              </div>
              <h4 className="text-base font-black text-slate-900 mt-1">
                Please Inspect Proof Photo & Confirm Installation
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                The seller has mounted the hoarding. Customer has 4 hours to verify it before the subscription period automatically begins.
              </p>
            </div>

            {/* Countdown widget */}
            <div className="shrink-0 bg-white px-4 py-2 rounded-xl border border-purple-200 text-center shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Left</span>
              <span className="text-sm font-mono font-black text-purple-700">{timeLeftVerification}</span>
            </div>
          </div>

          {/* Proof Photo Display */}
          {m.proofPhotoUrl && (
            <div className="p-3 bg-white rounded-xl border border-purple-100 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={m.proofPhotoUrl}
                alt="Hoarding Mounting Proof"
                className="w-36 h-24 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0"
              />
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  Proof Photo Capture Timestamp: <span className="font-mono text-purple-700">{m.proofCaptureDateTime}</span>
                </div>
                {m.proofNotes && (
                  <p className="text-slate-500 italic">"{m.proofNotes}"</p>
                )}
                <a
                  href={m.proofPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Full-Resolution Photo
                </a>
              </div>
            </div>
          )}

          {/* Action buttons for Customer & Admin */}
          {isCustomerOrAdmin && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectBox(!showRejectBox)}
                className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
              >
                Report Mounting Issue
              </button>
              <button
                type="button"
                onClick={() => handleVerify(true)}
                disabled={loadingAction}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loadingAction ? 'Verifying...' : 'Verify & Start Campaign Subscription'}</span>
              </button>
            </div>
          )}

          {showRejectBox && (
            <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-2 text-xs">
              <label className="font-bold text-rose-800 block">Describe Issue (e.g. alignment, wrinkle, lighting)</label>
              <textarea
                rows={2}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="The flex appears loose on the right edge / lights not illuminated..."
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
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
        </div>
      )}

      {/* SUBSCRIPTION ACTIVE BANNER */}
      {booking.bookingStatus === 'active' && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                Subscription Officially Active
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Campaign term started on{' '}
                <strong>
                  {booking.subscriptionStartDate
                    ? new Date(booking.subscriptionStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Today'}
                </strong>{' '}
                and runs until{' '}
                <strong>
                  {booking.subscriptionEndDate
                    ? new Date(booking.subscriptionEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : `${booking.durationDays} days later`}
                </strong>
                .
              </p>
            </div>
          </div>

          {m.proofPhotoUrl && (
            <a
              href={m.proofPhotoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0"
            >
              View Verification Photo
            </a>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}

