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

// 3-Phase Mounting Tracker for Seller Desk
function SellerMountingTracker({ booking, onRefresh, onOpenProofModal }) {
  const [timeLeftMounting, setTimeLeftMounting] = useState('');
  const [timeLeftVerification, setTimeLeftVerification] = useState('');
  const [updatingPhase, setUpdatingPhase] = useState(null);

  const m = booking?.mountingDetails || {};
  const isMountingWindow = booking.bookingStatus === 'mounting_window';
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
      {/* Tracker Header */}
      <View style={styles.trackerHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.windowTag}>
              <Text style={styles.windowTagText}>3-DAY MOUNTING WINDOW</Text>
            </View>
            <Text style={styles.pipelineSub}>Seller Controls</Text>
          </View>
          <Text style={styles.trackerTitle}>Mounting Pipeline & Verification</Text>
        </View>

        {isMountingWindow && timeLeftMounting ? (
          <View style={styles.timerChipAmber}>
            <Ionicons name="time-outline" size={13} color="#b45309" />
            <Text style={styles.timerChipAmberText}>{timeLeftMounting} left</Text>
          </View>
        ) : null}

        {isVerificationPending && timeLeftVerification ? (
          <View style={styles.timerChipPurple}>
            <Ionicons name="hourglass-outline" size={13} color="#7e22ce" />
            <Text style={styles.timerChipPurpleText}>{timeLeftVerification}</Text>
          </View>
        ) : null}
      </View>

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

  // Proof Modal Form
  const [selectedBookingForProof, setSelectedBookingForProof] = useState(null);
  const [proofForm, setProofForm] = useState({
    proofPhotoUrl: '',
    capturedAt: '',
    notes: ''
  });
  const [uploadingProof, setUploadingProof] = useState(false);
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
    setProofForm({
      proofPhotoUrl: booking.mountingDetails?.proofPhotoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      capturedAt: booking.mountingDetails?.proofPhotoCapturedAt
        ? new Date(booking.mountingDetails.proofPhotoCapturedAt).toLocaleString('en-IN')
        : new Date().toLocaleString('en-IN'),
      notes: booking.mountingDetails?.mountingNotes || ''
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
      await mobileApi.put(`/bookings/${selectedBookingForProof._id}/mounting-proof`, {
        proofPhotoUrl: proofForm.proofPhotoUrl.trim(),
        capturedAt: new Date().toISOString(),
        notes: proofForm.notes.trim()
      });
      Alert.alert(
        'Proof Uploaded! 📸',
        'Photo proof with timestamp has been recorded. The 4-hour customer verification window is now active!'
      );
      setShowProofModal(false);
      fetchSellerData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload proof photo.');
    } finally {
      setUploadingProof(false);
    }
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
                const isMountingWindow = b.bookingStatus === 'mounting_window';
                const isVerificationPending = b.bookingStatus === 'verification_pending';
                const isActive = b.bookingStatus === 'active';

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
                        isActive && styles.statusTagGreen
                      ]}>
                        <Text style={[
                          styles.sellerStatusTagText,
                          isRequested && styles.statusTagAmberText,
                          isApproved && styles.statusTagBlueText,
                          (isMountingWindow || isVerificationPending) && styles.statusTagPurpleText,
                          isActive && styles.statusTagGreenText
                        ]}>
                          {isRequested ? 'PENDING APPROVAL' :
                           isApproved ? 'AWAITING PAYMENT' :
                           isMountingWindow ? 'MOUNTING WINDOW' :
                           isVerificationPending ? 'VERIFICATION PENDING' :
                           isActive ? 'ACTIVE' : (b.bookingStatus || '').toUpperCase()}
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

                    {/* MOUNTING TRACKER PIPELINE */}
                    {(isMountingWindow || isVerificationPending || isActive) && (
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

            <Text style={styles.inputLabel}>Proof Image URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://... (or select sample below)"
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
                  <Ionicons name="time" size={12} color="#fff" />
                  <Text style={styles.proofModalTimestampText}>
                    Date & Time Stamp: {proofForm.capturedAt || new Date().toLocaleString('en-IN')}
                  </Text>
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
});
