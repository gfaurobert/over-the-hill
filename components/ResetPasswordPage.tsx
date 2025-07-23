"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import SetPasswordForm from './SetPasswordForm';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { 
  extractAndValidateToken, 
  processTokenSecurely, 
  logTokenOperation,
  TokenValidationResult 
} from '@/lib/tokenSecurity';

const ResetPasswordPage: React.FC = () => {
  const { supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isInRecoveryMode, setIsInRecoveryMode] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<TokenValidationResult | null>(null);

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        logTokenOperation('password_reset_start', true, { url: window.location.href });
        
        // Step 1: Extract and validate token securely
        const tokenResult = extractAndValidateToken(searchParams);
        setTokenValidation(tokenResult);
        
        if (!tokenResult.isValid) {
          setError(`Invalid password reset link: ${tokenResult.errors.join(', ')}`);
          setLoading(false);
          return;
        }
        
        logTokenOperation('token_validation', true, { 
          source: tokenResult.source,
          hasEmail: !!tokenResult.email,
          type: tokenResult.type 
        });
        
        let recoveryEventDetected = false;
        let timeoutId: NodeJS.Timeout;
        
        // Step 2: Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            logTokenOperation('auth_state_change', true, { event });
            
            if (event === 'PASSWORD_RECOVERY') {
              recoveryEventDetected = true;
              setIsInRecoveryMode(true);
              setLoading(false);
              
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              
              logTokenOperation('password_recovery_mode_activated', true);
            } else if (event === 'SIGNED_IN') {
              logTokenOperation('user_signed_in_during_recovery', true);
            } else if (event === 'SIGNED_OUT') {
              setIsInRecoveryMode(false);
              logTokenOperation('user_signed_out', true);
            }
          }
        );

        // Step 3: Process the token securely
        const verificationResult = await processTokenSecurely(
          'password_reset_verification',
          tokenResult,
          async (token, email, type) => {
            // Try multiple verification methods in order of preference
            const methods = [
              {
                name: 'verifyOtp',
                handler: async () => {
                  if (!email) {
                    throw new Error('Email required for OTP verification');
                  }
                  return await supabase.auth.verifyOtp({
                    email,
                    token,
                    type: 'recovery'
                  });
                }
              },
              {
                name: 'exchangeCodeForSession',
                handler: async () => {
                  return await supabase.auth.exchangeCodeForSession(token);
                }
              }
            ];
            
            for (const method of methods) {
              try {
                logTokenOperation(`attempting_${method.name}`, true);
                const result = await method.handler();
                
                if (!result.error && result.data) {
                  logTokenOperation(`${method.name}_success`, true);
                  return result;
                }
                
                logTokenOperation(`${method.name}_failed`, false, { 
                  error: result.error?.message 
                });
              } catch (methodError) {
                logTokenOperation(`${method.name}_error`, false, { 
                  error: methodError instanceof Error ? methodError.message : 'Unknown error' 
                });
              }
            }
            
            throw new Error('All verification methods failed');
          }
        );
        
        if (!verificationResult.success) {
          setError(verificationResult.error || 'Failed to verify password reset token');
          setLoading(false);
          return;
        }
        
        // Step 4: Set timeout for recovery mode detection
        timeoutId = setTimeout(() => {
          if (!recoveryEventDetected && loading) {
            logTokenOperation('recovery_timeout', false, { 
              timeoutMs: 5000,
              recoveryDetected: recoveryEventDetected 
            });
            setError('Password reset verification timed out. Please request a new reset link.');
            setLoading(false);
          }
        }, 5000);

        return () => {
          subscription.unsubscribe();
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };
        
      } catch (err) {
        logTokenOperation('password_reset_error', false, { 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
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

    if (!tokenValidation?.isValid) {
      setError('Invalid session. Please request a new password reset.');
      return;
    }

    try {
      logTokenOperation('password_update_start', true);
      
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        logTokenOperation('password_update_failed', false, { error: error.message });
        setError(error.message);
        return;
      }

      logTokenOperation('password_update_success', true);
      setSuccess(true);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (err) {
      logTokenOperation('password_update_error', false, { 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
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
            {tokenValidation && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <strong>Validation Status:</strong>
                <div>Token Source: {tokenValidation.source}</div>
                <div>Has Email: {tokenValidation.email ? 'Yes' : 'No'}</div>
                <div>Token Type: {tokenValidation.type || 'Not specified'}</div>
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
            {tokenValidation && (
              <div className="mb-4 p-2 bg-red-50 rounded text-xs border border-red-200">
                <strong>Token Validation Details:</strong>
                <div>Valid: {tokenValidation.isValid ? 'Yes' : 'No'}</div>
                <div>Source: {tokenValidation.source || 'None'}</div>
                <div>Errors: {tokenValidation.errors.join(', ')}</div>
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
