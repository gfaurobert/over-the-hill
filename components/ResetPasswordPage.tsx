"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import SetPasswordForm from './SetPasswordForm';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

const ResetPasswordPage: React.FC = () => {
  const { supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isInRecoveryMode, setIsInRecoveryMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    console.log(`[Password Reset Debug] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  // Function to extract token from URL
  const extractTokenFromUrl = () => {
    // Try multiple ways to get the token
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Check search params first
    let token = searchParams.get('token') || urlParams.get('token');
    let email = searchParams.get('email') || urlParams.get('email');
    let type = searchParams.get('type') || urlParams.get('type');
    
    // If not found in search params, check hash params
    if (!token) {
      token = hashParams.get('token');
      email = hashParams.get('email');
      type = hashParams.get('type');
    }
    
    // Also check for access_token in hash (common with Supabase)
    if (!token) {
      token = hashParams.get('access_token');
    }
    
    addDebugInfo(`Token extraction - searchParams: ${!!searchParams.get('token')}, urlParams: ${!!urlParams.get('token')}, hashParams: ${!!hashParams.get('token')}`);
    addDebugInfo(`Final token: ${!!token}, email: ${email}, type: ${type}`);
    
    return { token, email, type };
  };

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        addDebugInfo('Starting password reset flow...');
        addDebugInfo(`Current URL: ${window.location.href}`);
        
        // Extract token using our custom function
        const { token, email, type } = extractTokenFromUrl();
        
        let recoveryEventDetected = false;
        let timeoutId: NodeJS.Timeout;
        
        // Listen for auth state changes FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            addDebugInfo(`Auth state change: ${event}`);
            
            if (event === 'PASSWORD_RECOVERY') {
              addDebugInfo('✅ Password recovery event detected - setting recovery mode');
              recoveryEventDetected = true;
              setIsInRecoveryMode(true);
              setLoading(false);
              // Clear the timeout since we got the recovery event
              if (timeoutId) {
                clearTimeout(timeoutId);
                addDebugInfo('Timeout cleared - recovery mode confirmed');
              }
            } else if (event === 'SIGNED_IN') {
              addDebugInfo('User signed in during recovery');
              // Don't redirect yet - let them set the password first
            } else if (event === 'SIGNED_OUT') {
              addDebugInfo('User signed out');
              setIsInRecoveryMode(false);
            } else if (event === 'INITIAL_SESSION') {
              addDebugInfo('Initial session detected');
              // Check if we're already in recovery mode from a previous session
              if (session?.user) {
                addDebugInfo('User session found, checking if in recovery mode...');
                // If we have a token but no recovery event yet, try to trigger it
                if (token && !recoveryEventDetected) {
                  addDebugInfo('Token found but no recovery event, attempting to trigger recovery...');
                  // Try to verify the token to trigger recovery mode
                  try {
                    const { data, error } = await supabase.auth.verifyOtp({
                      email: email || session.user.email || '',
                      token: token,
                      type: 'recovery'
                    });
                    
                    if (!error && data) {
                      addDebugInfo('✅ Successfully verified token and triggered recovery mode');
                      recoveryEventDetected = true;
                      setIsInRecoveryMode(true);
                      setLoading(false);
                      if (timeoutId) {
                        clearTimeout(timeoutId);
                        addDebugInfo('Timeout cleared - recovery mode confirmed via verification');
                      }
                    } else {
                      addDebugInfo(`❌ Token verification failed: ${error?.message || 'Unknown error'}`);
                    }
                  } catch (verifyError) {
                    addDebugInfo(`❌ Token verification error: ${verifyError}`);
                  }
                }
              }
            }
          }
        );

        // If we have a token, try to process it
        if (token) {
          addDebugInfo('Token found, attempting to process...');
          
          // Method 1: Try to exchange the token for a session
          try {
            addDebugInfo('Method 1: Trying to exchange token for session...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(token);
            
            if (!error && data.session) {
              addDebugInfo('✅ Successfully exchanged token for session');
              // Don't set recovery mode here - let the auth state change handle it
            } else {
              addDebugInfo(`❌ Token exchange failed: ${error?.message || 'Unknown error'}`);
            }
          } catch (exchangeError) {
            addDebugInfo(`❌ Token exchange error: ${exchangeError}`);
          }

          // Method 2: Try to verify the recovery token with email
          if (email) {
            try {
              addDebugInfo('Method 2: Trying to verify recovery token with email...');
              const { data, error } = await supabase.auth.verifyOtp({
                email: email,
                token: token,
                type: 'recovery'
              });

              if (!error && data) {
                addDebugInfo('✅ Email-based verification successful');
                recoveryEventDetected = true;
                setIsInRecoveryMode(true);
                setLoading(false);
                return;
              } else {
                addDebugInfo(`❌ Email-based verification failed: ${error?.message || 'Unknown error'}`);
              }
            } catch (emailVerifyError) {
              addDebugInfo(`❌ Email-based verification error: ${emailVerifyError}`);
            }
          }
        } else {
          addDebugInfo('No token found in URL');
          setError('Invalid password reset link. Please request a new password reset.');
          setLoading(false);
        }

        // Set a timeout to handle cases where no recovery event is triggered
        // But only if we haven't already detected recovery mode
        timeoutId = setTimeout(() => {
          if (!recoveryEventDetected && loading) {
            addDebugInfo('Timeout reached - no recovery mode detected');
            setError('Unable to process password reset. Please request a new password reset link.');
            setLoading(false);
          } else if (recoveryEventDetected) {
            addDebugInfo('Timeout reached but recovery mode was already detected - ignoring timeout');
          }
        }, 5000);

        return () => {
          subscription.unsubscribe();
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };
      } catch (err) {
        addDebugInfo(`❌ Error in password reset flow: ${err}`);
        setError('Failed to process password reset. Please try again.');
        setLoading(false);
      }
    };

    handlePasswordReset();
  }, [searchParams, supabase]);

  const handlePasswordSet = async (password: string) => {
    if (!isInRecoveryMode) {
      setError('Not in password recovery mode. Please use a valid password reset link.');
      return;
    }

    try {
      addDebugInfo('Attempting to update password...');
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        addDebugInfo(`❌ Password update error: ${error.message}`);
        setError(error.message);
        return;
      }

      addDebugInfo('✅ Password updated successfully');
      setSuccess(true);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      addDebugInfo(`❌ Password update error: ${err}`);
      setError('Failed to update password. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing Password Reset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Verifying your reset link...</span>
            </div>
            {debugInfo.length > 0 && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <strong>Debug Info:</strong>
                {debugInfo.slice(-5).map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Reset Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your password has been updated successfully. You will be redirected to the homepage shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Reset Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            {debugInfo.length > 0 && (
              <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                <strong>Debug Info:</strong>
                {debugInfo.slice(-8).map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </div>
            )}
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
            >
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isInRecoveryMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This password reset link is invalid or has expired. Please request a new password reset.</p>
            {debugInfo.length > 0 && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <strong>Debug Info:</strong>
                {debugInfo.slice(-8).map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </div>
            )}
            <Button 
              onClick={() => router.push('/')}
              className="w-full mt-4"
            >
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Please create a new password for your account.
          </p>
          <SetPasswordForm onPasswordSet={handlePasswordSet} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
