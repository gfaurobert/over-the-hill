import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sendDebugIngestEvent } from '../lib/debug-ingest';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { PasswordInput } from './ui/password-input';
import { Label } from './ui/label';

interface SignInFormProps {
  onSignIn?: () => void;
  onRequestAccess?: () => void;
  onResetPassword?: () => void;
}

const SignInForm: React.FC<SignInFormProps> = ({ onSignIn, onRequestAccess, onResetPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const hasLoggedMountRef = useRef(false);

  useEffect(() => {
    if (hasLoggedMountRef.current) return;
    hasLoggedMountRef.current = true;
    sendDebugIngestEvent({
      location: 'components/SignInForm.tsx:mount',
      message: 'SignInForm mounted',
      data: { pageOrigin: typeof window !== 'undefined' ? window.location.origin : null },
      hypothesisId: 'E',
    });
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // #region agent log
    if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7249/ingest/685368f0-06f2-47f7-9f0b-ce960e48801d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/SignInForm.tsx:handleSignIn',message:'handleSignIn invoked',data:{timestamp:Date.now()},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      (() => {
        let parsed: { origin?: string; host?: string; port?: string; protocol?: string } = {};
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        try {
          if (typeof supabaseUrl === 'string' && supabaseUrl.length > 0) {
            const url = new URL(supabaseUrl);
            parsed = { origin: url.origin, host: url.host, port: url.port, protocol: url.protocol };
          }
        } catch {
          // ignore parse errors
        }
        sendDebugIngestEvent({
          location: 'components/SignInForm.tsx:handleSignIn',
          message: 'handleSignIn start',
          data: {
            hasEmail: email.length > 0,
            hasPassword: password.length > 0,
            pageOrigin: typeof window !== 'undefined' ? window.location.origin : null,
            parsedSupabaseUrl: parsed,
            supabaseUrlSample: typeof supabaseUrl === 'string' ? supabaseUrl.slice(0, 80) : null,
          },
          hypothesisId: 'A',
        });
      })();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        sendDebugIngestEvent({
          location: 'components/SignInForm.tsx:handleSignIn',
          message: 'signInWithPassword returned error',
          data: {
            errorName: error.name ?? null,
            errorMessage: error.message ?? null,
            errorStatus: (error as any).status ?? null,
          },
          hypothesisId: 'C',
        });
        if ((error as { status?: number }).status === 429) {
          setError(
            'Too many sign-in attempts. Please wait a few minutes and try again.\n\n' +
            'If using local Supabase, restart it to apply higher rate limits (see supabase/config.toml [auth.rate_limit]).'
          );
        } else {
          setError(error.message);
        }
      } else {
        if (onSignIn) onSignIn();
      }
    } catch (err) {
      console.error('Sign in error:', err);
      sendDebugIngestEvent({
        location: 'components/SignInForm.tsx:handleSignIn',
        message: 'signInWithPassword threw',
        data: {
          errType: err instanceof Error ? err.name : typeof err,
          errMessage: err instanceof Error ? err.message : String(err),
        },
        hypothesisId: 'B',
      });
      // Handle network errors specifically
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
        setError(
          `Cannot connect to Supabase server.\n\n` +
          `Possible solutions:\n` +
          `• If using local Supabase: Run "npx supabase start" or "supabase start"\n` +
          `• Check your .env.local file has NEXT_PUBLIC_SUPABASE_URL set correctly\n` +
          `• Verify your network connection\n` +
          `• Check browser console for more details`
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setError(error.message);
      } else {
        setMagicLinkSent(true);
      }
    } catch (err) {
      console.error('Magic link error:', err);
      // Handle network errors specifically
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
        setError(
          `Cannot connect to Supabase server.\n\n` +
          `Possible solutions:\n` +
          `• If using local Supabase: Run "npx supabase start" or "supabase start"\n` +
          `• Check your .env.local file has NEXT_PUBLIC_SUPABASE_URL set correctly\n` +
          `• Verify your network connection\n` +
          `• Check browser console for more details`
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Enter your email and password, or use a magic link to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="ml-auto inline-block text-sm underline"
                  onClick={onResetPassword}
                >
                  Forgot your password?
                </button>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleMagicLink}
              disabled={loading || !email}
            >
              {magicLinkSent ? 'Magic Link Sent!' : 'Send Magic Link'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-blue-600 underline"
              onClick={onRequestAccess}
              disabled={loading}
            >
              Request Access
            </Button>
            {error && (
              <div className="text-red-600 text-sm mt-2 whitespace-pre-line">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInForm; 