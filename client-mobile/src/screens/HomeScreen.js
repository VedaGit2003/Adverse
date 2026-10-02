import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mobileApi from '../api/client';

export default function HomeScreen({ navigation }) {
  const [hoardings, setHoardings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mobileApi.get('/hoardings/nearby').then(res => setHoardings(res.data.hoardings || [])).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ padding: 16, backgroundColor: '#0f172a' }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>ADVERSE</Text>
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>West Bengal Hoarding Marketplace</Text>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList
          data={hoardings}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('HoardingDetail', { hoardingId: item._id })}
              style={{ backgroundColor: '#fff', margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Image source={{ uri: item.photos[0] }} style={{ height: 160, width: '100%' }} />
              <View style={{ padding: 14 }}>
                <Text style={{ color: '#2563eb', fontSize: 11, fontWeight: '700' }}>{item.location?.city}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', marginTop: 2 }}>{item.title}</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 8 }}>₹{item.pricing?.baseRatePerMonth?.toLocaleString('en-IN')}/mo</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
