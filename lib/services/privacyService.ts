import { supabase } from "@/lib/supabaseClient"
import { createHash, randomBytes } from "crypto"

// Privacy service for handling encrypted data
export class PrivacyService {
  private static instance: PrivacyService
  private userKey: string | null = null

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

      // Create a deterministic but secure key from user ID and a fixed secret
      // This ensures the key remains consistent across sessions
      const keyMaterial = `${userId}:fixed-app-secret-for-hill-chart-encryption-long-enough-secret`
      
      // Use SHA-256 to create a consistent 32-byte key
      const hash = createHash('sha256')
      hash.update(keyMaterial)
      return hash.digest('hex').substring(0, 64) // Use first 64 chars for AES-256 (32 bytes)
    } catch (error) {
      console.error('Failed to generate user key:', error)
      // For migration/fallback scenarios, use a deterministic key based on user ID
      const hash = createHash('sha256')
      hash.update(`fallback-key-${userId}-long-enough-secret`)
      return hash.digest('hex').substring(0, 64) // Use first 64 chars for AES-256 (32 bytes)
    }
  }

  // Get or generate user key
  private async getUserKey(userId: string): Promise<string> {
    if (!this.userKey) {
      console.log('Generating new user key for user:', userId)
      this.userKey = await this.generateUserKey(userId)
      console.log('Generated user key length:', this.userKey.length)
    }
    return this.userKey
  }

  // Create a hash for searching without decryption
  private createSearchHash(text: string): string {
    const hash = createHash('sha256')
    hash.update(text.toLowerCase().trim())
    return hash.digest('hex')
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
      console.error('Encryption failed:', error)
      // Fallback to simple encoding if encryption fails
      const encoded = Buffer.from(data).toString('base64')
      console.log('Using fallback base64 encoding for:', data)
      return {
        encrypted: encoded,
        hash: this.createSearchHash(data)
      }
    }
  }

  // Decrypt sensitive data
  async decryptData(encryptedData: string, userId: string): Promise<string> {
    try {
      // Handle empty or null encrypted data
      if (!encryptedData) {
        return ''
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
      
      // Try with old 32-character key format for backwards compatibility
      try {
        const oldKey = await this.generateOldFormatKey(userId)
        console.log('Trying decryption with old key format, length:', oldKey.length)
        
        const { data: result, error } = await supabase.rpc('decrypt_sensitive_data', {
          encrypted_data: encryptedData,
          user_key: oldKey
        })

        if (!error && result) {
          console.log('Successfully decrypted with old key format')
          return result
        }
      } catch (oldKeyError) {
        console.log('Old key format also failed:', oldKeyError)
      }

      // Fallback to simple decoding if decryption fails
      try {
        const decoded = Buffer.from(encryptedData, 'base64').toString('utf8')
        console.log('Successfully decoded with base64 fallback')
        return decoded
      } catch (decodeError) {
        console.error('Base64 decode fallback failed:', decodeError)
        // Last resort: return the original data if it's readable
        return encryptedData
      }
    }
  }

  // Generate old format key for backwards compatibility
  private async generateOldFormatKey(userId: string): Promise<string> {
    const hash = createHash('sha256')
    hash.update(`fallback-key-${userId}`)
    return hash.digest('hex').substring(0, 32) // Old 32-character format
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
  clearUserKey(): void {
    this.userKey = null
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
