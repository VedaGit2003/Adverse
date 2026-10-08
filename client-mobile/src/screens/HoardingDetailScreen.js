import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import mobileApi from '../api/client';
import { useAuth } from '../context/AuthContext';
import MobileHoardingMap from '../components/MobileHoardingMap';

const { width } = Dimensions.get('window');

export default function HoardingDetailScreen({ route, navigation }) {
  const { hoardingId } = route.params;
  const { isAuthenticated, user } = useAuth();
  const [hoarding, setHoarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  useEffect(() => {
    mobileApi
      .get(`/hoardings/${hoardingId}`)
      .then((res) => setHoarding(res.data.hoarding))
      .catch((err) => {
        console.error('Failed to load hoarding detail:', err);
        Alert.alert('Error', 'Could not load hoarding details.');
      })
      .finally(() => setLoading(false));
  }, [hoardingId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading hoarding specifications...</Text>
      </SafeAreaView>
    );
  }

  if (!hoarding) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Hoarding not found</Text>
      </SafeAreaView>
    );
  }

  const isAvailable = hoarding.availabilityStatus === 'available';
  const coords = hoarding.location?.geo?.coordinates;
  const hasCoords = coords && coords.length === 2;
  const lat = hasCoords ? coords[1] : null;
  const lng = hasCoords ? coords[0] : null;

  const openGoogleMaps = () => {
    let url = hoarding.location?.googleMapsUrl;
    if (!url && hasCoords) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (url) {
      Linking.openURL(url).catch((err) =>
        Alert.alert('Error', 'Could not launch Google Maps on this device.')
      );
    } else {
      Alert.alert('Notice', 'No GPS location link provided for this site.');
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in or register to book this hoarding site.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Sign In', onPress: () => navigation.navigate('Account') }
      ]);
      return;
    }

    Alert.alert(
      'Reserve Hoarding Campaign',
      `Submit booking request for "${hoarding.title}" at ₹${(hoarding.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}/mo?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Booking Request',
          onPress: async () => {
            try {
              const startDate = new Date();
              startDate.setDate(startDate.getDate() + 2);
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + (hoarding.pricing?.minimumBookingDays || 30));

              const res = await mobileApi.post('/bookings', {
                hoardingId: hoarding._id,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                notes: 'Booking initiated from Adverse Mobile App'
              });

              if (res.data.success) {
                Alert.alert(
                  'Booking Initiated! 🎉',
                  'Your reservation request has been submitted. Check "My Bookings" tab to view payment and invoice instructions.',
                  [{ text: 'View Bookings', onPress: () => navigation.navigate('BookingsTab') }]
                );
              }
            } catch (err) {
              Alert.alert('Booking Error', err.response?.data?.message || 'Could not complete booking.');
            }
          }
        }
      ]
    );
  };

  const photos = hoarding.photos && hoarding.photos.length > 0
    ? hoarding.photos
    : ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {hoarding.title}
        </Text>
        <TouchableOpacity onPress={openGoogleMaps} style={styles.mapsHeaderBtn}>
          <Ionicons name="navigate" size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Photo Gallery Carousel */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: photos[activePhotoIdx] }} style={styles.mainPhoto} />
          <View style={[styles.statusBadge, isAvailable ? styles.badgeAvail : styles.badgeBooked]}>
            <Text style={[styles.statusBadgeText, isAvailable ? styles.badgeAvailText : styles.badgeBookedText]}>
              {isAvailable ? 'AVAILABLE FOR RENT' : 'CURRENTLY OCCUPIED'}
            </Text>
          </View>
        </View>

        {photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsRow}>
            {photos.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActivePhotoIdx(idx)}
                style={[styles.thumbnailWrap, activePhotoIdx === idx && styles.thumbnailWrapActive]}
              >
                <Image source={{ uri: p }} style={styles.thumbnailImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Title & Location Section */}
        <View style={styles.contentSection}>
          <View style={styles.categoryPillRow}>
            <Text style={styles.categoryPill}>{hoarding.hoardingType || 'Billboard'}</Text>
            <Text style={styles.categoryPill}>{hoarding.lightingType || 'Frontlit'}</Text>
            <Text style={styles.categoryPill}>{hoarding.location?.city || 'Kolkata'}</Text>
          </View>

          <Text style={styles.title}>{hoarding.title}</Text>

          <View style={styles.addressRow}>
            <Ionicons name="location-sharp" size={16} color="#2563eb" />
            <Text style={styles.addressText}>
              {hoarding.location?.address}, {hoarding.location?.city}
              {hoarding.location?.pincode ? ` - ${hoarding.location.pincode}` : ''}
            </Text>
          </View>

          {/* Prominent Google Maps Redirect Button */}
          <TouchableOpacity onPress={openGoogleMaps} style={styles.googleMapsButton}>
            <View style={styles.googleMapsIconCircle}>
              <Ionicons name="navigate" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.googleMapsBtnTitle}>Open in Google Maps / GPS Navigation</Text>
              <Text style={styles.googleMapsBtnSubtitle}>
                {hasCoords ? `Coordinates: ${lat?.toFixed(4)}, ${lng?.toFixed(4)}` : 'Tap to open exact street location'}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Pricing Summary Card */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingCardTitle}>RENTAL TARIFF</Text>
            <Text style={styles.pricingMinDays}>
              Min Duration: {hoarding.pricing?.minimumBookingDays || 15} days
            </Text>
          </View>

          <View style={styles.priceFiguresRow}>
            <View>
              <Text style={styles.priceBig}>
                ₹{(hoarding.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}
                <Text style={styles.priceBigUnit}> / month</Text>
              </Text>
              <Text style={styles.dailyEquivalent}>
                Daily rate: ₹{(hoarding.pricing?.baseRatePerDay || Math.round((hoarding.pricing?.baseRatePerMonth || 0)/30)).toLocaleString('en-IN')}/day
              </Text>
            </View>
          </View>

          <View style={styles.costsGrid}>
            <View style={styles.costItem}>
              <Text style={styles.costItemLabel}>Printing Flex</Text>
              <Text style={styles.costItemVal}>
                ₹{(hoarding.pricing?.printingCostEstimate || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.costItem}>
              <Text style={styles.costItemLabel}>Mounting Labor</Text>
              <Text style={styles.costItemVal}>
                ₹{(hoarding.pricing?.mountingCostEstimate || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Hoarding Technical Specifications */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionHeader}>Board Specifications</Text>

          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Ionicons name="resize-outline" size={18} color="#2563eb" />
              <Text style={styles.specBoxLabel}>Dimensions</Text>
              <Text style={styles.specBoxVal}>
                {hoarding.dimensions?.width} × {hoarding.dimensions?.height} {hoarding.dimensions?.unit || 'ft'}
              </Text>
            </View>

            <View style={styles.specBox}>
              <Ionicons name="sunny-outline" size={18} color="#2563eb" />
              <Text style={styles.specBoxLabel}>Lighting</Text>
              <Text style={styles.specBoxVal}>{hoarding.lightingType || 'Frontlit'}</Text>
            </View>

            <View style={styles.specBox}>
              <Ionicons name="construct-outline" size={18} color="#2563eb" />
              <Text style={styles.specBoxLabel}>Structure</Text>
              <Text style={styles.specBoxVal}>{hoarding.hoardingType || 'Billboard'}</Text>
            </View>

            <View style={styles.specBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#2563eb" />
              <Text style={styles.specBoxLabel}>Permit</Text>
              <Text style={styles.specBoxVal}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Interactive Location Map */}
        {hasCoords && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionHeader}>Live Location & Vicinity</Text>
            <Text style={styles.sectionSubtext}>
              Interactive map with street, hybrid, and satellite layers
            </Text>

            <View style={{ height: 260, marginTop: 10, borderRadius: 16, overflow: 'hidden' }}>
              <MobileHoardingMap
                hoardings={[hoarding]}
                center={[lat, lng]}
                zoom={14}
                height="100%"
              />
            </View>
          </View>
        )}

        {/* Description */}
        {hoarding.description ? (
          <View style={styles.contentSection}>
            <Text style={styles.sectionHeader}>Site Description</Text>
            <Text style={styles.descText}>{hoarding.description}</Text>
          </View>
        ) : null}

        {/* Media Owner Agency Info */}
        <View style={styles.agencyCard}>
          <Ionicons name="business" size={24} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={styles.agencyName}>
              {hoarding.owner?.companyDetails?.companyName || hoarding.owner?.name || 'Verified Media Owner'}
            </Text>
            <Text style={styles.agencySub}>West Bengal Accredited OOH Advertising Partner</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Booking Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>TOTAL BASE RENT</Text>
          <Text style={styles.bottomPrice}>
            ₹{(hoarding.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}
            <Text style={{ fontSize: 11, color: '#64748b' }}>/mo</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleBookNow}
          disabled={!isAvailable}
          style={[styles.bookBtn, !isAvailable && styles.bookBtnDisabled]}
        >
          <Ionicons name="calendar" size={18} color="#fff" />
          <Text style={styles.bookBtnText}>
            {isAvailable ? 'Reserve Campaign' : 'Currently Occupied'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  mapsHeaderBtn: {
    padding: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  photoContainer: {
    height: 240,
    width: '100%',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeAvail: {
    backgroundColor: '#dcfce7',
  },
  badgeAvailText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '900',
  },
  badgeBooked: {
    backgroundColor: '#e0e7ff',
  },
  badgeBookedText: {
    color: '#3730a3',
    fontSize: 11,
    fontWeight: '900',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  thumbnailWrap: {
    width: 60,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailWrapActive: {
    borderColor: '#2563eb',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 10,
  },
  categoryPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 24,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  googleMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  googleMapsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMapsBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e40af',
  },
  googleMapsBtnSubtitle: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 1,
  },
  pricingCard: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  pricingMinDays: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '700',
  },
  priceFiguresRow: {
    marginBottom: 12,
  },
  priceBig: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  priceBigUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  dailyEquivalent: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  costsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  costItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  costItemLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  costItemVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  sectionSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  specBox: {
    width: (width - 48) / 2,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  specBoxLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  specBoxVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  descText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    marginTop: 6,
  },
  agencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 16,
    gap: 12,
  },
  agencyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  agencySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
  },
  bottomPriceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
  },
  bottomPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  bookBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  bookBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  bookBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
