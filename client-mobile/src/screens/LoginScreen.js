import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, register, ssoLogin, user, logout, isAuthenticated } = useAuth();

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

  // SSO Modal State
  const [showSSOModal, setShowSSOModal] = useState(false);
  const [customSSOMode, setCustomSSOMode] = useState(false);
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoName, setSsoName] = useState('');
  const [ssoRole, setSsoRole] = useState('customer');
  const [ssoCompany, setSsoCompany] = useState('');

  const quickGoogleAccounts = [
    {
      name: 'Client Advertiser',
      email: 'client@brands.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      role: 'customer',
      badge: 'Advertiser'
    },
    {
      name: 'Bengal Outdoor Media',
      email: 'seller@bengalmedia.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      role: 'seller',
      badge: 'Hoarding Owner'
    },
    {
      name: 'Super Admin',
      email: 'admin@adverse.in',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      role: 'admin',
      badge: 'Platform Admin'
    }
  ];

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

  const handleSSOSelect = async (ssoPayload) => {
    setLoading(true);
    try {
      await ssoLogin(ssoPayload);
      setShowSSOModal(false);
      Alert.alert('Google SSO', `Signed in successfully as ${ssoPayload.name || ssoPayload.email}!`);
    } catch (err) {
      Alert.alert('Google Sign-In Failed', err.response?.data?.message || 'Could not authenticate via Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSSOSubmit = () => {
    if (!ssoEmail) {
      Alert.alert('Required', 'Please provide a Google email address.');
      return;
    }
    handleSSOSelect({
      provider: 'google',
      ssoId: `google_${Date.now()}`,
      email: ssoEmail,
      name: ssoName || ssoEmail.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ssoName || ssoEmail)}`,
      role: ssoRole,
      companyDetails: ssoRole === 'seller' ? { companyName: ssoCompany || ssoName } : undefined
    });
  };

  if (isAuthenticated) {
    const isSeller = user?.role === 'seller';
    const isApproved = user?.status === 'active';
    const isGoogleSSO = user?.ssoProvider === 'google';

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.accountContent}>
          <View style={styles.avatarCircle}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#2563eb" />
            )}
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>
                ROLE: {user?.role?.toUpperCase()}
              </Text>
            </View>

            {isGoogleSSO && (
              <View style={styles.ssoVerifiedBadge}>
                <Ionicons name="logo-google" size={12} color="#ea4335" />
                <Text style={styles.ssoVerifiedText}>Google SSO</Text>
              </View>
            )}
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
            {/* Google SSO Button */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => {
                setSsoRole('customer');
                setShowSSOModal(true);
              }}
              disabled={loading}
            >
              <View style={styles.googleIconBox}>
                <Ionicons name="logo-google" size={18} color="#ea4335" />
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

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

            {/* Google SSO Button in Register Tab */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => {
                setSsoRole(role);
                setShowSSOModal(true);
              }}
              disabled={loading}
            >
              <View style={styles.googleIconBox}>
                <Ionicons name="logo-google" size={18} color="#ea4335" />
              </View>
              <Text style={styles.googleBtnText}>
                Sign up with Google as {role === 'seller' ? 'Seller' : 'Advertiser'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR REGISTER WITH EMAIL</Text>
              <View style={styles.dividerLine} />
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

      {/* Google SSO Bottom Sheet Modal */}
      <Modal
        visible={showSSOModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSSOModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Ionicons name="logo-google" size={24} color="#ea4335" />
                <View>
                  <Text style={styles.modalTitle}>Sign in with Google</Text>
                  <Text style={styles.modalSubtitle}>to continue to Adverse Media Hub</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowSSOModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {!customSSOMode ? (
                <View style={{ gap: 10 }}>
                  <Text style={styles.modalSectionLabel}>CHOOSE A GOOGLE ACCOUNT</Text>

                  {quickGoogleAccounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.email}
                      onPress={() => handleSSOSelect({
                        provider: 'google',
                        ssoId: `google_${acc.email}`,
                        email: acc.email,
                        name: acc.name,
                        avatar: acc.avatar,
                        role: ssoRole || acc.role,
                        companyDetails: (ssoRole || acc.role) === 'seller' ? { companyName: acc.name } : undefined
                      })}
                      style={styles.quickAccountCard}
                    >
                      <Image source={{ uri: acc.avatar }} style={styles.quickAccountAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quickAccountName}>{acc.name}</Text>
                        <Text style={styles.quickAccountEmail}>{acc.email}</Text>
                      </View>
                      <View style={styles.quickAccountBadge}>
                        <Text style={styles.quickAccountBadgeText}>{acc.badge}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    onPress={() => setCustomSSOMode(true)}
                    style={styles.customAccountBtn}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#2563eb" />
                    <Text style={styles.customAccountBtnText}>Use another Google Account</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.modalSectionLabel}>ENTER GOOGLE CREDENTIALS</Text>
                    <TouchableOpacity onPress={() => setCustomSSOMode(false)}>
                      <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '700' }}>← Quick Accounts</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Google Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. user@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={ssoEmail}
                    onChangeText={setSsoEmail}
                  />

                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ronit Sen"
                    value={ssoName}
                    onChangeText={setSsoName}
                  />

                  <Text style={styles.inputLabel}>Account Role</Text>
                  <View style={styles.roleToggleRow}>
                    <TouchableOpacity
                      onPress={() => setSsoRole('customer')}
                      style={[styles.roleSelectBtn, ssoRole === 'customer' && styles.roleSelectBtnActive]}
                    >
                      <Text style={[styles.roleSelectText, ssoRole === 'customer' && styles.roleSelectTextActive]}>
                        🛍️ Advertiser
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setSsoRole('seller')}
                      style={[styles.roleSelectBtn, ssoRole === 'seller' && styles.roleSelectBtnActive]}
                    >
                      <Text style={[styles.roleSelectText, ssoRole === 'seller' && styles.roleSelectTextActive]}>
                        🏢 Hoarding Owner
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {ssoRole === 'seller' && (
                    <>
                      <Text style={styles.inputLabel}>Agency / Company Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Sen Outdoor Agency"
                        value={ssoCompany}
                        onChangeText={setSsoCompany}
                      />
                    </>
                  )}

                  <TouchableOpacity
                    onPress={handleCustomSSOSubmit}
                    disabled={loading}
                    style={styles.submitBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Sign In with Google</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooterSecurity}>
              <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
              <Text style={styles.modalFooterSecurityText}>Protected by OAuth 2.0 Single Sign-On</Text>
            </View>
          </View>
        </View>
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
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  googleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
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
    marginBottom: 10,
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
    marginTop: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  demoSection: {
    marginTop: 20,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  roleChip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleChipText: {
    color: '#3730a3',
    fontSize: 10,
    fontWeight: '900',
  },
  ssoVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ssoVerifiedText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '800',
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
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 14,
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  quickAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  quickAccountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickAccountName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  quickAccountEmail: {
    fontSize: 11,
    color: '#64748b',
  },
  quickAccountBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  quickAccountBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3730a3',
  },
  customAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  customAccountBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  modalFooterSecurity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalFooterSecurityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
});
