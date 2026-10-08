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
          .layer-toggle {
            position: absolute;
            top: 10px;
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
            top: 10px;
            left: 10px;
            z-index: 1000;
            background: rgba(254, 243, 199, 0.96);
            border: 1px solid #f59e0b;
            color: #92400e;
            padding: 6px 10px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <div class="layer-toggle">
          <button id="btn-streets" class="layer-btn active" onclick="switchLayer('streets')">Street</button>
          <button id="btn-hybrid" class="layer-btn" onclick="switchLayer('hybrid')">Hybrid</button>
          <button id="btn-satellite" class="layer-btn" onclick="switchLayer('satellite')">Satellite</button>
        </div>

        ${
          pickerMode
            ? '<div class="picker-banner">🎯 Tap map to pin GPS location</div>'
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

