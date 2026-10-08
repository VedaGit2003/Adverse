import React, { createContext, useContext, useState, useEffect } from 'react';
import mobileApi, { setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const res = await mobileApi.post('/auth/login', { email, password });
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    setAuthToken(jwt);
    return userData;
  };

  const register = async (formData) => {
    const res = await mobileApi.post('/auth/register', formData);
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    setAuthToken(jwt);
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  const refreshUser = async () => {
    if (!token) return null;
    try {
      const res = await mobileApi.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
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
