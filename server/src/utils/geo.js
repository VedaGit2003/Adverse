/**
 * Comprehensive Geographic Directory for West Bengal Outdoor Advertising (OOH)
 * Over 50+ strategically mapped cities, commercial districts, IT hubs, and arterial crossings.
 */

const WB_REGIONS = [
  {
    region: 'Kolkata - Heritage, CBD & Central',
    areas: [
      { id: 'park-street', name: 'Park Street', city: 'Kolkata', lat: 22.5532, lng: 88.3527, popular: true },
      { id: 'esplanade', name: 'Esplanade / Chowringhee', city: 'Kolkata', lat: 22.5647, lng: 88.3518, popular: true },
      { id: 'camac-street', name: 'Camac Street', city: 'Kolkata', lat: 22.5478, lng: 88.3534, popular: true },
      { id: 'bbd-bagh', name: 'BBD Bagh / Dalhousie', city: 'Kolkata', lat: 22.5714, lng: 88.3498 },
      { id: 'dharmatala', name: 'Dharmatala / Central Avenue', city: 'Kolkata', lat: 22.5629, lng: 88.3571 },
      { id: 'sealdah', name: 'Sealdah Station Area', city: 'Kolkata', lat: 22.5675, lng: 88.3715 }
    ]
  },
  {
    region: 'Kolkata - South & Commercial Hubs',
    areas: [
      { id: 'gariahat', name: 'Gariahat Crossing', city: 'Kolkata', lat: 22.5190, lng: 88.3667, popular: true },
      { id: 'ballygunge', name: 'Ballygunge Phari', city: 'Kolkata', lat: 22.5280, lng: 88.3655 },
      { id: 'alipore', name: 'Alipore Commercial Zone', city: 'Kolkata', lat: 22.5312, lng: 88.3283 },
      { id: 'jadavpur', name: 'Jadavpur 8B / Sukanta Setu', city: 'Kolkata', lat: 22.4988, lng: 88.3718 },
      { id: 'garia', name: 'Garia Mahamayatala', city: 'Kolkata', lat: 22.4646, lng: 88.3807 },
      { id: 'behala', name: 'Behala Chowrasta / Diamond Harbour Rd', city: 'Kolkata', lat: 22.4988, lng: 88.3149, popular: true },
      { id: 'tollygunge', name: 'Tollygunge Phari / Tram Depot', city: 'Kolkata', lat: 22.4996, lng: 88.3446 }
    ]
  },
  {
    region: 'Kolkata - IT Corridors & Arterial Expressways',
    areas: [
      { id: 'sector-v', name: 'Salt Lake Sector V (IT Hub)', city: 'Kolkata', lat: 22.5804, lng: 88.4312, popular: true },
      { id: 'salt-lake-city', name: 'Salt Lake City (Karunamoyee / City Centre)', city: 'Kolkata', lat: 22.5867, lng: 88.4178, popular: true },
      { id: 'new-town-aa1', name: 'New Town Action Area I', city: 'Kolkata', lat: 22.5850, lng: 88.4645, popular: true },
      { id: 'new-town-aa2', name: 'New Town Action Area II (Eco Space)', city: 'Kolkata', lat: 22.6012, lng: 88.4721 },
      { id: 'rajarhat', name: 'Rajarhat Chinar Park', city: 'Kolkata', lat: 22.6186, lng: 88.4411, popular: true },
      { id: 'em-bypass-ruby', name: 'EM Bypass - Ruby Hospital Crossing', city: 'Kolkata', lat: 22.5135, lng: 88.3995, popular: true },
      { id: 'science-city', name: 'Science City / Park Circus Connector', city: 'Kolkata', lat: 22.5401, lng: 88.3957 }
    ]
  },
  {
    region: 'Kolkata - North & Airport Commuter Corridors',
    areas: [
      { id: 'shyambazar', name: 'Shyambazar Five-Point Crossing', city: 'Kolkata', lat: 22.6027, lng: 88.3714, popular: true },
      { id: 'ultadanga', name: 'Ultadanga / Hudson Crossing', city: 'Kolkata', lat: 22.5922, lng: 88.3845 },
      { id: 'airport-ccu', name: 'Netaji Subhash Airport (CCU) / 1 No Gate', city: 'Kolkata', lat: 22.6547, lng: 88.4467, popular: true },
      { id: 'vip-road', name: 'VIP Road (Teghoria / Baguiati)', city: 'Kolkata', lat: 22.6234, lng: 88.4312 },
      { id: 'dunlop', name: 'Dunlop Crossing / BT Road', city: 'Kolkata', lat: 22.6565, lng: 88.3742 },
      { id: 'barasat', name: 'Barasat Champadali Crossing', city: 'North 24 Parganas', lat: 22.7237, lng: 88.4812 },
      { id: 'barrackpore', name: 'Barrackpore Chiria More', city: 'North 24 Parganas', lat: 22.7635, lng: 88.3768 }
    ]
  },
  {
    region: 'Howrah & Hooghly Belt',
    areas: [
      { id: 'howrah-station', name: 'Howrah Station / Bridge Flyover', city: 'Howrah', lat: 22.5892, lng: 88.3426, popular: true },
      { id: 'kona-expressway', name: 'Kona Expressway Toll Plaza', city: 'Howrah', lat: 22.5765, lng: 88.2912, popular: true },
      { id: 'shibpur', name: 'Shibpur Mandirtala / Nabanna Corridor', city: 'Howrah', lat: 22.5645, lng: 88.3189 },
      { id: 'bally', name: 'Bally Khal / Vivekananda Setu', city: 'Howrah', lat: 22.6515, lng: 88.3432 },
      { id: 'serampore', name: 'Serampore Battala', city: 'Hooghly', lat: 22.7511, lng: 88.3432 },
      { id: 'chandannagar', name: 'Chandannagar Strand Road', city: 'Hooghly', lat: 22.8671, lng: 88.3674 },
      { id: 'chinsurah', name: 'Chinsurah Clock Tower', city: 'Hooghly', lat: 22.9023, lng: 88.3954 },
      { id: 'bandel', name: 'Bandel Church & Junction', city: 'Hooghly', lat: 22.9234, lng: 88.3756 }
    ]
  },
  {
    region: 'Western Industrial & Mining Belt',
    areas: [
      { id: 'durgapur-cc', name: 'Durgapur City Centre', city: 'Durgapur', lat: 23.5204, lng: 87.3119, popular: true },
      { id: 'durgapur-benachity', name: 'Durgapur Benachity Market', city: 'Durgapur', lat: 23.5412, lng: 87.2912 },
      { id: 'asansol-gt', name: 'Asansol GT Road / Bus Stand', city: 'Asansol', lat: 23.6889, lng: 86.9746, popular: true },
      { id: 'raniganj', name: 'Raniganj Coal Belt Hub', city: 'Paschim Bardhaman', lat: 23.6234, lng: 87.1321 },
      { id: 'bardhaman-gate', name: 'Bardhaman Curzon Gate', city: 'Purba Bardhaman', lat: 23.2456, lng: 87.8631, popular: true },
      { id: 'purulia', name: 'Purulia Jubilee Ground Area', city: 'Purulia', lat: 23.3321, lng: 86.3654 },
      { id: 'bankura', name: 'Bankura Machantala Crossing', city: 'Bankura', lat: 23.2324, lng: 87.0712 }
    ]
  },
  {
    region: 'South Bengal & Port / Coastal Gateway',
    areas: [
      { id: 'kharagpur', name: 'Kharagpur Station / IIT Bypass', city: 'Paschim Medinipur', lat: 22.3460, lng: 87.3215, popular: true },
      { id: 'medinipur', name: 'Medinipur Collectorate Road', city: 'Paschim Medinipur', lat: 22.4257, lng: 87.3199 },
      { id: 'haldia', name: 'Haldia Port & Petrochemical Zone', city: 'Purba Medinipur', lat: 22.0667, lng: 88.0650, popular: true },
      { id: 'digha', name: 'Digha Beach Commercial Strip', city: 'Purba Medinipur', lat: 21.6266, lng: 87.5074, popular: true },
      { id: 'tamluk', name: 'Tamluk Link Road', city: 'Purba Medinipur', lat: 22.2989, lng: 87.9234 },
      { id: 'diamond-harbour', name: 'Diamond Harbour Port Corridor', city: 'South 24 Parganas', lat: 22.1912, lng: 88.1923 }
    ]
  },
  {
    region: 'North Bengal & Tea / Tourism Arteries',
    areas: [
      { id: 'siliguri-sevoke', name: 'Siliguri Sevoke Road & Vega Circle', city: 'Siliguri', lat: 26.7271, lng: 88.4312, popular: true },
      { id: 'siliguri-hill-cart', name: 'Siliguri Hill Cart Road (Venus More)', city: 'Siliguri', lat: 26.7112, lng: 88.4215 },
      { id: 'darjeeling', name: 'Darjeeling Mall & Chowrasta', city: 'Darjeeling', lat: 27.0410, lng: 88.2627, popular: true },
      { id: 'kalimpong', name: 'Kalimpong Dambar Chowk', city: 'Kalimpong', lat: 27.0667, lng: 88.4667 },
      { id: 'jalpaiguri', name: 'Jalpaiguri Dinbazar Crossing', city: 'Jalpaiguri', lat: 26.5411, lng: 88.7189 },
      { id: 'cooch-behar', name: 'Cooch Behar Palace Road', city: 'Cooch Behar', lat: 26.3234, lng: 89.4512 },
      { id: 'alipurduar', name: 'Alipurduar Chowpathy', city: 'Alipurduar', lat: 26.4912, lng: 89.5267 },
      { id: 'malda', name: 'Malda English Bazar (Rathbari More)', city: 'Malda', lat: 25.0108, lng: 88.1408, popular: true },
      { id: 'raiganj', name: 'Raiganj Siliguri More', city: 'Uttar Dinajpur', lat: 25.6178, lng: 88.1256 }
    ]
  },
  {
    region: 'Central & Cultural Bengal',
    areas: [
      { id: 'bolpur', name: 'Bolpur Santiniketan Road', city: 'Birbhum', lat: 23.6789, lng: 87.6892, popular: true },
      { id: 'suri', name: 'Suri Circuit House Area', city: 'Birbhum', lat: 23.9102, lng: 87.5256 },
      { id: 'berhampore', name: 'Berhampore Mohona Bus Stand (Murshidabad)', city: 'Murshidabad', lat: 24.1012, lng: 88.2512, popular: true },
      { id: 'krishnanagar', name: 'Krishnanagar Post Office More', city: 'Nadia', lat: 23.4012, lng: 88.5012 },
      { id: 'kalyani', name: 'Kalyani Central Park / Expressway', city: 'Nadia', lat: 22.9751, lng: 88.4344, popular: true }
    ]
  }
];

