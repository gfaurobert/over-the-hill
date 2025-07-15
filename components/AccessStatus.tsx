import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface AccessStatusProps {
  status: 'pending' | 'denied';
}

const AccessStatus: React.FC<AccessStatusProps> = ({ status }) => {
  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'pending' ? 'Access Pending' : 'Access Denied'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'pending' ? (
            <div className="text-yellow-700 dark:text-yellow-400">
              Your access request is pending. You will be notified when an admin approves your account.
            </div>
          ) : (
            <div className="text-red-700 dark:text-red-400">
              Your access request has been denied. Please contact support if you believe this is a mistake.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessStatus; 