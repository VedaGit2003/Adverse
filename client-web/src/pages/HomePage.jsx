import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import HoardingCard from '../components/HoardingCard';
import { Search, MapPin, Navigation, Sparkles, Shield, Building2, ArrowRight } from 'lucide-react';

const POPULAR_HUBS = ['Kolkata', 'Park Street', 'Salt Lake', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol'];

export default function HomePage() {
  const [searchLocation, setSearchLocation] = useState('');
  const [featuredHoardings, setFeaturedHoardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/hoardings?limit=6');
        setFeaturedHoardings(res.data.hoardings || []);
      } catch (err) {
        console.error('Failed to load featured:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchLocation.trim()) {
      navigate(`/search?location=${encodeURIComponent(searchLocation.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        navigate(`/search?lat=${latitude}&lng=${longitude}`);
      },
      () => {
        setLocating(false);
        navigate('/search?location=Kolkata');
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-400/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            West Bengal's #1 Outdoor Advertising Marketplace
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Rent Prime Hoarding Sites <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-brand-400 to-indigo-300 bg-clip-text text-transparent">
              Online & Manage Bookings Digitally
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Enter any location in Kolkata, Howrah, Siliguri or across West Bengal to discover available billboards, unipoles, and LED digital screens with live rates and offline payment options.
          </p>

          <div className="mt-10 max-w-3xl mx-auto bg-white p-3 rounded-2xl shadow-2xl shadow-brand-950/50 border border-slate-200 text-slate-900">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 flex items-center gap-3 w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin className="w-5 h-5 text-brand-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Enter location (e.g. Park Street, Salt Lake, Siliguri, Howrah)..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full bg-transparent text-sm sm:text-base font-medium outline-none text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Navigation className={`w-4 h-4 text-brand-600 ${locating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Near Me</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </form>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs py-1">
              <span className="text-slate-400 font-medium shrink-0">Popular in WB:</span>
              {POPULAR_HUBS.map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => navigate(`/search?location=${encodeURIComponent(hub)}`)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-600 font-semibold transition-colors shrink-0"
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4 p-4 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Geo-Targeted Discovery</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Pinpoint high-impact hoardings across Kolkata, Howrah, Siliguri, and highways with exact GPS distance and high-res site photos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Offline & Online Payments</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Support for Cheque, Bank Transfer (NEFT/RTGS/UPI), and Cash receipts with full digital tracking and seller payment verification.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Dedicated Seller Portal</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hoarding owners can enlist sites, set custom rate cards, approve bookings, and monitor occupancy calendars in real time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
              West Bengal Inventory
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Featured Outdoor Advertising Sites
            </h2>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700"
          >
            Explore All WB Hoardings <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : featuredHoardings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredHoardings.map((h) => (
              <HoardingCard key={h._id} hoarding={h} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm">No hoardings found. Please run seed script.</p>
          </div>
        )}
      </section>
    </div>
  );
}

