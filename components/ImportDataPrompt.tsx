import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthProvider';
import { importData } from '@/lib/services/supabaseService';
import { ValidationError } from '@/lib/validation';
import { ImportSecurityService } from '@/lib/security/importSecurity';

interface ImportDataPromptProps {
  open: boolean;
  onClose: () => void;
}

// Example: adjust these keys to match your app's LocalStorage structure
const LOCAL_KEYS = ['collections', 'dots', 'snapshots'];

const ImportDataPrompt: React.FC<ImportDataPromptProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocalData = LOCAL_KEYS.some(key => typeof window !== 'undefined' && localStorage.getItem(key));

  const handleImport = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    
    let totalDataSize = 0;
    let importSuccess = false;
    
    try {
      // Check rate limiting first
      const rateLimitCheck = ImportSecurityService.checkRateLimit(user.id);
      if (!rateLimitCheck.allowed) {
        const resetTime = rateLimitCheck.resetTime ? new Date(rateLimitCheck.resetTime).toLocaleTimeString() : 'soon';
        throw new ValidationError(`Too many import attempts. Please try again after ${resetTime}.`);
      }

      // Collect all local storage data with security validation
      const localData: any = {
        collections: [],
        snapshots: [],
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      // Securely parse localStorage data
      for (const key of LOCAL_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) {
          totalDataSize += raw.length;
          
          try {
            // Use secure parsing with JSON bomb protection
            const parsed = ImportSecurityService.secureParseLocalStorageData(key, raw);
            
            // Validate data structure before processing
            if (ImportSecurityService.validateLocalStorageKey(key, parsed)) {
              if (key === 'collections' && Array.isArray(parsed)) {
                localData.collections = ImportSecurityService.sanitizeImportData(parsed);
              } else if (key === 'snapshots' && Array.isArray(parsed)) {
                localData.snapshots = ImportSecurityService.sanitizeImportData(parsed);
              }
            } else {
              console.warn(`[IMPORT_SECURITY] Invalid data structure for key: ${key}`);
              throw new ValidationError(`Invalid data format detected in ${key}`);
            }
          } catch (parseError) {
            console.warn(`[IMPORT_SECURITY] Failed to securely parse ${key}:`, parseError);
            throw parseError instanceof ValidationError ? parseError : 
              new ValidationError(`Failed to parse ${key}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }
        }
      }

      // Additional security check: ensure we have valid data to import
      if (localData.collections.length === 0 && localData.snapshots.length === 0) {
        throw new ValidationError('No valid data found to import');
      }

      console.log(`[IMPORT_SECURITY] Importing ${localData.collections.length} collections and ${localData.snapshots.length} snapshots`);

      // Use the validated import service
      await importData(localData, user.id);
      
      importSuccess = true;
      setSuccess(true);
      
      // Log successful import
      ImportSecurityService.logImportAttempt(user.id, true, totalDataSize);
      
      // Optionally clear LocalStorage after successful import
      // LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
      
    } catch (e: any) {
      importSuccess = false;
      
      // Log failed import attempt
      ImportSecurityService.logImportAttempt(user.id, false, totalDataSize, e.message);
      
      if (e instanceof ValidationError) {
        setError(`Security/Validation Error: ${e.message}`);
      } else {
        setError(e.message || 'Import failed. Please check your data format.');
      }
      console.error('[IMPORT_SECURITY] Import error:', e);
    }
    
    setLoading(false);
  };

  if (!open || !hasLocalData) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Import Your Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            We found data from a previous session. Would you like to import it into your new account?
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={loading || success}>
              {loading ? 'Importing...' : success ? 'Imported!' : 'Import Data'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
          {error && (
            <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded border">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-600 text-sm mt-2 p-2 bg-green-50 rounded border">
              ✅ Data imported successfully! Your data has been validated, sanitized, and stored securely with comprehensive security checks.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportDataPrompt; 