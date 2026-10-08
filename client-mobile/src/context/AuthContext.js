import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileApi, { setAuthToken } from '../api/client';

const AuthContext = createContext(null);
const TOKEN_KEY = 'adverse_token';
const USER_KEY = 'adverse_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from persistent storage on startup
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY)
        ]);

        if (storedToken && isMounted) {
          setToken(storedToken);
          setAuthToken(storedToken);

          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (err) {
              console.warn('Error parsing cached user payload:', err);
            }
          }

          // Background verification with backend
          try {
            const res = await mobileApi.get('/auth/me');
            if (res.data?.user && isMounted) {
              setUser(res.data.user);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
            }
          } catch (apiErr) {
            // Only invalidate session if the token is explicitly rejected (HTTP 401)
            // If offline, connection timed out, or LAN lag occurred, keep session intact!
            if (apiErr.response?.status === 401) {
              console.log('Mobile session expired (401). Clearing storage.');
              await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
              if (isMounted) {
                setToken(null);
                setUser(null);
                setAuthToken(null);
              }
            } else {
              console.log('Backend currently unreachable; maintaining cached mobile session.');
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore mobile session from storage:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const res = await mobileApi.post('/auth/login', { email, password });
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    setAuthToken(jwt);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, jwt],
      [USER_KEY, JSON.stringify(userData)]
    ]);
    return userData;
  };

  const register = async (formData) => {
    const res = await mobileApi.post('/auth/register', formData);
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    setAuthToken(jwt);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, jwt],
      [USER_KEY, JSON.stringify(userData)]
    ]);
    return userData;
  };

  const ssoLogin = async (ssoPayload) => {
    const res = await mobileApi.post('/auth/sso', ssoPayload);
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    setAuthToken(jwt);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, jwt],
      [USER_KEY, JSON.stringify(userData)]
    ]);
    return userData;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
  };

  const refreshUser = async () => {
    if (!token) return null;
    try {
      const res = await mobileApi.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch (err) {
      console.warn('Failed to refresh user', err);
    }
  };

  const updateProfile = async (profileData) => {
    const res = await mobileApi.put('/auth/profile', profileData);
    if (res.data?.user) {
      setUser(res.data.user);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';
  const isApprovedSeller = isSeller && user?.status === 'active';
  const isPendingSeller = isSeller && user?.status !== 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        ssoLogin,
        logout,
        refreshUser,
        updateProfile,
        isAuthenticated: !!user,
        isSeller,
        isAdmin,
        isCustomer,
        isApprovedSeller,
        isPendingSeller
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
