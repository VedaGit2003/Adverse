import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, LogBox, View, ActivityIndicator } from 'react-native';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated and will be removed in a future release',
  'SafeAreaView has been deprecated'
]);

import { AuthProvider, useAuth } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import HoardingDetailScreen from './src/screens/HoardingDetailScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import SellerDashboardScreen from './src/screens/SellerDashboardScreen';
import LoginScreen from './src/screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isClient = user?.role === 'customer';

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0);
  const tabHeight = 60 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: tabHeight,
          paddingBottom: Math.max(bottomInset, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Explore') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'BookingsTab') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'SellerTab') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Explore"
        component={HomeScreen}
        options={{ tabBarLabel: 'Discover' }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={MyBookingsScreen}
        options={{ tabBarLabel: 'My Bookings' }}
      />
      {!isClient && (
        <Tab.Screen
          name="SellerTab"
          component={SellerDashboardScreen}
          options={{ tabBarLabel: 'Seller Desk' }}
        />
      )}
      <Tab.Screen
        name="Account"
        component={LoginScreen}
        options={{ tabBarLabel: 'Account' }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="HoardingDetail" component={HoardingDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
