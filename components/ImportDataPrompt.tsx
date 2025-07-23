import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthProvider';
import { importData } from '@/lib/services/supabaseService';
import { ValidationError } from '@/lib/validation';

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
    
    try {
      // Collect all local storage data
      const localData: any = {
        collections: [],
        snapshots: [],
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      // Try to parse localStorage data
      for (const key of LOCAL_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (key === 'collections' && Array.isArray(parsed)) {
              localData.collections = parsed;
            } else if (key === 'snapshots' && Array.isArray(parsed)) {
              localData.snapshots = parsed;
            }
          } catch (parseError) {
            console.warn(`Failed to parse ${key} from localStorage:`, parseError);
          }
        }
      }

      // Use the validated import service
      await importData(localData, user.id);
      
      setSuccess(true);
      
      // Optionally clear LocalStorage after successful import
      // LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
      
    } catch (e: any) {
      if (e instanceof ValidationError) {
        setError(`Validation Error: ${e.message}`);
      } else {
        setError(e.message || 'Import failed. Please check your data format.');
      }
      console.error('Import error:', e);
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
              Data imported successfully! Your data has been validated and stored securely.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportDataPrompt; 