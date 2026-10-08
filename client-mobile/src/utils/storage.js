import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory memory fallback if native bridge is momentarily unready
const memoryCache = new Map();

/**
 * Robust cross-platform storage adapter for Expo Go (Android & iOS)
 * Prioritizes native expo-secure-store, with graceful fallbacks.
 */
export const storage = {
  async setItem(key, value) {
    if (typeof value !== 'string') {
      value = JSON.stringify(value);
    }
    memoryCache.set(key, value);

    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch (secureErr) {
      // SecureStore not available or quota exceeded, try AsyncStorage
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (asyncErr) {
      // Silently retained in memoryCache
    }
  },

  async getItem(key) {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null && val !== undefined) {
        memoryCache.set(key, val);
        return val;
      }
    } catch (secureErr) {
      // Fallback to AsyncStorage
    }

    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null && val !== undefined) {
        memoryCache.set(key, val);
        return val;
      }
    } catch (asyncErr) {
      // Fallback to memoryCache
    }

    return memoryCache.get(key) || null;
  },

  async removeItem(key) {
    memoryCache.delete(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {}

    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {}
  },

  async clear() {
    memoryCache.clear();
    try {
      await SecureStore.deleteItemAsync('adverse_token');
      await SecureStore.deleteItemAsync('adverse_user');
    } catch (e) {}
    try {
      await AsyncStorage.multiRemove(['adverse_token', 'adverse_user']);
    } catch (e) {}
  }
};

export default storage;
