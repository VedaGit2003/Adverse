import axios from 'axios';
import { Platform } from 'react-native';

export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api'
});

const mobileApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const setAuthToken = (token) => {
  if (token) {
    mobileApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete mobileApi.defaults.headers.common['Authorization'];
  }
};

export default mobileApi;
