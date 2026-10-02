import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-extrabold text-lg">
                AD
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">ADVERSE</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              West Bengal's premier digital marketplace connecting hoarding site owners with advertisers. Seamless offline & online booking and payment tracking.
            </p>
            <div className="pt-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> 100% Verified Hoarding Inventory
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase">WB Prime Hubs</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/search?location=Kolkata" className="hover:text-brand-400 transition-colors">Kolkata</Link></li>
              <li><Link to="/search?location=Howrah" className="hover:text-brand-400 transition-colors">Howrah</Link></li>
              <li><Link to="/search?location=Siliguri" className="hover:text-brand-400 transition-colors">Siliguri</Link></li>
              <li><Link to="/search?location=Durgapur" className="hover:text-brand-400 transition-colors">Durgapur</Link></li>
              <li><Link to="/search?location=Asansol" className="hover:text-brand-400 transition-colors">Asansol</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/search" className="hover:text-brand-400 transition-colors">Search Nearby</Link></li>
              <li><Link to="/register?role=seller" className="hover:text-brand-400 transition-colors">List Hoarding</Link></li>
              <li><Link to="/login" className="hover:text-brand-400 transition-colors">Offline Booking Desk</Link></li>
              <li><Link to="/login" className="hover:text-brand-400 transition-colors">Advertiser Portal</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase">Headquarters</h4>
            <p className="text-sm text-slate-400 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <span>Sector V, Salt Lake, Kolkata - 700091</span>
            </p>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand-400 shrink-0" />
              <span>+91 98300 00001</span>
            </p>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-400 shrink-0" />
              <span>contact@adverse.in</span>
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Adverse Technologies. All rights reserved.</p>
          <p>West Bengal Outdoor Advertising (OOH) Platform</p>
        </div>
      </div>
    </footer>
  );
}
