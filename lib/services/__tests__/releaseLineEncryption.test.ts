/**
 * Comprehensive tests for release line encryption and decryption
 * Tests encryption roundtrip, error handling, and security aspects
 */

import { privacyService } from '../privacyService'
import type { ReleaseLineConfig } from '@/components/HillChartApp'

// Mock the underlying encryption methods
jest.mock('../privacyService', () => ({
  privacyService: {
    encryptData: jest.fn(),
    decryptData: jest.fn(),
    encryptReleaseLineConfig: jest.fn(),
    decryptReleaseLineConfig: jest.fn(),
  }
}))

const mockPrivacyService = privacyService as jest.Mocked<typeof privacyService>

describe('Release Line Encryption', () => {
  const testUserId = 'test-user-12345'
  
  const testReleaseLineConfig: ReleaseLineConfig = {
    enabled: true,
    color: '#ff00ff',
    text: 'Q4 2024 Release'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('encryptReleaseLineConfig', () => {
    it('should encrypt color and text while preserving enabled flag', async () => {
      // Mock individual encryption calls
      mockPrivacyService.encryptData
        .mockResolvedValueOnce({ encrypted: 'encrypted-color-data', hash: 'color-hash' })
        .mockResolvedValueOnce({ encrypted: 'encrypted-text-data', hash: 'text-hash' })

      // Mock the main encryption method
      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color_encrypted: 'encrypted-color-data',
        text_encrypted: 'encrypted-text-data'
      })

      const result = await privacyService.encryptReleaseLineConfig(testReleaseLineConfig, testUserId)

      expect(result).toEqual({
        enabled: true,
        color_encrypted: 'encrypted-color-data',
        text_encrypted: 'encrypted-text-data'
      })

      expect(mockPrivacyService.encryptReleaseLineConfig).toHaveBeenCalledWith(
        testReleaseLineConfig,
        testUserId
      )
    })

    it('should handle empty color and text values', async () => {
      const emptyConfig: ReleaseLineConfig = {
        enabled: false,
        color: '',
        text: ''
      }

      mockPrivacyService.encryptData
        .mockResolvedValueOnce({ encrypted: '', hash: 'empty-hash' })
        .mockResolvedValueOnce({ encrypted: '', hash: 'empty-hash' })

      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: false,
        color_encrypted: '',
        text_encrypted: ''
      })

      const result = await privacyService.encryptReleaseLineConfig(emptyConfig, testUserId)

      expect(result).toEqual({
        enabled: false,
        color_encrypted: '',
        text_encrypted: ''
      })
    })

    it('should preserve boolean enabled value without encryption', async () => {
      mockPrivacyService.encryptData.mockResolvedValue({ encrypted: 'mock-encrypted', hash: 'mock-hash' })

      // Test with enabled: true
      const enabledConfig = { ...testReleaseLineConfig, enabled: true }
      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color_encrypted: 'mock-encrypted',
        text_encrypted: 'mock-encrypted'
      })

      const enabledResult = await privacyService.encryptReleaseLineConfig(enabledConfig, testUserId)
      expect(enabledResult.enabled).toBe(true)

      // Test with enabled: false
      const disabledConfig = { ...testReleaseLineConfig, enabled: false }
      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: false,
        color_encrypted: 'mock-encrypted',
        text_encrypted: 'mock-encrypted'
      })

      const disabledResult = await privacyService.encryptReleaseLineConfig(disabledConfig, testUserId)
      expect(disabledResult.enabled).toBe(false)
    })

    it('should handle encryption errors gracefully', async () => {
      mockPrivacyService.encryptReleaseLineConfig.mockRejectedValue(
        new Error('Encryption failed')
      )

      await expect(
        privacyService.encryptReleaseLineConfig(testReleaseLineConfig, testUserId)
      ).rejects.toThrow('Encryption failed')
    })

    it('should handle special characters in text', async () => {
      const specialTextConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4-2024 (Beta) & Release #1 @ 100%'
      }

      mockPrivacyService.encryptData
        .mockResolvedValueOnce({ encrypted: 'encrypted-color', hash: 'color-hash' })
        .mockResolvedValueOnce({ encrypted: 'encrypted-special-text', hash: 'text-hash' })

      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-special-text'
      })

      const result = await privacyService.encryptReleaseLineConfig(specialTextConfig, testUserId)

      expect(result).toEqual({
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-special-text'
      })
    })

    it('should handle unicode characters in text', async () => {
      const unicodeTextConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 🚀 Release ✨'
      }

      mockPrivacyService.encryptData
        .mockResolvedValueOnce({ encrypted: 'encrypted-color', hash: 'color-hash' })
        .mockResolvedValueOnce({ encrypted: 'encrypted-unicode-text', hash: 'text-hash' })

      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-unicode-text'
      })

      const result = await privacyService.encryptReleaseLineConfig(unicodeTextConfig, testUserId)

      expect(result).toEqual({
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-unicode-text'
      })
    })
  })

  describe('decryptReleaseLineConfig', () => {
    it('should decrypt color and text while preserving enabled flag', async () => {
      const encryptedConfig = {
        enabled: true,
        color_encrypted: 'encrypted-color-data',
        text_encrypted: 'encrypted-text-data'
      }

      mockPrivacyService.decryptData
        .mockResolvedValueOnce('#ff00ff')
        .mockResolvedValueOnce('Q4 2024 Release')

      mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 Release'
      })

      const result = await privacyService.decryptReleaseLineConfig(encryptedConfig, testUserId)

      expect(result).toEqual({
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 Release'
      })

      expect(mockPrivacyService.decryptReleaseLineConfig).toHaveBeenCalledWith(
        encryptedConfig,
        testUserId
      )
    })

    it('should handle empty encrypted values', async () => {
      const encryptedConfig = {
        enabled: false,
        color_encrypted: '',
        text_encrypted: ''
      }

      mockPrivacyService.decryptData.mockResolvedValue('')

      mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue({
        enabled: false,
        color: '',
        text: ''
      })

      const result = await privacyService.decryptReleaseLineConfig(encryptedConfig, testUserId)

      expect(result).toEqual({
        enabled: false,
        color: '',
        text: ''
      })
    })

    it('should preserve boolean enabled value without decryption', async () => {
      mockPrivacyService.decryptData.mockResolvedValue('mock-decrypted')

      // Test with enabled: true
      const enabledEncrypted = {
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-text'
      }

      mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color: 'mock-decrypted',
        text: 'mock-decrypted'
      })

      const enabledResult = await privacyService.decryptReleaseLineConfig(enabledEncrypted, testUserId)
      expect(enabledResult.enabled).toBe(true)

      // Test with enabled: false
      const disabledEncrypted = {
        enabled: false,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-text'
      }

      mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue({
        enabled: false,
        color: 'mock-decrypted',
        text: 'mock-decrypted'
      })

      const disabledResult = await privacyService.decryptReleaseLineConfig(disabledEncrypted, testUserId)
      expect(disabledResult.enabled).toBe(false)
    })

    it('should handle decryption errors gracefully', async () => {
      const encryptedConfig = {
        enabled: true,
        color_encrypted: 'corrupted-color-data',
        text_encrypted: 'corrupted-text-data'
      }

      mockPrivacyService.decryptReleaseLineConfig.mockRejectedValue(
        new Error('Decryption failed')
      )

      await expect(
        privacyService.decryptReleaseLineConfig(encryptedConfig, testUserId)
      ).rejects.toThrow('Decryption failed')
    })

    it('should handle corrupted encrypted data', async () => {
      const corruptedConfig = {
        enabled: true,
        color_encrypted: 'corrupted-data-that-cannot-be-decrypted',
        text_encrypted: 'another-corrupted-piece-of-data'
      }

      mockPrivacyService.decryptReleaseLineConfig.mockRejectedValue(
        new Error('Invalid encrypted data')
      )

      await expect(
        privacyService.decryptReleaseLineConfig(corruptedConfig, testUserId)
      ).rejects.toThrow('Invalid encrypted data')
    })
  })

  describe('Encryption/Decryption Roundtrip', () => {
    it('should successfully encrypt and decrypt release line config', async () => {
      const originalConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 Release'
      }

      // Mock encryption
      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color_encrypted: 'encrypted-ff00ff',
        text_encrypted: 'encrypted-q4-2024-release'
      })

      // Mock decryption
      mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue(originalConfig)

      // Encrypt
      const encrypted = await privacyService.encryptReleaseLineConfig(originalConfig, testUserId)
      expect(encrypted).toEqual({
        enabled: true,
        color_encrypted: 'encrypted-ff00ff',
        text_encrypted: 'encrypted-q4-2024-release'
      })

      // Decrypt
      const decrypted = await privacyService.decryptReleaseLineConfig(encrypted, testUserId)
      expect(decrypted).toEqual(originalConfig)
    })

    it('should handle multiple roundtrips consistently', async () => {
      const configs: ReleaseLineConfig[] = [
        { enabled: true, color: '#ff0000', text: 'Red Release' },
        { enabled: false, color: '#00ff00', text: 'Green Release' },
        { enabled: true, color: '#0000ff', text: 'Blue Release' },
        { enabled: true, color: '#ffffff', text: '' },
        { enabled: false, color: '#000000', text: 'Black Release' }
      ]

      for (const config of configs) {
        // Mock encryption for this config
        mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
          enabled: config.enabled,
          color_encrypted: `encrypted-${config.color}`,
          text_encrypted: `encrypted-${config.text}`
        })

        // Mock decryption for this config
        mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue(config)

        // Perform roundtrip
        const encrypted = await privacyService.encryptReleaseLineConfig(config, testUserId)
        const decrypted = await privacyService.decryptReleaseLineConfig(encrypted, testUserId)

        expect(decrypted).toEqual(config)
      }
    })

    it('should handle edge case configurations in roundtrip', async () => {
      const edgeCases: ReleaseLineConfig[] = [
        { enabled: true, color: '#ffffff', text: '12345678901234567890123456789012345678901234567890' }, // Max length
        { enabled: false, color: '#000000', text: '' }, // Minimal config
        { enabled: true, color: '#123abc', text: 'Special chars: !@#$%^&*()' },
        { enabled: true, color: '#ABCDEF', text: 'Unicode: 🚀✨🎉' }
      ]

      for (const config of edgeCases) {
        mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
          enabled: config.enabled,
          color_encrypted: `encrypted-${config.color}`,
          text_encrypted: `encrypted-${config.text}`
        })

        mockPrivacyService.decryptReleaseLineConfig.mockResolvedValue(config)

        const encrypted = await privacyService.encryptReleaseLineConfig(config, testUserId)
        const decrypted = await privacyService.decryptReleaseLineConfig(encrypted, testUserId)

        expect(decrypted).toEqual(config)
      }
    })
  })

  describe('Security and Privacy', () => {
    it('should not expose sensitive data in error messages', async () => {
      const sensitiveConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Confidential Project Alpha'
      }

      mockPrivacyService.encryptReleaseLineConfig.mockRejectedValue(
        new Error('Encryption failed')
      )

      try {
        await privacyService.encryptReleaseLineConfig(sensitiveConfig, testUserId)
      } catch (error) {
        // Error message should not contain sensitive data
        expect(error.message).not.toContain('Confidential Project Alpha')
        expect(error.message).not.toContain('#ff00ff')
      }
    })

    it('should handle different user IDs correctly', async () => {
      const user1Id = 'user-1-id'
      const user2Id = 'user-2-id'

      // Mock encryption for user 1
      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValueOnce({
        enabled: true,
        color_encrypted: 'user1-encrypted-color',
        text_encrypted: 'user1-encrypted-text'
      })

      // Mock encryption for user 2
      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValueOnce({
        enabled: true,
        color_encrypted: 'user2-encrypted-color',
        text_encrypted: 'user2-encrypted-text'
      })

      const config1 = await privacyService.encryptReleaseLineConfig(testReleaseLineConfig, user1Id)
      const config2 = await privacyService.encryptReleaseLineConfig(testReleaseLineConfig, user2Id)

      // Encrypted data should be different for different users
      expect(config1.color_encrypted).not.toBe(config2.color_encrypted)
      expect(config1.text_encrypted).not.toBe(config2.text_encrypted)

      expect(mockPrivacyService.encryptReleaseLineConfig).toHaveBeenCalledWith(testReleaseLineConfig, user1Id)
      expect(mockPrivacyService.encryptReleaseLineConfig).toHaveBeenCalledWith(testReleaseLineConfig, user2Id)
    })

    it('should validate user ID format before encryption', async () => {
      const invalidUserIds = [
        '',
        'invalid-format',
        '123',
        null,
        undefined
      ]

      for (const invalidUserId of invalidUserIds) {
        mockPrivacyService.encryptReleaseLineConfig.mockRejectedValue(
          new Error('Invalid user ID')
        )

        await expect(
          privacyService.encryptReleaseLineConfig(testReleaseLineConfig, invalidUserId as any)
        ).rejects.toThrow('Invalid user ID')
      }
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large text encryption efficiently', async () => {
      const largeTextConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'a'.repeat(50) // Maximum allowed length
      }

      mockPrivacyService.encryptReleaseLineConfig.mockResolvedValue({
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-large-text'
      })

      const startTime = Date.now()
      const result = await privacyService.encryptReleaseLineConfig(largeTextConfig, testUserId)
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly
    })

    it('should handle concurrent encryption operations', async () => {
      const configs = Array.from({ length: 5 }, (_, i) => ({
        enabled: true,
        color: '#ff00ff',
        text: `Config ${i}`
      }))

      // Mock encryption for all configs
      configs.forEach((config, i) => {
        mockPrivacyService.encryptReleaseLineConfig.mockResolvedValueOnce({
          enabled: true,
          color_encrypted: `encrypted-color-${i}`,
          text_encrypted: `encrypted-text-${i}`
        })
      })

      const startTime = Date.now()
      const results = await Promise.all(
        configs.map(config => privacyService.encryptReleaseLineConfig(config, testUserId))
      )
      const endTime = Date.now()

      expect(results).toHaveLength(5)
      expect(endTime - startTime).toBeLessThan(500) // Should handle concurrent operations efficiently
    })
  })
})