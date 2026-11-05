import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthContextType, UserProfile, PermissionKey, UserRole } from '../types/auth';
import { AuthContext } from './authContextDef';
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

  // Fetch the user's employee profile and permissions from public tables via centralized auth service
  const fetchProfileAndPermissions = useCallback(async (userId: string) => {
    try {
      const { profile: employeeProfile, permissions: userPerms, error: queryErr } =
        await getEmployeeProfileAndPermissions(userId);

      if (!isMountedRef.current) return;

      if (queryErr) {
        // Table may not yet be migrated in remote database; log clearly without crash
        console.warn('[AuthProvider] Profile query issue:', queryErr.message);
        setError(queryErr.message);
        setProfile(null);
        setPermissions([]);
        return;
      }

      setProfile(employeeProfile);
      setPermissions(userPerms);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
      console.error('[AuthProvider] Unexpected error loading profile:', err);
      setError(msg);
      setProfile(null);
      setPermissions([]);
    }
  }, []);

  // Initialize session and listen for auth state changes
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

    // Listen for auth state changes (sign-in, token refresh, user update, sign-out)
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

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileAndPermissions]);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase credentials are not configured in .env.local. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
        ),
      };
    }

    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return { error: new Error(signInError.message) };
      }

      if (data.user) {
        await fetchProfileAndPermissions(data.user.id);
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      setError(message);
      return { error: new Error(message) };
    }
  }, [fetchProfileAndPermissions]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[AuthProvider] signOut error:', err);
    } finally {
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
