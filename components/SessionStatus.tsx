'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';

interface SessionStatusProps {
  showDetails?: boolean;
  className?: string;
}

// Mapping for Tailwind classes by status color
const statusColorClasses = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    text: 'text-red-700',
    text600: 'text-red-600',
    buttonBg: 'bg-red-100',
    buttonHover: 'hover:bg-red-200',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    text: 'text-orange-700',
    text600: 'text-orange-600',
    buttonBg: 'bg-orange-100',
    buttonHover: 'hover:bg-orange-200',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'bg-green-500',
    text: 'text-green-700',
    text600: 'text-green-600',
    buttonBg: 'bg-green-100',
    buttonHover: 'hover:bg-green-200',
  },
};

export function SessionStatus({ showDetails = false, className = '' }: SessionStatusProps) {
  const { 
    user, 
    session, 
    isSessionValid, 
    lastValidation, 
    validateSession, 
    refreshSession,
    loading 
  } = useAuth();
  
  const [isValidating, setIsValidating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateSession();
    } finally {
      setIsValidating(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-3 bg-gray-100 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return (
      <div className={`p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-red-700">Not authenticated</span>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!isSessionValid) return 'red';
    if (lastValidation?.code === 'SESSION_EXPIRED') return 'orange';
    return 'green';
  };

  const getStatusText = () => {
    if (!isSessionValid) return 'Invalid Session';
    if (lastValidation?.code === 'SESSION_EXPIRED') return 'Session Expired';
    return 'Valid Session';
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();
  const colorClasses = statusColorClasses[statusColor];

  return (
    <div className={`p-3 ${colorClasses.bg} ${colorClasses.border} rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${colorClasses.dot} rounded-full`}></div>
          <span className={`text-sm font-medium ${colorClasses.text}`}>
            {statusText}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className={`px-2 py-1 text-xs ${colorClasses.buttonBg} ${colorClasses.text} rounded ${colorClasses.buttonHover} disabled:opacity-50`}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </button>
          
          {session && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50`}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {showDetails && lastValidation && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono">{user.id ? `${user.id.substring(0, 8)}...` : 'N/A'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span>{user.email}</span>
            </div>
            
            {/* Robust expires_at validation */}
            {(() => {
              const expiresAt = lastValidation.session?.expires_at;
              const isValidExpiresAt =
                typeof expiresAt === 'number' &&
                Number.isFinite(expiresAt) &&
                expiresAt > 0;
              if (!isValidExpiresAt) return null;
              return (
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires:</span>
                  <span>
                    {new Date(expiresAt * 1000).toLocaleString()}
                  </span>
                </div>
              );
            })()}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Last Validation:</span>
              <span className={`${colorClasses.text600}`}>
                {lastValidation.code || 'SUCCESS'}
              </span>
            </div>

            {lastValidation.error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <span className="text-xs text-red-700">{lastValidation.error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified status indicator for headers/navbars
export function SessionIndicator({ className = '' }: { className?: string }) {
  const { isSessionValid, loading } = useAuth();

  if (loading) {
    return (
      <div className={`w-2 h-2 bg-gray-400 rounded-full animate-pulse ${className}`} 
           title="Loading session...">
      </div>
    );
  }

  return (
    <div 
      className={`w-2 h-2 rounded-full ${
        isSessionValid ? 'bg-green-500' : 'bg-red-500'
      } ${className}`}
      title={isSessionValid ? 'Session valid' : 'Session invalid'}
    >
    </div>
  );
}