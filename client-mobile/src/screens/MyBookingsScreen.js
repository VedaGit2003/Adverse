import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import mobileApi from '../api/client';
import { useAuth } from '../context/AuthContext';

// Helper component for 3-Phase Mounting Tracker in Mobile
function MobileMountingTracker({ booking, onRefresh }) {
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [issueNotes, setIssueNotes] = useState('');
  const [showIssueBox, setShowIssueBox] = useState(false);
  const [timeLeftMounting, setTimeLeftMounting] = useState('');
  const [timeLeftVerification, setTimeLeftVerification] = useState('');
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

  const handleVerify = async (verified) => {
    setVerifying(true);
    try {
      const res = await mobileApi.put(`/bookings/${booking._id}/verify-mounting`, {
        verified,
        notes: issueNotes
      });
      if (res.data.success) {
        Alert.alert(
          verified ? 'Campaign Activated! 🎉' : 'Feedback Reported',
          verified
            ? 'Mounting installation verified! Campaign subscription has officially started.'
            : 'Your issue feedback was reported to the site owner.'
        );
        setShowIssueBox(false);
        setIssueNotes('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit verification.');
    } finally {
      setVerifying(false);
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
            <Text style={styles.pipelineSub}>3 Phases</Text>
          </View>
          <Text style={styles.trackerTitle}>Mounting & Verification Pipeline</Text>
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

      {/* 3 PHASES STEPPER */}
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
          <Text style={styles.phaseDesc}>From customer by seller</Text>
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
          <Text style={styles.phaseDesc}>Rigging & flex installation</Text>
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
          <Text style={styles.phaseDesc}>Photo with date & time</Text>
        </View>
      </View>

      {/* 4-HOUR VERIFICATION WINDOW ACTION CARD */}
      {isVerificationPending && (
        <View style={styles.verifyWindowCard}>
          <View style={styles.verifyWindowTop}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.verifyWindowTag}>
                  <Text style={styles.verifyWindowTagText}>4-HOUR WINDOW ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.verifyWindowHeading}>Verify Hoarding Installation Proof</Text>
              <Text style={styles.verifyWindowSub}>
                Seller has uploaded proof. You have 4 hours to verify before campaign subscription starts automatically.
              </Text>
            </View>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownBadgeLabel}>TIME LEFT</Text>
              <Text style={styles.countdownBadgeTime}>{timeLeftVerification}</Text>
            </View>
          </View>

          {/* Proof Photo Display */}
          {m.proofPhotoUrl ? (
            <View style={styles.proofPhotoWrap}>
              <Image source={{ uri: m.proofPhotoUrl }} style={styles.proofImg} resizeMode="cover" />
              <View style={styles.proofDetails}>
                <Text style={styles.proofStampLabel}>📸 CAPTURE DATE & TIME STAMP</Text>
                <Text style={styles.proofStampVal}>{m.proofCaptureDateTime || 'Recorded at upload'}</Text>

                {/* GPS Verification Badge */}
                {m.proofGeoLocation?.verifiedOnSite ? (
                  <View style={styles.mGeoVerifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#15803d" />
                    <Text style={styles.mGeoVerifiedText}>
                      🟢 On-Site Verified ({m.proofGeoLocation.distanceMetersFromHoarding}m)
                    </Text>
                  </View>
                ) : m.proofGeoLocation?.isWithinGeofence === false ? (
                  <View style={styles.mGeoWarningBadge}>
                    <Ionicons name="warning-outline" size={12} color="#b45309" />
                    <Text style={styles.mGeoWarningText}>
                      ⚠️ Geofence: {m.proofGeoLocation.distanceMetersFromHoarding}m from site
                    </Text>
                  </View>
                ) : null}

                {m.proofGeoLocation?.latitude && m.proofGeoLocation?.longitude ? (
                  <View style={styles.mGeoCoordsRow}>
                    <Ionicons name="location" size={11} color="#64748b" />
                    <Text style={styles.mGeoCoordsText}>
                      {m.proofGeoLocation.latitude.toFixed(4)}° N, {m.proofGeoLocation.longitude.toFixed(4)}° E
                    </Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`https://maps.google.com/?q=${m.proofGeoLocation.latitude},${m.proofGeoLocation.longitude}`)}
                    >
                      <Text style={styles.mGeoMapLink}>[Map]</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {m.proofNotes ? <Text style={styles.proofNotes}>"{m.proofNotes}"</Text> : null}
                <TouchableOpacity
                  onPress={() => Linking.openURL(m.proofPhotoUrl)}
                  style={styles.openFullPhotoBtn}
                >
                  <Ionicons name="open-outline" size={13} color="#2563eb" />
                  <Text style={styles.openFullPhotoText}>View Full-Resolution Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Verification Buttons */}
          <View style={styles.verifyActionsRow}>
            <TouchableOpacity
              onPress={() => setShowIssueBox(!showIssueBox)}
              style={styles.reportIssueBtn}
            >
              <Ionicons name="alert-circle-outline" size={14} color="#b91c1c" />
              <Text style={styles.reportIssueText}>Report Issue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleVerify(true)}
              disabled={verifying}
              style={styles.confirmVerifyBtn}
            >
              {verifying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.confirmVerifyBtnText}>Verify & Start Campaign</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Issue notes box */}
          {showIssueBox && (
            <View style={styles.issueBox}>
              <Text style={styles.issueBoxLabel}>Describe Issue (loose flex, unlit spots, etc.):</Text>
              <TextInput
                style={styles.issueInput}
                placeholder="Enter feedback for seller..."
                value={issueNotes}
                onChangeText={setIssueNotes}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <TouchableOpacity onPress={() => setShowIssueBox(false)}>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleVerify(false)}
                  disabled={verifying}
                  style={styles.submitIssueBtn}
                >
                  <Text style={styles.submitIssueBtnText}>Submit Issue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* SUBSCRIPTION ACTIVE BANNER */}
      {isActive && (
        <View style={styles.activeCampaignBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#166534" />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeCampaignHeading}>SUBSCRIPTION OFFICIALLY ACTIVE</Text>
            <Text style={styles.activeCampaignSub}>
              Started on{' '}
              <Text style={{ fontWeight: '800' }}>
                {booking.subscriptionStartDate
                  ? new Date(booking.subscriptionStartDate).toLocaleDateString()
                  : 'Today'}
              </Text>{' '}
              • Ends on{' '}
              <Text style={{ fontWeight: '800' }}>
                {booking.subscriptionEndDate
                  ? new Date(booking.subscriptionEndDate).toLocaleDateString()
                  : `${booking.durationDays} days later`}
              </Text>
            </Text>
          </View>
          {m.proofPhotoUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(m.proofPhotoUrl)}>
              <Text style={styles.proofLinkText}>Proof Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
        </View>
      )}
    </View>
  );
}

// Helper component for Flex Remounting (₹3/sq.ft) Moving Line in Mobile
function MobileRemountingTracker({ booking, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showIssueBox, setShowIssueBox] = useState(false);
  const [issueNotes, setIssueNotes] = useState('');

  const requests = booking?.remountingRequests || [];
  if (!requests.length) return null;
  const req = requests[0]; // Active or latest request

  const stages = [
    { key: 'requested', label: 'Requested', icon: 'document-text-outline' },
    { key: 'paid', label: 'Paid', icon: 'card-outline' },
    { key: 'flex_pickup', label: 'Pickup', icon: 'car-outline' },
    { key: 'mounting', label: 'Mounting', icon: 'construct-outline' },
    { key: 'completed', label: 'Live', icon: 'checkmark-circle-outline' }
  ];

  const getStageIndex = (status) => {
    switch (status) {
      case 'requested':
      case 'approved':
        return 0;
      case 'paid':
        return 1;
      case 'flex_pickup':
        return 2;
      case 'mounting':
        return 3;
      case 'proof_uploaded':
        return 3.5;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(req.status);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await mobileApi.post(`/bookings/${booking._id}/remounting/${req.requestId}/pay`, {
        paymentMode: 'online_upi',
        transactionReference: `REM-UPI-${Date.now()}`
      });
      if (res.data.success) {
        Alert.alert(
          'Payment Successful 🎉',
          `₹${req.totalAmount} paid for flex remounting (${req.areaSqFt} sq.ft @ ₹3/sq.ft). Crew notified for flex pickup!`
        );
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  const handleVerify = async (verified) => {
    setVerifying(true);
    try {
      const res = await mobileApi.put(`/bookings/${booking._id}/remounting/${req.requestId}/verify`, {
        verified,
        notes: issueNotes
      });
      if (res.data.success) {
        Alert.alert(
          verified ? 'New Banner Active! 🎉' : 'Issue Reported',
          verified
            ? 'New flex mounting verified! Your updated banner is now officially live.'
            : 'Issue feedback sent to mounting crew.'
        );
        setShowIssueBox(false);
        setIssueNotes('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.remountContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={styles.remountHeader}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.remountTag}>
              <Text style={styles.remountTagText}>FLEX REMOUNTING</Text>
            </View>
            <View style={styles.remountRatePill}>
              <Text style={styles.remountRateText}>₹3 / sq.ft</Text>
            </View>
          </View>
          <Text style={styles.remountTitle}>
            Flex Remounting Pipeline (#{req.requestId})
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.remountFeePill}>₹{req.totalAmount}</Text>
          <View style={styles.expandChevron}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color="#4f46e5" />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 10 }}>
          {/* Moving Line Stepper */}
          <View style={styles.remountStepperCard}>
            <Text style={styles.stepperSubhead}>LIVE PROGRESS LINE</Text>

            {/* Connecting Bar */}
            <View style={styles.remountLineWrap}>
              <View style={styles.remountLineBg} />
              <View
                style={[
                  styles.remountLineProgress,
                  { width: `${Math.min(100, (currentStageIndex / 4) * 100)}%` }
                ]}
              />
            </View>

            {/* Stages Row */}
            <View style={styles.remountStagesRow}>
              {stages.map((stage, idx) => {
                const isDone = currentStageIndex > idx;
                const isActive = Math.floor(currentStageIndex) === idx || (idx === 3 && currentStageIndex === 3.5);
                return (
                  <View key={stage.key} style={styles.remountStageItem}>
                    <View
                      style={[
                        styles.remountStageNode,
                        isDone && styles.remountNodeDone,
                        isActive && styles.remountNodeActive
                      ]}
                    >
                      <Ionicons
                        name={isDone ? 'checkmark-circle' : stage.icon}
                        size={15}
                        color={isDone || isActive ? '#fff' : '#94a3b8'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.remountStageText,
                        isActive && styles.remountStageActiveText,
                        isDone && styles.remountStageDoneText
                      ]}
                    >
                      {stage.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Pricing Formula Card */}
          <View style={styles.remountCalcBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.calcLabel}>BILLBOARD AREA & CHARGE</Text>
              <Text style={styles.calcFormula}>
                {req.dimensions?.width}ft × {req.dimensions?.height}ft = {req.areaSqFt} sq.ft @ ₹3/sq.ft
              </Text>
            </View>
            <Text style={styles.calcTotal}>₹{req.totalAmount}</Text>
          </View>

          {/* Replacement proof photo */}
          {req.proofPhotoUrl ? (
            <View style={styles.remountProofCard}>
              <Image source={{ uri: req.proofPhotoUrl }} style={styles.remountProofImg} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.remountProofTitle}>Site Remounting Proof</Text>
                <Text style={styles.remountProofDate}>{req.proofCaptureDateTime}</Text>
                {req.proofNotes ? <Text style={styles.remountProofNotes}>"{req.proofNotes}"</Text> : null}
              </View>
            </View>
          ) : null}

          {/* Actions */}
          {req.paymentStatus !== 'paid' && (
            <TouchableOpacity
              onPress={handlePay}
              disabled={paying}
              style={styles.remountPayBtn}
            >
              {paying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={14} color="#fff" />
                  <Text style={styles.remountPayBtnText}>
                    Pay ₹{req.totalAmount} Remounting Fee (₹3/sq.ft)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {req.status === 'proof_uploaded' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setShowIssueBox(!showIssueBox)}
                style={styles.remountIssueBtn}
              >
                <Text style={styles.remountIssueBtnText}>Report Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleVerify(true)}
                disabled={verifying}
                style={styles.remountVerifyBtn}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.remountVerifyBtnText}>Verify & Make Live</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {showIssueBox && (
            <View style={styles.issueBoxWrap}>
              <Text style={styles.issueBoxLabel}>Describe issue with remounting:</Text>
              <TextInput
                style={styles.issueInput}
                placeholder="e.g. Wrinkled on top corner, needs re-tensioning..."
                value={issueNotes}
                onChangeText={setIssueNotes}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <TouchableOpacity onPress={() => setShowIssueBox(false)} style={{ padding: 6 }}>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleVerify(false)} style={styles.issueSubmitBtn}>
                  <Text style={styles.issueSubmitBtnText}>Send Feedback</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function MyBookingsScreen({ navigation }) {
  const { isAuthenticated, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pay Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online_upi'); // 'online_upi' | 'online_card' | 'neft' | 'cheque'
  const [transRef, setTransRef] = useState('');
  const [paying, setPaying] = useState(false);

  // Remount Modal State
  const [remountBooking, setRemountBooking] = useState(null);
  const [remountCampaignName, setRemountCampaignName] = useState('');
  const [remountCreativeUrl, setRemountCreativeUrl] = useState('');
  const [remountPickupAddress, setRemountPickupAddress] = useState('');
  const [remountNotes, setRemountNotes] = useState('');
  const [submittingRemount, setSubmittingRemount] = useState(false);

  const fetchBookings = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await mobileApi.get('/bookings');
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.warn('Failed to load bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <Ionicons name="receipt-outline" size={48} color="#94a3b8" />
        <Text style={styles.authTitle}>My Bookings & Receipts</Text>
        <Text style={styles.authSubtitle}>
          Sign in to view your campaign reservations, submit payments, track the 3-day mounting window, and verify proofs.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Account')}
          style={styles.signInBtn}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Handle Pay for Approved Booking
  const handleCompletePayment = async () => {
    setPaying(true);
    try {
      const res = await mobileApi.post(`/bookings/${selectedBooking._id}/pay`, {
        paymentMode: paymentMethod,
        transactionReference: transRef.trim() || `TXN-${Date.now()}`
      });

      if (res.data.success) {
        Alert.alert(
          'Payment Recorded! 🎉',
          'Payment completed! Confirmation sent to Seller & Admin. 3-Day Mounting Window has started.'
        );
        setSelectedBooking(null);
        setTransRef('');
        fetchBookings();
      }
    } catch (err) {
      Alert.alert('Payment Error', err.response?.data?.message || 'Could not process payment.');
    } finally {
      setPaying(false);
    }
  };

  // Handle Flex Remounting Request
  const handleSubmitRemount = async () => {
    if (!remountBooking) return;
    setSubmittingRemount(true);
    try {
      const res = await mobileApi.post(`/bookings/${remountBooking._id}/remounting`, {
        campaignName: remountCampaignName.trim(),
        newCreativeUrl: remountCreativeUrl.trim(),
        pickupAddress: remountPickupAddress.trim(),
        notes: remountNotes.trim()
      });
      if (res.data.success) {
        Alert.alert(
          'Remounting Requested! 🎉',
          `Your request has been placed. Total fee: ₹${res.data.remountingRequest?.totalAmount} (${res.data.remountingRequest?.areaSqFt} sq.ft @ ₹3/sq.ft).`
        );
        setRemountBooking(null);
        setRemountCampaignName('');
        setRemountCreativeUrl('');
        setRemountPickupAddress('');
        setRemountNotes('');
        fetchBookings();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit remounting request.');
    } finally {
      setSubmittingRemount(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Bookings & Receipts</Text>
          <Text style={styles.headerSubtitle}>
            Campaign reservations, approvals, 3-day mounting window & verification
          </Text>
        </View>

        <TouchableOpacity onPress={fetchBookings} style={styles.refreshIconBtn}>
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: '700' }}>
            Loading reservations...
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchBookings();
          }}
          contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Bookings Yet</Text>
              <Text style={styles.emptySub}>
                Explore the marketplace and reserve your first billboard site.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const h = item.hoardingId || item.hoarding;
            const status = item.bookingStatus || 'requested';
            const isRequested = status === 'requested';
            const isApproved = status === 'approved';
            const isMountingWindow = status === 'mounting_window' || status === 'confirmed';
            const isVerificationPending = status === 'verification_pending';
            const isActive = status === 'active';
            const isCompleted = status === 'completed';
            const isRejected = status === 'rejected' || status === 'cancelled';
            const hasMountingPipeline = isMountingWindow || isVerificationPending || isActive;

            return (
              <View style={styles.bookingCard}>
                {/* Card Top */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.bookingNumber}>#{item.bookingNumber}</Text>
                      <Text style={styles.bookingCity}>• {h?.location?.city || 'Kolkata'}</Text>
                    </View>
                    <Text style={styles.bookingTitle} numberOfLines={2}>
                      {h?.title || 'Hoarding Reservation'}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusPill,
                      isCompleted
                        ? styles.pillCompleted
                        : isActive
                        ? styles.pillActive
                        : isVerificationPending
                        ? styles.pillVerify
                        : isMountingWindow
                        ? styles.pillMounting
                        : isApproved
                        ? styles.pillApproved
                        : isRejected
                        ? styles.pillRejected
                        : styles.pillRequested,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isCompleted
                          ? styles.pillCompletedText
                          : isActive
                          ? styles.pillActiveText
                          : isVerificationPending
                          ? styles.pillVerifyText
                          : isMountingWindow
                          ? styles.pillMountingText
                          : isApproved
                          ? styles.pillApprovedText
                          : isRejected
                          ? styles.pillRejectedText
                          : styles.pillRequestedText,
                      ]}
                    >
                      {isCompleted
                        ? 'COMPLETED (EXPIRED)'
                        : isActive
                        ? 'ACTIVE'
                        : isVerificationPending
                        ? 'VERIFY PROOF'
                        : isMountingWindow
                        ? 'MOUNTING WINDOW'
                        : isApproved
                        ? 'APPROVED'
                        : isRejected
                        ? 'REJECTED'
                        : 'PENDING APPROVAL'}
                    </Text>
                  </View>
                </View>

                {/* Dates & Duration */}
                <Text style={styles.bookingDates}>
                  📅 {new Date(item.startDate).toLocaleDateString()} —{' '}
                  {new Date(item.endDate).toLocaleDateString()} ({item.durationDays || 30} Days)
                </Text>

                {/* Explanatory callout for requested status */}
                {isRequested && (
                  <View style={styles.requestedCallout}>
                    <Ionicons name="time" size={14} color="#b45309" />
                    <Text style={styles.requestedCalloutText}>
                      Awaiting site owner approval. Payment option will unlock as soon as the seller approves your requested dates.
                    </Text>
                  </View>
                )}

                {/* Explanatory callout for completed status */}
                {isCompleted && (
                  <View style={styles.completedCallout}>
                    <Ionicons name="checkmark-done-circle" size={14} color="#475569" />
                    <Text style={styles.completedCalloutText}>
                      Campaign subscription term has ended. The hoarding space is now released and available.
                    </Text>
                  </View>
                )}

                {/* Approved Callout with Pay Option */}
                {isApproved && (
                  <View style={styles.approvedCallout}>
                    <Ionicons name="checkmark-circle" size={16} color="#166534" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.approvedCalloutTitle}>Approved by Media Owner!</Text>
                      <Text style={styles.approvedCalloutText}>
                        Pay now to dispatch confirmation to seller & admin and start the 3-day mounting window.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Amount & Actions row */}
                <View style={styles.cardDivider} />
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.amountLabel}>GROSS AMOUNT</Text>
                    <Text style={styles.amountText}>
                      ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* REMOUNT FLEX BUTTON (For ongoing active bookings) */}
                    {(isActive || isMountingWindow || isVerificationPending) && (
                      <TouchableOpacity
                        onPress={() => {
                          setRemountBooking(item);
                          setRemountCampaignName(item.campaignName || '');
                        }}
                        style={styles.remountTriggerBtn}
                      >
                        <Ionicons name="construct" size={13} color="#4f46e5" />
                        <Text style={styles.remountTriggerBtnText}>Remount (₹3/sq.ft)</Text>
                      </TouchableOpacity>
                    )}

                    {h?.location?.googleMapsUrl && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(h.location.googleMapsUrl)}
                        style={styles.mapsBtn}
                      >
                        <Ionicons name="navigate" size={13} color="#2563eb" />
                        <Text style={styles.mapsBtnText}>Map</Text>
                      </TouchableOpacity>
                    )}

                    {/* PAY NOW BUTTON (Available ONLY after seller approves) */}
                    {isApproved && (
                      <TouchableOpacity
                        onPress={() => setSelectedBooking(item)}
                        style={styles.payBtn}
                      >
                        <Ionicons name="card" size={14} color="#fff" />
                        <Text style={styles.payBtnText}>Pay Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* FLEX REMOUNTING PIPELINE (WITH MOVING LINE) */}
                {item.remountingRequests && item.remountingRequests.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <MobileRemountingTracker
                      booking={item}
                      onRefresh={fetchBookings}
                    />
                  </View>
                )}

                {/* MOUNTING TRACKER PIPELINE (Visible during mounting_window, verification_pending, or active) */}
                {hasMountingPipeline && (
                  <View style={{ marginTop: 12 }}>
                    <MobileMountingTracker
                      booking={item}
                      onRefresh={fetchBookings}
                    />
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ============================================================== */}
      {/* PAY NOW MODAL FOR APPROVED BOOKINGS */}
      {/* ============================================================== */}
      <Modal visible={!!selectedBooking} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>Pay for Reservation</Text>
                <Text style={styles.modalSubheading}>
                  Booking #{selectedBooking?.bookingNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAmountBox}>
              <Text style={styles.modalAmountLabel}>TOTAL AMOUNT PAYABLE</Text>
              <Text style={styles.modalAmountVal}>
                ₹{(selectedBooking?.totalAmount || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.modalNotice}>
                ✓ Payment will start the 3-Day Mounting Window immediately.
              </Text>
            </View>

            <Text style={styles.inputLabel}>Select Payment Mode</Text>
            <View style={styles.methodToggleGrid}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('online_upi')}
                style={[styles.methodBtn, paymentMethod === 'online_upi' && styles.methodBtnActive]}
              >
                <Text style={[styles.methodBtnText, paymentMethod === 'online_upi' && styles.methodBtnTextActive]}>
                  ⚡ Instant UPI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('online_card')}
                style={[styles.methodBtn, paymentMethod === 'online_card' && styles.methodBtnActive]}
              >
                <Text style={[styles.methodBtnText, paymentMethod === 'online_card' && styles.methodBtnTextActive]}>
                  💳 Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('neft')}
                style={[styles.methodBtn, paymentMethod === 'neft' && styles.methodBtnActive]}
              >
                <Text style={[styles.methodBtnText, paymentMethod === 'neft' && styles.methodBtnTextActive]}>
                  🏦 NEFT / RTGS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('cheque')}
                style={[styles.methodBtn, paymentMethod === 'cheque' && styles.methodBtnActive]}
              >
                <Text style={[styles.methodBtnText, paymentMethod === 'cheque' && styles.methodBtnTextActive]}>
                  📄 Cheque
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>
              {paymentMethod.startsWith('online')
                ? 'UPI ID / Transaction Note (Optional)'
                : 'UTR / Cheque Number Reference *'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                paymentMethod.startsWith('online')
                  ? 'e.g. UPI-Payment or Leave blank for auto'
                  : 'e.g. UTR #SBIN2026194819'
              }
              value={transRef}
              onChangeText={setTransRef}
            />

            <TouchableOpacity
              onPress={handleCompletePayment}
              disabled={paying}
              style={styles.modalSubmitBtn}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  Confirm Payment (₹{(selectedBooking?.totalAmount || 0).toLocaleString('en-IN')})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* REMOUNT REQUEST MODAL (₹3 / SQ.FT RATE) */}
      {/* ============================================================== */}
      <Modal visible={!!remountBooking} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>Request Flex Remounting</Text>
                <Text style={styles.modalSubheading}>
                  Booking #{remountBooking?.bookingNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRemountBooking(null)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Price banner */}
            <View style={[styles.modalAmountBox, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
              <Text style={[styles.modalAmountLabel, { color: '#4338ca' }]}>STANDARD REMOUNTING RATE</Text>
              <Text style={[styles.modalAmountVal, { color: '#312e81' }]}>
                ₹{((Number(remountBooking?.hoardingId?.dimensions?.width) || 20) * (Number(remountBooking?.hoardingId?.dimensions?.height) || 10) * 3).toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.modalNotice, { color: '#4f46e5' }]}>
                {((Number(remountBooking?.hoardingId?.dimensions?.width) || 20) * (Number(remountBooking?.hoardingId?.dimensions?.height) || 10))} sq.ft @ ₹3/sq.ft fixed rate
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 8 }}>
              <Text style={styles.inputLabel}>CAMPAIGN / CREATIVE TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Festive Offer Campaign"
                value={remountCampaignName}
                onChangeText={setRemountCampaignName}
              />

              <Text style={styles.inputLabel}>NEW CREATIVE ARTWORK URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://... (Artwork URL)"
                value={remountCreativeUrl}
                onChangeText={setRemountCreativeUrl}
              />

              <Text style={styles.inputLabel}>FLEX PICKUP ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="Where crew will pick up printed flex..."
                value={remountPickupAddress}
                onChangeText={setRemountPickupAddress}
              />

              <Text style={styles.inputLabel}>SPECIAL INSTRUCTIONS (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rigging instructions..."
                value={remountNotes}
                onChangeText={setRemountNotes}
              />
            </ScrollView>

            <TouchableOpacity
              onPress={handleSubmitRemount}
              disabled={submittingRemount}
              style={[styles.modalSubmitBtn, { backgroundColor: '#4f46e5' }]}
            >
              {submittingRemount ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Submit Remounting Request</Text>
              )}
            </TouchableOpacity>
          </View>
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
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f8fafc',
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 12,
  },
  authSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  signInBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 18,
  },
  signInBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  bookingNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563eb',
    fontFamily: 'monospace',
  },
  bookingCity: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillCompleted: { backgroundColor: '#f1f5f9' },
  pillCompletedText: { color: '#475569', fontSize: 10, fontWeight: '900' },
  pillRejected: { backgroundColor: '#ffe4e6' },
  pillRejectedText: { color: '#be123c', fontSize: 10, fontWeight: '900' },
  pillActive: { backgroundColor: '#dcfce7' },
  pillActiveText: { color: '#166534', fontSize: 10, fontWeight: '900' },
  pillVerify: { backgroundColor: '#f3e8ff' },
  pillVerifyText: { color: '#7e22ce', fontSize: 10, fontWeight: '900' },
  pillMounting: { backgroundColor: '#e0e7ff' },
  pillMountingText: { color: '#3730a3', fontSize: 10, fontWeight: '900' },
  pillApproved: { backgroundColor: '#dbeafe' },
  pillApprovedText: { color: '#1d4ed8', fontSize: 10, fontWeight: '900' },
  pillRequested: { backgroundColor: '#fef3c7' },
  pillRequestedText: { color: '#b45309', fontSize: 10, fontWeight: '900' },
  completedCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  completedCalloutText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  bookingDates: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '600',
  },
  requestedCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  requestedCalloutText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  approvedCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  approvedCalloutTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#166534',
  },
  approvedCalloutText: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mapsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },

  // Mounting Tracker Styles
  trackerContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  windowTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  windowTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3730a3',
  },
  pipelineSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  trackerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 3,
  },
  timerChipAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  timerChipAmberText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400e',
  },
  timerChipPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  timerChipPurpleText: {
    fontSize: 11,
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
    padding: 8,
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
    paddingVertical: 2,
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
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  phaseDesc: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },

  // 4-Hour Verification Card
  verifyWindowCard: {
    backgroundColor: '#faf5ff',
    borderWidth: 1.5,
    borderColor: '#d8b4fe',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  verifyWindowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  verifyWindowTag: {
    backgroundColor: '#e9d5ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifyWindowTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#581c87',
  },
  verifyWindowHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: '#3b0764',
    marginTop: 2,
  },
  verifyWindowSub: {
    fontSize: 10,
    color: '#6b21a8',
    marginTop: 2,
    lineHeight: 14,
  },
  countdownBadge: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c084fc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  countdownBadgeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#7e22ce',
  },
  countdownBadgeTime: {
    fontSize: 11,
    fontWeight: '900',
    color: '#581c87',
    fontFamily: 'monospace',
  },
  mGeoVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  mGeoVerifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  mGeoWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  mGeoWarningText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
  },
  mGeoCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  mGeoCoordsText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748b',
  },
  mGeoMapLink: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  proofPhotoWrap: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    padding: 8,
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  proofImg: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  proofDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  proofStampLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#7e22ce',
  },
  proofStampVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  proofNotes: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 1,
  },
  openFullPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  openFullPhotoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  verifyActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  reportIssueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reportIssueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
  },
  confirmVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmVerifyBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },
  issueBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  issueBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
  },
  issueInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 6,
    fontSize: 11,
    marginTop: 4,
  },
  submitIssueBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  submitIssueBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },

  // Active Campaign Banner
  activeCampaignBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeCampaignHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: '#166534',
  },
  activeCampaignSub: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 1,
  },
  proofLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textDecorationLine: 'underline',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubheading: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  modalAmountBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  modalAmountLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#166534',
  },
  modalAmountVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#14532d',
    marginTop: 1,
  },
  modalNotice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 4,
  },
  methodToggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  methodBtn: {
    flexBasis: '48%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  methodBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  methodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  methodBtnTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 14,
  },
  modalSubmitBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },

  // Flex Remounting Styles
  remountContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    padding: 12,
    marginTop: 10,
  },
  remountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remountTag: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  remountTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  remountRatePill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  remountRateText: {
    color: '#92400e',
    fontSize: 9,
    fontWeight: '800',
  },
  remountTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 3,
  },
  remountFeePill: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  expandChevron: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  remountStepperCard: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  stepperSubhead: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  remountLineWrap: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginHorizontal: 16,
    position: 'relative',
    marginTop: 12,
  },
  remountLineBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e2e8f0',
  },
  remountLineProgress: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  remountStagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -12,
  },
  remountStageItem: {
    alignItems: 'center',
    width: 54,
  },
  remountStageNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remountNodeDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  remountNodeActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  remountStageText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  remountStageActiveText: {
    color: '#4f46e5',
    fontWeight: '900',
  },
  remountStageDoneText: {
    color: '#059669',
    fontWeight: '800',
  },
  remountCalcBox: {
    backgroundColor: '#f5f3ff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6d28d9',
  },
  calcFormula: {
    fontSize: 11,
    color: '#4c1d95',
    fontWeight: '700',
    marginTop: 2,
  },
  calcTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  remountProofCard: {
    flexDirection: 'row',
    backgroundColor: '#faf5ff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    marginTop: 8,
    alignItems: 'center',
  },
  remountProofImg: {
    width: 60,
    height: 45,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  remountProofTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#581c87',
  },
  remountProofDate: {
    fontSize: 10,
    color: '#7e22ce',
    marginTop: 2,
  },
  remountProofNotes: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 2,
  },
  remountPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  remountPayBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  remountIssueBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  remountIssueBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800',
  },
  remountVerifyBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  remountVerifyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  remountTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  remountTriggerBtnText: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '800',
  },
  issueBoxWrap: {
    backgroundColor: '#fff1f2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginTop: 8,
  },
  issueBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9f1239',
    marginBottom: 4,
  },
  issueInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  issueSubmitBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  issueSubmitBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
