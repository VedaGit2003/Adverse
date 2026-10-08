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
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import mobileApi from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MyBookingsScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pay Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('neft'); // 'cheque' | 'neft'
  const [transRef, setTransRef] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchBookings = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await mobileApi.get('/bookings/my-bookings');
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
          Sign in to view your campaign reservations, submit bank cheques, and download receipts.
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

  const handleSubmitPayment = async () => {
    if (!transRef.trim()) {
      Alert.alert('Required', 'Please enter your cheque number or NEFT transaction reference.');
      return;
    }

    setPaying(true);
    try {
      await mobileApi.post('/payments', {
        bookingId: selectedBooking._id,
        amount: selectedBooking.totalAmount,
        paymentMethod: paymentMethod === 'cheque' ? 'offline_cheque' : 'offline_neft',
        transactionReference: transRef.trim()
      });

      Alert.alert(
        'Slip Submitted! 🏦',
        'Your offline payment reference has been recorded. Media owner / admin will verify and activate your campaign.'
      );
      setSelectedBooking(null);
      setTransRef('');
      fetchBookings();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not record payment.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings & Receipts</Text>
        <Text style={styles.headerSubtitle}>
          Outdoor advertising campaign reservations & bank clearances
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
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
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
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
            const h = item.hoarding;
            const status = item.bookingStatus || 'pending_payment';
            const isPendingPayment = status === 'pending_payment';
            const isConfirmed = status === 'confirmed' || status === 'active';

            return (
              <View style={styles.bookingCard}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCity}>{h?.location?.city || 'Kolkata'}</Text>
                    <Text style={styles.bookingTitle} numberOfLines={2}>
                      {h?.title || 'Hoarding Reservation'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isConfirmed
                        ? styles.pillConfirmed
                        : isPendingPayment
                        ? styles.pillPending
                        : styles.pillOther,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isConfirmed
                          ? styles.pillConfirmedText
                          : isPendingPayment
                          ? styles.pillPendingText
                          : styles.pillOtherText,
                      ]}
                    >
                      {status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.bookingDates}>
                  📅 {new Date(item.startDate).toLocaleDateString()} —{' '}
                  {new Date(item.endDate).toLocaleDateString()}
                </Text>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.amountLabel}>CAMPAIGN AMOUNT</Text>
                    <Text style={styles.amountText}>
                      ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {h?.location?.googleMapsUrl && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(h.location.googleMapsUrl)}
                        style={styles.mapsBtn}
                      >
                        <Ionicons name="navigate" size={14} color="#2563eb" />
                        <Text style={styles.mapsBtnText}>Maps</Text>
                      </TouchableOpacity>
                    )}

                    {isPendingPayment && (
                      <TouchableOpacity
                        onPress={() => setSelectedBooking(item)}
                        style={styles.payBtn}
                      >
                        <Ionicons name="cash-outline" size={14} color="#fff" />
                        <Text style={styles.payBtnText}>Submit Cheque</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Offline Cheque / NEFT Submission Modal */}
      <Modal visible={!!selectedBooking} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Submit Offline Payment Slip</Text>
              <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalNotice}>
              Total Amount Payable: ₹{(selectedBooking?.totalAmount || 0).toLocaleString('en-IN')}
            </Text>

            <View style={styles.methodToggleRow}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('neft')}
                style={[styles.methodBtn, paymentMethod === 'neft' && styles.methodBtnActive]}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    paymentMethod === 'neft' && styles.methodBtnTextActive,
                  ]}
                >
                  Bank NEFT / RTGS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('cheque')}
                style={[styles.methodBtn, paymentMethod === 'cheque' && styles.methodBtnActive]}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    paymentMethod === 'cheque' && styles.methodBtnTextActive,
                  ]}
                >
                  Bank Cheque
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>
              {paymentMethod === 'cheque'
                ? 'Cheque Number & Issuing Bank'
                : 'NEFT / UTR Transaction Reference *'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                paymentMethod === 'cheque'
                  ? 'e.g. Cheque #492810 - HDFC Bank'
                  : 'e.g. UTR / URN #SBIN0029410492'
              }
              value={transRef}
              onChangeText={setTransRef}
            />

            <TouchableOpacity
              onPress={handleSubmitPayment}
              disabled={paying}
              style={styles.modalSubmitBtn}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Submit Reference for Verification</Text>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  bookingCity: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillConfirmed: { backgroundColor: '#dcfce7' },
  pillConfirmedText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  pillPending: { backgroundColor: '#fef3c7' },
  pillPendingText: { color: '#b45309', fontSize: 10, fontWeight: '800' },
  pillOther: { backgroundColor: '#f1f5f9' },
  pillOtherText: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  bookingDates: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '600',
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
    paddingHorizontal: 10,
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
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
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
    marginBottom: 10,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalNotice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  methodToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
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
    color: '#64748b',
  },
  methodBtnTextActive: {
    color: '#fff',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
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
  modalSubmitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
