import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import HoardingCard from '../components/HoardingCard';
import HoardingMap from '../components/HoardingMap';
import {
  Search,
  MapPin,
  RefreshCw,
  Navigation,
  Map as MapIcon,
  LayoutGrid,
  Columns,
  Crosshair,
  SlidersHorizontal,
  X
} from 'lucide-react';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationParam = searchParams.get('location') || '';
  const latParam = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
  const lngParam = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;

  const [locationInput, setLocationInput] = useState(locationParam);
  const [hoardings, setHoardings] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [searchedTitle, setSearchedTitle] = useState('');

  // Filters
  const [radius, setRadius] = useState(30);
  const [lightingType, setLightingType] = useState('');
  const [hoardingType, setHoardingType] = useState('');
  const [status, setStatus] = useState('');

  // View Mode: 'split' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState('split');

  // Map Center: [lat, lng]
  const [mapCenter, setMapCenter] = useState(
    latParam && lngParam ? [latParam, lngParam] : [22.5726, 88.3639]
  );
  const [searchPin, setSearchPin] = useState(
    latParam && lngParam ? [latParam, lngParam] : null
  );

  // Fetch West Bengal categorized locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get('/hoardings/locations');
        if (res.data?.regions) {
          setRegions(res.data.regions);
        }
      } catch (err) {
        console.warn('Could not load dynamic locations, using fallback', err);
      }
    };
    fetchLocations();
  }, []);

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
      const found = res.data.hoardings || [];
      setHoardings(found);
      setSearchedTitle(res.data.searchedLocation || (locationParam ? locationParam : 'West Bengal'));

      // If we have coordinates from URL or results, update map center
      if (latParam && lngParam) {
        setMapCenter([latParam, lngParam]);
        setSearchPin([latParam, lngParam]);
      } else if (found.length > 0 && found[0].location?.geo?.coordinates) {
        const [hLng, hLat] = found[0].location.geo.coordinates;
        if (hLat && hLng) setMapCenter([hLat, hLng]);
      }
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

  // Quick Area Dropdown Select
  const handleSelectArea = (e) => {
    const val = e.target.value;
    if (!val) return;

    // Value format: "lat,lng,name"
    const [lat, lng, name] = val.split('|');
    if (lat && lng) {
      const newParams = new URLSearchParams();
      newParams.set('lat', lat);
      newParams.set('lng', lng);
      newParams.set('location', name);
      setSearchParams(newParams);
      setLocationInput(name);
      setMapCenter([parseFloat(lat), parseFloat(lng)]);
      setSearchPin([parseFloat(lat), parseFloat(lng)]);
    }
  };

  // Click on Map to Search
  const handleMapSearchCenterChange = (clickedLat, clickedLng) => {
    const newParams = new URLSearchParams();
    newParams.set('lat', clickedLat.toFixed(5));
    newParams.set('lng', clickedLng.toFixed(5));
    newParams.set('location', `Map Pin (${clickedLat.toFixed(3)}, ${clickedLng.toFixed(3)})`);
    setSearchParams(newParams);
    setSearchPin([clickedLat, clickedLng]);
    setMapCenter([clickedLat, clickedLng]);
    setLocationInput(`Map Location (${clickedLat.toFixed(3)}, ${clickedLng.toFixed(3)})`);
  };

  // Use Browser GPS Location
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
        const newParams = new URLSearchParams();
        newParams.set('lat', latitude.toFixed(5));
        newParams.set('lng', longitude.toFixed(5));
        newParams.set('location', 'My Current Location');
        setSearchParams(newParams);
        setSearchPin([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setLocationInput('My Current Location');
      },
      (err) => {
        setLocating(false);
        alert('Could not retrieve your location. Please select an area from the list.');
      },
      { timeout: 10000 }
    );
  };

  const handleClearPin = () => {
    const newParams = new URLSearchParams();
    newParams.set('location', 'Kolkata');
    setSearchParams(newParams);
    setSearchPin(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search & Area Selection Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            {/* Text Search Input */}
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 transition">
              <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                placeholder="Search city, area, metro station, or landmark in West Bengal..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none text-slate-800 placeholder-slate-400"
              />
              {searchPin && (
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                  title="Clear Map Pin"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categorized West Bengal Area Dropdown */}
            <div className="w-full md:w-64">
              <select
                onChange={handleSelectArea}
                defaultValue=""
                className="w-full h-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">⭐ Select from 50+ WB Areas</option>
                {regions.map((reg) => (
                  <optgroup key={reg.region} label={reg.region}>
                    {reg.areas.map((area) => (
                      <option
                        key={area.id}
                        value={`${area.lat}|${area.lng}|${area.name}`}
                      >
                        {area.name} ({area.city})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shrink-0"
                title="Use Current GPS Location"
              >
                <Navigation className={`w-4 h-4 text-indigo-600 ${locating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Near Me</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Secondary Filters Bar */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Search Radius</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
              >
                <option value={5}>Within 5 km (Hyperlocal)</option>
                <option value={10}>Within 10 km (City Zone)</option>
                <option value={25}>Within 25 km (Metropolitan)</option>
                <option value={50}>Within 50 km (Regional Hub)</option>
                <option value={100}>Within 100 km (Highways)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Illumination</label>
              <select
                value={lightingType}
                onChange={(e) => setLightingType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
              >
                <option value="">All Lighting</option>
                <option value="Frontlit">Frontlit</option>
                <option value="Backlit">Backlit</option>
                <option value="Digital/LED">Digital / LED Screen</option>
                <option value="Non-lit">Non-lit</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Board Format</label>
              <select
                value={hoardingType}
                onChange={(e) => setHoardingType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
              >
                <option value="">All Formats</option>
                <option value="Unipole">Unipole</option>
                <option value="Billboard">Billboard</option>
                <option value="Gantry">Gantry</option>
                <option value="LED Digital Screen">LED Digital Screen</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Availability</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
              >
                <option value="">All Sites</option>
                <option value="available">Available Immediately</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header with View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                Live Marketplace
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {searchPin ? 'Interactive Map Search' : 'West Bengal Region'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Hoardings near: <span className="text-indigo-600">{searchedTitle}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Found <strong className="text-slate-900">{hoardings.length}</strong> outdoor advertising sites within {radius} km radius
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  viewMode === 'split' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  viewMode === 'map' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map Only</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid Only</span>
              </button>
            </div>

            <button
              onClick={fetchHoardings}
              className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl shadow-xs transition"
              title="Refresh Listings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Pin Notice Banner */}
        {searchPin && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-900 font-semibold shadow-xs">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Searching within <strong>{radius} km</strong> of custom map coordinate ({searchPin[0].toFixed(4)}, {searchPin[1].toFixed(4)}). Click anywhere on the map to move the search pin.
              </span>
            </div>
            <button
              onClick={handleClearPin}
              className="text-rose-700 hover:text-rose-900 underline shrink-0 font-bold"
            >
              Reset to Area
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* MAIN RESULTS DISPLAY (SPLIT, MAP, OR GRID) */}
        {/* ============================================================== */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Interactive Map (Left/Top) */}
            <div className="lg:col-span-6 sticky top-6">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <MapIcon className="w-4 h-4" /> Interactive Google / OSM Map
                </span>
                <span className="text-[11px] text-slate-400">Click map to search nearby</span>
              </div>
              <HoardingMap
                hoardings={hoardings}
                center={mapCenter}
                searchLocation={searchPin}
                radiusKm={radius}
                onSearchCenterChange={handleMapSearchCenterChange}
                height="620px"
              />
            </div>

            {/* Hoardings List (Right) */}
            <div className="lg:col-span-6 space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="bg-white rounded-2xl h-72 animate-pulse border border-slate-200" />
                  ))}
                </div>
              ) : hoardings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hoardings.map((hoarding) => (
                    <HoardingCard key={hoarding._id} hoarding={hoarding} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800 text-lg">No Hoardings Found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try clicking another area on the map or expanding your search radius to 50 km.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="space-y-4">
            <HoardingMap
              hoardings={hoardings}
              center={mapCenter}
              searchLocation={searchPin}
              radiusKm={radius}
              onSearchCenterChange={handleMapSearchCenterChange}
              height="700px"
            />
          </div>
        )}

        {viewMode === 'grid' && (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
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
                <p className="text-xs text-slate-500 mt-1">Try expanding your search radius or choosing another area.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
