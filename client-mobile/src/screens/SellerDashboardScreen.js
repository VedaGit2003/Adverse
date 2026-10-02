import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function SellerDashboardScreen() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Seller Desk</Text>
      <Text style={{ color: '#64748b', marginTop: 8 }}>Verify advertiser cheques & NEFT payments</Text>
    </SafeAreaView>
  );
}
