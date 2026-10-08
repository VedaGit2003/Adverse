import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import {
  Layers,
  MapPin,
  Navigation,
  Eye,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';

// Custom Marker Icons using Tailwind & SVG
const createCustomIcon = (type = 'available', label = '') => {
  let bgColor = 'bg-emerald-600';
  let borderColor = 'border-emerald-200';
  let pulse = true;

  if (type === 'occupied') {
    bgColor = 'bg-indigo-600';
    borderColor = 'border-indigo-200';
    pulse = false;
  } else if (type === 'under_maintenance' || type === 'inactive') {
    bgColor = 'bg-amber-600';
    borderColor = 'border-amber-200';
    pulse = false;
  } else if (type === 'center') {
    bgColor = 'bg-rose-600';
    borderColor = 'border-rose-200';
    pulse = true;
  }

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center">
        ${pulse ? `<span class="animate-ping absolute inline-flex h-7 w-7 rounded-full ${bgColor} opacity-40"></span>` : ''}
        <div class="w-8 h-8 rounded-full ${bgColor} border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
          ${
            type === 'center'
              ? '🎯'
              : `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`
          }
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

// Component to dynamically pan and zoom when center changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Click event listener component for Map
function MapClickHandler({ onMapClick, pickerMode }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function HoardingMap({
  hoardings = [],
  center = [22.5726, 88.3639], // Default: Kolkata
  zoom = 12,
  radiusKm = null,
  searchLocation = null,
  onSearchCenterChange = null,
  pickerMode = false,
  selectedPoint = null,
  onPointPicked = null,
  height = '500px',
  interactive = true
}) {
  // Free Tile Providers
  const [mapLayer, setMapLayer] = useState('streets'); // 'streets' | 'satellite' | 'google-hybrid'

  const tileLayers = {
    streets: {
      name: 'OpenStreetMap (Streets)',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      name: 'Esri Satellite (Aerial)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    'google-hybrid': {
      name: 'Google Roads / Hybrid',
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps'
    }
  };

  const handleMapClick = (lat, lng) => {
    if (pickerMode && onPointPicked) {
      onPointPicked(lat, lng);
    } else if (onSearchCenterChange) {
      onSearchCenterChange(lat, lng);
    }
  };

  const activeCenter = searchLocation || selectedPoint || center;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      {/* Layer Toggle Bar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMapLayer('streets')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            mapLayer === 'streets' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Street
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('google-hybrid')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            mapLayer === 'google-hybrid' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hybrid
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            mapLayer === 'satellite' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Floating Info Overlay */}
      {pickerMode ? (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm px-3.5 py-2 rounded-xl shadow-md border border-amber-300 text-xs text-amber-900 font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
          <span>Click anywhere on the map to set the hoarding's exact GPS location</span>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-[11px] text-slate-600 font-semibold flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available ({hoardings.filter((h) => h.availabilityStatus === 'available').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Booked ({hoardings.filter((h) => h.availabilityStatus === 'occupied').length})
          </span>
          {onSearchCenterChange && (
            <span className="text-slate-400 border-l pl-2">🎯 Click map to search radius</span>
          )}
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={activeCenter}
        zoom={zoom}
        scrollWheelZoom={interactive}
        className="w-full h-full"
      >
        <TileLayer
          url={tileLayers[mapLayer].url}
          attribution={tileLayers[mapLayer].attribution}
          maxZoom={19}
        />

        <MapRecenter center={activeCenter} zoom={zoom} />
        {interactive && <MapClickHandler onMapClick={handleMapClick} pickerMode={pickerMode} />}

        {/* Search Center Circle & Pin */}
        {searchLocation && (
          <>
            <Marker position={searchLocation} icon={createCustomIcon('center')} />
            {radiusKm && (
              <Circle
                center={searchLocation}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: '#e11d48',
                  fillColor: '#fb7185',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '4, 8'
                }}
              />
            )}
          </>
        )}

        {/* Picker Mode Selected Pin */}
        {pickerMode && selectedPoint && (
          <Marker position={selectedPoint} icon={createCustomIcon('center')}>
            <Popup>
              <div className="text-xs p-1">
                <strong>Selected Location</strong>
                <p className="text-[11px] text-slate-500 mt-1">
                  Lat: {selectedPoint[0].toFixed(5)}, Lng: {selectedPoint[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hoarding Inventory Markers */}
        {hoardings.map((hoarding) => {
          const coords = hoarding.location?.geo?.coordinates;
          if (!coords || coords.length < 2) return null;
          const [lng, lat] = coords;
          if (!lat || !lng) return null;

          const isAvailable = hoarding.availabilityStatus === 'available';

          return (
            <Marker
              key={hoarding._id}
              position={[lat, lng]}
              icon={createCustomIcon(hoarding.availabilityStatus, hoarding.title)}
            >
              <Popup className="custom-hoarding-popup" minWidth={220} maxWidth={280}>
                <div className="text-slate-800 text-xs">
                  {/* Photo Thumbnail */}
                  {hoarding.photos && hoarding.photos[0] ? (
                    <img
                      src={hoarding.photos[0]}
                      alt={hoarding.title}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 mb-2 font-medium">
                      No Photo Available
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {isAvailable ? 'Available' : 'Booked'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {hoarding.hoardingType || 'Billboard'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
                    {hoarding.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{hoarding.location?.address || hoarding.location?.city}</span>
                  </p>

                  {hoarding.distanceKm !== undefined && (
                    <div className="text-[10px] font-bold text-rose-600 mt-1">
                      📍 {hoarding.distanceKm} km from search pin
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Monthly Rate</span>
                      <span className="font-black text-indigo-700 text-sm">
                        ₹{(hoarding.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <Link
                      to={`/hoardings/${hoarding._id}`}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition"
                    >
                      View Site
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

