import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify token on app load
  const verifyStoredToken = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('admin_user');

    if (!token || !userData) {
      setLoading(false);
      return;
    }

    try {
      // Set token in headers first
      authService.setToken(token);

      // Verify the token is still valid with the server
      const response = await authService.verifyToken();

      if (response.data.success) {
        // Use fresh data from server
        setUser(response.data.user);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
      } else {
        // Token invalid — clear everything
        clearAuth();
      }
    } catch (error) {
      console.warn('Token verification failed — clearing stale session');
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyStoredToken();
  }, [verifyStoredToken]);

  function clearAuth() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    authService.setToken(null);
    setUser(null);
  }

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { token, user } = response.data;

      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      authService.setToken(token);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Server-side logout is optional for stateless JWT
    } finally {
      clearAuth();
    }
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}