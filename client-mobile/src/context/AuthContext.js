import React, { createContext, useContext, useState } from 'react';
import mobileApi, { setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = async (email, password) => {
    const res = await mobileApi.post('/auth/login', { email, password });
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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isSeller: user?.role === 'seller', isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
