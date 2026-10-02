import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function MyBookingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>My Bookings</Text>
      <Text style={{ color: '#64748b', marginTop: 8 }}>Campaigns and offline payments tracker</Text>
    </SafeAreaView>
  );
}
