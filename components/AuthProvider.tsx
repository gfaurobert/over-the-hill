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
    
    // Refs for intervals and timeouts
    const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Validate session server-side
    const validateSession = useCallback(async (): Promise<ValidationResponse> => {
        console.log('[AUTH_PROVIDER] Validating session server-side');
        
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
    }, []);

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
    }, [validateSession]);

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
        
        if (newSession) {
            // Validate new session server-side
            await validateSession();
        } else {
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

        // Set up periodic validation for active sessions
        validationIntervalRef.current = setInterval(async () => {
            if (session && mounted) {
                console.log('[AUTH_PROVIDER] Periodic session validation');
                await validateSession();
            }
        }, 5 * 60 * 1000); // Validate every 5 minutes

        return () => {
            mounted = false;
            subscription.unsubscribe();
            
            if (validationIntervalRef.current) {
                clearInterval(validationIntervalRef.current);
            }
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [session, handleAuthStateChange, validateSession]);

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
