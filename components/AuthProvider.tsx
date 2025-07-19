"use client";

import React, { useState, useEffect, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient'; // Import the singleton instance

// Create a context for authentication
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  supabase: typeof supabase; // Use the type of the imported instance
  isInRecoveryMode: boolean;
}
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInRecoveryMode, setIsInRecoveryMode] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
            
            // Track recovery mode
            if (event === 'PASSWORD_RECOVERY') {
                setIsInRecoveryMode(true);
            } else if (event === 'SIGNED_OUT') {
                setIsInRecoveryMode(false);
            }
        });

        // Initial check
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        checkUser();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Sign out the user
    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut, supabase, isInRecoveryMode }}>
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
