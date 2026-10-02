const WB_CITIES = {
  kolkata: { name: 'Kolkata', lng: 88.3639, lat: 22.5726 },
  'park street': { name: 'Park Street, Kolkata', lng: 88.3527, lat: 22.5532 },
  'salt lake': { name: 'Salt Lake / Sector V, Kolkata', lng: 88.4312, lat: 22.5804 },
  'new town': { name: 'New Town, Rajarhat, Kolkata', lng: 88.4645, lat: 22.5850 },
  howrah: { name: 'Howrah', lng: 88.3103, lat: 22.5958 },
  siliguri: { name: 'Siliguri', lng: 88.4312, lat: 26.7271 },
  durgapur: { name: 'Durgapur', lng: 87.3119, lat: 23.5204 },
  asansol: { name: 'Asansol', lng: 86.9746, lat: 23.6889 },
  kharagpur: { name: 'Kharagpur', lng: 87.3215, lat: 22.3460 },
  bardhaman: { name: 'Bardhaman', lng: 87.8631, lat: 23.2456 },
  malda: { name: 'Malda', lng: 88.1408, lat: 25.0108 },
  haldia: { name: 'Haldia', lng: 88.0650, lat: 22.0667 },
  darjeeling: { name: 'Darjeeling', lng: 88.2627, lat: 27.0410 }
};

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function resolveWBCoordinates(query) {
  if (!query || typeof query !== 'string') return null;
  const normalized = query.trim().toLowerCase();

  for (const [key, value] of Object.entries(WB_CITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  if (normalized.includes('bengal') || normalized.includes('wb')) {
    return WB_CITIES.kolkata;
  }

  return null;
}

module.exports = {
  WB_CITIES,
  calculateDistanceKm,
  resolveWBCoordinates
};
