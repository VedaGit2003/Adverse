import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, register, user, logout, isAuthenticated } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('seller'); // 'customer' | 'seller'
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  const handleLogin = async (loginEmail = email, loginPass = password) => {
    if (!loginEmail || !loginPass) {
      Alert.alert('Required', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(loginEmail, loginPass);
      Alert.alert('Success', 'Signed in successfully!');
    } catch (err) {
      Alert.alert('Sign In Failed', err.response?.data?.message || 'Invalid credentials or connection issue.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Required', 'Please fill name, email and password.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        phone,
        role,
        companyDetails: role === 'seller' ? {
          companyName: companyName || name,
          gstNumber: gstNumber || 'Unregistered',
          tradeLicense: '',
          address: ''
        } : undefined
      };

      await register(payload);
      Alert.alert('Account Created! 🎉', 'Welcome to Adverse.');
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.message || 'Registration could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    const isSeller = user?.role === 'seller';
    const isApproved = user?.status === 'active';

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.accountContent}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color="#2563eb" />
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>
              ROLE: {user?.role?.toUpperCase()}
            </Text>
          </View>

          {isSeller && (
            <View style={[styles.statusBox, isApproved ? styles.statusBoxActive : styles.statusBoxPending]}>
              <Ionicons
                name={isApproved ? 'shield-checkmark' : 'time'}
                size={20}
                color={isApproved ? '#166534' : '#92400e'}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusBoxTitle, isApproved ? { color: '#166534' } : { color: '#92400e' }]}>
                  {isApproved ? 'Accredited Media Owner' : 'Pending Admin Verification'}
                </Text>
                <Text style={styles.statusBoxSub}>
                  Agency: {user?.companyDetails?.companyName || user?.name}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.menuCard}>
            <TouchableOpacity
              onPress={() => navigation.navigate(isSeller ? 'SellerTab' : 'BookingsTab')}
              style={styles.menuRow}
            >
              <Ionicons name="apps-outline" size={20} color="#2563eb" />
              <Text style={styles.menuRowText}>
                {isSeller ? 'Go to Seller Management Desk' : 'Go to My Bookings'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={logout}
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuRowText, { color: '#ef4444' }]}>Sign Out of Adverse</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header Branding */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>ADVERSE</Text>
          <Text style={styles.brandSubtitle}>
            West Bengal Out-Of-Home (OOH) Advertising Network
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setMode('login')}
            style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, mode === 'login' && styles.tabBtnTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('register')}
            style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, mode === 'register' && styles.tabBtnTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'login' ? (
          /* Sign In Form */
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. seller@bengalmedia.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() => handleLogin()}
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Logins */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>QUICK 1-TAP DEMO SIGN IN</Text>
              <View style={styles.demoGrid}>
                <TouchableOpacity
                  onPress={() => handleLogin('seller@bengalmedia.com', 'Seller@123')}
                  style={styles.demoBtn}
                >
                  <Text style={styles.demoBtnText}>🏢 Bengal Media (Seller)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleLogin('admin@adverse.in', 'Admin@123')}
                  style={styles.demoBtn}
                >
                  <Text style={styles.demoBtnText}>🛡️ Super Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleLogin('brand@tata.com', 'Customer@123')}
                  style={styles.demoBtn}
                >
                  <Text style={styles.demoBtnText}>👤 Advertiser (Client)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* Registration Form */
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Select Your Role</Text>
            <View style={styles.roleToggleRow}>
              <TouchableOpacity
                onPress={() => setRole('seller')}
                style={[styles.roleSelectBtn, role === 'seller' && styles.roleSelectBtnActive]}
              >
                <Ionicons name="business" size={16} color={role === 'seller' ? '#fff' : '#64748b'} />
                <Text style={[styles.roleSelectText, role === 'seller' && styles.roleSelectTextActive]}>
                  Site Owner (Seller)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRole('customer')}
                style={[styles.roleSelectBtn, role === 'customer' && styles.roleSelectBtnActive]}
              >
                <Ionicons name="megaphone" size={16} color={role === 'customer' ? '#fff' : '#64748b'} />
                <Text style={[styles.roleSelectText, role === 'customer' && styles.roleSelectTextActive]}>
                  Advertiser (Client)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. name@domain.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98300..."
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose strong password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {role === 'seller' && (
              <>
                <Text style={styles.inputLabel}>Agency / Company Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Kolkata Outdoor Media Pvt Ltd"
                  value={companyName}
                  onChangeText={setCompanyName}
                />

                <Text style={styles.inputLabel}>GST Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="19AAAAA0000A1Z5 or Unregistered"
                  value={gstNumber}
                  onChangeText={setGstNumber}
                />
              </>
            )}

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    marginVertical: 14,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0f172a',
    fontWeight: '900',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  roleSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
  },
  roleSelectBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleSelectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  roleSelectTextActive: {
    color: '#fff',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  demoSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  demoGrid: {
    gap: 8,
  },
  demoBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  accountContent: {
    padding: 24,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 12,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  roleChip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleChipText: {
    color: '#3730a3',
    fontSize: 10,
    fontWeight: '900',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: 12,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
  },
  statusBoxActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  statusBoxPending: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  statusBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusBoxSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    marginTop: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  menuRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
});
