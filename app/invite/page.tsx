"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import SetPasswordForm from '../../components/SetPasswordForm';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  extractAndValidateToken, 
  processTokenSecurely, 
  logTokenOperation,
  TokenValidationResult 
} from '../../lib/tokenSecurity';

function InvitePageContent() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<TokenValidationResult | null>(null);

  useEffect(() => {
    const handleInvitation = async () => {
      try {
        logTokenOperation('invitation_start', true, { url: window.location.href });
        
        // Step 1: Extract and validate token securely
        const tokenResult = extractAndValidateToken(searchParams);
        setTokenValidation(tokenResult);
        
        if (!tokenResult.isValid) {
          setError(`Invalid invitation link: ${tokenResult.errors.join(', ')}`);
          setIsValidating(false);
          return;
        }
        
        // Validate that we have an email for invitations
        if (!tokenResult.email) {
          setError('Invalid invitation link: Email is required for invitations.');
          setIsValidating(false);
          return;
        }
        
        setInvitationEmail(tokenResult.email);
        
        logTokenOperation('invitation_token_validation', true, { 
          source: tokenResult.source,
          hasEmail: !!tokenResult.email,
          type: tokenResult.type 
        });
        
        // Step 2: Check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          logTokenOperation('user_already_authenticated', true);
          router.push('/');
          return;
        }

        // Step 3: Process the invitation token securely
        const invitationResult = await processTokenSecurely(
          'invitation_processing',
          tokenResult,
          async (token, email, type) => {
            // Try multiple invitation verification methods
            const methods = [
              {
                name: 'verifyOtp_signup',
                handler: async () => {
                  if (!email) {
                    throw new Error('Email required for signup verification');
                  }
                  return await supabase.auth.verifyOtp({
                    email,
                    token,
                    type: 'signup'
                  });
                }
              },
              {
                name: 'verifyOtp_invite',
                handler: async () => {
                  if (!email) {
                    throw new Error('Email required for invite verification');
                  }
                  return await supabase.auth.verifyOtp({
                    email,
                    token,
                    type: 'invite'
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
                
                if (!result.error && result.data?.session) {
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
            
            throw new Error('All invitation verification methods failed');
          }
        );
        
        if (!invitationResult.success) {
          setError(invitationResult.error || 'Failed to process invitation. The link may be invalid or expired.');
          setIsValidating(false);
          return;
        }
        
        logTokenOperation('invitation_session_established', true);
        setSessionEstablished(true);
        setIsValidating(false);
        
      } catch (err) {
        logTokenOperation('invitation_processing_error', false, { 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
        setError('Failed to process invitation. Please try again.');
        setIsValidating(false);
      }
    };

    handleInvitation();
  }, [searchParams, supabase, router]);

  const handlePasswordSet = async (password: string) => {
    if (!sessionEstablished) {
      setError('Session not established. Please refresh the page and try again.');
      return;
    }

    if (!tokenValidation?.isValid) {
      setError('Invalid session. Please request a new invitation.');
      return;
    }

    try {
      logTokenOperation('invitation_password_set_start', true);
      
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        logTokenOperation('invitation_password_set_failed', false, { error: error.message });
        setError(error.message);
        return;
      }

      logTokenOperation('invitation_password_set_success', true);
      router.push('/');
      
    } catch (err) {
      logTokenOperation('invitation_password_set_error', false, { 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
      setError('Failed to set password. Please try again.');
    }
  };

  if (loading || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Processing invitation...</p>
          {tokenValidation && (
            <div className="mt-4 text-xs text-gray-500 max-w-md mx-auto text-left">
              <p className="font-semibold">Validation Status:</p>
              <p className="mt-1">Token Source: {tokenValidation.source}</p>
              <p className="mt-1">Has Email: {tokenValidation.email ? 'Yes' : 'No'}</p>
              <p className="mt-1">Token Type: {tokenValidation.type || 'Not specified'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            {tokenValidation && (
              <div className="mb-4 p-3 bg-red-50 rounded text-xs border border-red-200">
                <p className="font-semibold">Token Validation Details:</p>
                <p className="mt-1">Valid: {tokenValidation.isValid ? 'Yes' : 'No'}</p>
                <p className="mt-1">Source: {tokenValidation.source || 'None'}</p>
                <p className="mt-1">Errors: {tokenValidation.errors.join(', ')}</p>
              </div>
            )}
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Go to Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Welcome! Please create a strong password for your account.
            {invitationEmail && (
              <span className="block mt-1">Email: {invitationEmail}</span>
            )}
          </p>
          <SetPasswordForm onPasswordSet={handlePasswordSet} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
} 