"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';

interface SetPasswordFormProps {
  onPasswordSet: (password: string) => Promise<void>;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
}

const SetPasswordForm: React.FC<SetPasswordFormProps> = ({ onPasswordSet }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] });

  const checkPasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one uppercase letter');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one number');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one special character');
    }

    return { score, feedback };
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

  const getStrengthColor = (score: number) => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Please choose a stronger password');
      return;
    }

    setLoading(true);
    try {
      await onPasswordSet(password);
    } catch (err) {
      setError('Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder="Create a strong password"
          required
          disabled={loading}
        />
        
        {/* Password Strength Indicator */}
        {password && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-2 w-8 rounded ${
                      level <= passwordStrength.score ? getStrengthColor(passwordStrength.score) : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">
                {getStrengthText(passwordStrength.score)}
              </span>
            </div>
            
            {passwordStrength.feedback.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  {passwordStrength.feedback.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading || passwordStrength.score < 3 || password !== confirmPassword}
      >
        {loading ? 'Setting Password...' : 'Set Password'}
      </Button>
    </form>
  );
};

export default SetPasswordForm; 