import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logout as logoutService } from '../services/authService';
import { getSession, setSession, subscribeSession } from '../services/apiClient';
import { getProfile } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingOtp, setPendingOtp] = useState(null);
  // Personal data, File and the registration-only JWT never leave React memory.
  const [registrationDraft, setRegistrationDraft] = useState(null);
  const clearRegistration = useCallback(() => {
    setRegistrationDraft(null);
    setPendingOtp((pending) => pending?.flow === 'phone-registration' ? null : pending);
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSession((session) => {
      if (!session && active) setCurrentUser(null);
    });
    // StrictMode's discarded effect must not start a refresh rotation.
    Promise.resolve().then(async () => {
      if (!active) return;
      try {
        if (getSession()) {
          const profile = await getProfile();
          if (active && getSession()) setCurrentUser(profile);
        }
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  async function login(result, { useResponseUser = false } = {}) {
    if (!result?.accessToken || !result?.refreshToken) throw new Error('لم يُرجع الخادم جلسة صالحة.');
    setSession(result);
    try {
      const profile = useResponseUser && result.user?.id ? result.user : await getProfile();
      if (!getSession()) throw new Error('انتهت الجلسة.');
      setCurrentUser(profile);
      setPendingOtp(null);
      setRegistrationDraft(null);
      return profile;
    } catch (error) {
      setSession(null);
      throw error;
    }
  }

  async function logout() {
    clearRegistration();
    setPendingOtp(null);
    setCurrentUser(null);
    await logoutService();
  }

  async function refreshUser() {
    const profile = await getProfile();
    if (getSession()) setCurrentUser(profile);
    return profile;
  }

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, loading,
      login, logout, refreshUser, pendingOtp, setPendingOtp, registrationDraft, setRegistrationDraft, clearRegistration }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

