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
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        console.log('[PASSWORD_RESET] Starting password reset flow');
        console.log('[PASSWORD_RESET] Current URL:', window.location.href);
        console.log('[PASSWORD_RESET] Hash:', window.location.hash);
        console.log('[PASSWORD_RESET] Search:', window.location.search);
        
        // Set debug info for user to see what's happening
        setDebugInfo({
          url: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          searchParams: Object.fromEntries(searchParams.entries())
        });
        
        let recoveryEventDetected = false;
        let signedInEventDetected = false;
        let timeoutId: NodeJS.Timeout | undefined = undefined;
        
        // Set up auth state listener BEFORE any other operations
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            console.log('[PASSWORD_RESET] Auth state change:', event, session?.user?.id);
            
            if (event === 'SIGNED_IN') {
              signedInEventDetected = true;
              console.log('[PASSWORD_RESET] User signed in during recovery');
            } else if (event === 'PASSWORD_RECOVERY') {
              recoveryEventDetected = true;
              setIsInRecoveryMode(true);
              setLoading(false);
              
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              
              console.log('[PASSWORD_RESET] Password recovery mode activated');
            } else if (event === 'SIGNED_OUT') {
              setIsInRecoveryMode(false);
              console.log('[PASSWORD_RESET] User signed out');
            }
          }
        );
        
        // Check current session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[PASSWORD_RESET] Session error:', sessionError);
        } else {
          console.log('[PASSWORD_RESET] Current session:', session?.user?.id || 'None');
        }
        
        // Set a timeout to handle cases where recovery event doesn't fire
        timeoutId = setTimeout(() => {
          console.log('[PASSWORD_RESET] Timeout reached - recovery event detected:', recoveryEventDetected, 'signed in detected:', signedInEventDetected);
          
          if (!recoveryEventDetected && loading) {
            if (signedInEventDetected) {
              // User was signed in but no recovery event - this might be the case
              // where Supabase has already processed the recovery but we missed the event
              console.log('[PASSWORD_RESET] Assuming recovery mode based on signed in state');
              setIsInRecoveryMode(true);
              setLoading(false);
            } else {
              setError('Password reset verification timed out. Please request a new reset link.');
              setLoading(false);
            }
          }
        }, 8000); // Increased timeout to 8 seconds

        // Cleanup function
        return () => {
          subscription.unsubscribe();
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };
        
      } catch (err) {
        console.error('[PASSWORD_RESET] Error:', err);
        setError('Failed to process password reset. Please try again.');
        setLoading(false);
      }
    };

    handlePasswordReset();
  }, [searchParams, supabase, loading]);

  const handlePasswordSet = async (password: string) => {
    if (!isInRecoveryMode) {
      setError('Not in password recovery mode. Please use a valid password reset link.');
      return;
    }

    try {
      console.log('[PASSWORD_RESET] Updating password');
      
      // Use the simplified approach - just call updateUser since we're in recovery mode
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error('[PASSWORD_RESET] Password update failed:', error);
        setError(error.message);
        return;
      }

      console.log('[PASSWORD_RESET] Password updated successfully');
      setSuccess(true);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (err) {
      console.error('[PASSWORD_RESET] Password update error:', err);
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
            {debugInfo && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <strong>Debug Info:</strong>
                <div>Current URL: {String(debugInfo.url)}</div>
                <div>Hash: {String(debugInfo.hash) || 'None'}</div>
                <div>Search: {String(debugInfo.search) || 'None'}</div>
                <div>Search Params: {JSON.stringify(debugInfo.searchParams)}</div>
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
            {debugInfo && (
              <div className="mb-4 p-2 bg-red-50 rounded text-xs border border-red-200">
                <strong>Debug Info:</strong>
                <div>Current URL: {String(debugInfo.url)}</div>
                <div>Hash: {String(debugInfo.hash) || 'None'}</div>
                <div>Search: {String(debugInfo.search) || 'None'}</div>
                <div>Search Params: {JSON.stringify(debugInfo.searchParams)}</div>
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