// Flat lookup index for backward compatibility & fast coordinates resolution
const WB_CITIES = {};
WB_REGIONS.forEach((r) => {
  r.areas.forEach((a) => {
    WB_CITIES[a.name.toLowerCase()] = {
      name: a.name,
      city: a.city,
      lat: a.lat,
      lng: a.lng,
      region: r.region
    };
    // Also index short names (e.g. "park street", "durgapur", "siliguri")
    const simpleKey = a.id.replace(/-/g, ' ');
    if (!WB_CITIES[simpleKey]) {
      WB_CITIES[simpleKey] = {
        name: a.name,
        city: a.city,
        lat: a.lat,
        lng: a.lng,
        region: r.region
      };
    }
  });
});

// Provide standard fallback entries
if (!WB_CITIES.kolkata) WB_CITIES.kolkata = { name: 'Kolkata Central', city: 'Kolkata', lat: 22.5726, lng: 88.3639 };
if (!WB_CITIES.howrah) WB_CITIES.howrah = { name: 'Howrah Station', city: 'Howrah', lat: 22.5892, lng: 88.3426 };
if (!WB_CITIES.siliguri) WB_CITIES.siliguri = { name: 'Siliguri Sevoke Road', city: 'Siliguri', lat: 26.7271, lng: 88.4312 };
if (!WB_CITIES.durgapur) WB_CITIES.durgapur = { name: 'Durgapur City Centre', city: 'Durgapur', lat: 23.5204, lng: 87.3119 };
if (!WB_CITIES.asansol) WB_CITIES.asansol = { name: 'Asansol GT Road', city: 'Asansol', lat: 23.6889, lng: 86.9746 };
if (!WB_CITIES.kharagpur) WB_CITIES.kharagpur = { name: 'Kharagpur', city: 'Paschim Medinipur', lat: 22.3460, lng: 87.3215 };
if (!WB_CITIES.bardhaman) WB_CITIES.bardhaman = { name: 'Bardhaman', city: 'Purba Bardhaman', lat: 23.2456, lng: 87.8631 };
if (!WB_CITIES.malda) WB_CITIES.malda = { name: 'Malda', city: 'Malda', lat: 25.0108, lng: 88.1408 };
if (!WB_CITIES.haldia) WB_CITIES.haldia = { name: 'Haldia', city: 'Purba Medinipur', lat: 22.0667, lng: 88.0650 };
if (!WB_CITIES.darjeeling) WB_CITIES.darjeeling = { name: 'Darjeeling', city: 'Darjeeling', lat: 27.0410, lng: 88.2627 };

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

  // Exact or partial key match
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
  WB_REGIONS,
  WB_CITIES,
  calculateDistanceKm,
  resolveWBCoordinates
};
