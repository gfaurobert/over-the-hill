"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import SetPasswordForm from '../../components/SetPasswordForm';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

function InvitePageContent() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, message]);
  };

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    
    addDebugInfo(`Token: ${token}`);
    addDebugInfo(`Email: ${email}`);
    
    if (!token || !email) {
      setError('Invalid invitation link. Missing token or email.');
      setIsValidating(false);
      return;
    }

    setInvitationEmail(email);

    // Handle the invitation flow
    const handleInvitation = async () => {
      try {
        addDebugInfo('Starting invitation processing...');
        
        // First, check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          addDebugInfo('User already authenticated, redirecting');
          router.push('/');
          return;
        }

        addDebugInfo('No existing session found, processing invitation...');

        // For Supabase Auth invitations, we need to verify the token first
        // The token might be a confirmation token that needs to be verified
        try {
          addDebugInfo('Attempting to verify invitation token...');
          
          // Try to verify the token as a confirmation token
          const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup' // Try signup type for invitation confirmation
          });
          
          if (!error && data.session) {
            addDebugInfo('✅ Successfully verified invitation token');
            setSessionEstablished(true);
            setIsValidating(false);
            return;
          } else {
            addDebugInfo(`❌ Signup verification failed: ${error?.message || 'Unknown error'}`);
          }
        } catch (verifyError) {
          addDebugInfo(`❌ Token verification error: ${verifyError}`);
        }

        // If verification failed, try to exchange the token for a session
        try {
          addDebugInfo('Trying to exchange token for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(token);
          
          if (!error && data.session) {
            addDebugInfo('✅ Successfully exchanged token for session');
            setSessionEstablished(true);
            setIsValidating(false);
            return;
          } else {
            addDebugInfo(`❌ Token exchange failed: ${error?.message || 'Unknown error'}`);
          }
        } catch (exchangeError) {
          addDebugInfo(`❌ Token exchange error: ${exchangeError}`);
        }

        // If all methods fail, the token might be invalid or expired
        addDebugInfo('❌ All authentication methods failed');
        setError('Invalid or expired invitation link. Please request a new invitation.');
        setIsValidating(false);
        
      } catch (err) {
        addDebugInfo(`❌ Invitation processing error: ${err}`);
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

    try {
      addDebugInfo('Attempting to update password...');
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        addDebugInfo(`Password update error: ${error.message}`);
        setError(error.message);
        return;
      }

      addDebugInfo('✅ Password updated successfully');
      router.push('/');
    } catch (err) {
      addDebugInfo(`Password update error: ${err}`);
      setError('Failed to set password. Please try again.');
    }
  };

  if (loading || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Processing invitation...</p>
          {debugInfo.length > 0 && (
            <div className="mt-4 text-xs text-gray-500 max-w-md mx-auto text-left">
              <p className="font-semibold">Debug Info:</p>
              {debugInfo.map((info, index) => (
                <p key={index} className="mt-1">{info}</p>
              ))}
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
            {debugInfo.length > 0 && (
              <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
                <p className="font-semibold">Debug Info:</p>
                {debugInfo.map((info, index) => (
                  <p key={index} className="mt-1">{info}</p>
                ))}
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