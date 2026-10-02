import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, user, logout, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('seller@bengalmedia.com');
  const [password, setPassword] = useState('Seller@123');

  if (isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Signed in as: {user?.name}</Text>
        <Text style={{ color: '#2563eb', marginTop: 4 }}>Role: {user?.role}</Text>
        <TouchableOpacity onPress={logout} style={{ marginTop: 20, backgroundColor: '#fee2e2', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 20 }}>Sign In</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 8, marginBottom: 12 }} />
      <TextInput placeholder="Password" value={password} secureTextEntry onChangeText={setPassword} style={{ borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 8, marginBottom: 16 }} />
      <TouchableOpacity onPress={() => login(email, password)} style={{ backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>Sign In</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
