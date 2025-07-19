"use client";

import React, { Suspense } from 'react';
import ResetPasswordPage from '../../components/ResetPasswordPage';

function ResetPasswordContent() {
  return <ResetPasswordPage />;
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
} 