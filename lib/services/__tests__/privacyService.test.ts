import { privacyService } from '../privacyService';

// Mock environment variables for testing
const originalEnv = process.env;

// Mock Supabase client
jest.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            user: { id: 'test-user-id' }
          }
        }
      })
    },
    rpc: jest.fn()
  }
}));

// Mock crypto for Node.js environment
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn()
  },
  getRandomValues: jest.fn()
};

// Mock global crypto if not available (Node.js environment)
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = mockCrypto;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    KEY_MATERIAL: 'test-key-material-that-is-at-least-32-characters-long-for-security'
  };
  
  // Clear any cached user keys
  privacyService.clearUserKey();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('PrivacyService - Release Line Encryption', () => {
  const testUserId = 'test-user-id-12345';
  const testReleaseLineConfig = {
    enabled: true,
    color: '#ff00ff',
    text: 'Q4 2024 Release'
  };

  describe('encryptReleaseLineConfig', () => {
    it('should encrypt release line configuration correctly', async () => {
      // Mock the encryptData method to return predictable results
      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      mockEncryptData
        .mockResolvedValueOnce({ encrypted: 'encrypted-color', hash: 'color-hash' })
        .mockResolvedValueOnce({ encrypted: 'encrypted-text', hash: 'text-hash' });

      const result = await privacyService.encryptReleaseLineConfig(testReleaseLineConfig, testUserId);

      expect(result).toEqual({
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-text'
      });

      expect(mockEncryptData).toHaveBeenCalledTimes(2);
      expect(mockEncryptData).toHaveBeenCalledWith('#ff00ff', testUserId);
      expect(mockEncryptData).toHaveBeenCalledWith('Q4 2024 Release', testUserId);

      mockEncryptData.mockRestore();
    });

    it('should handle empty color and text values', async () => {
      const emptyConfig = {
        enabled: false,
        color: '',
        text: ''
      };

      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      mockEncryptData
        .mockResolvedValueOnce({ encrypted: '', hash: 'empty-hash' })
        .mockResolvedValueOnce({ encrypted: '', hash: 'empty-hash' });

      const result = await privacyService.encryptReleaseLineConfig(emptyConfig, testUserId);

      expect(result).toEqual({
        enabled: false,
        color_encrypted: '',
        text_encrypted: ''
      });

      mockEncryptData.mockRestore();
    });

    it('should preserve boolean enabled value without encryption', async () => {
      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      mockEncryptData.mockResolvedValue({ encrypted: 'mock-encrypted', hash: 'mock-hash' });

      // Test with enabled: true
      const enabledConfig = { ...testReleaseLineConfig, enabled: true };
      const enabledResult = await privacyService.encryptReleaseLineConfig(enabledConfig, testUserId);
      expect(enabledResult.enabled).toBe(true);

      // Test with enabled: false
      const disabledConfig = { ...testReleaseLineConfig, enabled: false };
      const disabledResult = await privacyService.encryptReleaseLineConfig(disabledConfig, testUserId);
      expect(disabledResult.enabled).toBe(false);

      mockEncryptData.mockRestore();
    });
  });

  describe('decryptReleaseLineConfig', () => {
    it('should decrypt release line configuration correctly', async () => {
      const encryptedConfig = {
        enabled: true,
        color_encrypted: 'encrypted-color-data',
        text_encrypted: 'encrypted-text-data'
      };

      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');
      mockDecryptData
        .mockResolvedValueOnce('#ff00ff')
        .mockResolvedValueOnce('Q4 2024 Release');

      const result = await privacyService.decryptReleaseLineConfig(encryptedConfig, testUserId);

      expect(result).toEqual({
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 Release'
      });

      expect(mockDecryptData).toHaveBeenCalledTimes(2);
      expect(mockDecryptData).toHaveBeenCalledWith('encrypted-color-data', testUserId);
      expect(mockDecryptData).toHaveBeenCalledWith('encrypted-text-data', testUserId);

      mockDecryptData.mockRestore();
    });

    it('should handle empty encrypted values', async () => {
      const encryptedConfig = {
        enabled: false,
        color_encrypted: '',
        text_encrypted: ''
      };

      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');
      mockDecryptData.mockResolvedValue('');

      const result = await privacyService.decryptReleaseLineConfig(encryptedConfig, testUserId);

      expect(result).toEqual({
        enabled: false,
        color: '',
        text: ''
      });

      mockDecryptData.mockRestore();
    });

    it('should preserve boolean enabled value without decryption', async () => {
      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');
      mockDecryptData.mockResolvedValue('mock-decrypted');

      // Test with enabled: true
      const enabledConfig = {
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-text'
      };
      const enabledResult = await privacyService.decryptReleaseLineConfig(enabledConfig, testUserId);
      expect(enabledResult.enabled).toBe(true);

      // Test with enabled: false
      const disabledConfig = {
        enabled: false,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-text'
      };
      const disabledResult = await privacyService.decryptReleaseLineConfig(disabledConfig, testUserId);
      expect(disabledResult.enabled).toBe(false);

      mockDecryptData.mockRestore();
    });
  });

  describe('Encryption/Decryption Roundtrip', () => {
    it('should successfully encrypt and decrypt release line config', async () => {
      // Mock the underlying encryption/decryption to simulate a working roundtrip
      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');

      // Set up mocks to simulate encryption/decryption
      mockEncryptData
        .mockImplementation(async (data: string) => ({
          encrypted: `encrypted-${data}`,
          hash: `hash-${data}`
        }));

      mockDecryptData
        .mockImplementation(async (encryptedData: string) => 
          encryptedData.replace('encrypted-', '')
        );

      // Test the roundtrip
      const originalConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024 Release'
      };

      // Encrypt
      const encrypted = await privacyService.encryptReleaseLineConfig(originalConfig, testUserId);
      expect(encrypted).toEqual({
        enabled: true,
        color_encrypted: 'encrypted-#ff00ff',
        text_encrypted: 'encrypted-Q4 2024 Release'
      });

      // Decrypt
      const decrypted = await privacyService.decryptReleaseLineConfig(encrypted, testUserId);
      expect(decrypted).toEqual(originalConfig);

      mockEncryptData.mockRestore();
      mockDecryptData.mockRestore();
    });

    it('should handle special characters in release line text', async () => {
      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');

      mockEncryptData
        .mockImplementation(async (data: string) => ({
          encrypted: `encrypted-${data}`,
          hash: `hash-${data}`
        }));

      mockDecryptData
        .mockImplementation(async (encryptedData: string) => 
          encryptedData.replace('encrypted-', '')
        );

      const configWithSpecialChars = {
        enabled: true,
        color: '#123abc',
        text: 'Release "2024" & Updates (Q4)'
      };

      const encrypted = await privacyService.encryptReleaseLineConfig(configWithSpecialChars, testUserId);
      const decrypted = await privacyService.decryptReleaseLineConfig(encrypted, testUserId);

      expect(decrypted).toEqual(configWithSpecialChars);

      mockEncryptData.mockRestore();
      mockDecryptData.mockRestore();
    });

    it('should handle maximum length text', async () => {
      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');

      mockEncryptData
        .mockImplementation(async (data: string) => ({
          encrypted: `encrypted-${data}`,
          hash: `hash-${data}`
        }));

      mockDecryptData
        .mockImplementation(async (encryptedData: string) => 
          encryptedData.replace('encrypted-', '')
        );

      // Test with 50 character text (maximum allowed)
      const maxLengthText = 'A'.repeat(50);
      const configWithMaxText = {
        enabled: true,
        color: '#ff0000',
        text: maxLengthText
      };

      const encrypted = await privacyService.encryptReleaseLineConfig(configWithMaxText, testUserId);
      const decrypted = await privacyService.decryptReleaseLineConfig(encrypted, testUserId);

      expect(decrypted).toEqual(configWithMaxText);
      expect(decrypted.text.length).toBe(50);

      mockEncryptData.mockRestore();
      mockDecryptData.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      mockEncryptData.mockRejectedValue(new Error('Encryption failed'));

      await expect(
        privacyService.encryptReleaseLineConfig(testReleaseLineConfig, testUserId)
      ).rejects.toThrow('Encryption failed');

      mockEncryptData.mockRestore();
    });

    it('should handle decryption errors gracefully', async () => {
      const encryptedConfig = {
        enabled: true,
        color_encrypted: 'invalid-encrypted-data',
        text_encrypted: 'invalid-encrypted-data'
      };

      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');
      mockDecryptData.mockRejectedValue(new Error('Decryption failed'));

      await expect(
        privacyService.decryptReleaseLineConfig(encryptedConfig, testUserId)
      ).rejects.toThrow('Decryption failed');

      mockDecryptData.mockRestore();
    });
  });

  describe('Integration with existing encryption methods', () => {
    it('should use the same encryption methods as other data types', async () => {
      const mockEncryptData = jest.spyOn(privacyService, 'encryptData');
      mockEncryptData.mockResolvedValue({ encrypted: 'test-encrypted', hash: 'test-hash' });

      await privacyService.encryptReleaseLineConfig(testReleaseLineConfig, testUserId);

      // Verify that the same encryptData method is called
      expect(mockEncryptData).toHaveBeenCalledWith('#ff00ff', testUserId);
      expect(mockEncryptData).toHaveBeenCalledWith('Q4 2024 Release', testUserId);

      mockEncryptData.mockRestore();
    });

    it('should use the same decryption methods as other data types', async () => {
      const encryptedConfig = {
        enabled: true,
        color_encrypted: 'encrypted-color',
        text_encrypted: 'encrypted-text'
      };

      const mockDecryptData = jest.spyOn(privacyService, 'decryptData');
      mockDecryptData.mockResolvedValue('test-decrypted');

      await privacyService.decryptReleaseLineConfig(encryptedConfig, testUserId);

      // Verify that the same decryptData method is called
      expect(mockDecryptData).toHaveBeenCalledWith('encrypted-color', testUserId);
      expect(mockDecryptData).toHaveBeenCalledWith('encrypted-text', testUserId);

      mockDecryptData.mockRestore();
    });
  });
});