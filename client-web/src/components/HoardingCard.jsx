import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Maximize2, Zap, Calendar } from 'lucide-react';

export default function HoardingCard({ hoarding }) {
  const photo = hoarding.photos && hoarding.photos.length > 0
    ? hoarding.photos[0]
    : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80';

  const isAvailable = hoarding.availabilityStatus === 'available';

  const lightingBadgeColor = {
    'Frontlit': 'bg-amber-100 text-amber-800 border-amber-200',
    'Backlit': 'bg-blue-100 text-blue-800 border-blue-200',
    'Digital/LED': 'bg-purple-100 text-purple-800 border-purple-200',
    'Non-lit': 'bg-slate-100 text-slate-700 border-slate-200'
  }[hoarding.lightingType] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={photo}
          alt={hoarding.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80';
          }}
        />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md ${
              isAvailable
                ? 'bg-emerald-500/90 text-white border-emerald-400'
                : 'bg-amber-500/90 text-white border-amber-400'
            }`}
          >
            {isAvailable ? 'Available Now' : 'Currently Booked'}
          </span>

          {typeof hoarding.distanceKm === 'number' && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur-md shadow-sm flex items-center gap-1">
              <MapPin className="w-3 h-3 text-brand-400" />
              {hoarding.distanceKm} km away
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white/95 text-slate-800 shadow-sm border border-slate-200/50">
            {hoarding.hoardingType}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span className="truncate">{hoarding.location.city}, {hoarding.location.landmark || hoarding.location.district}</span>
          </div>

          <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-brand-600 transition-colors line-clamp-1">
            {hoarding.title}
          </h3>

          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {hoarding.description || hoarding.location.address}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              <Maximize2 className="w-3 h-3 text-slate-500" />
              {hoarding.dimensions.width} × {hoarding.dimensions.height} ft
            </span>

            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${lightingBadgeColor}`}>
              <Zap className="w-3 h-3" />
              {hoarding.lightingType}
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              <Calendar className="w-3 h-3 text-slate-500" />
              Min {hoarding.pricing.minimumBookingDays || 15} days
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Monthly Rent</span>
            <span className="text-lg font-extrabold text-slate-900">
              ₹{hoarding.pricing.baseRatePerMonth.toLocaleString('en-IN')}
            </span>
          </div>

          <Link
            to={`/hoardings/${hoarding._id}`}
            className="px-4 py-2 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-600 hover:text-white rounded-lg transition-colors border border-brand-200"
          >
            View & Book
          </Link>
        </div>
      </div>
    </div>
  );
}
