import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('erp_token'));
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(() => {
    const stored = localStorage.getItem('erp_permissions');
    return stored ? JSON.parse(stored) : null;
  });

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_permissions');
    setToken(null);
    setUser(null);
    setPermissions(null);
  }, []);

  const fetchPermissions = useCallback(async (authToken) => {
    try {
      const res = await axios.get(`${API_URL}/auth/permissions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setPermissions(res.data.permissions);
      localStorage.setItem('erp_permissions', JSON.stringify(res.data.permissions));
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('erp_token');
      const storedUser = localStorage.getItem('erp_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token is still valid
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(response.data);
          await fetchPermissions(storedToken);
        } catch (error) {
          console.error('Auth verification failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [logout, fetchPermissions]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('erp_token', access_token);
      localStorage.setItem('erp_user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      await fetchPermissions(access_token);

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      return { success: false, error: message };
    }
  };

  const hasPermission = useCallback((module, action) => {
    if (user?.role === 'admin') return true;
    if (!permissions) return false;
    return permissions[module]?.[action] === true;
  }, [user, permissions]);

  const canViewModule = useCallback((module) => {
    if (user?.role === 'admin') return true;
    if (!permissions) return false;
    return permissions[module]?.view === true;
  }, [user, permissions]);

  const api = axios.create({
    baseURL: API_URL
  });

  // Add token to every request dynamically
  api.interceptors.request.use(
    (config) => {
      const currentToken = localStorage.getItem('erp_token');
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        logout();
      }
      return Promise.reject(error);
    }
  );

  const value = {
    user,
    setUser,
    token,
    loading,
    login,
    logout,
    api,
    isAuthenticated: !!token && !!user,
    permissions,
    hasPermission,
    canViewModule,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
