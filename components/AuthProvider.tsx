"use client";

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient'; // Import the singleton instance
import { sessionValidationService, ValidationResponse } from '@/lib/services/sessionValidationService';

// Create a context for authentication
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  supabase: typeof supabase; // Use the type of the imported instance
  isInRecoveryMode: boolean;
  isSessionValid: boolean;
  lastValidation: ValidationResponse | null;
  validateSession: () => Promise<ValidationResponse>;
  refreshSession: () => Promise<boolean>;
}
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInRecoveryMode, setIsInRecoveryMode] = useState(false);
    const [isSessionValid, setIsSessionValid] = useState(false);
    const [lastValidation, setLastValidation] = useState<ValidationResponse | null>(null);
    const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
    
    // Refs for intervals and timeouts
    const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isValidatingRef = useRef(false);

    // Clear stuck loading state after timeout
    useEffect(() => {
        if (loading) {
            const timeout = setTimeout(() => {
                console.warn('[AUTH_PROVIDER] Loading timeout reached, clearing authentication state');
                // Clear all authentication-related localStorage
                try {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('sb-') || key.includes('supabase'))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    
                    // Clear validation cache
                    sessionValidationService.clearValidationCache();
                    
                    // Force loading to false
                    setLoading(false);
                    setUser(null);
                    setSession(null);
                    setIsSessionValid(false);
                    setLastValidation(null);
                } catch (error) {
                    console.error('[AUTH_PROVIDER] Error clearing stuck state:', error);
                    setLoading(false);
                }
            }, 10000); // 10 second timeout
            
            setLoadingTimeout(timeout);
            
            return () => {
                clearTimeout(timeout);
                setLoadingTimeout(null);
            };
        } else {
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                setLoadingTimeout(null);
            }
        }
    }, [loading]);

    // Validate session server-side
    const validateSession = useCallback(async (): Promise<ValidationResponse> => {
        // Prevent concurrent validations
        if (isValidatingRef.current) {
            console.log('[AUTH_PROVIDER] Validation already in progress, skipping');
            // Return the current lastValidation state without depending on it in the callback
            return { valid: false, error: 'Validation in progress' };
        }

        isValidatingRef.current = true;
        console.log('[AUTH_PROVIDER] Validating session server-side');
        
        try {
            const validation = await sessionValidationService.validateWithRefresh();
            setLastValidation(validation);
            
            if (validation.valid) {
                setIsSessionValid(true);
                
                // Schedule refresh if session expires soon
                if (validation.session?.expires_at) {
                    const expiryInfo = sessionValidationService.getSessionExpiryInfo(validation.session.expires_at);
                    
                    if (expiryInfo.isExpiringSoon && !refreshTimeoutRef.current) {
                        const refreshDelay = Math.max(0, (expiryInfo.timeUntilExpiry || 0) - 60) * 1000; // Refresh 1 minute before expiry
                        
                        console.log(`[AUTH_PROVIDER] Scheduling session refresh in ${refreshDelay / 1000} seconds`);
                        
                        refreshTimeoutRef.current = setTimeout(async () => {
                            console.log('[AUTH_PROVIDER] Auto-refreshing session');
                            await refreshSession();
                            refreshTimeoutRef.current = null;
                        }, refreshDelay);
                    }
                }
            } else {
                setIsSessionValid(false);
                console.warn(`[AUTH_PROVIDER] Session validation failed: ${validation.error}`);
                
                // Clear any scheduled refresh
                if (refreshTimeoutRef.current) {
                    clearTimeout(refreshTimeoutRef.current);
                    refreshTimeoutRef.current = null;
                }
            }
            
            return validation;
        } finally {
            isValidatingRef.current = false;
        }
    }, []); // Remove lastValidation dependency to prevent callback recreation

    // Refresh session
    const refreshSession = useCallback(async (): Promise<boolean> => {
        console.log('[AUTH_PROVIDER] Refreshing session');
        
        const refreshResult = await sessionValidationService.refreshSession();
        
        if (refreshResult.success) {
            console.log('[AUTH_PROVIDER] Session refreshed successfully');
            
            // Re-validate after refresh
            await validateSession();
            return true;
        } else {
            console.warn(`[AUTH_PROVIDER] Session refresh failed: ${refreshResult.error}`);
            setIsSessionValid(false);
            return false;
        }
    }, [validateSession]); // Keep validateSession dependency since it's now stable

    // Handle client-side auth state changes
    const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
        console.log(`[AUTH_PROVIDER] Auth state changed: ${event}`);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Track recovery mode
        if (event === 'PASSWORD_RECOVERY') {
            setIsInRecoveryMode(true);
        } else if (event === 'SIGNED_OUT') {
            setIsInRecoveryMode(false);
        }
        
        if (newSession && event !== 'INITIAL_SESSION') {
            // Only validate for non-initial session events to prevent loops
            console.log(`[AUTH_PROVIDER] Triggering validation for event: ${event}`);
            await validateSession();
        } else if (newSession && event === 'INITIAL_SESSION') {
            console.log(`[AUTH_PROVIDER] Skipping validation for INITIAL_SESSION event`);
        } else if (!newSession) {
            // Clear validation state when signed out
            setIsSessionValid(false);
            setLastValidation(null);
            sessionValidationService.clearValidationCache();
            
            // Clear any scheduled operations
            if (validationIntervalRef.current) {
                clearInterval(validationIntervalRef.current);
                validationIntervalRef.current = null;
            }
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
        }
    }, [validateSession]);

    useEffect(() => {
        let mounted = true;

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Initial check
        const initializeAuth = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                
                if (!mounted) return;
                
                setSession(initialSession);
                setUser(initialSession?.user ?? null);
                
                if (initialSession) {
                    // Validate initial session server-side
                    await validateSession();
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error('[AUTH_PROVIDER] Failed to initialize auth:', error);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [handleAuthStateChange, validateSession]);

    // Set up periodic validation for active sessions (separate effect)
    useEffect(() => {
        if (session && !validationIntervalRef.current) {
            console.log('[AUTH_PROVIDER] Setting up periodic session validation');
            validationIntervalRef.current = setInterval(async () => {
                if (session) {
                    console.log('[AUTH_PROVIDER] Periodic session validation');
                    await validateSession();
                }
            }, 5 * 60 * 1000); // Validate every 5 minutes
        } else if (!session && validationIntervalRef.current) {
            console.log('[AUTH_PROVIDER] Clearing periodic session validation');
            clearInterval(validationIntervalRef.current);
            validationIntervalRef.current = null;
        }

        return () => {
            if (validationIntervalRef.current) {
                clearInterval(validationIntervalRef.current);
                validationIntervalRef.current = null;
            }
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
        };
    }, [session]); // validateSession is now stable, so we don't need it in dependencies

    // Sign out the user
    const signOut = async () => {
        console.log('[AUTH_PROVIDER] Signing out');
        
        // Clear validation state immediately
        setIsSessionValid(false);
        setLastValidation(null);
        sessionValidationService.clearValidationCache();
        
        // Clear any scheduled operations
        if (validationIntervalRef.current) {
            clearInterval(validationIntervalRef.current);
            validationIntervalRef.current = null;
        }
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
        
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            session,
            loading, 
            signOut, 
            supabase, 
            isInRecoveryMode,
            isSessionValid,
            lastValidation,
            validateSession,
            refreshSession
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
