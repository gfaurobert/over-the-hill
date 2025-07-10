"use client";

import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import SignInForm from '../components/SignInForm';
import RequestAccessForm from '../components/RequestAccessForm';
import ImportDataPrompt from '../components/ImportDataPrompt';
import SignOutButton from '../components/SignOutButton';
import HillChartApp from '../components/HillChartApp';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function HomePage() {
  const { user, loading, supabase } = useAuth();
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [showImportPrompt, setShowImportPrompt] = useState(true);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetPasswordRequest = async () => {
    if (!resetEmail) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetError(null);
    setResetSuccess(false);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
    }
  };


  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
            {resetSuccess ? (
              <div>
                <p>If an account exists for {resetEmail}, a password reset link has been sent.</p>
                <Button onClick={() => setShowResetPasswordModal(false)} className="mt-4 w-full">
                  Close
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter your email address to receive a password reset link.
                </p>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mb-2"
                />
                {resetError && <p className="text-red-500 text-sm mb-2">{resetError}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowResetPasswordModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleResetPasswordRequest}>Send Reset Link</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!user ? (
        <div className="flex items-center justify-center min-h-screen">
          {showRequestAccess ? (
            <RequestAccessForm />
          ) : (
            <SignInForm onRequestAccess={() => setShowRequestAccess(true)} onResetPassword={() => setShowResetPasswordModal(true)} />
          )}
        </div>
      ) : (
        <>
          <ImportDataPrompt open={showImportPrompt} onClose={() => setShowImportPrompt(false)} />
          <HillChartApp onResetPassword={() => setShowResetPasswordModal(true)} />
        </>
      )}
    </>
  );
}
