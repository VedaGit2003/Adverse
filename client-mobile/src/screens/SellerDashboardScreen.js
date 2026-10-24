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
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import mobileApi from '../api/client';
import { useAuth } from '../context/AuthContext';
import MobileHoardingMap from '../components/MobileHoardingMap';

const { width } = Dimensions.get('window');

// 3-Phase Mounting Tracker for Seller Desk
function SellerMountingTracker({ booking, onRefresh, onOpenProofModal }) {
  const [timeLeftMounting, setTimeLeftMounting] = useState('');
  const [timeLeftVerification, setTimeLeftVerification] = useState('');
  const [updatingPhase, setUpdatingPhase] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const m = booking?.mountingDetails || {};
  const isMountingWindow = booking.bookingStatus === 'mounting_window' || booking.bookingStatus === 'confirmed';
  const isVerificationPending = booking.bookingStatus === 'verification_pending';
  const isActive = booking.bookingStatus === 'active';

  useEffect(() => {
    const updateCountdowns = () => {
      // 3-Day Mounting Window Countdown
      if (m.windowEndsAt && (isMountingWindow || isVerificationPending)) {
        const diff = new Date(m.windowEndsAt) - new Date();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeftMounting(`${hours}h ${mins}m`);
        } else {
          setTimeLeftMounting('Elapsed');
        }
      }

      // 4-Hour Customer Verification Countdown
      if (m.verificationWindowExpiresAt && isVerificationPending) {
        const diff = new Date(m.verificationWindowExpiresAt) - new Date();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeftVerification(`${hours}h ${mins}m ${secs}s`);
        } else {
          setTimeLeftVerification('Expired (Auto-Activating)');
        }
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [m.windowEndsAt, m.verificationWindowExpiresAt, isMountingWindow, isVerificationPending]);

  const handleUpdatePhase = async (phase, status) => {
    setUpdatingPhase(phase);
    try {
      await mobileApi.put(`/bookings/${booking._id}/mounting-phase`, { phase, status });
      Alert.alert(
        'Phase Updated',
        `Phase marked as ${status === 'completed' ? 'Completed' : 'In Progress'}.`
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update mounting phase.');
    } finally {
      setUpdatingPhase(null);
    }
  };

  const renderBadge = (status) => {
    if (status === 'completed' || status === 'verified') {
      return (
        <View style={[styles.mPhaseBadge, styles.mBadgeCompleted]}>
          <Ionicons name="checkmark-circle" size={12} color="#166534" />
          <Text style={styles.mBadgeCompletedText}>Done</Text>
        </View>
      );
    }
    if (status === 'in_progress' || status === 'proof_uploaded') {
      return (
        <View style={[styles.mPhaseBadge, styles.mBadgeProgress]}>
          <Ionicons name="time" size={12} color="#1e40af" />
          <Text style={styles.mBadgeProgressText}>In Progress</Text>
        </View>
      );
    }
    return (
      <View style={[styles.mPhaseBadge, styles.mBadgePending]}>
        <Text style={styles.mBadgePendingText}>Pending</Text>
      </View>
    );
  };

  return (
    <View style={styles.trackerContainer}>
      {/* Tracker Collapsible Header */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={styles.trackerHeader}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.windowTag}>
              <Text style={styles.windowTagText}>3-DAY MOUNTING WINDOW</Text>
            </View>
            <Text style={styles.pipelineSub}>Seller Controls</Text>
          </View>
          <Text style={styles.trackerTitle}>Mounting Pipeline & Verification</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isMountingWindow && timeLeftMounting ? (
            <View style={styles.timerChipAmber}>
              <Ionicons name="time-outline" size={12} color="#b45309" />
              <Text style={styles.timerChipAmberText}>{timeLeftMounting}</Text>
            </View>
          ) : null}

          {isVerificationPending && timeLeftVerification ? (
            <View style={styles.timerChipPurple}>
              <Ionicons name="hourglass-outline" size={12} color="#7e22ce" />
              <Text style={styles.timerChipPurpleText}>{timeLeftVerification}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 }}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color="#4f46e5" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Pipeline Details */}
      {expanded && (
        <View style={{ marginTop: 10 }}>

      {/* 3 Phases Stepper */}
      <View style={styles.phasesRow}>
        {/* Phase 1: Flex Pick up */}
        <View style={[styles.phaseBox, m.flexPickupStatus === 'completed' && styles.phaseBoxCompleted]}>
          <View style={styles.phaseBoxTop}>
            <Ionicons
              name="car-outline"
              size={18}
              color={m.flexPickupStatus === 'completed' ? '#166534' : '#2563eb'}
            />
            {renderBadge(m.flexPickupStatus)}
          </View>
          <Text style={styles.phaseNumber}>PHASE 1</Text>
          <Text style={styles.phaseName}>Flex Pick up</Text>
          <Text style={styles.phaseDesc}>Pick up flex from client</Text>
          {m.flexPickupStatus !== 'completed' ? (
            <TouchableOpacity
              onPress={() => handleUpdatePhase('pickup', 'completed')}
              disabled={updatingPhase === 'pickup'}
              style={styles.phaseActionBtnSmall}
            >
              <Text style={styles.phaseActionBtnText}>
                {updatingPhase === 'pickup' ? '...' : 'Mark Picked Up'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.phaseDoneLabel}>✓ Picked Up</Text>
          )}
        </View>

        {/* Phase 2: Mounting */}
        <View style={[styles.phaseBox, m.mountingStatus === 'completed' && styles.phaseBoxCompleted]}>
          <View style={styles.phaseBoxTop}>
            <Ionicons
              name="construct-outline"
              size={18}
              color={m.mountingStatus === 'completed' ? '#166534' : '#2563eb'}
            />
            {renderBadge(m.mountingStatus)}
          </View>
          <Text style={styles.phaseNumber}>PHASE 2</Text>
          <Text style={styles.phaseName}>Mounting</Text>
          <Text style={styles.phaseDesc}>Install & tension flex</Text>
          {m.mountingStatus !== 'completed' ? (
            <TouchableOpacity
              onPress={() => handleUpdatePhase('mounting', 'completed')}
              disabled={updatingPhase === 'mounting'}
              style={styles.phaseActionBtnSmall}
            >
              <Text style={styles.phaseActionBtnText}>
                {updatingPhase === 'mounting' ? '...' : 'Mark Mounted'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.phaseDoneLabel}>✓ Mounted</Text>
          )}
        </View>

        {/* Phase 3: Confirmation */}
        <View style={[styles.phaseBox, m.confirmationStatus === 'verified' && styles.phaseBoxCompleted]}>
          <View style={styles.phaseBoxTop}>
            <Ionicons
              name="camera-outline"
              size={18}
              color={m.confirmationStatus === 'verified' ? '#166534' : '#7e22ce'}
            />
            {renderBadge(m.confirmationStatus)}
          </View>
          <Text style={styles.phaseNumber}>PHASE 3</Text>
          <Text style={styles.phaseName}>Confirmation</Text>
          <Text style={styles.phaseDesc}>Proof with date & time</Text>
          <TouchableOpacity
            onPress={() => onOpenProofModal(booking)}
            style={[styles.phaseActionBtnSmall, { backgroundColor: '#7e22ce' }]}
          >
            <Text style={styles.phaseActionBtnText}>
              {m.proofPhotoUrl ? 'Update Proof' : 'Upload Proof'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Proof Photo Display Card */}
      {m.proofPhotoUrl && (
        <View style={styles.sellerProofCard}>
          <Image source={{ uri: m.proofPhotoUrl }} style={styles.sellerProofImg} />
          <View style={styles.sellerProofMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="shield-checkmark" size={14} color="#166534" />
              <Text style={styles.sellerProofMetaTitle}>Installation Proof Recorded</Text>
            </View>
            {m.proofPhotoCapturedAt && (
              <Text style={styles.sellerProofDate}>
                Timestamp: {new Date(m.proofPhotoCapturedAt).toLocaleString('en-IN')}
              </Text>
            )}
            {m.proofGeoLocation?.verifiedOnSite ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="checkmark-circle" size={12} color="#15803d" />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803d' }}>
                  🟢 On-Site Verified ({m.proofGeoLocation.distanceMetersFromHoarding}m)
                </Text>
              </View>
            ) : m.proofGeoLocation?.isWithinGeofence === false ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="warning" size={12} color="#b45309" />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#b45309' }}>
                  ⚠️ Geofence: {m.proofGeoLocation.distanceMetersFromHoarding}m from site
                </Text>
              </View>
            ) : null}
            {m.mountingNotes ? (
              <Text style={styles.sellerProofNotes} numberOfLines={2}>
                Notes: "{m.mountingNotes}"
              </Text>
            ) : null}

            <View style={{ marginTop: 4 }}>
              {isVerificationPending ? (
                <Text style={styles.sellerProofStatusPending}>
                  ⏳ 4-Hour Customer Verification window active ({timeLeftVerification || 'counting down'})
                </Text>
              ) : m.customerVerified ? (
                <Text style={styles.sellerProofStatusDone}>
                  ✓ Verified by Customer ({m.customerVerifiedAt ? new Date(m.customerVerifiedAt).toLocaleDateString('en-IN') : ''})
                </Text>
              ) : m.adminVerified ? (
                <Text style={styles.sellerProofStatusDone}>
                  ✓ Auto-verified / Overridden by Admin
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      )}

      {/* Subscription Active Banner */}
      {isActive && (
        <View style={styles.activeCampaignBanner}>
          <Ionicons name="flash" size={18} color="#16a34a" />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeCampaignHeading}>CAMPAIGN SUBSCRIPTION ACTIVE</Text>
            <Text style={styles.activeCampaignSub}>
              Running from{' '}
              {new Date(booking.subscriptionStartDate || booking.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
              to{' '}
              {new Date(booking.subscriptionEndDate || booking.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>
      )}
        </View>
      )}
    </View>
  );
}

export default function SellerDashboardScreen({ navigation }) {
  const { user, isAuthenticated, isSeller, isApprovedSeller, isPendingSeller, updateProfile, refreshUser } = useAuth();

  const [hoardings, setHoardings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: 'inventory' | 'bookings' | 'payments'
  const [sellerActiveTab, setSellerActiveTab] = useState('inventory');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMapPickerModal, setShowMapPickerModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);

  // Photo Gallery Manager & Cover Deletion Request Modals
  const [photoManagerHoarding, setPhotoManagerHoarding] = useState(null);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [requestCoverModal, setRequestCoverModal] = useState({ visible: false, hoardingId: null, reason: '' });
  const [submittingCoverRequest, setSubmittingCoverRequest] = useState(false);

  // Edit Billboard & Price Modal
  const [editHoardingModal, setEditHoardingModal] = useState(null);
  const [savingEditHoarding, setSavingEditHoarding] = useState(false);

  // Proof Modal Form
  const [selectedBookingForProof, setSelectedBookingForProof] = useState(null);
  const [gpsFeatureEnabled, setGpsFeatureEnabled] = useState(true);

  useEffect(() => {
    mobileApi.get('/settings').then(res => {
      if (res.data?.success && res.data?.settings) {
        setGpsFeatureEnabled(res.data.settings.gpsVerificationEnabled !== false);
      }
    }).catch(() => {});
  }, []);

  const [proofForm, setProofForm] = useState({
    proofPhotoUrl: '',
    capturedAt: '',
    notes: '',
    latitude: null,
    longitude: null,
    accuracy: null,
    deviceAddress: '',
    isGpsAttached: false,
    distanceMeters: null
  });
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadingProofImage, setUploadingProofImage] = useState(false);
  const [uploadingHoardingImage, setUploadingHoardingImage] = useState(false);
  const [approvingBookingId, setApprovingBookingId] = useState(null);

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
  const [pickerTarget, setPickerTarget] = useState('new'); // 'new' | 'edit'
  const [parsingMapLink, setParsingMapLink] = useState(false);

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
    if (isAuthenticated && user?.role !== 'customer') {
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

  // Client (Advertiser) Role Guard: Clients are NOT allowed to enlist hoardings or access Seller Desk
  if (user?.role === 'customer') {
    return (
      <SafeAreaView style={styles.authPromptContainer}>
        <View style={styles.clientRestrictedIconBox}>
          <Ionicons name="shield-outline" size={44} color="#d97706" />
        </View>
        <Text style={styles.authPromptTitle}>Advertiser / Client Account</Text>
        <Text style={styles.authPromptSubtitle}>
          Clients are not allowed to enlist new hoarding sites. Hoarding site enlistment is exclusively reserved for accredited Media Owners (Sellers).
        </Text>
        <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Explore')}
            style={[styles.clientActionBtn, styles.clientActionBtnPrimary]}
          >
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.clientActionBtnTextPrimary}>Explore Available Hoardings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('BookingsTab')}
            style={[styles.clientActionBtn, styles.clientActionBtnSecondary]}
          >
            <Ionicons name="receipt-outline" size={18} color="#334155" />
            <Text style={styles.clientActionBtnTextSecondary}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
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
      const res = await mobileApi.put(`/hoardings/${hoardingId}/status`, { status: nextStatus });
      if (res.data?.requiresApproval) {
        Alert.alert('Admin Approval Required 🛡️', res.data.message);
      } else {
        setHoardings(prev =>
          prev.map(h => (h._id === hoardingId ? { ...h, availabilityStatus: nextStatus } : h))
        );
        Alert.alert('Status Updated', `Hoarding is now marked as ${nextStatus.toUpperCase()}`);
      }
      fetchSellerData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change status.');
    }
  };

  // Open Edit Billboard & Price Modal (like web client)
  const handleOpenEditModal = (hoarding) => {
    // Check if hoarding is locked (under active bookings, 3-day mounting window, or marked occupied)
    const isUnderBooking = (bookings || []).some(
      b =>
        (b.hoardingId?._id === hoarding._id || b.hoardingId === hoarding._id) &&
        ['requested', 'approved', 'confirmed', 'mounting_window', 'verification_pending', 'active'].includes(b.bookingStatus)
    );
    const isBooked = hoarding.availabilityStatus === 'occupied';
    const isLockedForApproval = isBooked || isUnderBooking;

    setEditHoardingModal({
      _id: hoarding._id,
      title: hoarding.title || '',
      description: hoarding.description || '',
      hoardingType: hoarding.hoardingType || 'Billboard',
      lightingType: hoarding.lightingType || 'Frontlit',
      width: String(hoarding.dimensions?.width || '40'),
      height: String(hoarding.dimensions?.height || '20'),
      address: hoarding.location?.address || '',
      city: hoarding.location?.city || 'Kolkata',
      googleMapsUrl: hoarding.location?.googleMapsUrl || '',
      latitude: hoarding.location?.geo?.coordinates?.[1] != null ? String(hoarding.location.geo.coordinates[1]) : '',
      longitude: hoarding.location?.geo?.coordinates?.[0] != null ? String(hoarding.location.geo.coordinates[0]) : '',
      baseRatePerMonth: String(hoarding.pricing?.baseRatePerMonth || ''),
      baseRatePerDay: String(
        hoarding.pricing?.baseRatePerDay ||
        Math.round((hoarding.pricing?.baseRatePerMonth || 0) / 30) ||
        ''
      ),
      minimumBookingDays: String(hoarding.pricing?.minimumBookingDays || '15'),
      availabilityStatus: hoarding.availabilityStatus || 'available',
      isLockedForApproval,
      hasPendingApproval: hoarding.modificationRequest?.status === 'pending'
    });
  };

  // Save Billboard Price & Specifications
  const handleSaveHoardingEdit = async () => {
    if (!editHoardingModal) return;
    const monthly = Number(editHoardingModal.baseRatePerMonth);
    if (!monthly || monthly <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid monthly rental rate (₹).');
      return;
    }

    setSavingEditHoarding(true);
    try {
      const payload = {
        title: editHoardingModal.title,
        description: editHoardingModal.description,
        hoardingType: editHoardingModal.hoardingType,
        lightingType: editHoardingModal.lightingType,
        dimensions: {
          width: Number(editHoardingModal.width) || 0,
          height: Number(editHoardingModal.height) || 0,
          unit: 'feet'
        },
        location: {
          address: editHoardingModal.address,
          city: editHoardingModal.city,
          googleMapsUrl: editHoardingModal.googleMapsUrl || '',
          latitude: editHoardingModal.latitude || '',
          longitude: editHoardingModal.longitude || '',
          geo: (editHoardingModal.latitude && editHoardingModal.longitude)
            ? {
                type: 'Point',
                coordinates: [
                  parseFloat(editHoardingModal.longitude),
                  parseFloat(editHoardingModal.latitude)
                ]
              }
            : undefined
        },
        pricing: {
          baseRatePerMonth: monthly,
          baseRatePerDay: Number(editHoardingModal.baseRatePerDay) || Math.round(monthly / 30),
          minimumBookingDays: Number(editHoardingModal.minimumBookingDays) || 15
        },
        availabilityStatus: editHoardingModal.availabilityStatus
      };

      const res = await mobileApi.put(`/hoardings/${editHoardingModal._id}`, payload);
      if (res.data?.success) {
        if (res.data.requiresApproval) {
          Alert.alert(
            'Submitted to Admin for Approval 🛡️',
            res.data.message || 'This billboard is currently booked or in an active campaign. Your price/specs update has been sent to Super Admin for approval.'
          );
        } else {
          Alert.alert('Billboard Updated! 🏷️', 'Billboard pricing and specifications updated successfully.');
        }
        setEditHoardingModal(null);
        fetchSellerData();
      }
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Failed to update billboard pricing.');
    } finally {
      setSavingEditHoarding(false);
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

  const handleSellerApproval = (bookingId, decision) => {
    Alert.alert(
      decision === 'approve' ? 'Approve Booking Request?' : 'Decline Booking Request?',
      decision === 'approve'
        ? 'This will approve the reservation and unlock the payment option for the advertiser.'
        : 'This will decline the reservation request.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approve' ? 'Approve' : 'Decline',
          style: decision === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            setApprovingBookingId(bookingId);
            try {
              await mobileApi.put(`/bookings/${bookingId}/seller-approval`, { decision });
              Alert.alert(
                decision === 'approve' ? 'Booking Approved! 🎉' : 'Booking Declined',
                decision === 'approve'
                  ? 'Payment option is now unlocked for the advertiser. Once they complete payment, the 3-day mounting window will begin.'
                  : 'The booking request has been declined.'
              );
              fetchSellerData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update approval.');
            } finally {
              setApprovingBookingId(null);
            }
          }
        }
      ]
    );
  };

  const openProofModal = (booking) => {
    setSelectedBookingForProof(booking);
    const geo = booking.mountingDetails?.proofGeoLocation || {};
    setProofForm({
      proofPhotoUrl: booking.mountingDetails?.proofPhotoUrl || '',
      capturedAt: booking.mountingDetails?.proofPhotoCapturedAt
        ? new Date(booking.mountingDetails.proofPhotoCapturedAt).toLocaleString('en-IN')
        : new Date().toLocaleString('en-IN'),
      notes: booking.mountingDetails?.mountingNotes || booking.mountingDetails?.proofNotes || '',
      latitude: geo.latitude || null,
      longitude: geo.longitude || null,
      accuracy: geo.accuracy || null,
      deviceAddress: geo.deviceAddress || '',
      isGpsAttached: Boolean(geo.latitude && geo.longitude),
      distanceMeters: geo.distanceMetersFromHoarding || null
    });
    setShowProofModal(true);
  };

  const handleSubmitProof = async () => {
    if (!proofForm.proofPhotoUrl.trim()) {
      Alert.alert('Photo Required', 'Please enter or select a proof photo URL.');
      return;
    }
    setUploadingProof(true);
    try {
      const res = await mobileApi.put(`/bookings/${selectedBookingForProof._id}/mounting-proof`, {
        proofPhotoUrl: proofForm.proofPhotoUrl.trim(),
        proofCaptureDateTime: proofForm.capturedAt || new Date().toLocaleString('en-IN'),
        notes: proofForm.notes.trim(),
        latitude: proofForm.latitude,
        longitude: proofForm.longitude,
        accuracy: proofForm.accuracy,
        deviceAddress: proofForm.deviceAddress,
        source: proofForm.isGpsAttached ? 'mobile_gps' : 'manual'
      });

      const dist = res.data?.distanceMeters;
      const verifiedOnSite = res.data?.verifiedOnSite;

      let successMsg = 'Photo proof with timestamp has been recorded. The 4-hour customer verification window is now active!';
      if (verifiedOnSite) {
        successMsg = `🟢 GPS Verified On-Site (${dist}m from billboard)! Photo with watermarked coordinates recorded. Verification window active.`;
      } else if (dist !== null && dist !== undefined) {
        successMsg = `Proof recorded. Note: Device was ${dist}m from registered billboard location.`;
      }

      Alert.alert('Proof Stamped & Uploaded! 📍', successMsg);
      setShowProofModal(false);
      fetchSellerData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload proof photo.');
    } finally {
      setUploadingProof(false);
    }
  };

  // Pick or Capture Proof Photo for Mounting Phase 3 via Cloudinary
  const handlePickProofImage = async (useCamera = false) => {
    try {
      let gpsLocation = null;

      if (useCamera) {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to capture mounting proof.');
          return;
        }

        // Request high-accuracy GPS coordinates if feature is enabled by Admin
        if (gpsFeatureEnabled) {
          try {
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            if (locStatus === 'granted') {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
              });
              let addressStr = '';
              try {
                const rev = await Location.reverseGeocodeAsync({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude
                });
                if (rev && rev[0]) {
                  addressStr = [rev[0].name, rev[0].street, rev[0].city, rev[0].region].filter(Boolean).join(', ');
                }
              } catch (revErr) {}

              gpsLocation = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: Math.round(loc.coords.accuracy || 0),
                deviceAddress: addressStr
              };
            }
          } catch (locErr) {
            console.warn('[GPS] Could not obtain GPS lock:', locErr.message);
          }
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required to select photos.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: false, // Keep raw authentic view of site
            quality: 0.8,
            base64: true
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true
          });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        setUploadingProofImage(true);
        const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;

        const uploadPayload = {
          image: base64Data,
          folder: 'adverse/mounting_proofs'
        };

        if (gpsLocation) {
          uploadPayload.latitude = gpsLocation.latitude;
          uploadPayload.longitude = gpsLocation.longitude;
          uploadPayload.accuracy = gpsLocation.accuracy;
          uploadPayload.hoardingCode =
            selectedBookingForProof?.hoarding?.hoardingCode ||
            selectedBookingForProof?.hoardingId?.hoardingCode ||
            selectedBookingForProof?.hoarding?.title ||
            'ADVERSE-SITE';
        }

        const res = await mobileApi.post('/upload/base64', uploadPayload);

        if (res.data?.success && res.data?.fileUrl) {
          setProofForm(prev => ({
            ...prev,
            proofPhotoUrl: res.data.fileUrl,
            capturedAt: new Date().toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            latitude: gpsLocation?.latitude || prev.latitude,
            longitude: gpsLocation?.longitude || prev.longitude,
            accuracy: gpsLocation?.accuracy || prev.accuracy,
            deviceAddress: gpsLocation?.deviceAddress || prev.deviceAddress,
            isGpsAttached: Boolean(gpsLocation || prev.latitude)
          }));

          if (gpsLocation) {
            Alert.alert(
              'Photo Stamped & Uploaded! 📍',
              `GPS Geofence attached (${gpsLocation.latitude.toFixed(4)}° N, ${gpsLocation.longitude.toFixed(4)}° E) ±${gpsLocation.accuracy}m.`
            );
          } else {
            Alert.alert('Photo Uploaded! ☁️', 'Proof photo successfully uploaded to Cloudinary CDN.');
          }
        } else {
          Alert.alert('Upload Failed', res.data?.message || 'Could not upload photo.');
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      Alert.alert('Upload Error', err.response?.data?.message || err.message || 'Failed to upload photo.');
    } finally {
      setUploadingProofImage(false);
    }
  };

  // Pick or Capture Hoarding Photo for Enlistment via Cloudinary (Supports multiple selection)
  const handlePickHoardingImage = async (useCamera = false) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photo.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required to select photos.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
            base64: true
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.8,
            base64: true
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingHoardingImage(true);
        const uploadedUrls = [];

        for (const asset of result.assets) {
          if (asset.base64) {
            try {
              const res = await mobileApi.post('/upload/base64', {
                image: `data:image/jpeg;base64,${asset.base64}`,
                folder: 'adverse/hoardings'
              });
              if (res.data?.success && res.data?.fileUrl) {
                uploadedUrls.push(res.data.fileUrl);
              }
            } catch (err) {
              console.warn('Single photo upload failed:', err);
            }
          }
        }

        if (uploadedUrls.length > 0) {
          setNewHoarding(prev => ({
            ...prev,
            photos: [...(prev.photos || []), ...uploadedUrls]
          }));
          Alert.alert('Photos Uploaded! ☁️', `${uploadedUrls.length} image(s) uploaded to Cloudinary CDN.`);
        } else {
          Alert.alert('Upload Failed', 'Could not upload selected photos.');
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      Alert.alert('Upload Error', err.response?.data?.message || err.message || 'Failed to upload photo.');
    } finally {
      setUploadingHoardingImage(false);
    }
  };

  // Remove photo from draft (Also deletes from Cloudinary)
  const handleRemoveHoardingPhoto = async (indexToRemove) => {
    const photoToRemove = newHoarding.photos?.[indexToRemove];
    if (photoToRemove) {
      try {
        await mobileApi.delete('/upload', { data: { url: photoToRemove } });
      } catch (err) {
        console.warn('Failed to delete draft photo from Cloudinary:', err);
      }
    }
    setNewHoarding(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Pick or Capture Photo for Existing Hoarding Gallery via Cloudinary
  const handlePickGalleryImage = async (useCamera = false) => {
    if (!photoManagerHoarding) return;
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
            base64: true
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.8,
            base64: true
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingGalleryImage(true);
        const uploadedUrls = [];

        for (const asset of result.assets) {
          if (asset.base64) {
            try {
              const res = await mobileApi.post('/upload/base64', {
                image: `data:image/jpeg;base64,${asset.base64}`,
                folder: 'adverse/hoardings'
              });
              if (res.data?.success && res.data?.fileUrl) {
                uploadedUrls.push(res.data.fileUrl);
              }
            } catch (err) {
              console.warn('Gallery upload failed:', err);
            }
          }
        }

        if (uploadedUrls.length > 0) {
          const updatedPhotos = [...(photoManagerHoarding.photos || []), ...uploadedUrls];
          await mobileApi.put(`/hoardings/${photoManagerHoarding._id}`, { photos: updatedPhotos });

          setPhotoManagerHoarding(prev => ({ ...prev, photos: updatedPhotos }));
          fetchSellerData();
          Alert.alert('Success! ☁️', `${uploadedUrls.length} photo(s) added to gallery and synced with Cloudinary.`);
        }
      }
    } catch (err) {
      Alert.alert('Upload Error', err.response?.data?.message || err.message || 'Failed to upload photo.');
    } finally {
      setUploadingGalleryImage(false);
    }
  };

  // Remove Photo from Existing Hoarding Gallery (Permanently deletes from Cloudinary)
  const handleRemoveExistingPhoto = async (indexToRemove) => {
    if (!photoManagerHoarding) return;
    const photoUrl = photoManagerHoarding.photos?.[indexToRemove];
    if (!photoUrl) return;

    // RULE: Cover photo (index 0) cannot be deleted directly
    if (indexToRemove === 0) {
      Alert.alert(
        'Cover Photo Protected 🛡️',
        'The primary Cover Photo cannot be deleted directly. Please tap "Request Cover Pic Delete" for Super Admin approval.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Delete',
            onPress: () => {
              setRequestCoverModal({
                visible: true,
                hoardingId: photoManagerHoarding._id,
                reason: ''
              });
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Delete Photo?',
      'Are you sure you want to permanently delete this photo? It will be deleted from your gallery and from Cloudinary cloud storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await mobileApi.delete(`/hoardings/${photoManagerHoarding._id}/photos`, {
                data: { photoUrl }
              });

              const newPhotos = res.data?.photos || photoManagerHoarding.photos.filter((_, idx) => idx !== indexToRemove);
              setPhotoManagerHoarding(prev => ({ ...prev, photos: newPhotos }));
              fetchSellerData();
              Alert.alert('Deleted! 🗑️', 'Photo successfully deleted from Cloudinary storage.');
            } catch (err) {
              Alert.alert('Delete Failed', err.response?.data?.message || 'Failed to delete photo.');
            }
          }
        }
      ]
    );
  };

  // Reorder photo to Cover (index 0)
  const handleSetCoverPhoto = async (indexToPromote) => {
    if (!photoManagerHoarding || indexToPromote === 0) return;
    try {
      const photos = [...photoManagerHoarding.photos];
      const [promoted] = photos.splice(indexToPromote, 1);
      photos.unshift(promoted);

      await mobileApi.put(`/hoardings/${photoManagerHoarding._id}`, { photos });
      setPhotoManagerHoarding(prev => ({ ...prev, photos }));
      fetchSellerData();
      Alert.alert('Cover Updated', 'This photo is now set as the primary cover picture.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update cover photo.');
    }
  };

  // Submit request to delete cover photo to Super Admin
  const handleSubmitCoverDeleteRequest = async () => {
    if (!requestCoverModal.hoardingId) return;
    setSubmittingCoverRequest(true);
    try {
      const res = await mobileApi.post(`/hoardings/${requestCoverModal.hoardingId}/request-cover-delete`, {
        reason: requestCoverModal.reason.trim() || 'Media owner requested removal of cover picture'
      });

      Alert.alert(
        'Request Sent to Super Admin 🛡️',
        'Your request to delete the cover photo has been submitted. The Super Admin will review it and delete the image from Cloudinary upon approval.'
      );

      setRequestCoverModal({ visible: false, hoardingId: null, reason: '' });
      if (photoManagerHoarding && photoManagerHoarding._id === requestCoverModal.hoardingId) {
        setPhotoManagerHoarding(prev => ({
          ...prev,
          coverPhotoDeletionRequest: res.data?.coverPhotoDeletionRequest || { status: 'pending' }
        }));
      }
      fetchSellerData();
    } catch (err) {
      Alert.alert('Request Failed', err.response?.data?.message || 'Failed to submit cover deletion request.');
    } finally {
      setSubmittingCoverRequest(false);
    }
  };

  const handlePointPicked = (lat, lng) => {
    setPickedCoords([lat, lng]);
    const mapsUrl = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (pickerTarget === 'edit') {
      setEditHoardingModal(prev => prev ? ({
        ...prev,
        latitude: lat.toFixed(5),
        longitude: lng.toFixed(5),
        googleMapsUrl: mapsUrl
      }) : null);
    } else {
      setNewHoarding(prev => ({
        ...prev,
        latitude: lat.toFixed(5),
        longitude: lng.toFixed(5),
        googleMapsUrl: mapsUrl
      }));
    }
    Alert.alert(
      'Location Pinned! 📍',
      `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}\nGoogle Maps link generated.`
    );
    setShowMapPickerModal(false);
  };

  // Extract coordinates from URL locally or via backend API for Mobile
  const extractCoordinatesFromUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    const pinMatch = trimmed.match(/!3d([-+]?\d+\.\d+)!4d([-+]?\d+\.\d+)/);
    if (pinMatch) return { lat: parseFloat(pinMatch[1]), lng: parseFloat(pinMatch[2]) };
    const qMatch = trimmed.match(/[?&](?:q|query|ll|center)=([-+]?\d+\.\d+)[,+]([-+]?\d+\.\d+)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    const vpMatch = trimmed.match(/@([-+]?\d+\.\d+),([-+]?\d+\.\d+)/);
    if (vpMatch) return { lat: parseFloat(vpMatch[1]), lng: parseFloat(vpMatch[2]) };
    const rawMatch = trimmed.match(/^\s*([-+]?\d+\.\d+)[,\s]+([-+]?\d+\.\d+)\s*$/);
    if (rawMatch) return { lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]) };
    return null;
  };

  const applyMobileExtractedCoords = (lat, lng, urlStr, target) => {
    const mapsUrl = `https://maps.google.com/?q=${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
    const finalUrl = urlStr && urlStr.startsWith('http') ? urlStr : mapsUrl;
    if (target === 'edit') {
      setEditHoardingModal(prev => prev ? ({
        ...prev,
        latitude: Number(lat).toFixed(5),
        longitude: Number(lng).toFixed(5),
        googleMapsUrl: finalUrl
      }) : null);
    } else {
      setNewHoarding(prev => ({
        ...prev,
        latitude: Number(lat).toFixed(5),
        longitude: Number(lng).toFixed(5),
        googleMapsUrl: finalUrl
      }));
    }
  };

  const handleParseAndApplyMapLinkMobile = async (rawUrl, target = 'new') => {
    if (!rawUrl || !rawUrl.trim()) {
      Alert.alert('Missing Link', 'Please paste a Google Maps link or coordinates first.');
      return;
    }
    const trimmed = rawUrl.trim();
    const local = extractCoordinatesFromUrl(trimmed);
    if (local) {
      applyMobileExtractedCoords(local.lat, local.lng, trimmed, target);
      Alert.alert('GPS Extracted! 📍', `Pinned: ${local.lat.toFixed(5)}, ${local.lng.toFixed(5)}`);
      return;
    }

    setParsingMapLink(true);
    try {
      const res = await mobileApi.post('/hoardings/parse-map-link', { mapUrl: trimmed });
      if (res.data?.success && res.data.lat && res.data.lng) {
        applyMobileExtractedCoords(res.data.lat, res.data.lng, res.data.googleMapsUrl || trimmed, target);
        Alert.alert('GPS Resolved! 📍', `Pinned: ${Number(res.data.lat).toFixed(5)}, ${Number(res.data.lng).toFixed(5)}`);
      } else {
        Alert.alert('Notice', res.data?.message || 'Could not extract coordinates from link. Please pick from map.');
      }
    } catch (err) {
      Alert.alert('Notice', err.response?.data?.message || 'Could not extract coordinates from this link. You can select directly from the interactive map.');
    } finally {
      setParsingMapLink(false);
    }
  };

  const handleAddHoardingSubmit = async () => {
    if (user?.role === 'customer') {
      Alert.alert('Action Not Allowed', 'Clients (Advertisers) are not permitted to enlist new hoarding sites.');
      return;
    }

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
        photos: (newHoarding.photos && newHoarding.photos.length > 0)
          ? newHoarding.photos
          : ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80']
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

        {/* Navigation Tabs Bar */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setSellerActiveTab('inventory')}
            style={[styles.tabBtn, sellerActiveTab === 'inventory' && styles.tabBtnActive]}
          >
            <Ionicons
              name="grid-outline"
              size={15}
              color={sellerActiveTab === 'inventory' ? '#2563eb' : '#64748b'}
            />
            <Text style={[styles.tabBtnText, sellerActiveTab === 'inventory' && styles.tabBtnTextActive]}>
              Hoardings ({hoardings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSellerActiveTab('bookings')}
            style={[styles.tabBtn, sellerActiveTab === 'bookings' && styles.tabBtnActive]}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={sellerActiveTab === 'bookings' ? '#2563eb' : '#64748b'}
            />
            <Text style={[styles.tabBtnText, sellerActiveTab === 'bookings' && styles.tabBtnTextActive]}>
              Bookings ({bookings.length})
            </Text>
            {(bookings || []).filter(b => b.bookingStatus === 'requested').length > 0 && (
              <View style={styles.tabBadgeAmber}>
                <Text style={styles.tabBadgeAmberText}>
                  {(bookings || []).filter(b => b.bookingStatus === 'requested').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSellerActiveTab('payments')}
            style={[styles.tabBtn, sellerActiveTab === 'payments' && styles.tabBtnActive]}
          >
            <Ionicons
              name="cash-outline"
              size={15}
              color={sellerActiveTab === 'payments' ? '#2563eb' : '#64748b'}
            />
            <Text style={[styles.tabBtnText, sellerActiveTab === 'payments' && styles.tabBtnTextActive]}>
              Cheques
            </Text>
            {payments.filter(p => p.paymentStatus === 'pending').length > 0 && (
              <View style={styles.tabBadgeAmber}>
                <Text style={styles.tabBadgeAmberText}>
                  {payments.filter(p => p.paymentStatus === 'pending').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* TAB 1: INVENTORY CARDS */}
        {/* ============================================================== */}
        {sellerActiveTab === 'inventory' && (
          <View>
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
                    {/* Top Image Banner with Badges */}
                    <View style={styles.inventoryCardImgContainer}>
                      <Image
                        source={{
                          uri: h.photos?.[0] || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
                        }}
                        style={styles.inventoryCardBannerImg}
                        resizeMode="cover"
                      />

                      {/* Top Overlay Chips */}
                      <View style={styles.cardTopOverlay}>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <View style={styles.cardLocationChip}>
                            <Ionicons name="location" size={11} color="#fff" />
                            <Text style={styles.cardLocationChipText}>{h.location?.city || 'Kolkata'}</Text>
                          </View>
                          {h.hoardingType ? (
                            <View style={styles.cardTypeChip}>
                              <Text style={styles.cardTypeChipText}>{h.hoardingType}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={[styles.statusPillLarge, isAvail ? styles.pillAvailLarge : styles.pillBookedLarge]}>
                          <View style={[styles.statusDot, isAvail ? styles.statusDotAvail : styles.statusDotBooked]} />
                          <Text style={[styles.statusPillTextLarge, isAvail ? styles.pillAvailTextLarge : styles.pillBookedTextLarge]}>
                            {isAvail ? 'AVAILABLE' : 'BOOKED'}
                          </Text>
                        </View>
                      </View>

                      {/* Bottom Overlay Chips (on image) */}
                      <View style={styles.cardBottomOverlay}>
                        <View style={{ flexDirection: 'column', gap: 4, flex: 1, marginRight: 8 }}>
                          {h.coverPhotoDeletionRequest?.status === 'pending' ? (
                            <View style={styles.pendingCoverBanner}>
                              <Ionicons name="time" size={12} color="#b45309" />
                              <Text style={styles.pendingCoverBannerText}>Cover Deletion Pending Admin</Text>
                            </View>
                          ) : null}

                          {h.modificationRequest?.status === 'pending' ? (
                            <View style={styles.pendingModificationBanner}>
                              <Ionicons name="hourglass" size={11} color="#4338ca" />
                              <Text style={styles.pendingModificationBannerText} numberOfLines={1}>
                                Price/Specs Pending Admin: ₹{Number(h.modificationRequest.requestedUpdates?.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}/mo
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.photosCountBadge}>
                          <Ionicons name="images" size={12} color="#fff" />
                          <Text style={styles.photosCountBadgeText}>{h.photos?.length || 1} Photos</Text>
                        </View>
                      </View>
                    </View>

                    {/* Card Body Information */}
                    <View style={styles.inventoryCardBody}>
                      <Text style={styles.inventoryTitle} numberOfLines={1}>{h.title}</Text>

                      <View style={styles.inventoryAddressRow}>
                        <Ionicons name="navigate-circle-outline" size={14} color="#64748b" />
                        <Text style={styles.inventoryAddress} numberOfLines={1}>{h.location?.address}</Text>
                      </View>

                      {/* Technical Specs Tags */}
                      <View style={styles.inventorySpecsRow}>
                        {h.dimensions?.width && h.dimensions?.height ? (
                          <View style={styles.specTag}>
                            <Ionicons name="scan-outline" size={12} color="#475569" />
                            <Text style={styles.specTagText}>
                              {h.dimensions.width} × {h.dimensions.height} {h.dimensions.unit || 'ft'}
                            </Text>
                          </View>
                        ) : null}
                        {h.lightingType ? (
                          <View style={styles.specTag}>
                            <Ionicons name="bulb-outline" size={12} color="#475569" />
                            <Text style={styles.specTagText}>{h.lightingType}</Text>
                          </View>
                        ) : null}
                        {h.pricing?.baseRatePerDay ? (
                          <View style={styles.specTag}>
                            <Text style={styles.specTagText}>₹{h.pricing.baseRatePerDay.toLocaleString('en-IN')}/day</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Rate Row */}
                      <View style={styles.inventoryRateContainer}>
                        <View>
                          <Text style={styles.inventoryRateLabel}>MONTHLY TARIFF</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <Text style={styles.inventoryPrice}>
                              ₹{(h.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}
                              <Text style={styles.inventoryPriceSub}> / mo</Text>
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleOpenEditModal(h)}
                              style={styles.editPricePillBtn}
                            >
                              <Ionicons name="pencil" size={11} color="#4338ca" />
                              <Text style={styles.editPricePillText}>Edit Price</Text>
                            </TouchableOpacity>
                          </View>
                          {h.modificationRequest?.status === 'pending' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Ionicons name="time-outline" size={11} color="#b45309" />
                              <Text style={{ fontSize: 10, color: '#b45309', fontWeight: '800' }}>
                                Req: ₹{Number(h.modificationRequest.requestedUpdates?.pricing?.baseRatePerMonth || 0).toLocaleString('en-IN')}/mo (Pending Approval)
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.inventoryInventoryNum}>
                            ID: #{h._id.slice(-6).toUpperCase()}
                          </Text>
                          <Text style={[styles.inventoryStatusHint, isAvail ? { color: '#166534' } : { color: '#4338ca' }]}>
                            {isAvail ? '● Ready for Campaign' : '● Contracted'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Dedicated Full-Width Action Bar */}
                    <View style={styles.inventoryActionBar}>
                      {/* Button 1: Photos / Gallery */}
                      <TouchableOpacity
                        onPress={() => setPhotoManagerHoarding(h)}
                        style={styles.actionBtnPhotos}
                      >
                        <Ionicons name="images" size={14} color="#4338ca" />
                        <Text style={styles.actionBtnPhotosText}>
                          Photos ({h.photos?.length || 0})
                        </Text>
                        {h.coverPhotoDeletionRequest?.status === 'pending' && (
                          <View style={styles.pendingDot} />
                        )}
                      </TouchableOpacity>

                      {/* Button 2: Edit Board & Price */}
                      <TouchableOpacity
                        onPress={() => handleOpenEditModal(h)}
                        style={styles.actionBtnEditPrice}
                      >
                        <Ionicons name="create-outline" size={14} color="#0284c7" />
                        <Text style={styles.actionBtnEditPriceText}>Edit Price</Text>
                      </TouchableOpacity>

                      {/* Button 3: Map Link (if available) */}
                      {hasMaps && (
                        <TouchableOpacity
                          onPress={() => {
                            const url = h.location?.googleMapsUrl ||
                              `https://www.google.com/maps?q=${h.location?.geo?.coordinates[1]},${h.location?.geo?.coordinates[0]}`;
                            Linking.openURL(url);
                          }}
                          style={styles.actionBtnMap}
                        >
                          <Ionicons name="map-outline" size={14} color="#2563eb" />
                          <Text style={styles.actionBtnMapText}>Map</Text>
                        </TouchableOpacity>
                      )}

                      {/* Button 4: Toggle Availability Status */}
                      <TouchableOpacity
                        onPress={() => handleStatusToggle(h._id, h.availabilityStatus)}
                        style={[styles.actionBtnToggle, isAvail ? styles.actionBtnToggleBooked : styles.actionBtnToggleAvail]}
                      >
                        <Ionicons
                          name={isAvail ? 'lock-closed-outline' : 'checkmark-circle-outline'}
                          size={14}
                          color={isAvail ? '#b45309' : '#166534'}
                        />
                        <Text style={[styles.actionBtnToggleText, isAvail ? { color: '#b45309' } : { color: '#166534' }]}>
                          {isAvail ? 'Mark Booked' : 'Mark Available'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BOOKINGS & 3-DAY MOUNTING PIPELINE */}
        {/* ============================================================== */}
        {sellerActiveTab === 'bookings' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>
                  Bookings & Mounting Pipeline ({bookings.length})
                </Text>
                <Text style={styles.sectionSubheading}>
                  Approve client bookings to unlock payment, and manage the 3-day mounting window.
                </Text>
              </View>
            </View>

            {bookings.length === 0 ? (
              <View style={styles.emptyInventory}>
                <Ionicons name="calendar-outline" size={40} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Booking Requests Yet</Text>
                <Text style={styles.emptySub}>
                  When customers reserve your hoarding sites, booking requests and mounting tasks will appear here.
                </Text>
              </View>
            ) : (
              bookings.map(b => {
                const isRequested = b.bookingStatus === 'requested';
                const isApproved = b.bookingStatus === 'approved';
                const isMountingWindow = b.bookingStatus === 'mounting_window' || b.bookingStatus === 'confirmed';
                const isVerificationPending = b.bookingStatus === 'verification_pending';
                const isActive = b.bookingStatus === 'active';
                const isCompleted = b.bookingStatus === 'completed';
                const isRejected = b.bookingStatus === 'rejected' || b.bookingStatus === 'cancelled';

                return (
                  <View key={b._id} style={styles.sellerBookingCard}>
                    {/* Top Header */}
                    <View style={styles.sellerBookingHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.sellerBookingNum}>#{b.bookingNumber || b._id.slice(-6)}</Text>
                          <Text style={styles.sellerBookingDot}>•</Text>
                          <Text style={styles.sellerBookingCampaign} numberOfLines={1}>
                            {b.campaignName || 'Brand Campaign'}
                          </Text>
                        </View>
                        <Text style={styles.sellerBookingSiteTitle} numberOfLines={1}>
                          {b.hoardingId?.title || 'Hoarding Space'}
                        </Text>
                        <Text style={styles.sellerBookingDates}>
                          {b.hoardingId?.location?.city || 'Kolkata'} • {b.durationDays} Days •{' '}
                          {new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} —{' '}
                          {new Date(b.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>

                      {/* Status Tag */}
                      <View style={[
                        styles.sellerStatusTag,
                        isRequested && styles.statusTagAmber,
                        isApproved && styles.statusTagBlue,
                        (isMountingWindow || isVerificationPending) && styles.statusTagPurple,
                        isActive && styles.statusTagGreen,
                        isCompleted && styles.statusTagGray,
                        isRejected && styles.statusTagRed
                      ]}>
                        <Text style={[
                          styles.sellerStatusTagText,
                          isRequested && styles.statusTagAmberText,
                          isApproved && styles.statusTagBlueText,
                          (isMountingWindow || isVerificationPending) && styles.statusTagPurpleText,
                          isActive && styles.statusTagGreenText,
                          isCompleted && styles.statusTagGrayText,
                          isRejected && styles.statusTagRedText
                        ]}>
                          {isRequested ? 'PENDING APPROVAL' :
                           isApproved ? 'AWAITING PAYMENT' :
                           isMountingWindow ? 'MOUNTING WINDOW' :
                           isVerificationPending ? 'VERIFICATION PENDING' :
                           isActive ? 'ACTIVE' :
                           isCompleted ? 'COMPLETED (EXPIRED)' :
                           isRejected ? 'DECLINED' : (b.bookingStatus || '').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Customer & Financial Summary */}
                    <View style={styles.sellerBookingMetaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.metaLabel}>ADVERTISER</Text>
                        <Text style={styles.metaVal}>{b.customerId?.name || 'Customer'}</Text>
                        <Text style={styles.metaSub}>{b.customerId?.phone || b.customerId?.email}</Text>
                        {b.customerId?.companyDetails?.companyName ? (
                          <Text style={styles.metaCompany}>{b.customerId.companyDetails.companyName}</Text>
                        ) : null}
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.metaLabel}>GROSS RENT</Text>
                        <Text style={styles.metaAmount}>₹{(b.totalAmount || 0).toLocaleString('en-IN')}</Text>
                        <Text style={[styles.metaPaymentStatus, b.paymentStatus === 'paid' ? { color: '#16a34a' } : { color: '#d97706' }]}>
                          Payment: {b.paymentStatus || 'unpaid'}
                        </Text>
                      </View>
                    </View>

                    {/* ACTION BAR: PENDING APPROVAL REQUEST */}
                    {isRequested && (
                      <View style={styles.approvalActionBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Ionicons name="time" size={16} color="#b45309" />
                          <Text style={styles.approvalNoticeTitle}>Advertiser Reservation Request</Text>
                        </View>
                        <Text style={styles.approvalNoticeText}>
                          Advertiser has reserved this site. Review the campaign dates and approve to unlock the payment option for them.
                        </Text>

                        <View style={styles.approvalBtnRow}>
                          <TouchableOpacity
                            onPress={() => handleSellerApproval(b._id, 'reject')}
                            disabled={approvingBookingId === b._id}
                            style={styles.declineBtn}
                          >
                            <Text style={styles.declineBtnText}>Decline</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleSellerApproval(b._id, 'approve')}
                            disabled={approvingBookingId === b._id}
                            style={styles.approveBtn}
                          >
                            <Ionicons name="checkmark-circle" size={15} color="#fff" />
                            <Text style={styles.approveBtnText}>
                              {approvingBookingId === b._id ? 'Approving...' : 'Approve Booking'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* APPROVED STATE: WAITING FOR CUSTOMER PAYMENT */}
                    {isApproved && (
                      <View style={styles.awaitingPaymentBox}>
                        <Ionicons name="information-circle" size={16} color="#1d4ed8" />
                        <Text style={styles.awaitingPaymentText}>
                          <Text style={{ fontWeight: '900' }}>Approved by You! </Text>
                          Waiting for customer to complete payment. Once paid, confirmation is sent and the 3-day mounting window automatically starts.
                        </Text>
                      </View>
                    )}

                    {/* COMPLETED STATE: CAMPAIGN EXPIRED */}
                    {isCompleted && (
                      <View style={styles.completedCallout}>
                        <Ionicons name="checkmark-done-circle" size={18} color="#475569" />
                        <Text style={styles.completedCalloutText}>
                          <Text style={{ fontWeight: '900' }}>Campaign Concluded & Expired: </Text>
                          This billboard booking has reached the end of its subscription period. The hoarding site is now released and available for new bookings.
                        </Text>
                      </View>
                    )}

                    {/* MOUNTING TRACKER PIPELINE */}
                    {(isMountingWindow || isVerificationPending || isActive || isCompleted) && (
                      <SellerMountingTracker
                        booking={b}
                        onRefresh={fetchSellerData}
                        onOpenProofModal={openProofModal}
                      />
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: OFFLINE CHEQUE / NEFT VERIFICATION DESK */}
        {/* ============================================================== */}
        {sellerActiveTab === 'payments' && (
          <View>
            <View style={styles.sectionHeaderRow}>
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
          </View>
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
                    : 'Tap "Select from Map" to set coordinates'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setPickerTarget('new');
                  setPickedCoords(
                    newHoarding.latitude && newHoarding.longitude
                      ? [parseFloat(newHoarding.latitude), parseFloat(newHoarding.longitude)]
                      : [22.5726, 88.3639]
                  );
                  setShowMapPickerModal(true);
                }}
                style={styles.pinBtn}
              >
                <Ionicons name="map" size={16} color="#2563eb" />
                <Text style={styles.pinBtnText}>Select from Map</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={styles.inputLabel}>Google Maps Link</Text>
              <TouchableOpacity
                disabled={parsingMapLink || !newHoarding.googleMapsUrl}
                onPress={() => handleParseAndApplyMapLinkMobile(newHoarding.googleMapsUrl, 'new')}
                style={[styles.extractBtn, (!newHoarding.googleMapsUrl || parsingMapLink) && { opacity: 0.5 }]}
              >
                <Ionicons name="locate" size={13} color="#4338ca" />
                <Text style={styles.extractBtnText}>
                  {parsingMapLink ? 'Extracting...' : 'Extract Pin from Link'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Paste: https://maps.app.goo.gl/... or coordinates"
              value={newHoarding.googleMapsUrl}
              onChangeText={t => {
                setNewHoarding(p => ({ ...p, googleMapsUrl: t }));
                const local = extractCoordinatesFromUrl(t);
                if (local) {
                  applyMobileExtractedCoords(local.lat, local.lng, t, 'new');
                }
              }}
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

            {/* Cloudinary Hoarding Photos Upload */}
            <View style={[styles.cloudUploadBox, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="images" size={16} color="#2563eb" />
                  <Text style={[styles.cloudUploadTitle, { color: '#1e40af' }]}>Site Photos (Cloudinary)</Text>
                </View>
                <View style={[styles.cloudUploadBadge, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.cloudUploadBadgeText, { color: '#1d4ed8' }]}>Cloud Storage</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handlePickHoardingImage(true)}
                  disabled={uploadingHoardingImage}
                  style={[styles.cloudPickerBtn, { backgroundColor: '#2563eb' }]}
                >
                  {uploadingHoardingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                  <Text style={styles.cloudPickerBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handlePickHoardingImage(false)}
                  disabled={uploadingHoardingImage}
                  style={[styles.cloudPickerBtn, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' }]}
                >
                  <Ionicons name="image-outline" size={16} color="#334155" />
                  <Text style={[styles.cloudPickerBtnText, { color: '#334155' }]}>From Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Photos List Horizontal Scroll */}
              {newHoarding.photos && newHoarding.photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {newHoarding.photos.map((url, idx) => (
                      <View key={idx} style={styles.cloudPhotoThumbWrap}>
                        <Image source={{ uri: url }} style={styles.cloudPhotoThumb} />
                        {idx === 0 && (
                          <View style={styles.cloudCoverBadge}>
                            <Text style={styles.cloudCoverBadgeText}>Cover</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => handleRemoveHoardingPhoto(idx)}
                          style={styles.cloudPhotoRemoveBtn}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </View>

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

      {/* ============================================================== */}
      {/* MOUNTING PROOF PHOTO UPLOAD MODAL */}
      {/* ============================================================== */}
      <Modal visible={showProofModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalHeading}>Upload Mounting Proof</Text>
              <Text style={styles.modalSubheading}>Phase 3 • Date & Time Stamped Confirmation</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProofModal(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            <View style={styles.proofNoticeBox}>
              <Ionicons name="information-circle" size={18} color="#7e22ce" />
              <Text style={styles.proofNoticeText}>
                Upload a real photo of the mounted hoarding. Upon submitting, a timestamp will be recorded and the 4-hour customer verification window will automatically start.
              </Text>
            </View>

            {!gpsFeatureEnabled && (
              <View style={[styles.proofNoticeBox, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
                <Ionicons name="shield-outline" size={16} color="#64748b" />
                <Text style={[styles.proofNoticeText, { color: '#475569' }]}>
                  GPS Geofence verification is currently turned OFF by Admin. Standard camera or gallery photos accepted without location checks.
                </Text>
              </View>
            )}

            {/* Cloudinary Camera & Gallery Action Box */}
            <View style={styles.cloudUploadBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="cloud-upload" size={16} color="#7e22ce" />
                  <Text style={styles.cloudUploadTitle}>Cloudinary Direct Upload</Text>
                </View>
                <View style={styles.cloudUploadBadge}>
                  <Text style={styles.cloudUploadBadgeText}>Fast CDN</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handlePickProofImage(true)}
                  disabled={uploadingProofImage}
                  style={[styles.cloudPickerBtn, { backgroundColor: '#7e22ce' }]}
                >
                  {uploadingProofImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                  <Text style={styles.cloudPickerBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handlePickProofImage(false)}
                  disabled={uploadingProofImage}
                  style={[styles.cloudPickerBtn, { backgroundColor: '#f3e8ff', borderWidth: 1, borderColor: '#d8b4fe' }]}
                >
                  <Ionicons name="images" size={16} color="#7e22ce" />
                  <Text style={[styles.cloudPickerBtnText, { color: '#7e22ce' }]}>From Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.inputLabel}>Proof Image URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://... (or use Camera / Gallery above)"
              value={proofForm.proofPhotoUrl}
              onChangeText={t => setProofForm(p => ({ ...p, proofPhotoUrl: t }))}
            />

            {/* Quick Sample Presets */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setProofForm(p => ({
                  ...p,
                  proofPhotoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'
                }))}
                style={styles.samplePresetBtn}
              >
                <Text style={styles.samplePresetBtnText}>Sample Billboard 1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setProofForm(p => ({
                  ...p,
                  proofPhotoUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
                }))}
                style={styles.samplePresetBtn}
              >
                <Text style={styles.samplePresetBtnText}>Sample Billboard 2</Text>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            {proofForm.proofPhotoUrl ? (
              <View style={styles.proofModalPreviewWrap}>
                <Image source={{ uri: proofForm.proofPhotoUrl }} style={styles.proofModalPreviewImg} />
                <View style={styles.proofModalTimestampOverlay}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time" size={12} color="#fff" />
                    <Text style={styles.proofModalTimestampText}>
                      Date & Time Stamp: {proofForm.capturedAt || new Date().toLocaleString('en-IN')}
                    </Text>
                  </View>
                  {proofForm.isGpsAttached && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="location" size={12} color="#86efac" />
                      <Text style={[styles.proofModalTimestampText, { color: '#86efac', fontWeight: '800' }]}>
                        GPS: {proofForm.latitude?.toFixed(4)}° N, {proofForm.longitude?.toFixed(4)}° E (±{proofForm.accuracy}m)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Mounting & Inspection Notes</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="e.g., High-tension vinyl flex mounted with reinforced eyelets, floodlights aligned and tested."
              multiline
              value={proofForm.notes}
              onChangeText={t => setProofForm(p => ({ ...p, notes: t }))}
            />

            <TouchableOpacity
              onPress={handleSubmitProof}
              disabled={uploadingProof}
              style={[styles.submitModalBtn, { backgroundColor: '#7e22ce' }]}
            >
              <Text style={styles.submitModalBtnText}>
                {uploadingProof ? 'Uploading Proof...' : 'Submit Proof & Start 4-Hour Verification'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* HOARDING PHOTO GALLERY MANAGER MODAL */}
      {/* ============================================================== */}
      <Modal visible={!!photoManagerHoarding} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalHeading}>Hoarding Site Gallery</Text>
              <Text style={styles.modalSubheading} numberOfLines={1}>
                {photoManagerHoarding?.title || 'Manage Photos'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPhotoManagerHoarding(null)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            {/* Cloudinary Add Photos Box */}
            <View style={[styles.cloudUploadBox, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="cloud-upload" size={16} color="#2563eb" />
                  <Text style={[styles.cloudUploadTitle, { color: '#1e40af' }]}>Add More Photos to Site</Text>
                </View>
                <View style={[styles.cloudUploadBadge, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.cloudUploadBadgeText, { color: '#1d4ed8' }]}>Cloudinary CDN</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handlePickGalleryImage(true)}
                  disabled={uploadingGalleryImage}
                  style={[styles.cloudPickerBtn, { backgroundColor: '#2563eb' }]}
                >
                  {uploadingGalleryImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                  <Text style={styles.cloudPickerBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handlePickGalleryImage(false)}
                  disabled={uploadingGalleryImage}
                  style={[styles.cloudPickerBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' }]}
                >
                  <Ionicons name="image-outline" size={16} color="#334155" />
                  <Text style={[styles.cloudPickerBtnText, { color: '#334155' }]}>From Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Photos List */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 10 }}>
              Current Gallery Images ({photoManagerHoarding?.photos?.length || 0})
            </Text>

            {(!photoManagerHoarding?.photos || photoManagerHoarding.photos.length === 0) ? (
              <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Ionicons name="images-outline" size={36} color="#94a3b8" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b', marginTop: 8 }}>
                  No photos uploaded for this hoarding.
                </Text>
              </View>
            ) : (
              photoManagerHoarding.photos.map((url, idx) => {
                const isCover = idx === 0;
                const isPendingCoverDelete = isCover && photoManagerHoarding.coverPhotoDeletionRequest?.status === 'pending';

                return (
                  <View key={idx} style={styles.galleryItemCard}>
                    <Image source={{ uri: url }} style={styles.galleryItemImage} />

                    <View style={styles.galleryItemContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {isCover ? (
                          <View style={styles.coverBadgePill}>
                            <Ionicons name="star" size={10} color="#fff" />
                            <Text style={styles.coverBadgePillText}>Primary Cover Photo</Text>
                          </View>
                        ) : (
                          <View style={styles.photoIndexPill}>
                            <Text style={styles.photoIndexPillText}>Photo #{idx + 1}</Text>
                          </View>
                        )}

                        {isPendingCoverDelete && (
                          <View style={styles.pendingDeletionPill}>
                            <Ionicons name="time" size={10} color="#92400e" />
                            <Text style={styles.pendingDeletionPillText}>Pending Admin</Text>
                          </View>
                        )}
                      </View>

                      {isCover && (
                        <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
                          {isPendingCoverDelete
                            ? 'Admin approval is pending to delete this cover photo from Cloudinary.'
                            : 'Cover photo is protected from direct deletion to maintain listing integrity.'}
                        </Text>
                      )}

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
                        {isCover ? (
                          isPendingCoverDelete ? (
                            <View style={styles.pendingActionPill}>
                              <Text style={styles.pendingActionPillText}>⏳ Deletion Pending Admin</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => {
                                setRequestCoverModal({
                                  visible: true,
                                  hoardingId: photoManagerHoarding._id,
                                  reason: ''
                                });
                              }}
                              style={styles.requestCoverBtn}
                            >
                              <Ionicons name="shield-outline" size={13} color="#d97706" />
                              <Text style={styles.requestCoverBtnText}>Request Cover Pic Delete</Text>
                            </TouchableOpacity>
                          )
                        ) : (
                          <>
                            <TouchableOpacity
                              onPress={() => handleSetCoverPhoto(idx)}
                              style={styles.setCoverBtn}
                            >
                              <Ionicons name="star-outline" size={13} color="#4338ca" />
                              <Text style={styles.setCoverBtnText}>Set as Cover</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleRemoveExistingPhoto(idx)}
                              style={styles.deletePhotoBtn}
                            >
                              <Ionicons name="trash-outline" size={13} color="#e11d48" />
                              <Text style={styles.deletePhotoBtnText}>Delete (Cloudinary)</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              onPress={() => setPhotoManagerHoarding(null)}
              style={[styles.submitModalBtn, { backgroundColor: '#0f172a', marginTop: 20 }]}
            >
              <Text style={styles.submitModalBtnText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* REQUEST COVER PHOTO DELETION MODAL */}
      {/* ============================================================== */}
      <Modal visible={requestCoverModal.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.requestCoverModalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={styles.shieldIconWrap}>
                <Ionicons name="shield-checkmark" size={18} color="#d97706" />
              </View>
              <Text style={styles.requestCoverTitle}>Request Cover Photo Deletion</Text>
            </View>

            <Text style={styles.requestCoverSub}>
              To prevent accidental deletion or broken listings, removing a site's primary cover image requires Super Admin approval. Approving will also destroy the image on Cloudinary.
            </Text>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Reason for Deletion (Optional):</Text>
            <TextInput
              style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
              placeholder="e.g., Billboard renovated, replacing with fresh high-res daytime photo, banner updated..."
              multiline
              value={requestCoverModal.reason}
              onChangeText={t => setRequestCoverModal(p => ({ ...p, reason: t }))}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setRequestCoverModal({ visible: false, hoardingId: null, reason: '' })}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitCoverDeleteRequest}
                disabled={submittingCoverRequest}
                style={styles.modalSubmitRequestBtn}
              >
                {submittingCoverRequest ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitRequestBtnText}>Submit to Admin</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* EDIT BILLBOARD & PRICE MODAL (MATCHING WEB CLIENT) */}
      {/* ============================================================== */}
      <Modal visible={!!editHoardingModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          {editHoardingModal && (
            <>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeading}>Edit Billboard & Price</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 }}>
                    ID: #{editHoardingModal._id.slice(-6).toUpperCase()} • Update Tariff & Specs
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setEditHoardingModal(null)}>
                  <Ionicons name="close" size={24} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                {/* Admin Approval Requirement Callout */}
                {editHoardingModal.isLockedForApproval && (
                  <View style={styles.modalLockCallout}>
                    <View style={styles.modalLockIconWrap}>
                      <Ionicons name="shield-checkmark" size={16} color="#b45309" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLockTitle}>Admin Approval Required</Text>
                      <Text style={styles.modalLockSub}>
                        This billboard is currently booked or in an active campaign / mounting window. Any changes saved will be submitted to Super Admin for approval before updating live.
                      </Text>
                    </View>
                  </View>
                )}

                {/* PRIORITY SECTION: TARIFF & PRICING */}
                <View style={styles.editPriceHighlightCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={styles.editPriceIconBadge}>
                      <Ionicons name="cash" size={16} color="#059669" />
                    </View>
                    <View>
                      <Text style={styles.editPriceSectionTitle}>Billboard Rental Tariff</Text>
                      <Text style={styles.editPriceSectionSub}>Set your monthly rate and minimum duration</Text>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Monthly Rental Rate (₹) *</Text>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.rupeePrefix}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="numeric"
                      placeholder="e.g., 85000"
                      value={editHoardingModal.baseRatePerMonth}
                      onChangeText={t => {
                        const monthlyVal = Number(t) || 0;
                        setEditHoardingModal(p => ({
                          ...p,
                          baseRatePerMonth: t,
                          baseRatePerDay: monthlyVal > 0 ? String(Math.round(monthlyVal / 30)) : ''
                        }));
                      }}
                    />
                    <Text style={styles.priceMonthSuffix}>/ month</Text>
                  </View>

                  {/* Calculated daily rate display */}
                  <View style={styles.calcDailyRateBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calculator-outline" size={14} color="#059669" />
                      <Text style={styles.calcDailyRateLabel}>Estimated Daily Rate:</Text>
                    </View>
                    <Text style={styles.calcDailyRateVal}>
                      ₹{(Number(editHoardingModal.baseRatePerDay) || Math.round((Number(editHoardingModal.baseRatePerMonth) || 0) / 30)).toLocaleString('en-IN')}/day
                    </Text>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>Minimum Booking Period (Days)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="15"
                      value={editHoardingModal.minimumBookingDays}
                      onChangeText={t => setEditHoardingModal(p => ({ ...p, minimumBookingDays: t }))}
                    />
                  </View>
                </View>

                {/* BOARD SPECIFICATIONS */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Hoarding / Display Type</Text>
                <View style={styles.pillsRow}>
                  {['Billboard', 'Unipole', 'Gantry', 'Kiosk', 'Bridge Panel', 'Digital Screen'].map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setEditHoardingModal(p => ({ ...p, hoardingType: type }))}
                      style={[
                        styles.pillOption,
                        editHoardingModal.hoardingType === type && styles.pillOptionSelected
                      ]}
                    >
                      <Text style={[
                        styles.pillOptionText,
                        editHoardingModal.hoardingType === type && styles.pillOptionTextSelected
                      ]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Lighting Type</Text>
                <View style={styles.pillsRow}>
                  {['Frontlit', 'Backlit', 'Non-Lit', 'Digital LED'].map(light => (
                    <TouchableOpacity
                      key={light}
                      onPress={() => setEditHoardingModal(p => ({ ...p, lightingType: light }))}
                      style={[
                        styles.pillOption,
                        editHoardingModal.lightingType === light && styles.pillOptionSelected
                      ]}
                    >
                      <Text style={[
                        styles.pillOptionText,
                        editHoardingModal.lightingType === light && styles.pillOptionTextSelected
                      ]}>{light}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* DIMENSIONS */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Width (ft)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={editHoardingModal.width}
                      onChangeText={t => setEditHoardingModal(p => ({ ...p, width: t }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Height (ft)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={editHoardingModal.height}
                      onChangeText={t => setEditHoardingModal(p => ({ ...p, height: t }))}
                    />
                  </View>
                </View>

                {/* TITLE & LOCATION */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Billboard Title / Landmark Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Prime Billboard at Park Circus"
                  value={editHoardingModal.title}
                  onChangeText={t => setEditHoardingModal(p => ({ ...p, title: t }))}
                />

                <Text style={styles.inputLabel}>City / District</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Kolkata, Durgapur, Siliguri..."
                  value={editHoardingModal.city}
                  onChangeText={t => setEditHoardingModal(p => ({ ...p, city: t }))}
                />

                <Text style={styles.inputLabel}>Exact Road / Landmark Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Road name, landmark..."
                  value={editHoardingModal.address}
                  onChangeText={t => setEditHoardingModal(p => ({ ...p, address: t }))}
                />

                {/* GPS Pinning & Map Picker */}
                <View style={styles.pinSection}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>GPS Location Pin</Text>
                    <Text style={styles.pinSub}>
                      {editHoardingModal.latitude
                        ? `Pinned: ${editHoardingModal.latitude}, ${editHoardingModal.longitude}`
                        : 'Tap "Select from Map" to set coordinates'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setPickerTarget('edit');
                      setPickedCoords(
                        editHoardingModal.latitude && editHoardingModal.longitude
                          ? [parseFloat(editHoardingModal.latitude), parseFloat(editHoardingModal.longitude)]
                          : [22.5726, 88.3639]
                      );
                      setShowMapPickerModal(true);
                    }}
                    style={styles.pinBtn}
                  >
                    <Ionicons name="map" size={16} color="#2563eb" />
                    <Text style={styles.pinBtnText}>Select from Map</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Google Maps Link</Text>
                  <TouchableOpacity
                    disabled={parsingMapLink || !editHoardingModal.googleMapsUrl}
                    onPress={() => handleParseAndApplyMapLinkMobile(editHoardingModal.googleMapsUrl, 'edit')}
                    style={[styles.extractBtn, (!editHoardingModal.googleMapsUrl || parsingMapLink) && { opacity: 0.5 }]}
                  >
                    <Ionicons name="locate" size={13} color="#4338ca" />
                    <Text style={styles.extractBtnText}>
                      {parsingMapLink ? 'Extracting...' : 'Extract Pin from Link'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Paste: https://maps.app.goo.gl/... or coordinates"
                  value={editHoardingModal.googleMapsUrl}
                  onChangeText={t => {
                    setEditHoardingModal(p => ({ ...p, googleMapsUrl: t }));
                    const local = extractCoordinatesFromUrl(t);
                    if (local) {
                      applyMobileExtractedCoords(local.lat, local.lng, t, 'edit');
                    }
                  }}
                />

                {/* AVAILABILITY STATUS */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Listing Status</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setEditHoardingModal(p => ({ ...p, availabilityStatus: 'available' }))}
                    style={[
                      styles.statusTogglePill,
                      editHoardingModal.availabilityStatus === 'available' && styles.statusTogglePillAvailActive
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={editHoardingModal.availabilityStatus === 'available' ? '#166534' : '#64748b'}
                    />
                    <Text style={[
                      styles.statusTogglePillText,
                      editHoardingModal.availabilityStatus === 'available' && { color: '#166534', fontWeight: '900' }
                    ]}>
                      Available (Ready for Rent)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setEditHoardingModal(p => ({ ...p, availabilityStatus: 'occupied' }))}
                    style={[
                      styles.statusTogglePill,
                      editHoardingModal.availabilityStatus === 'occupied' && styles.statusTogglePillBookedActive
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={16}
                      color={editHoardingModal.availabilityStatus === 'occupied' ? '#92400e' : '#64748b'}
                    />
                    <Text style={[
                      styles.statusTogglePillText,
                      editHoardingModal.availabilityStatus === 'occupied' && { color: '#92400e', fontWeight: '900' }
                    ]}>
                      Booked (Contracted)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ACTION BUTTONS */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 40 }}>
                  <TouchableOpacity
                    onPress={() => setEditHoardingModal(null)}
                    style={styles.modalCancelBtn}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveHoardingEdit}
                    disabled={savingEditHoarding}
                    style={[styles.submitModalBtn, { flex: 2, marginTop: 0 }]}
                  >
                    {savingEditHoarding ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitModalBtnText}>
                        {editHoardingModal.isLockedForApproval ? 'Submit for Admin Approval' : 'Save Price & Specs'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
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
  clientRestrictedIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  clientActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
  },
  clientActionBtnPrimary: {
    backgroundColor: '#2563eb',
  },
  clientActionBtnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  clientActionBtnTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  clientActionBtnTextSecondary: {
    color: '#334155',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inventoryCardImgContainer: {
    position: 'relative',
    width: '100%',
    height: 165,
    backgroundColor: '#f1f5f9',
  },
  inventoryCardBannerImg: {
    width: '100%',
    height: '100%',
  },
  cardTopOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardLocationChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardTypeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTypeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusPillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillAvailLarge: {
    backgroundColor: 'rgba(240, 253, 244, 0.95)',
    borderColor: '#bbf7d0',
  },
  pillBookedLarge: {
    backgroundColor: 'rgba(238, 242, 255, 0.95)',
    borderColor: '#c7d2fe',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotAvail: {
    backgroundColor: '#16a34a',
  },
  statusDotBooked: {
    backgroundColor: '#4f46e5',
  },
  statusPillTextLarge: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pillAvailTextLarge: {
    color: '#166534',
  },
  pillBookedTextLarge: {
    color: '#3730a3',
  },
  cardBottomOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingCoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(254, 243, 199, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingCoverBannerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400e',
  },
  photosCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photosCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  inventoryCardBody: {
    padding: 14,
  },
  inventoryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 22,
  },
  inventoryAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  inventoryAddress: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  inventorySpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  specTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  inventoryRateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inventoryRateLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  inventoryPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  inventoryPriceSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  inventoryInventoryNum: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  inventoryStatusHint: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  inventoryActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtnPhotos: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  actionBtnPhotosText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338ca',
  },
  actionBtnMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnMapText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  actionBtnToggle: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnToggleBooked: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  actionBtnToggleAvail: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  actionBtnToggleText: {
    fontSize: 12,
    fontWeight: '900',
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
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  extractBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
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

  // Tab Bar
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#1d4ed8',
    fontWeight: '900',
  },
  tabBadgeAmber: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tabBadgeAmberText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#92400e',
  },

  // Section Subheading
  sectionSubheading: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  // Seller Bookings
  sellerBookingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  sellerBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sellerBookingNum: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '900',
    color: '#4338ca',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sellerBookingDot: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sellerBookingCampaign: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    flex: 1,
  },
  sellerBookingSiteTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  sellerBookingDates: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sellerStatusTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  sellerStatusTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
  },
  statusTagAmber: { backgroundColor: '#fef3c7' },
  statusTagAmberText: { color: '#92400e' },
  statusTagBlue: { backgroundColor: '#dbeafe' },
  statusTagBlueText: { color: '#1e40af' },
  statusTagPurple: { backgroundColor: '#f3e8ff' },
  statusTagPurpleText: { color: '#6b21a8' },
  statusTagGreen: { backgroundColor: '#dcfce7' },
  statusTagGreenText: { color: '#166534' },
  statusTagGray: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  statusTagGrayText: { color: '#475569' },
  statusTagRed: { backgroundColor: '#fee2e2' },
  statusTagRedText: { color: '#991b1b' },

  completedCallout: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  completedCalloutText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 15,
  },

  sellerBookingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  metaSub: {
    fontSize: 10,
    color: '#64748b',
  },
  metaCompany: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4f46e5',
  },
  metaAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  metaPaymentStatus: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 1,
  },

  // Pending Approval Action Bar
  approvalActionBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  approvalNoticeTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#78350f',
    textTransform: 'uppercase',
  },
  approvalNoticeText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 15,
  },
  approvalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  declineBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
  },
  approveBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },

  // Awaiting Payment Box
  awaitingPaymentBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  awaitingPaymentText: {
    fontSize: 11,
    color: '#1e40af',
    flex: 1,
    lineHeight: 15,
  },

  // Mounting Tracker
  trackerContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 10,
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 6,
  },
  windowTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  windowTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#92400e',
  },
  pipelineSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  trackerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  timerChipAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  timerChipAmberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400e',
  },
  timerChipPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  timerChipPurpleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6b21a8',
    fontFamily: 'monospace',
  },

  phasesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  phaseBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  phaseBoxCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  phaseBoxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mPhaseBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mBadgeCompleted: { backgroundColor: '#dcfce7' },
  mBadgeCompletedText: { fontSize: 8, fontWeight: '900', color: '#166534' },
  mBadgeProgress: { backgroundColor: '#dbeafe' },
  mBadgeProgressText: { fontSize: 8, fontWeight: '900', color: '#1e40af' },
  mBadgePending: { backgroundColor: '#f1f5f9' },
  mBadgePendingText: { fontSize: 8, fontWeight: '700', color: '#64748b' },
  phaseNumber: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 4,
  },
  phaseName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  phaseDesc: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 1,
  },
  phaseActionBtnSmall: {
    backgroundColor: '#2563eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  phaseActionBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  phaseDoneLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
    marginTop: 6,
  },

  // Seller Proof Card
  sellerProofCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  sellerProofImg: {
    width: 76,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  sellerProofMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  sellerProofMetaTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#166534',
  },
  sellerProofDate: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
    marginTop: 1,
  },
  sellerProofNotes: {
    fontSize: 9,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 1,
  },
  sellerProofStatusPending: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7e22ce',
  },
  sellerProofStatusDone: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },

  // Active Campaign Banner
  activeCampaignBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeCampaignHeading: {
    fontSize: 9,
    fontWeight: '900',
    color: '#166534',
  },
  activeCampaignSub: {
    fontSize: 10,
    color: '#15803d',
    marginTop: 1,
  },

  // Proof Modal
  modalSubheading: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  proofNoticeBox: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  proofNoticeText: {
    fontSize: 11,
    color: '#581c87',
    flex: 1,
    lineHeight: 15,
  },
  samplePresetBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  samplePresetBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  proofModalPreviewWrap: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    position: 'relative',
  },
  proofModalPreviewImg: {
    width: '100%',
    height: 140,
  },
  proofModalTimestampOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proofModalTimestampText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  cloudUploadBox: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
  },
  cloudUploadTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b21a8',
  },
  cloudUploadBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cloudUploadBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7e22ce',
    textTransform: 'uppercase',
  },
  cloudPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cloudPickerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cloudPhotoThumbWrap: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cloudPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  cloudCoverBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cloudCoverBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  cloudPhotoRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCoverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingCoverPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400e',
  },
  cardGalleryIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  galleryItemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  galleryItemImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  galleryItemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  coverBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgePillText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  photoIndexPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoIndexPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  pendingDeletionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingDeletionPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#92400e',
  },
  pendingActionPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingActionPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  requestCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  requestCoverBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  setCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  setCoverBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
  },
  deletePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  deletePhotoBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#e11d48',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  requestCoverModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  shieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCoverTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1,
  },
  requestCoverSub: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  modalSubmitRequestBtn: {
    flex: 1.5,
    backgroundColor: '#d97706',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitRequestBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  editPricePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  editPricePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338ca',
  },
  actionBtnEditPrice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  actionBtnEditPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  editPriceHighlightCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  editPriceIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPriceSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#166534',
  },
  editPriceSectionSub: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  rupeePrefix: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803d',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    paddingVertical: 10,
  },
  priceMonthSuffix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 6,
  },
  calcDailyRateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  calcDailyRateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  calcDailyRateVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  pillOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  pillOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  pillOptionTextSelected: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  statusTogglePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginTop: 6,
  },
  statusTogglePillAvailActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  statusTogglePillBookedActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  statusTogglePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  pendingModificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(238, 242, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  pendingModificationBannerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4338ca',
  },
  modalLockCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  modalLockIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  modalLockTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400e',
  },
  modalLockSub: {
    fontSize: 11,
    color: '#b45309',
    lineHeight: 16,
    marginTop: 2,
  },
});
