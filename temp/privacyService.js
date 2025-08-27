"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyService = exports.PrivacyService = void 0;
const supabaseClient_1 = require("@/lib/supabaseClient");
const crypto_1 = require("crypto");
// Privacy service for handling encrypted data
class PrivacyService {
    constructor() {
        this.userKeys = new Map();
    }
    static getInstance() {
        if (!PrivacyService.instance) {
            PrivacyService.instance = new PrivacyService();
        }
        return PrivacyService.instance;
    }
    // Environment-aware base64 encoding helper
    base64Encode(data) {
        if (typeof Buffer !== 'undefined') {
            // Node.js environment - use Buffer
            return Buffer.from(data).toString('base64');
        }
        else {
            // Browser environment - use btoa with proper UTF-8 handling
            const binaryString = Array.from(data, byte => String.fromCharCode(byte)).join('');
            return globalThis.btoa(binaryString);
        }
    }
    // Environment-aware base64 decoding helper
    base64Decode(base64String) {
        if (typeof Buffer !== 'undefined') {
            // Node.js environment - use Buffer
            return new Uint8Array(Buffer.from(base64String, 'base64'));
        }
        else {
            // Browser environment - use atob
            const binaryString = globalThis.atob(base64String);
            return new Uint8Array(Array.from(binaryString, char => char.charCodeAt(0)));
        }
    }
    // Generate a user-specific encryption key from user ID and session
    async generateUserKey(userId) {
        try {
            console.log('[PRIVACY_SERVICE] Starting key generation for user:', userId);
            // Get user session to ensure we have fresh authentication
            const { data: { session } } = await supabaseClient_1.supabase.auth.getSession();
            if (!session) {
                console.error('[PRIVACY_SERVICE] No active session found');
                throw new Error('No active session');
            }
            console.log('[PRIVACY_SERVICE] Session found, access token length:', session.access_token?.length || 0);
            // Check if we're running on the server-side (Node.js environment)
            const isServerSide = typeof window === 'undefined'
                && typeof process !== 'undefined'
                && process.versions
                && process.versions.node;
            console.log('[PRIVACY_SERVICE] Environment check - isServerSide:', isServerSide);
            if (isServerSide) {
                // Server-side: Access environment variable directly
                const keyMaterial = process.env.KEY_MATERIAL;
                if (!keyMaterial) {
                    throw new Error('KEY_MATERIAL environment variable is not configured. Please set this environment variable with a secure random string.');
                }
                // Validate key material length for security
                if (keyMaterial.length < 32) {
                    throw new Error('KEY_MATERIAL must be at least 32 characters long for adequate security');
                }
                // Log successful configuration without sensitive details
                console.log('[PRIVACY_SERVICE] KEY_MATERIAL configured');
                // Use HMAC-SHA256 with domain separation for primary key generation
                const hmac = (0, crypto_1.createHmac)('sha256', keyMaterial);
                hmac.update(`primary-key|${userId}`); // Domain-separated message format
                const key = hmac.digest('hex').substring(0, 64); // Use first 64 chars for AES-256 (32 bytes)
                console.log('[PRIVACY_SERVICE] Server-side key generation successful, key length:', key.length);
                return key;
            }
            else {
                // Client-side: Call API endpoint to generate key securely
                console.log('[PRIVACY_SERVICE] Client-side key generation, calling API endpoint...');

                // Ensure access token is available
                if (!session.access_token) {
                    throw new Error('Access token is missing from session');
                }

                const response = await fetch('/api/auth/generate-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        userId: userId,
                        keyType: 'primary'
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('[PRIVACY_SERVICE] API key generation failed:', response.status, errorData);
                    throw new Error(`Key generation failed: ${errorData.error || 'Unknown error'}`);
                }
                const data = await response.json();
                console.log('[PRIVACY_SERVICE] Client-side key generation successful, key length:', data.encryptionKey?.length || 0);
                return data.encryptionKey;
            }
        }
        catch (error) {
            console.error('[PRIVACY_SERVICE] Failed to generate user key:', error);
            // For migration/fallback scenarios, try fallback key generation
            console.log('[PRIVACY_SERVICE] Trying fallback key generation...');
            return await this.generateFallbackUserKey(userId);
        }
    }
    // Generate fallback user key (for backwards compatibility)
    async generateFallbackUserKey(userId) {
        try {
            // Get user session
            const { data: { session } } = await supabaseClient_1.supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session for fallback key generation');
            }
            // Check if we're running on the server-side
            const isServerSide = typeof window === 'undefined';
            if (isServerSide) {
                // Server-side fallback
                const fallbackKeyMaterial = process.env.KEY_MATERIAL;
                if (!fallbackKeyMaterial) {
                    throw new Error('KEY_MATERIAL environment variable is required for fallback key generation');
                }
                // Use HMAC-SHA256 with domain separation for fallback key generation
                const hmac = (0, crypto_1.createHmac)('sha256', fallbackKeyMaterial);
                hmac.update(`fallback-key|${userId}`); // Domain-separated message format
                return hmac.digest('hex').substring(0, 64); // Use first 64 chars for AES-256 (32 bytes)
            }
            else {
                // Client-side fallback: Call API endpoint
                const response = await fetch('/api/auth/generate-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        accessToken: session.access_token,
                        userId: userId,
                        keyType: 'fallback'
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Fallback key generation failed: ${errorData.error || 'Unknown error'}`);
                }
                const data = await response.json();
                return data.encryptionKey;
            }
        }
        catch (error) {
            console.error('Fallback key generation failed:', error);
            throw new Error('All key generation methods failed - cannot generate encryption key');
        }
    }
    // Get or generate user key
    async getUserKey(userId) {
        console.log('[PRIVACY_SERVICE] Getting user key for user:', userId, 'hasKey:', this.userKeys.has(userId));
        if (!this.userKeys.has(userId)) {
            console.log('[PRIVACY_SERVICE] Generating new user key for user:', userId);
            const userKey = await this.generateUserKey(userId);
            this.userKeys.set(userId, userKey);
            console.log('[PRIVACY_SERVICE] Generated user key length:', userKey.length);
        }
        else {
            console.log('[PRIVACY_SERVICE] Using cached user key, length:', this.userKeys.get(userId).length);
        }
        const key = this.userKeys.get(userId);
        console.log('[PRIVACY_SERVICE] Returning user key, length:', key.length);
        return key;
    }
    // Create a salted hash for searching without decryption
    // Uses per-user salt to prevent rainbow table attacks
    createSearchHash(text, userId) {
        if (!userId) {
            throw new Error('userId is required for creating search hash');
        }

        // Derive a consistent salt from userId
        const saltHash = (0, crypto_1.createHash)('sha256');
        saltHash.update(`search_salt_${userId}`);
        const salt = saltHash.digest('hex');

        // Create salted hash of the search text
        const hash = (0, crypto_1.createHash)('sha256');
        const normalizedText = text.toLowerCase().trim();
        hash.update(salt + normalizedText); // Prepend salt to text
        return hash.digest('hex');
    }
    // Client-side encryption fallback using Web Crypto API
    async encryptClientSide(data, userKey) {
        try {
            // Convert hex key to ArrayBuffer
            const hexMatches = userKey.match(/.{2}/g);
            if (!hexMatches || hexMatches.length < 32) {
                throw new Error('Invalid user key format: must be at least 64 hex characters');
            }
            const keyBuffer = new Uint8Array(hexMatches.map(byte => parseInt(byte, 16)));
            // Import the key for AES-GCM
            const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer.slice(0, 32), // Use first 32 bytes for AES-256
                { name: 'AES-GCM' }, false, ['encrypt']);
            // Generate a random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            // Encrypt the data
            const encodedData = new TextEncoder().encode(data);
            const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encodedData);
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);
            // Return as base64 with client-side prefix
            return 'client:' + this.base64Encode(combined);
        }
        catch (error) {
            console.error('Client-side encryption failed:', error);
            throw new Error('Client-side encryption failed - cannot store data unencrypted');
        }
    }
    // Encrypt sensitive data
    async encryptData(data, userId) {
        try {
            if (!data) {
                return { encrypted: '', hash: this.createSearchHash('', userId) };
            }
            const userKey = await this.getUserKey(userId);
            console.log('Encrypting data with key length:', userKey.length, 'for user:', userId);
            // Call the database encryption function
            const { data: result, error } = await supabaseClient_1.supabase.rpc('encrypt_sensitive_data', {
                data: data,
                user_key: userKey
            });
            if (error) {
                console.error('Database encryption error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    full: error
                });
                throw new Error(`Database encryption failed: ${error.message || 'Unknown error'}`);
            }
            if (!result) {
                throw new Error('Encryption returned null result');
            }
            return {
                encrypted: result,
                hash: this.createSearchHash(data, userId)
            };
        }
        catch (error) {
            console.error('Database encryption failed, attempting client-side encryption:', error);
            try {
                // Secure fallback: use client-side encryption
                const userKey = await this.getUserKey(userId);
                const clientEncrypted = await this.encryptClientSide(data, userKey);
                console.log('Successfully encrypted data using client-side fallback');
                return {
                    encrypted: clientEncrypted,
                    hash: this.createSearchHash(data, userId)
                };
            }
            catch (clientError) {
                console.error('Client-side encryption also failed:', clientError);
                // Fail hard - do not store unencrypted data
                throw new Error('All encryption methods failed - cannot store sensitive data unencrypted');
            }
        }
    }
    // Client-side decryption using Web Crypto API
    async decryptClientSide(encryptedData, userKey) {
        try {
            // Remove client-side prefix and decode base64
            const base64Data = encryptedData.replace('client:', '');
            const combined = new Uint8Array(this.base64Decode(base64Data));
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encryptedBuffer = combined.slice(12);
            // Convert hex key to ArrayBuffer
            const hexMatches = userKey.match(/.{2}/g);
            if (!hexMatches || hexMatches.length < 32) {
                throw new Error('Invalid user key format: must be at least 64 hex characters');
            }
            const keyBuffer = new Uint8Array(hexMatches.map(byte => parseInt(byte, 16)));
            // Import the key for AES-GCM
            const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer.slice(0, 32), // Use first 32 bytes for AES-256
                { name: 'AES-GCM' }, false, ['decrypt']);
            // Decrypt the data
            const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encryptedBuffer);
            return new TextDecoder().decode(decryptedBuffer);
        }
        catch (error) {
            console.error('Client-side decryption failed:', error);
            throw new Error('Client-side decryption failed');
        }
    }
    // Decrypt sensitive data
    async decryptData(encryptedData, userId) {
        try {
            // Handle empty or null encrypted data
            if (!encryptedData) {
                return '';
            }
            // Check if this is client-side encrypted data
            if (encryptedData.startsWith('client:')) {
                console.log('Detected client-side encrypted data, using client-side decryption');
                const userKey = await this.getUserKey(userId);
                return await this.decryptClientSide(encryptedData, userKey);
            }
            const userKey = await this.getUserKey(userId);
            console.log('Decrypting data with key length:', userKey.length, 'for user:', userId);
            // Call the database decryption function
            const { data: result, error } = await supabaseClient_1.supabase.rpc('decrypt_sensitive_data', {
                encrypted_data: encryptedData,
                user_key: userKey
            });
            if (error) {
                console.error('Database decryption error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    full: error
                });
                throw new Error(`Database decryption failed: ${error.message || 'Unknown error'}`);
            }
            return result || '';
        }
        catch (error) {
            console.error('Decryption failed, trying fallbacks:', error);
            // Only try backwards compatibility fallbacks for non-client-side encrypted data
            if (!encryptedData.startsWith('client:')) {
                // Try with fallback key format for backwards compatibility
                try {
                    const fallbackKey = await this.generateFallbackUserKey(userId);
                    console.log('Trying decryption with fallback key format, length:', fallbackKey.length);
                    const { data: result, error } = await supabaseClient_1.supabase.rpc('decrypt_sensitive_data', {
                        encrypted_data: encryptedData,
                        user_key: fallbackKey
                    });
                    if (!error && result) {
                        console.log('Successfully decrypted with fallback key format');
                        return result;
                    }
                }
                catch (fallbackKeyError) {
                    console.log('Fallback key format also failed:', fallbackKeyError);
                }
            }
            // Fail hard - do not return potentially corrupted data
            throw new Error('Decryption failed - data may be corrupted or key is invalid');
        }
    }
    // Encrypt collection data
    async encryptCollection(collection) {
        console.log('[PRIVACY_SERVICE] Encrypting collection:', { id: collection.id, name: collection.name, userId: collection.userId });
        const { encrypted, hash } = await this.encryptData(collection.name, collection.userId);
        console.log('[PRIVACY_SERVICE] Collection encryption successful:', { id: collection.id, hasEncrypted: !!encrypted, hasHash: !!hash });
        return {
            id: collection.id,
            name_encrypted: encrypted,
            name_hash: hash,
            user_id: collection.userId
        };
    }
    // Decrypt collection data
    async decryptCollection(collection) {
        console.log('[PRIVACY_SERVICE] Decrypting collection:', { id: collection.id, hasEncryptedName: !!collection.name_encrypted, hasHash: !!collection.name_hash, userId: collection.userId });
        const decryptedName = await this.decryptData(collection.name_encrypted, collection.userId);
        console.log('[PRIVACY_SERVICE] Collection decryption successful:', { id: collection.id, decryptedName });
        return {
            id: collection.id,
            name: decryptedName,
            name_hash: collection.name_hash
        };
    }
    // Encrypt dot data
    async encryptDot(dot) {
        const { encrypted, hash } = await this.encryptData(dot.label, dot.userId);
        return {
            id: dot.id,
            label_encrypted: encrypted,
            label_hash: hash,
            user_id: dot.userId
        };
    }
    // Decrypt dot data
    async decryptDot(dot) {
        const decryptedLabel = await this.decryptData(dot.label_encrypted, dot.userId);
        return {
            id: dot.id,
            label: decryptedLabel,
            label_hash: dot.label_hash
        };
    }
    // Search collections by name hash (privacy-preserving search)
    // Note: This performs exact hash matching. If substring/fuzzy search is needed,
    // implement a tokenization scheme that hashes normalized tokens and searches across token hashes.
    // Create legacy (unsalted) hash for backward compatibility during migration
    createLegacyHash(text) {
        const hash = (0, crypto_1.createHash)('sha256');
        hash.update(text.toLowerCase().trim());
        return hash.digest('hex');
    }

    async searchCollectionsByName(userId, searchTerm) {
        const saltedHash = this.createSearchHash(searchTerm, userId);

        // First try with new salted hash
        let { data, error } = await supabaseClient_1.supabase
            .from('collections')
            .select('id')
            .eq('user_id', userId)
            .eq('name_hash', saltedHash)
            .eq('status', 'active');

        if (error) {
            console.error('Search failed:', error);
            return [];
        }

        // If no results with salted hash, try legacy hash for backward compatibility
        if (!data || data.length === 0) {
            console.log('[PRIVACY_SERVICE] No results with salted hash, trying legacy hash for backward compatibility');
            const legacyHash = this.createLegacyHash(searchTerm);

            const { data: legacyData, error: legacyError } = await supabaseClient_1.supabase
                .from('collections')
                .select('id')
                .eq('user_id', userId)
                .eq('name_hash', legacyHash)
                .eq('status', 'active');

            if (legacyError) {
                console.error('Legacy search failed:', legacyError);
                return [];
            }

            if (legacyData && legacyData.length > 0) {
                console.log(`[PRIVACY_SERVICE] Found ${legacyData.length} results with legacy hash - migration needed`);
                return legacyData?.map(c => c.id) || [];
            }
        }

        return data?.map(c => c.id) || [];
    }
    // Clear user key (for logout)
    clearUserKey(userId) {
        if (userId) {
            // Clear specific user's key
            this.userKeys.delete(userId);
        }
        else {
            // Clear all user keys (for complete logout/cleanup)
            this.userKeys.clear();
        }
    }
    // Validate encryption is working
    async testEncryption(userId) {
        try {
            const testData = "test-encryption-data";
            const { encrypted } = await this.encryptData(testData, userId);
            const decrypted = await this.decryptData(encrypted, userId);
            return testData === decrypted;
        }
        catch (error) {
            console.error('Encryption test failed:', error);
            return false;
        }
    }
}
exports.PrivacyService = PrivacyService;
// Export singleton instance
exports.privacyService = PrivacyService.getInstance();
