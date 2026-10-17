import React, { useState, useRef } from 'react';
import api from '../services/api';
import {
  Wrench,
  X,
  Upload,
  Sparkles,
  Info,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function RequestRemountingModal({
  booking,
  isOpen,
  onClose,
  onSuccess
}) {
  if (!isOpen || !booking) return null;

  const hoarding = booking.hoardingId || {};
  const initialWidth = Number(hoarding.dimensions?.width) || 20;
  const initialHeight = Number(hoarding.dimensions?.height) || 10;

  const [campaignName, setCampaignName] = useState(booking.campaignName || '');
  const [newCreativeUrl, setNewCreativeUrl] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [customWidth, setCustomWidth] = useState(initialWidth);
  const [customHeight, setCustomHeight] = useState(initialHeight);

  // Cloudinary image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fixed ₹3/sq.ft platform standard calculation
  const REMOUNTING_RATE = 3;
  const areaSqFt = Math.max(1, Math.round((Number(customWidth) || 0) * (Number(customHeight) || 0)));
  const totalAmount = areaSqFt * REMOUNTING_RATE;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingImage(true);
    setError('');

    try {
      const res = await api.post('/upload/single?folder=adverse/remounting_creatives', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.fileUrl) {
        setNewCreativeUrl(res.data.fileUrl);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload creative artwork.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post(`/bookings/${booking._id}/remounting`, {
        campaignName: campaignName.trim(),
        newCreativeUrl: newCreativeUrl.trim(),
        pickupAddress: pickupAddress.trim(),
        notes: notes.trim(),
        customWidth: Number(customWidth),
        customHeight: Number(customHeight)
      });

      if (res.data.success) {
        if (onSuccess) onSuccess(res.data.remountingRequest);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit remounting request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                Ongoing Booking Service
              </span>
              <span className="text-xs font-bold text-slate-400">
                #{booking.bookingNumber}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Request Flex Remounting
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Need to replace or update your vinyl flex banner for this site? Submit a remounting request.
        </p>

        {/* Pricing Calculation Banner (₹3 / sq.ft standard) */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-emerald-50/40 border border-indigo-200 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Standard Platform Rate: ₹3 / sq.ft
            </span>
            <span className="text-[11px] font-bold text-indigo-700">Fixed Cost</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-bold">Dimensions</span>
              <span className="font-bold text-slate-800">{customWidth} × {customHeight} ft</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-bold">Total Area</span>
              <span className="font-black text-indigo-900 font-mono">{areaSqFt} sq.ft</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
              <span className="text-[10px] text-emerald-700 block font-bold">Remounting Fee</span>
              <span className="font-black text-emerald-800 font-mono text-sm">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 mt-2 flex items-center justify-between">
            <span>Calculation formula:</span>
            <span className="font-mono font-bold text-indigo-950">
              {areaSqFt} sq.ft × ₹3 = ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Campaign / Creative Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Festive Offer Campaign (Phase 2)"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
            />
          </div>

          {/* New Artwork Upload / Link */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              New Flex Creative Artwork
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white"
                />
              </div>
              {uploadingImage && (
                <span className="text-[11px] text-indigo-600 font-bold">
                  Uploading image to Cloudinary...
                </span>
              )}
              <input
                type="url"
                placeholder="Or paste artwork URL (e.g. https://...)"
                value={newCreativeUrl}
                onChange={(e) => setNewCreativeUrl(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl font-mono text-[11px]"
              />
            </div>
            {newCreativeUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={newCreativeUrl}
                  alt="Preview"
                  className="w-14 h-10 object-cover rounded-md border border-slate-300"
                />
                <span className="text-[11px] text-emerald-700 font-bold">
                  ✓ Artwork attached
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Flex Pickup Address / Contact
            </label>
            <input
              type="text"
              placeholder="Address where printed flex can be collected from..."
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Special Instructions for Rigging Crew (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Please mount before Friday evening, ensure corner lighting is aligned..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md shadow-indigo-200 transition flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : `Submit Request (₹${totalAmount})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
