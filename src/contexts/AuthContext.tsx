import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthContextType, UserProfile, PermissionKey, UserRole } from '../types/auth';
import { AuthContext } from './authContextDef';
import { REMEMBER_ME_PREF_KEY, STORAGE_AUTH_KEY } from '../lib/authStorage';
import {
  getEmployeeProfileAndPermissions,
  checkUserRole,
  checkUserPermission,
} from '../services/auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Track mounted status to prevent memory leaks on unmounted state updates
  const isMountedRef = useRef(true);

  // Fetch employee profile and permissions with inactive account enforcement
  const fetchProfileAndPermissions = useCallback(async (userId: string) => {
    try {
      const { profile: employeeProfile, permissions: userPerms, error: queryErr } =
        await getEmployeeProfileAndPermissions(userId);

      if (!isMountedRef.current) return;

      if (queryErr) {
        console.warn('[AuthProvider] Profile query issue:', queryErr.message);
        setError(queryErr.message);
        setProfile(null);
        setPermissions([]);
        return;
      }

      // Enforcement: Inactive employee account check
      if (employeeProfile && !employeeProfile.is_active) {
        console.warn('[AuthProvider] Employee profile is deactivated.');
        setError('Your account has been deactivated by the Administrator.');
        setProfile(employeeProfile);
        setPermissions([]);
        return;
      }

      setProfile(employeeProfile);
      setPermissions(userPerms);
      setError(null);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
      console.error('[AuthProvider] Unexpected error loading profile:', err);
      setError(msg);
      setProfile(null);
      setPermissions([]);
    }
  }, []);

  // Initialize session on application startup and subscribe to auth state changes
  useEffect(() => {
    isMountedRef.current = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthProvider] getSession error:', sessionError.message);
          if (isMountedRef.current) setError(sessionError.message);
        }

        if (isMountedRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchProfileAndPermissions(initialSession.user.id);
          }
        }
      } catch (err: unknown) {
        console.error('[AuthProvider] Initialization failure:', err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes (sign-in, token refresh, user update, sign-out across all tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMountedRef.current) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentSession?.user) {
            await fetchProfileAndPermissions(currentSession.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setPermissions([]);
          setError(null);
        }

        setIsLoading(false);
      }
    );

    // Multi-tab storage event synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_AUTH_KEY && !e.newValue) {
        // Logged out in another tab
        if (isMountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setPermissions([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchProfileAndPermissions]);

  // Sign in with email, password, and Remember Me persistence flag
  const signInWithEmail = useCallback(
    async (email: string, password: string, rememberMe: boolean = true): Promise<{ error: Error | null }> => {
      if (!isSupabaseConfigured) {
        return {
          error: new Error(
            'Supabase credentials are not configured in .env.local. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
          ),
        };
      }

      setError(null);
      try {
        // Save Remember Me preference before authenticating
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(REMEMBER_ME_PREF_KEY, rememberMe ? 'true' : 'false');
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return { error: new Error(signInError.message) };
        }

        if (data.user) {
          // Record last login timestamp safely in the background
          Promise.resolve(supabase.rpc('record_employee_login', { p_user_id: data.user.id })).catch(() => {});
          await fetchProfileAndPermissions(data.user.id);
        }

        return { error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
        setError(message);
        return { error: new Error(message) };
      }
    },
    [fetchProfileAndPermissions]
  );

  // Manual Sign Out: Clears Supabase session and local storages across tabs
  const signOut = useCallback(async (): Promise<void> => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[AuthProvider] signOut error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_AUTH_KEY);
        window.sessionStorage.removeItem(STORAGE_AUTH_KEY);
      }
      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setPermissions([]);
        setError(null);
      }
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (user) {
      await fetchProfileAndPermissions(user.id);
    }
  }, [user, fetchProfileAndPermissions]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return checkUserRole(profile, role);
  }, [profile]);

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    return checkUserPermission(profile, permissions, permission);
  }, [profile, permissions]);

  const canManageRates = useCallback((): boolean => {
    return hasPermission('CAN_MANAGE_RATES');
  }, [hasPermission]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      profile,
      permissions,
      isLoading,
      isConfigured: isSupabaseConfigured,
      error,
      signInWithEmail,
      signOut,
      hasRole,
      hasPermission,
      canManageRates,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      permissions,
      isLoading,
      error,
      signInWithEmail,
      signOut,
      hasRole,
      hasPermission,
      canManageRates,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
