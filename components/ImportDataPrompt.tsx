import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthProvider';

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
    setLoading(true);
    setError(null);
    try {
      for (const key of LOCAL_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw && user) {
          // Example: insert into a table named after the key, with user_id
          const data = JSON.parse(raw);
          if (Array.isArray(data)) {
            for (const item of data) {
              await supabase.from(key).insert({ ...item, user_id: user.id });
            }
          }
        }
      }
      setSuccess(true);
      // Optionally clear LocalStorage after import
      // LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
    } catch (e: any) {
      setError(e.message || 'Import failed');
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
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-2">Data imported successfully!</div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportDataPrompt; 