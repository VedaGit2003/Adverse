import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import HoardingCard from '../components/HoardingCard';
import { Search, MapPin, RefreshCw } from 'lucide-react';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationParam = searchParams.get('location') || '';
  const latParam = searchParams.get('lat') || '';
  const lngParam = searchParams.get('lng') || '';

  const [locationInput, setLocationInput] = useState(locationParam);
  const [hoardings, setHoardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchedTitle, setSearchedTitle] = useState('');

  const [radius, setRadius] = useState(30);
  const [lightingType, setLightingType] = useState('');
  const [hoardingType, setHoardingType] = useState('');
  const [status, setStatus] = useState('');

  const fetchHoardings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (locationParam) params.location = locationParam;
      if (latParam && lngParam) {
        params.lat = latParam;
        params.lng = lngParam;
      }
      if (radius) params.radius = radius;
      if (lightingType) params.lightingType = lightingType;
      if (hoardingType) params.hoardingType = hoardingType;
      if (status) params.status = status;

      const res = await api.get('/hoardings/nearby', { params });
      setHoardings(res.data.hoardings || []);
      setSearchedTitle(res.data.searchedLocation || 'West Bengal');
    } catch (err) {
      console.error('Failed to search:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLocationInput(locationParam);
    fetchHoardings();
  }, [locationParam, latParam, lngParam, radius, lightingType, hoardingType, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (locationInput.trim()) {
      newParams.set('location', locationInput.trim());
    }
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <MapPin className="w-5 h-5 text-brand-600 shrink-0" />
              <input
                type="text"
                placeholder="Search city, area, or landmark in West Bengal..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full bg-transparent text-sm font-medium outline-none text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Max Distance Radius</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
              >
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
                <option value={100}>Within 100 km</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Illumination Type</label>
              <select
                value={lightingType}
                onChange={(e) => setLightingType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
              >
                <option value="">All Lighting</option>
                <option value="Frontlit">Frontlit</option>
                <option value="Backlit">Backlit</option>
                <option value="Digital/LED">Digital / LED Screen</option>
                <option value="Non-lit">Non-lit</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Hoarding Type</label>
              <select
                value={hoardingType}
                onChange={(e) => setHoardingType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
              >
                <option value="">All Formats</option>
                <option value="Unipole">Unipole</option>
                <option value="Billboard">Billboard</option>
                <option value="Gantry">Gantry</option>
                <option value="LED Digital Screen">LED Digital Screen</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Availability</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
              >
                <option value="">All Sites</option>
                <option value="available">Available Immediately</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Hoardings near: <span className="text-brand-600">{searchedTitle}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {hoardings.length} outdoor advertising sites
            </p>
          </div>

          <button
            onClick={fetchHoardings}
            className="p-2 text-slate-500 hover:text-brand-600 bg-white border border-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : hoardings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hoardings.map((hoarding) => (
              <HoardingCard key={hoarding._id} hoarding={hoarding} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">No Hoardings Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try expanding your search radius.</p>
          </div>
        )}
      </div>
    </div>
  );
}
