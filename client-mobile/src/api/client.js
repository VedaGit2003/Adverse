import axios from 'axios';
import storage from '../utils/storage';

// Host IP specified by user for physical Android/iOS devices & simulator
export const LAN_HOST = '192.168.29.205';
export const PORT = 3000;
export const API_BASE_URL = `http://${LAN_HOST}:${PORT}/api`;

const mobileApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto-inject stored token into all mobile API requests if not already set
mobileApi.interceptors.request.use(
  async (config) => {
    if (!config.headers.Authorization) {
      try {
        const token = await storage.getItem('adverse_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        // Fallback gracefully
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const setAuthToken = (token) => {
  if (token) {
    mobileApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete mobileApi.defaults.headers.common['Authorization'];
  }
};

export default mobileApi;
