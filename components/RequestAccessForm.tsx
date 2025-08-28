import React, { useState } from 'react';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

const RequestAccessForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/access-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit access request');
      } else {
        setSuccess(true);
        setEmail('');
        setMessage('');
      }
    } catch (err) {
      console.error('Access request submission error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Request Access</CardTitle>
          <CardDescription>
            Enter your email to request access. An admin will review your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
              <Label htmlFor="message">Message (optional)</Label>
              <Input
                id="message"
                type="text"
                placeholder="Tell us why you need access..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Request Access'}
            </Button>
            {success && <div className="text-green-600 text-sm mt-2">Request received! You’ll be contacted if approved.</div>}
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestAccessForm; 