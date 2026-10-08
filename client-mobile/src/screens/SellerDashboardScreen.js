import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  FlatList,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import mobileApi from '../api/client';
import { useAuth } from '../context/AuthContext';
import MobileHoardingMap from '../components/MobileHoardingMap';

const { width } = Dimensions.get('window');

export default function SellerDashboardScreen({ navigation }) {
  const { user, isAuthenticated, isSeller, isApprovedSeller, isPendingSeller, updateProfile, refreshUser } = useAuth();

  const [hoardings, setHoardings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMapPickerModal, setShowMapPickerModal] = useState(false);

  // Business Profile Form
  const [profileForm, setProfileForm] = useState({
    companyName: '',
    gstNumber: '',
    tradeLicense: '',
    address: '',
    phone: '',
    name: ''
  });

  // Add Hoarding Form
  const [newHoarding, setNewHoarding] = useState({
    title: '',
    description: '',
    hoardingType: 'Billboard',
    lightingType: 'Frontlit',
    width: '40',
    height: '20',
    address: '',
    city: 'Kolkata',
    latitude: '',
    longitude: '',
    googleMapsUrl: '',
    baseRatePerMonth: '',
    photos: []
  });

  const [pickedCoords, setPickedCoords] = useState(null);

  const fetchSellerData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [hRes, pRes, bRes] = await Promise.all([
        mobileApi.get('/hoardings/my-sites').catch(() => ({ data: { hoardings: [] } })),
        mobileApi.get('/payments').catch(() => ({ data: { payments: [] } })),
        mobileApi.get('/bookings').catch(() => ({ data: { bookings: [] } }))
      ]);
      setHoardings(hRes.data.hoardings || []);
      setPayments(pRes.data.payments || []);
      setBookings(bRes.data.bookings || []);
    } catch (err) {
      console.warn('Error fetching seller dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSellerData();
      if (user) {
        setProfileForm({
          companyName: user.companyDetails?.companyName || '',
          gstNumber: user.companyDetails?.gstNumber || '',
          tradeLicense: user.companyDetails?.tradeLicense || '',
          address: user.companyDetails?.address || '',
          phone: user.phone || '',
          name: user.name || ''
        });
      }
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.authPromptContainer}>
        <Ionicons name="lock-closed-outline" size={54} color="#64748b" />
        <Text style={styles.authPromptTitle}>Media Owner Portal</Text>
        <Text style={styles.authPromptSubtitle}>
          Sign in with your seller account to manage hoardings, view live stats, and verify client cheques.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Account')}
          style={styles.signInBtn}
        >
          <Text style={styles.signInBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        companyDetails: {
          companyName: profileForm.companyName,
          gstNumber: profileForm.gstNumber || 'Unregistered',
          tradeLicense: profileForm.tradeLicense,
          address: profileForm.address
        }
      });
      if (refreshUser) await refreshUser();
      Alert.alert('Profile Updated', 'Your business details were updated and submitted for admin accreditation.');
      setShowProfileModal(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update business profile.');
    }
  };

  const handleStatusToggle = async (hoardingId, currentStatus) => {
    const nextStatus = currentStatus === 'available' ? 'occupied' : 'available';
    try {
      await mobileApi.put(`/hoardings/${hoardingId}/status`, { status: nextStatus });
      setHoardings(prev =>
        prev.map(h => (h._id === hoardingId ? { ...h, availabilityStatus: nextStatus } : h))
      );
      Alert.alert('Status Updated', `Hoarding is now marked as ${nextStatus.toUpperCase()}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to change status.');
    }
  };

  const handleVerifyCheque = async (paymentId) => {
    Alert.alert(
      'Confirm Payment Verification',
      'Verify this customer offline cheque / bank slip and activate the campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify & Confirm',
          onPress: async () => {
            try {
              await mobileApi.put(`/payments/${paymentId}/verify`, {
                verificationNotes: 'Verified via Adverse Mobile App'
              });
              Alert.alert('Payment Verified! 🎉', 'Campaign has been confirmed.');
              fetchSellerData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to verify payment.');
            }
          }
        }
      ]
    );
  };

  const handlePointPicked = (lat, lng) => {
    setPickedCoords([lat, lng]);
    const mapsUrl = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
    setNewHoarding(prev => ({
      ...prev,
      latitude: lat.toFixed(5),
      longitude: lng.toFixed(5),
      googleMapsUrl: mapsUrl
    }));
    Alert.alert(
      'Location Pinned! 📍',
      `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}\nAuto-filled Google Maps link.`
    );
    setShowMapPickerModal(false);
  };

  const handleAddHoardingSubmit = async () => {
    if (!newHoarding.title || !newHoarding.address || !newHoarding.baseRatePerMonth) {
      Alert.alert('Missing Fields', 'Please provide Title, Address, and Monthly Rent.');
      return;
    }

    try {
      await mobileApi.post('/hoardings', {
        title: newHoarding.title,
        description: newHoarding.description,
        hoardingType: newHoarding.hoardingType,
        lightingType: newHoarding.lightingType,
        dimensions: {
          width: Number(newHoarding.width) || 40,
          height: Number(newHoarding.height) || 20
        },
        location: {
          address: newHoarding.address,
          city: newHoarding.city || 'Kolkata',
          googleMapsUrl: newHoarding.googleMapsUrl || '',
          geo: newHoarding.latitude && newHoarding.longitude
            ? { type: 'Point', coordinates: [parseFloat(newHoarding.longitude), parseFloat(newHoarding.latitude)] }
            : undefined
        },
        pricing: {
          baseRatePerMonth: Number(newHoarding.baseRatePerMonth),
          baseRatePerDay: Math.round(Number(newHoarding.baseRatePerMonth) / 30)
        },
        photos: [
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'
        ]
      });

      Alert.alert('Success! 🎉', 'New hoarding board enlisted.');
      setShowAddModal(false);
      fetchSellerData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to enlist hoarding.');
    }
  };

  const verifiedEarnings = (payments || [])
    .filter(p => p.paymentStatus === 'verified')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.brandTitle}>SELLER DESK</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PORTAL</Text>
            </View>
          </View>
          <Text style={styles.agencySubtitle}>
            {user?.companyDetails?.companyName || user?.name || 'Media Owner'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => fetchSellerData()}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
        {/* ============================================================== */}
        {/* SELLER APPROVAL STATUS BANNER */}
        {/* ============================================================== */}
        {isPendingSeller ? (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerHeader}>
              <Ionicons name="time" size={22} color="#b45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Pending Admin Verification</Text>
                <Text style={styles.pendingSubtitle}>
                  Your agency profile is waiting for Super Admin accreditation. Hoarding enlistment is locked until verified.
                </Text>
              </View>
            </View>

            <View style={styles.pendingDetailsBox}>
              <Text style={styles.pendingDetailText}>
                • Agency: {user?.companyDetails?.companyName || 'Not Set'}
              </Text>
              <Text style={styles.pendingDetailText}>
                • GST: {user?.companyDetails?.gstNumber || 'Unregistered'}
              </Text>
              <Text style={styles.pendingDetailText}>
                • Trade License: {user?.companyDetails?.tradeLicense || 'Pending'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              style={styles.updateProfileBtn}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.updateProfileBtnText}>Update Business Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.approvedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#166534" />
            <View style={{ flex: 1 }}>
              <Text style={styles.approvedTitle}>Verified & Accredited Media Owner</Text>
              <Text style={styles.approvedSubtitle}>
                Authorized to enlist hoarding inventory across West Bengal.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Text style={styles.editProfileLink}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Global Key Stats Bar */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TOTAL SITES</Text>
            <Text style={styles.statValue}>{hoardings.length}</Text>
            <Text style={styles.statSub}>
              {hoardings.filter(h => h.availabilityStatus === 'available').length} Avail
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>BOOKINGS</Text>
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statSub}>Total Leases</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>CHEQUES</Text>
            <Text style={[styles.statValue, { color: '#d97706' }]}>
              {payments.filter(p => p.paymentStatus === 'pending').length}
            </Text>
            <Text style={styles.statSub}>Pending</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>EARNINGS</Text>
            <Text style={[styles.statValue, { color: '#16a34a', fontSize: 16 }]}>
              ₹{verifiedEarnings.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statSub}>Verified</Text>
          </View>
        </View>

        {/* Action Button: Enlist New Hoarding */}
        <TouchableOpacity
          onPress={() => {
            if (isPendingSeller) {
              Alert.alert(
                'Approval Required',
                'Super Admin verification required before enlisting new hoardings. Please complete your profile details.'
              );
              setShowProfileModal(true);
              return;
            }
            setShowAddModal(true);
          }}
          style={[styles.addHoardingBtn, isPendingSeller && styles.addHoardingBtnLocked]}
        >
          <Ionicons
            name={isPendingSeller ? 'lock-closed' : 'add-circle'}
            size={20}
            color="#fff"
          />
          <Text style={styles.addHoardingBtnText}>
            {isPendingSeller ? 'Enlist Site (Locked: Pending Verification)' : 'Enlist New Hoarding Site'}
          </Text>
        </TouchableOpacity>

        {/* SECTION: INVENTORY CARDS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Listed Hoardings ({hoardings.length})</Text>
        </View>

        {hoardings.length === 0 ? (
          <View style={styles.emptyInventory}>
            <Ionicons name="images-outline" size={40} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Hoardings Listed Yet</Text>
            <Text style={styles.emptySub}>
              Tap "Enlist New Hoarding Site" above to add your first billboard.
            </Text>
          </View>
        ) : (
          hoardings.map(h => {
            const isAvail = h.availabilityStatus === 'available';
            const hasMaps = h.location?.googleMapsUrl || h.location?.geo?.coordinates?.length === 2;

            return (
              <View key={h._id} style={styles.inventoryCard}>
                <Image
                  source={{
                    uri: h.photos?.[0] || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'
                  }}
                  style={styles.inventoryCardImg}
                />
                <View style={styles.inventoryCardBody}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inventoryCity}>{h.location?.city || 'Kolkata'}</Text>
                    <View style={[styles.statusPill, isAvail ? styles.pillAvail : styles.pillBooked]}>
                      <Text style={[styles.statusPillText, isAvail ? styles.pillAvailText : styles.pillBookedText]}>
                        {isAvail ? 'AVAILABLE' : 'BOOKED'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.inventoryTitle} numberOfLines={1}>{h.title}</Text>
                  <Text style={styles.inventoryAddress} numberOfLines={1}>{h.location?.address}</Text>

                  <View style={styles.inventoryPriceRow}>
                    <Text style={styles.inventoryPrice}>
                      ₹{(h.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}/mo
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {hasMaps && (
                        <TouchableOpacity
                          onPress={() => {
                            const url = h.location?.googleMapsUrl ||
                              `https://www.google.com/maps?q=${h.location?.geo?.coordinates[1]},${h.location?.geo?.coordinates[0]}`;
                            Linking.openURL(url);
                          }}
                          style={styles.cardMapsIconBtn}
                        >
                          <Ionicons name="navigate" size={14} color="#2563eb" />
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#2563eb' }}>Map</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => handleStatusToggle(h._id, h.availabilityStatus)}
                        style={styles.toggleStatusBtn}
                      >
                        <Text style={styles.toggleStatusBtnText}>
                          {isAvail ? 'Mark Booked' : 'Mark Available'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* SECTION: OFFLINE CHEQUE / NEFT VERIFICATION */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text style={styles.sectionHeading}>
            Offline Cheque / NEFT Verification Desk ({payments.filter(p => p.paymentStatus === 'pending').length})
          </Text>
        </View>

        {payments.filter(p => p.paymentStatus === 'pending').length === 0 ? (
          <View style={styles.emptyCheques}>
            <Ionicons name="checkmark-done-circle-outline" size={36} color="#16a34a" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 4 }}>
              All client payments verified!
            </Text>
          </View>
        ) : (
          payments
            .filter(p => p.paymentStatus === 'pending')
            .map(p => (
              <View key={p._id} style={styles.chequeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chequeBookingId}>
                    Booking #{p.booking?.slice(-6) || p._id.slice(-6)}
                  </Text>
                  <Text style={styles.chequeAmount}>
                    ₹{(p.amount || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.chequeRef}>
                    Mode: {p.paymentMethod?.toUpperCase()} • Ref: {p.transactionReference || 'Cheque'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleVerifyCheque(p._id)}
                  style={styles.verifyChequeBtn}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.verifyChequeBtnText}>Verify</Text>
                </TouchableOpacity>
              </View>
            ))
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* ADD HOARDING MODAL */}
      {/* ============================================================== */}
      <Modal visible={showAddModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeading}>Enlist New Hoarding Board</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            <Text style={styles.inputLabel}>Site Title / Location Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Prime Billboard at Park Circus 7-Point"
              value={newHoarding.title}
              onChangeText={t => setNewHoarding(p => ({ ...p, title: t }))}
            />

            <Text style={styles.inputLabel}>City / District</Text>
            <TextInput
              style={styles.input}
              placeholder="Kolkata, Durgapur, Siliguri, Howrah..."
              value={newHoarding.city}
              onChangeText={t => setNewHoarding(p => ({ ...p, city: t }))}
            />

            <Text style={styles.inputLabel}>Exact Road / Landmark Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Near Quest Mall Flyover, AJC Bose Road"
              value={newHoarding.address}
              onChangeText={t => setNewHoarding(p => ({ ...p, address: t }))}
            />

            {/* GPS Pinning & Map Picker */}
            <View style={styles.pinSection}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>GPS Location Pin</Text>
                <Text style={styles.pinSub}>
                  {newHoarding.latitude
                    ? `Pinned: ${newHoarding.latitude}, ${newHoarding.longitude}`
                    : 'Tap "Pin on Free Map" to set coordinates'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowMapPickerModal(true)}
                style={styles.pinBtn}
              >
                <Ionicons name="pin" size={16} color="#2563eb" />
                <Text style={styles.pinBtnText}>Pin on Free Map</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Google Maps Link (Auto-generated or Paste)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://maps.google.com/?q=..."
              value={newHoarding.googleMapsUrl}
              onChangeText={t => setNewHoarding(p => ({ ...p, googleMapsUrl: t }))}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Width (ft)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newHoarding.width}
                  onChangeText={t => setNewHoarding(p => ({ ...p, width: t }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Height (ft)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newHoarding.height}
                  onChangeText={t => setNewHoarding(p => ({ ...p, height: t }))}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Monthly Rental Rate (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g., 85000"
              value={newHoarding.baseRatePerMonth}
              onChangeText={t => setNewHoarding(p => ({ ...p, baseRatePerMonth: t }))}
            />

            <TouchableOpacity
              onPress={handleAddHoardingSubmit}
              style={styles.submitModalBtn}
            >
              <Text style={styles.submitModalBtnText}>Enlist Hoarding Site</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* INTERACTIVE MAP LOCATION PICKER MODAL */}
      {/* ============================================================== */}
      <Modal visible={showMapPickerModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <View style={styles.mapPickerHeader}>
            <View>
              <Text style={styles.mapPickerTitle}>Pin Hoarding Location</Text>
              <Text style={styles.mapPickerSubtitle}>
                Tap anywhere on the map to set exact coordinates
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowMapPickerModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <MobileHoardingMap
              pickerMode={true}
              selectedPoint={pickedCoords || [22.5726, 88.3639]}
              center={pickedCoords || [22.5726, 88.3639]}
              onPointPicked={handlePointPicked}
              height="100%"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* BUSINESS PROFILE EDIT MODAL */}
      {/* ============================================================== */}
      <Modal visible={showProfileModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeading}>Agency Business Accreditation</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            <Text style={styles.inputLabel}>Agency / Company Name *</Text>
            <TextInput
              style={styles.input}
              value={profileForm.companyName}
              onChangeText={t => setProfileForm(p => ({ ...p, companyName: t }))}
            />

            <Text style={styles.inputLabel}>GST Number (or "Unregistered")</Text>
            <TextInput
              style={styles.input}
              value={profileForm.gstNumber}
              onChangeText={t => setProfileForm(p => ({ ...p, gstNumber: t }))}
            />

            <Text style={styles.inputLabel}>Municipal / District Trade License</Text>
            <TextInput
              style={styles.input}
              value={profileForm.tradeLicense}
              onChangeText={t => setProfileForm(p => ({ ...p, tradeLicense: t }))}
            />

            <Text style={styles.inputLabel}>Registered Business Address</Text>
            <TextInput
              style={styles.input}
              value={profileForm.address}
              onChangeText={t => setProfileForm(p => ({ ...p, address: t }))}
            />

            <Text style={styles.inputLabel}>Official Contact Phone</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={profileForm.phone}
              onChangeText={t => setProfileForm(p => ({ ...p, phone: t }))}
            />

            <TouchableOpacity
              onPress={handleUpdateProfile}
              style={styles.submitModalBtn}
            >
              <Text style={styles.submitModalBtnText}>Submit for Admin Approval</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  authPromptContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  authPromptTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 14,
  },
  authPromptSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  signInBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  agencySubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  pendingBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  pendingBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#92400e',
  },
  pendingSubtitle: {
    fontSize: 11,
    color: '#78350f',
    marginTop: 2,
    lineHeight: 16,
  },
  pendingDetailsBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    gap: 2,
  },
  pendingDetailText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  updateProfileBtn: {
    backgroundColor: '#d97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  updateProfileBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  approvedBanner: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  approvedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  approvedSubtitle: {
    fontSize: 10,
    color: '#15803d',
  },
  editProfileLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    textDecorationLine: 'underline',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  statSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  addHoardingBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  addHoardingBtnLocked: {
    backgroundColor: '#64748b',
  },
  addHoardingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  emptyInventory: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  inventoryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 10,
    flexDirection: 'row',
  },
  inventoryCardImg: {
    width: 90,
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  inventoryCardBody: {
    flex: 1,
    padding: 10,
  },
  inventoryCity: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillAvail: { backgroundColor: '#dcfce7' },
  pillAvailText: { color: '#166534', fontSize: 9, fontWeight: '900' },
  pillBooked: { backgroundColor: '#e0e7ff' },
  pillBookedText: { color: '#3730a3', fontSize: 9, fontWeight: '900' },
  inventoryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  inventoryAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  inventoryPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inventoryPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  cardMapsIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleStatusBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleStatusBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  emptyCheques: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chequeCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chequeBookingId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  chequeAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  chequeRef: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  verifyChequeBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyChequeBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  pinSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  pinSub: {
    fontSize: 11,
    color: '#1d4ed8',
    marginTop: 2,
  },
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  pinBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  submitModalBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitModalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  mapPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0f172a',
  },
  mapPickerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  mapPickerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
  },
});
