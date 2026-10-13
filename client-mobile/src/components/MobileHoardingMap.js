import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MobileHoardingMap({
  hoardings = [],
  center = [22.5726, 88.3639], // Default: Kolkata
  zoom = 12,
  radiusKm = null,
  searchLocation = null,
  pickerMode = false,
  selectedPoint = null,
  onPointPicked = null,
  onSelectHoarding = null,
  onSearchCenterChange = null,
  height = 360,
}) {
  const webViewRef = useRef(null);

  const activeCenter = searchLocation || selectedPoint || center || [22.5726, 88.3639];

  // Generate HTML for Leaflet Map
  const generateMapHtml = () => {
    const hoardingsJson = JSON.stringify(hoardings || []);
    const centerJson = JSON.stringify(activeCenter);
    const searchLocJson = JSON.stringify(searchLocation);
    const selectedPtJson = JSON.stringify(selectedPoint);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          .map-search-bar {
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            z-index: 1001;
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            padding: 7px 12px;
            gap: 8px;
          }
          .search-svg { width: 16px; height: 16px; flex-shrink: 0; stroke: #64748b; }
          #map-search-input {
            border: none;
            outline: none;
            background: transparent;
            width: 100%;
            font-size: 13px;
            color: #0f172a;
            font-family: inherit;
            font-weight: 600;
          }
          #map-search-clear {
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 18px;
            line-height: 1;
            padding: 0 4px;
            display: none;
            cursor: pointer;
          }
          .search-results-list {
            position: absolute;
            top: 52px;
            left: 10px;
            right: 10px;
            z-index: 1002;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            border: 1px solid #e2e8f0;
            max-height: 200px;
            overflow-y: auto;
          }
          .search-item {
            padding: 10px 14px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
            cursor: pointer;
            text-align: left;
          }
          .search-item:last-child { border-bottom: none; }
          .search-item:active { background: #eff6ff; }
          .search-item-title { font-weight: 700; color: #1e293b; font-size: 13px; }
          .search-item-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
          .layer-toggle {
            position: absolute;
            top: 54px;
            right: 10px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            padding: 3px;
            gap: 4px;
            font-size: 11px;
            font-weight: 700;
          }
          .layer-btn {
            border: none;
            background: transparent;
            padding: 6px 10px;
            border-radius: 8px;
            color: #475569;
            cursor: pointer;
          }
          .layer-btn.active {
            background: #2563eb;
            color: #ffffff;
          }
          .pulse-pin {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 16px;
            padding: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          }
          .popup-content {
            font-family: inherit;
            color: #0f172a;
          }
          .popup-title {
            font-size: 13px;
            font-weight: 800;
            margin: 4px 0 2px 0;
            color: #0f172a;
          }
          .popup-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 6px;
            margin-bottom: 4px;
          }
          .badge-avail { background: #dcfce7; color: #166534; }
          .badge-booked { background: #e0e7ff; color: #3730a3; }
          .popup-price {
            font-size: 13px;
            font-weight: 900;
            color: #2563eb;
            margin-top: 4px;
          }
          .popup-btn {
            display: block;
            width: 100%;
            margin-top: 8px;
            padding: 7px;
            background: #2563eb;
            color: #fff;
            text-align: center;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 800;
            font-size: 11px;
            cursor: pointer;
            border: none;
          }
          .picker-banner {
            position: absolute;
            bottom: 15px;
            left: 10px;
            right: 10px;
            z-index: 1000;
            background: rgba(254, 243, 199, 0.96);
            border: 1px solid #f59e0b;
            color: #92400e;
            padding: 8px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <!-- Free Interactive Map Search Bar -->
        <div class="map-search-bar" id="search-box">
          <svg class="search-svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input id="map-search-input" type="text" placeholder="${pickerMode ? 'Search place to pin billboard...' : 'Search place, city, street...'}" autocomplete="off" />
          <button id="map-search-clear" onclick="clearSearch()">&times;</button>
        </div>
        <div id="search-results-dropdown" class="search-results-list" style="display:none;"></div>

        <div class="layer-toggle">
          <button id="btn-streets" class="layer-btn active" onclick="switchLayer('streets')">Street</button>
          <button id="btn-hybrid" class="layer-btn" onclick="switchLayer('hybrid')">Hybrid</button>
          <button id="btn-satellite" class="layer-btn" onclick="switchLayer('satellite')">Satellite</button>
        </div>

        ${
          pickerMode
            ? '<div class="picker-banner">🎯 Tap anywhere on map or search above to pin GPS location</div>'
            : ''
        }

        <script>
          const centerCoords = ${centerJson};
          const hoardings = ${hoardingsJson};
          const searchLoc = ${searchLocJson};
          const selectedPt = ${selectedPtJson};
          const radiusKm = ${radiusKm ? Number(radiusKm) : 'null'};
          const isPicker = ${pickerMode ? 'true' : 'false'};

          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView(centerCoords, ${zoom});

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          // Tile Providers
          const tileLayers = {
            streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
            hybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 19 }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
          };

          let currentLayer = tileLayers.streets;
          currentLayer.addTo(map);

          function switchLayer(name) {
            map.removeLayer(currentLayer);
            currentLayer = tileLayers[name];
            currentLayer.addTo(map);

            document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + name).classList.add('active');
          }

          function createDivPin(type) {
            let bg = '#059669'; // available green
            let label = '📌';
            if (type === 'occupied') { bg = '#4f46e5'; } // blue
            else if (type === 'center') { bg = '#e11d48'; label = '🎯'; }

            return L.divIcon({
              className: 'pulse-pin',
              html: '<div style="width:28px;height:28px;background:' + bg + ';border-radius:50%;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">' + label + '</div>',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
          }

          // Search Pin & Radius Circle
          if (searchLoc && searchLoc[0] && searchLoc[1]) {
            L.marker(searchLoc, { icon: createDivPin('center') }).addTo(map);
            if (radiusKm) {
              L.circle(searchLoc, {
                radius: radiusKm * 1000,
                color: '#e11d48',
                fillColor: '#fb7185',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '4, 6'
              }).addTo(map);
            }
          }

          // Picker Pin
          let pickerMarker = null;
          if (selectedPt && selectedPt[0] && selectedPt[1]) {
            pickerMarker = L.marker(selectedPt, { icon: createDivPin('center') }).addTo(map);
          }

          // Hoardings Markers
          hoardings.forEach(function(h) {
            const coords = h.location && h.location.geo && h.location.geo.coordinates;
            if (coords && coords.length === 2) {
              const lat = coords[1];
              const lng = coords[0];
              const isAvail = h.availabilityStatus === 'available';

              const marker = L.marker([lat, lng], {
                icon: createDivPin(h.availabilityStatus || 'available')
              }).addTo(map);

              const photoHtml = (h.photos && h.photos[0])
                ? '<img src="' + h.photos[0] + '" style="width:100%;height:90px;object-fit:cover;border-radius:10px;margin-bottom:6px;" />'
                : '';

              const badgeClass = isAvail ? 'badge-avail' : 'badge-booked';
              const badgeText = isAvail ? 'Available' : 'Booked';
              const priceText = '₹' + (h.pricing && h.pricing.baseRatePerMonth ? Number(h.pricing.baseRatePerMonth).toLocaleString('en-IN') : '0') + '/mo';

              const popupHtml = '<div class="popup-content">' +
                photoHtml +
                '<span class="popup-badge ' + badgeClass + '">' + badgeText + '</span>' +
                '<div class="popup-title">' + (h.title || 'Hoarding') + '</div>' +
                '<div style="font-size:11px;color:#64748b;">' + (h.location && h.location.address ? h.location.address : (h.location && h.location.city ? h.location.city : '')) + '</div>' +
                '<div class="popup-price">' + priceText + '</div>' +
                '<button class="popup-btn" onclick="selectHoarding(\\'' + h._id + '\\')">View Details</button>' +
              '</div>';

              marker.bindPopup(popupHtml, { className: 'custom-popup', maxWidth: 220 });
            }
          });

          function selectHoarding(id) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_HOARDING', hoardingId: id }));
            }
          }

          // Map Click Handler
          map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            if (isPicker) {
              if (pickerMarker) {
                pickerMarker.setLatLng([lat, lng]);
              } else {
                pickerMarker = L.marker([lat, lng], { icon: createDivPin('center') }).addTo(map);
              }
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'POINT_PICKED', lat: lat, lng: lng }));
              }
            } else {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_CLICK', lat: lat, lng: lng }));
              }
            }
          });

          // Free Geocoding Search Handlers
          const searchBox = document.getElementById('search-box');
          const resultsDropdown = document.getElementById('search-results-dropdown');
          if (searchBox) {
            L.DomEvent.disableClickPropagation(searchBox);
            L.DomEvent.disableScrollPropagation(searchBox);
          }
          if (resultsDropdown) {
            L.DomEvent.disableClickPropagation(resultsDropdown);
            L.DomEvent.disableScrollPropagation(resultsDropdown);
          }

          let searchTimeout = null;
          const searchInput = document.getElementById('map-search-input');
          const clearBtn = document.getElementById('map-search-clear');

          function clearSearch() {
            if (searchInput) searchInput.value = '';
            if (clearBtn) clearBtn.style.display = 'none';
            if (resultsDropdown) {
              resultsDropdown.innerHTML = '';
              resultsDropdown.style.display = 'none';
            }
          }

          if (searchInput) {
            searchInput.addEventListener('input', function(e) {
              const val = e.target.value.trim();
              if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

              clearTimeout(searchTimeout);
              if (val.length < 2) {
                if (resultsDropdown) {
                  resultsDropdown.innerHTML = '';
                  resultsDropdown.style.display = 'none';
                }
                return;
              }

              searchTimeout = setTimeout(function() {
                fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(val) + '&countrycodes=in&limit=5&addressdetails=1')
                  .then(function(res) { return res.json(); })
                  .then(function(data) {
                    if (!data || data.length === 0) {
                      resultsDropdown.innerHTML = '<div class="search-item" style="color:#94a3b8;font-style:italic;">No places found</div>';
                      resultsDropdown.style.display = 'block';
                      return;
                    }
                    var html = '';
                    data.forEach(function(item) {
                      var parts = (item.display_name || '').split(',');
                      var title = parts[0] || item.name || val;
                      var sub = parts.slice(1, 3).join(',').trim();
                      var safeTitle = title.replace(/'/g, "\\'");
                      html += '<div class="search-item" onclick="selectSearchLocation(' + item.lat + ',' + item.lon + ',\\'' + safeTitle + '\\')">' +
                              '<div class="search-item-title">📍 ' + title + '</div>' +
                              (sub ? '<div class="search-item-sub">' + sub + '</div>' : '') +
                              '</div>';
                    });
                    resultsDropdown.innerHTML = html;
                    resultsDropdown.style.display = 'block';
                  })
                  .catch(function() {
                    resultsDropdown.style.display = 'none';
                  });
              }, 280);
            });
          }

          function selectSearchLocation(lat, lng, name) {
            lat = parseFloat(lat);
            lng = parseFloat(lng);
            map.flyTo([lat, lng], 16, { duration: 1.2 });
            if (searchInput) searchInput.value = name;
            if (resultsDropdown) resultsDropdown.style.display = 'none';

            if (isPicker) {
              if (pickerMarker) {
                pickerMarker.setLatLng([lat, lng]);
              } else {
                pickerMarker = L.marker([lat, lng], { icon: createDivPin('center') }).addTo(map);
              }
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'POINT_PICKED', lat: lat, lng: lng }));
              }
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'POINT_PICKED' && onPointPicked) {
        onPointPicked(data.lat, data.lng);
      } else if (data.type === 'MAP_CLICK' && onSearchCenterChange) {
        onSearchCenterChange(data.lat, data.lng);
      } else if (data.type === 'SELECT_HOARDING' && onSelectHoarding) {
        const found = hoardings.find((h) => h._id === data.hoardingId);
        if (found) onSelectHoarding(found);
      }
    } catch (err) {
      console.warn('Error parsing webview map message:', err);
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateMapHtml() }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});

