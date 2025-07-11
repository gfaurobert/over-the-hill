import React, { useState } from 'react';
import { Button } from './ui/button';
import { useAuth } from './AuthProvider';

interface SignOutButtonProps {
  className?: string;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({ className }) => {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <button onClick={handleSignOut} disabled={loading} className={className}>
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
};

export default SignOutButton; 