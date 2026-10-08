import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Modal,
  Linking,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mobileApi from '../api/client';
import MobileHoardingMap from '../components/MobileHoardingMap';

const { width } = Dimensions.get('window');

const QUICK_AREAS = [
  { name: 'All WB', coords: null },
  { name: 'Park Street', coords: [22.5535, 88.3512] },
  { name: 'Salt Lake Sec V', coords: [22.5786, 88.4312] },
  { name: 'New Town Biswa Bangla', coords: [22.5855, 88.471] },
  { name: 'Howrah Station', coords: [22.5839, 88.3426] },
  { name: 'Gariahat Junction', coords: [22.5186, 88.3653] },
  { name: 'Durgapur City Centre', coords: [23.5334, 87.2936] },
  { name: 'Siliguri Venus More', coords: [26.7162, 88.428] },
  { name: 'Asansol City', coords: [23.6889, 86.9661] }
];

export default function HomeScreen({ navigation }) {
  const [hoardings, setHoardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('All WB');
  const [mapCenter, setMapCenter] = useState([22.5726, 88.3639]);
  const [searchPin, setSearchPin] = useState(null);
  const [radiusKm, setRadiusKm] = useState(25);

  // View mode: 'list' | 'map' | 'split'
  const [viewMode, setViewMode] = useState('list');

  // Full Area Selector Modal
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [regionsData, setRegionsData] = useState([]);
  const [areaFilterQuery, setAreaFilterQuery] = useState('');

  // Fetch West Bengal Regions & Locations on mount
  useEffect(() => {
    mobileApi
      .get('/hoardings/locations')
      .then((res) => {
        if (res.data?.regions) {
          setRegionsData(res.data.regions);
        }
      })
      .catch((err) => console.warn('Could not load dynamic locations', err));
  }, []);

  const fetchHoardings = async (coords = null, customRadius = null) => {
    setLoading(true);
    try {
      let endpoint = '/hoardings';
      const params = {};

      if (coords && coords[0] && coords[1]) {
        endpoint = '/hoardings/nearby';
        params.latitude = coords[0];
        params.longitude = coords[1];
        params.radius = customRadius || radiusKm;
      }

      const res = await mobileApi.get(endpoint, { params });
      setHoardings(res.data.hoardings || []);
    } catch (err) {
      console.error('Failed to load hoardings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHoardings();
  }, []);

  const handleSelectQuickArea = (area) => {
    setSelectedArea(area.name);
    if (!area.coords) {
      setSearchPin(null);
      setMapCenter([22.5726, 88.3639]);
      fetchHoardings(null);
    } else {
      setSearchPin(area.coords);
      setMapCenter(area.coords);
      fetchHoardings(area.coords, radiusKm);
    }
  };

  const handleSelectModalArea = (areaItem) => {
    setSelectedArea(areaItem.name);
    setSearchPin([areaItem.latitude, areaItem.longitude]);
    setMapCenter([areaItem.latitude, areaItem.longitude]);
    setShowAreaModal(false);
    fetchHoardings([areaItem.latitude, areaItem.longitude], radiusKm);
  };

  const handleMapCenterClick = (lat, lng) => {
    setSearchPin([lat, lng]);
    setMapCenter([lat, lng]);
    setSelectedArea(`Pin (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
    fetchHoardings([lat, lng], radiusKm);
  };

  const openGoogleMaps = (hoarding) => {
    let url = hoarding.location?.googleMapsUrl;
    if (!url && hoarding.location?.geo?.coordinates?.length === 2) {
      const [lng, lat] = hoarding.location.geo.coordinates;
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (url) {
      Linking.openURL(url).catch((err) => console.warn('Cannot open maps url', err));
    }
  };

  const filteredHoardings = hoardings.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.title?.toLowerCase().includes(q) ||
      h.location?.address?.toLowerCase().includes(q) ||
      h.location?.city?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>ADVERSE</Text>
              <View style={styles.wbBadge}>
                <Text style={styles.wbBadgeText}>WB OOH</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>West Bengal Hoarding Marketplace & Maps</Text>
          </View>

          {/* View mode toggle */}
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            >
              <Ionicons
                name="grid"
                size={16}
                color={viewMode === 'list' ? '#fff' : '#64748b'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('split')}
              style={[styles.toggleBtn, viewMode === 'split' && styles.toggleBtnActive]}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={viewMode === 'split' ? '#fff' : '#64748b'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('map')}
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            >
              <Ionicons
                name="map"
                size={16}
                color={viewMode === 'map' ? '#fff' : '#64748b'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar & Area Picker Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Search billboards, roads, areas..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setShowAreaModal(true)}
            style={styles.areaModalBtn}
          >
            <Ionicons name="location" size={16} color="#2563eb" />
            <Text style={styles.areaModalBtnText} numberOfLines={1}>
              {selectedArea}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Horizontal Quick Area Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {QUICK_AREAS.map((item) => {
            const isSelected = selectedArea === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => handleSelectQuickArea(item)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Body */}
      {viewMode === 'map' ? (
        <View style={{ flex: 1, padding: 12 }}>
          <View style={styles.mapBanner}>
            <Ionicons name="information-circle" size={16} color="#2563eb" />
            <Text style={styles.mapBannerText}>
              Tap pins to view hoarding rent & photos. Tap anywhere on map to search nearby radius.
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
            <MobileHoardingMap
              hoardings={filteredHoardings}
              center={mapCenter}
              searchLocation={searchPin}
              radiusKm={radiusKm}
              height="100%"
              onSearchCenterChange={handleMapCenterClick}
              onSelectHoarding={(h) =>
                navigation.navigate('HoardingDetail', { hoardingId: h._id })
              }
            />
          </View>
        </View>
      ) : viewMode === 'split' ? (
        <View style={{ flex: 1 }}>
          {/* Half Map */}
          <View style={{ height: 240, padding: 8 }}>
            <MobileHoardingMap
              hoardings={filteredHoardings}
              center={mapCenter}
              searchLocation={searchPin}
              radiusKm={radiusKm}
              height="100%"
              onSearchCenterChange={handleMapCenterClick}
              onSelectHoarding={(h) =>
                navigation.navigate('HoardingDetail', { hoardingId: h._id })
              }
            />
          </View>

          {/* Half List */}
          <View style={{ flex: 1 }}>
            <FlatList
              data={filteredHoardings}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchHoardings(searchPin, radiusKm);
              }}
              renderItem={({ item }) => renderHoardingCard(item, navigation, openGoogleMaps)}
              ListEmptyComponent={renderEmptyState}
            />
          </View>
        </View>
      ) : (
        /* Full List Mode */
        <FlatList
          data={filteredHoardings}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchHoardings(searchPin, radiusKm);
          }}
          renderItem={({ item }) => renderHoardingCard(item, navigation, openGoogleMaps)}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* 50+ West Bengal Area Selector Modal */}
      <Modal visible={showAreaModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Choose West Bengal Location</Text>
                <Text style={styles.modalSubtitle}>
                  50+ key arterial roads, junctions & hubs across 9 regions
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAreaModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Filter inside modal */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                placeholder="Filter areas (e.g., Salt Lake, Siliguri, Howrah)..."
                value={areaFilterQuery}
                onChangeText={setAreaFilterQuery}
                style={styles.searchInput}
              />
            </View>

            <ScrollView style={{ flex: 1 }}>
              {/* Reset to All WB option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedArea('All WB');
                  setSearchPin(null);
                  setMapCenter([22.5726, 88.3639]);
                  setShowAreaModal(false);
                  fetchHoardings(null);
                }}
                style={styles.modalAreaRow}
              >
                <View style={styles.pinCircle}>
                  <Ionicons name="globe-outline" size={16} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalAreaName}>All West Bengal</Text>
                  <Text style={styles.modalAreaDesc}>Show all hoardings across the state</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>

              {regionsData.map((region) => {
                const filteredPlaces = (region.places || []).filter((p) =>
                  p.name.toLowerCase().includes(areaFilterQuery.toLowerCase())
                );
                if (filteredPlaces.length === 0) return null;

                return (
                  <View key={region.regionName} style={styles.regionSection}>
                    <Text style={styles.regionTitle}>{region.regionName}</Text>
                    {filteredPlaces.map((place) => (
                      <TouchableOpacity
                        key={place.name}
                        onPress={() => handleSelectModalArea(place)}
                        style={styles.modalAreaRow}
                      >
                        <View style={styles.pinCircle}>
                          <Ionicons name="location" size={16} color="#2563eb" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalAreaName}>{place.name}</Text>
                          <Text style={styles.modalAreaDesc}>
                            {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function renderHoardingCard(item, navigation, openGoogleMaps) {
  const isAvailable = item.availabilityStatus === 'available';
  const hasMapsLink =
    item.location?.googleMapsUrl || item.location?.geo?.coordinates?.length === 2;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate('HoardingDetail', { hoardingId: item._id })}
      style={styles.card}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{
            uri:
              item.photos && item.photos[0]
                ? item.photos[0]
                : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
          }}
          style={styles.cardImage}
        />
        <View style={[styles.statusBadge, isAvailable ? styles.badgeAvail : styles.badgeBooked]}>
          <Text
            style={[
              styles.statusBadgeText,
              isAvailable ? styles.badgeAvailText : styles.badgeBookedText,
            ]}
          >
            {isAvailable ? 'AVAILABLE' : 'BOOKED'}
          </Text>
        </View>

        {hasMapsLink && (
          <TouchableOpacity
            onPress={() => openGoogleMaps(item)}
            style={styles.cardMapsBtn}
          >
            <Ionicons name="navigate" size={13} color="#fff" />
            <Text style={styles.cardMapsBtnText}>Google Maps</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardCityRow}>
          <Ionicons name="location-sharp" size={13} color="#2563eb" />
          <Text style={styles.cardCityText}>{item.location?.city || 'Kolkata'}</Text>
          <Text style={styles.cardDot}>•</Text>
          <Text style={styles.cardType}>{item.hoardingType || 'Billboard'}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.cardAddress} numberOfLines={1}>
          {item.location?.address}
        </Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardPriceLabel}>MONTHLY RENT</Text>
            <Text style={styles.cardPrice}>
              ₹{(item.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}
              <Text style={styles.cardPriceUnit}> /mo</Text>
            </Text>
          </View>

          <View style={styles.cardSpecsPill}>
            <Text style={styles.cardSpecsText}>
              {item.dimensions?.width}×{item.dimensions?.height} ft • {item.lightingType || 'Frontlit'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function renderEmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="business-outline" size={48} color="#94a3b8" />
      <Text style={styles.emptyTitle}>No Hoardings Found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your area filter or search radius.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  wbBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wbBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    paddingVertical: 0,
  },
  areaModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    gap: 4,
    maxWidth: 130,
  },
  areaModalBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 1,
  },
  chipsScroll: {
    marginTop: 2,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#fff',
  },
  mapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    gap: 6,
  },
  mapBannerText: {
    fontSize: 11,
    color: '#1e40af',
    flex: 1,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageContainer: {
    height: 170,
    width: '100%',
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeAvail: {
    backgroundColor: '#dcfce7',
  },
  badgeAvailText: {
    color: '#166534',
  },
  badgeBooked: {
    backgroundColor: '#e0e7ff',
  },
  badgeBookedText: {
    color: '#3730a3',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardMapsBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardMapsBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardBody: {
    padding: 14,
  },
  cardCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCityText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
  },
  cardDot: {
    color: '#94a3b8',
    fontSize: 10,
  },
  cardType: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
    lineHeight: 20,
  },
  cardAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPriceLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  cardPriceUnit: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  cardSpecsPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardSpecsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    marginTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  regionSection: {
    marginTop: 14,
  },
  regionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAreaName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalAreaDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
});
