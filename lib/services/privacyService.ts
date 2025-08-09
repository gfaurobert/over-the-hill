import { supabase } from "@/lib/supabaseClient"
import { createHash, randomBytes } from "crypto"

// Privacy service for handling encrypted data
export class PrivacyService {
  private static instance: PrivacyService
  private userKeys: Map<string, string> = new Map()

  private constructor() {}

  static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService()
    }
    return PrivacyService.instance
  }

  // Generate a user-specific encryption key from user ID and session
  private async generateUserKey(userId: string): Promise<string> {
    try {
      // Get user session to ensure we have fresh authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Check if we're running on the server-side (Node.js environment)
      const isServerSide = typeof window === 'undefined'
      
      if (isServerSide) {
        // Server-side: Access environment variable directly
        const keyMaterial = process.env.KEY_MATERIAL
        if (!keyMaterial) {
          throw new Error('KEY_MATERIAL environment variable is not configured. Please set this environment variable with a secure random string.')
        }

        // Validate key material length for security
        if (keyMaterial.length < 32) {
          throw new Error('KEY_MATERIAL must be at least 32 characters long for adequate security')
        }

        // Create a deterministic but secure key from user ID and the environment secret
        const combinedKeyMaterial = `${userId}:${keyMaterial}`
        
        // Use SHA-256 to create a consistent 32-byte key
        const hash = createHash('sha256')
        hash.update(combinedKeyMaterial)
        return hash.digest('hex').substring(0, 64) // Use first 64 chars for AES-256 (32 bytes)
      } else {
        // Client-side: Call API endpoint to generate key securely
        const response = await fetch('/api/auth/generate-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: session.access_token,
            userId: userId,
            keyType: 'primary'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Key generation failed: ${errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()
        return data.encryptionKey
      }
    } catch (error) {
      console.error('Failed to generate user key:', error)
      
      // For migration/fallback scenarios, try fallback key generation
      return await this.generateFallbackUserKey(userId)
    }
  }

  // Generate fallback user key (for backwards compatibility)
  private async generateFallbackUserKey(userId: string): Promise<string> {
    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session for fallback key generation')
      }

      // Check if we're running on the server-side
      const isServerSide = typeof window === 'undefined'
      
      if (isServerSide) {
        // Server-side fallback
        const fallbackKeyMaterial = process.env.KEY_MATERIAL
        if (!fallbackKeyMaterial) {
          throw new Error('KEY_MATERIAL environment variable is required for fallback key generation')
        }
        
        const hash = createHash('sha256')
        hash.update(`fallback-key-${userId}-${fallbackKeyMaterial}`)
        return hash.digest('hex').substring(0, 64) // Use first 64 chars for AES-256 (32 bytes)
      } else {
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
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Fallback key generation failed: ${errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()
        return data.encryptionKey
      }
    } catch (error) {
      console.error('Fallback key generation failed:', error)
      throw new Error('All key generation methods failed - cannot generate encryption key')
    }
  }

  // Generate legacy key using the old hard-coded secret (for backward compatibility)
  private async generateLegacyKey(userId: string): Promise<string> {
    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session for legacy key generation')
      }

      // Check if we're running on the server-side
      const isServerSide = typeof window === 'undefined'
      
      if (isServerSide) {
        // Server-side: Generate key using the old hard-coded secret
        const legacySecret = 'fixed-app-secret-for-hill-chart-encryption-long-enough-secret'
        const combinedKeyMaterial = `${userId}:${legacySecret}`
        
        const hash = createHash('sha256')
        hash.update(combinedKeyMaterial)
        return hash.digest('hex').substring(0, 64) // Use first 64 chars for AES-256 (32 bytes)
      } else {
        // Client-side: Call API endpoint to generate legacy key
        const response = await fetch('/api/auth/generate-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: session.access_token,
            userId: userId,
            keyType: 'legacy'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Legacy key generation failed: ${errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()
        return data.encryptionKey
      }
    } catch (error) {
      console.error('Legacy key generation failed:', error)
      throw new Error('Legacy key generation failed - cannot decrypt old data')
    }
  }

  // Get or generate user key
  private async getUserKey(userId: string): Promise<string> {
    if (!this.userKeys.has(userId)) {
      console.log('Generating new user key for user:', userId)
      const userKey = await this.generateUserKey(userId)
      this.userKeys.set(userId, userKey)
      console.log('Generated user key length:', userKey.length)
    }
    return this.userKeys.get(userId)!
  }

  // Create a hash for searching without decryption
  private createSearchHash(text: string): string {
    const hash = createHash('sha256')
    hash.update(text.toLowerCase().trim())
    return hash.digest('hex')
  }

  // Client-side encryption fallback using Web Crypto API
  private async encryptClientSide(data: string, userKey: string): Promise<string> {
    try {
      // Convert hex key to ArrayBuffer
      const keyBuffer = new Uint8Array(userKey.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || [])
      
      // Import the key for AES-GCM
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer.slice(0, 32), // Use first 32 bytes for AES-256
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )

      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      // Encrypt the data
      const encodedData = new TextEncoder().encode(data)
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedData
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedBuffer), iv.length)

      // Return as base64 with client-side prefix
      return 'client:' + Buffer.from(combined).toString('base64')
    } catch (error) {
      console.error('Client-side encryption failed:', error)
      throw new Error('Client-side encryption failed - cannot store data unencrypted')
    }
  }

  // Encrypt sensitive data
  async encryptData(data: string, userId: string): Promise<{ encrypted: string; hash: string }> {
    try {
      if (!data) {
        return { encrypted: '', hash: this.createSearchHash('') }
      }

      const userKey = await this.getUserKey(userId)
      console.log('Encrypting data with key length:', userKey.length, 'for user:', userId)
      
      // Call the database encryption function
      const { data: result, error } = await supabase.rpc('encrypt_sensitive_data', {
        data: data,
        user_key: userKey
      })

      if (error) {
        console.error('Database encryption error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          full: error
        })
        throw new Error(`Database encryption failed: ${error.message || 'Unknown error'}`)
      }

      if (!result) {
        throw new Error('Encryption returned null result')
      }

      return {
        encrypted: result,
        hash: this.createSearchHash(data)
      }
    } catch (error) {
      console.error('Database encryption failed, attempting client-side encryption:', error)
      
      try {
        // Secure fallback: use client-side encryption
        const userKey = await this.getUserKey(userId)
        const clientEncrypted = await this.encryptClientSide(data, userKey)
        console.log('Successfully encrypted data using client-side fallback')
        
        return {
          encrypted: clientEncrypted,
          hash: this.createSearchHash(data)
        }
      } catch (clientError) {
        console.error('Client-side encryption also failed:', clientError)
        // Fail hard - do not store unencrypted data
        throw new Error('All encryption methods failed - cannot store sensitive data unencrypted')
      }
    }
  }

  // Client-side decryption using Web Crypto API
  private async decryptClientSide(encryptedData: string, userKey: string): Promise<string> {
    try {
      // Remove client-side prefix and decode base64
      const base64Data = encryptedData.replace('client:', '')
      const combined = new Uint8Array(Buffer.from(base64Data, 'base64'))
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12)
      const encryptedBuffer = combined.slice(12)
      
      // Convert hex key to ArrayBuffer
      const keyBuffer = new Uint8Array(userKey.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || [])
      
      // Import the key for AES-GCM
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer.slice(0, 32), // Use first 32 bytes for AES-256
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encryptedBuffer
      )

      return new TextDecoder().decode(decryptedBuffer)
    } catch (error) {
      console.error('Client-side decryption failed:', error)
      throw new Error('Client-side decryption failed')
    }
  }

  // Decrypt sensitive data
  async decryptData(encryptedData: string, userId: string): Promise<string> {
    try {
      // Handle empty or null encrypted data
      if (!encryptedData) {
        return ''
      }

      // Check if this is client-side encrypted data
      if (encryptedData.startsWith('client:')) {
        console.log('Detected client-side encrypted data, using client-side decryption')
        const userKey = await this.getUserKey(userId)
        return await this.decryptClientSide(encryptedData, userKey)
      }

      const userKey = await this.getUserKey(userId)
      console.log('Decrypting data with key length:', userKey.length, 'for user:', userId)
      
      // Call the database decryption function
      const { data: result, error } = await supabase.rpc('decrypt_sensitive_data', {
        encrypted_data: encryptedData,
        user_key: userKey
      })

      if (error) {
        console.error('Database decryption error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          full: error
        })
        throw new Error(`Database decryption failed: ${error.message || 'Unknown error'}`)
      }

      return result || ''
    } catch (error) {
      console.error('Decryption failed, trying fallbacks:', error)
      
      // Only try backwards compatibility fallbacks for non-client-side encrypted data
      if (!encryptedData.startsWith('client:')) {
        // Try with legacy key (original hard-coded secret) for backwards compatibility
        try {
          const legacyKey = await this.generateLegacyKey(userId)
          console.log('Trying decryption with legacy key format, length:', legacyKey.length)
          
          const { data: result, error } = await supabase.rpc('decrypt_sensitive_data', {
            encrypted_data: encryptedData,
            user_key: legacyKey
          })

          if (!error && result) {
            console.log('Successfully decrypted with legacy key format')
            return result
          }
        } catch (legacyKeyError) {
          console.log('Legacy key format also failed:', legacyKeyError)
        }

        // Try with fallback key format for backwards compatibility
        try {
          const fallbackKey = await this.generateFallbackUserKey(userId)
          console.log('Trying decryption with fallback key format, length:', fallbackKey.length)
          
          const { data: result, error } = await supabase.rpc('decrypt_sensitive_data', {
            encrypted_data: encryptedData,
            user_key: fallbackKey
          })

          if (!error && result) {
            console.log('Successfully decrypted with fallback key format')
            return result
          }
        } catch (fallbackKeyError) {
          console.log('Fallback key format also failed:', fallbackKeyError)
        }

        // Check if this might be legacy base64 encoded data (from migration)
        try {
          const decoded = Buffer.from(encryptedData, 'base64').toString('utf8')
          // Check if it's valid UTF-8 and not binary data by looking for null bytes or excessive control chars
          const hasNullBytes = decoded.includes('\0')
          const controlCharCount = (decoded.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length
          const isLikelyText = !hasNullBytes && controlCharCount / decoded.length < 0.1 // Less than 10% control chars
          
          if (isLikelyText && decoded.length > 0) {
            console.warn('WARNING: Found legacy base64-encoded data from migration - this should be re-encrypted')
            return decoded
          }
        } catch (decodeError) {
          console.log('Base64 decode attempt failed:', decodeError)
        }
      }

      // Fail hard - do not return potentially corrupted data
      throw new Error('Decryption failed - data may be corrupted or key is invalid')
    }
  }

  // Encrypt collection data
  async encryptCollection(collection: { id: string; name: string; userId: string }) {
    const { encrypted, hash } = await this.encryptData(collection.name, collection.userId)
    return {
      id: collection.id,
      name_encrypted: encrypted,
      name_hash: hash,
      user_id: collection.userId
    }
  }

  // Decrypt collection data
  async decryptCollection(collection: { id: string; name_encrypted: string; name_hash: string; userId: string }) {
    const decryptedName = await this.decryptData(collection.name_encrypted, collection.userId)
    return {
      id: collection.id,
      name: decryptedName,
      name_hash: collection.name_hash
    }
  }

  // Encrypt dot data
  async encryptDot(dot: { id: string; label: string; userId: string }) {
    const { encrypted, hash } = await this.encryptData(dot.label, dot.userId)
    return {
      id: dot.id,
      label_encrypted: encrypted,
      label_hash: hash,
      user_id: dot.userId
    }
  }

  // Decrypt dot data
  async decryptDot(dot: { id: string; label_encrypted: string; label_hash: string; userId: string }) {
    const decryptedLabel = await this.decryptData(dot.label_encrypted, dot.userId)
    return {
      id: dot.id,
      label: decryptedLabel,
      label_hash: dot.label_hash
    }
  }

  // Search collections by name hash (privacy-preserving search)
  async searchCollectionsByName(userId: string, searchTerm: string): Promise<string[]> {
    const searchHash = this.createSearchHash(searchTerm)
    
    const { data, error } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', userId)
      .ilike('name_hash', `%${searchHash}%`)
      .eq('status', 'active')

    if (error) {
      console.error('Search failed:', error)
      return []
    }

    return data?.map(c => c.id) || []
  }

  // Clear user key (for logout)
  clearUserKey(userId?: string): void {
    if (userId) {
      // Clear specific user's key
      this.userKeys.delete(userId)
    } else {
      // Clear all user keys (for complete logout/cleanup)
      this.userKeys.clear()
    }
  }

  // Validate encryption is working
  async testEncryption(userId: string): Promise<boolean> {
    try {
      const testData = "test-encryption-data"
      const { encrypted } = await this.encryptData(testData, userId)
      const decrypted = await this.decryptData(encrypted, userId)
      return testData === decrypted
    } catch (error) {
      console.error('Encryption test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const privacyService = PrivacyService.getInstance()
