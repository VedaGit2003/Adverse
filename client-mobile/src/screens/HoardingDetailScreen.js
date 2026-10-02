import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import mobileApi from '../api/client';

export default function HoardingDetailScreen({ route, navigation }) {
  const { hoardingId } = route.params;
  const [hoarding, setHoarding] = useState(null);

  useEffect(() => {
    mobileApi.get(`/hoardings/${hoardingId}`).then(res => setHoarding(res.data.hoarding));
  }, [hoardingId]);

  if (!hoarding) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView>
        <Image source={{ uri: hoarding.photos[0] }} style={{ height: 220, width: '100%' }} />
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>{hoarding.title}</Text>
          <Text style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{hoarding.location?.address}, {hoarding.location?.city}</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#2563eb', marginTop: 12 }}>₹{hoarding.pricing?.baseRatePerMonth?.toLocaleString('en-IN')}/mo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
