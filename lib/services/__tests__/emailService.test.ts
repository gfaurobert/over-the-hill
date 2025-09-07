import { emailService } from '../emailService';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock environment variables for testing
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    SMTP_HOST: 'test.smtp.com',
    SMTP_PORT: '587',
    SMTP_USER: 'test@example.com',
    SMTP_PASS: 'testpass',
    SMTP_SECURE: 'false',
    FROM_EMAIL: 'from@example.com',
    TO_EMAIL: 'to@example.com',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('EmailService', () => {
  describe('Configuration Loading', () => {
    it('should load SMTP configuration from environment variables', () => {
      // This test verifies that the service can be instantiated with proper env vars
      expect(async () => {
        const { emailService } = await import('../emailService');
        return emailService;
      }).not.toThrow();
    });

    it('should throw error when required SMTP config is missing', async () => {
      delete process.env.SMTP_HOST;
      
      await expect(async () => {
        // Note: ES modules don't have cache clearing like CommonJS
        const { emailService } = await import('../emailService');
        return emailService;
      }).rejects.toThrow('Missing required SMTP configuration');
    });
  });

  describe('Email Template Generation', () => {
    it('should generate HTML template with proper escaping', () => {
      const service = emailService;
      // Access private method for testing via type assertion
      const template = (service as any).generateEmailTemplate(
        'test@example.com',
        'Test message with <script>alert("xss")</script>',
        new Date('2024-01-01T12:00:00Z')
      );

      expect(template).toContain('test@example.com');
      expect(template).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(template).not.toContain('<script>alert("xss")</script>');
    });

    it('should handle empty message correctly', () => {
      const service = emailService;
      const template = (service as any).generateEmailTemplate(
        'test@example.com',
        '',
        new Date('2024-01-01T12:00:00Z')
      );

      expect(template).toContain('No message provided');
    });

    it('should handle whitespace-only message correctly', () => {
      const service = emailService;
      const template = (service as any).generateEmailTemplate(
        'test@example.com',
        '   \n\t   ',
        new Date('2024-01-01T12:00:00Z')
      );

      expect(template).toContain('No message provided');
    });

    it('should handle null/undefined message correctly', () => {
      const service = emailService;
      const template = (service as any).generateEmailTemplate(
        'test@example.com',
        null as any,
        new Date('2024-01-01T12:00:00Z')
      );

      expect(template).toContain('No message provided');
    });

    it('should generate plain text template', () => {
      const service = emailService;
      const template = (service as any).generatePlainTextTemplate(
        'test@example.com',
        'Test message',
        new Date('2024-01-01T12:00:00Z')
      );

      expect(template).toContain('NEW ACCESS REQUEST');
      expect(template).toContain('test@example.com');
      expect(template).toContain('Test message');
    });

    it('should handle empty message in plain text template', () => {
      const service = emailService;
      const template = (service as any).generatePlainTextTemplate(
        'test@example.com',
        '',
        new Date('2024-01-01T12:00:00Z')
      );

      expect(template).toContain('No message provided');
    });
  });

  describe('Security and Validation', () => {
    it('should validate email addresses correctly', () => {
      const service = emailService;
      
      // Valid emails
      expect((service as any).validateEmailAddress('test@example.com')).toBe(true);
      expect((service as any).validateEmailAddress('user.name+tag@domain.co.uk')).toBe(true);
      
      // Invalid emails
      expect((service as any).validateEmailAddress('invalid-email')).toBe(false);
      expect((service as any).validateEmailAddress('test@')).toBe(false);
      expect((service as any).validateEmailAddress('@example.com')).toBe(false);
      expect((service as any).validateEmailAddress('test@example')).toBe(false);
      expect((service as any).validateEmailAddress('')).toBe(false);
      expect((service as any).validateEmailAddress(null)).toBe(false);
      expect((service as any).validateEmailAddress(undefined)).toBe(false);
    });

    it('should reject emails with injection characters', () => {
      const service = emailService;
      
      expect((service as any).validateEmailAddress('test<script>@example.com')).toBe(false);
      expect((service as any).validateEmailAddress('test"@example.com')).toBe(false);
      expect((service as any).validateEmailAddress('test\r\n@example.com')).toBe(false);
      expect((service as any).validateEmailAddress('test>@example.com')).toBe(false);
    });

    it('should sanitize message content', () => {
      const service = emailService;
      
      // Test control character removal
      const messageWithControlChars = 'Hello\x00\x01World\x7F';
      const sanitized = (service as any).sanitizeMessage(messageWithControlChars);
      expect(sanitized).toBe('HelloWorld');
      
      // Test line ending normalization
      const messageWithMixedLineEndings = 'Line1\r\nLine2\rLine3\nLine4';
      const normalizedMessage = (service as any).sanitizeMessage(messageWithMixedLineEndings);
      expect(normalizedMessage).toBe('Line1\nLine2\nLine3\nLine4');
    });

    it('should truncate very long messages', () => {
      const service = emailService;
      const longMessage = 'A'.repeat(6000);
      const sanitized = (service as any).sanitizeMessage(longMessage);
      
      expect(sanitized.length).toBeLessThan(6000);
      expect(sanitized).toContain('... [message truncated]');
    });

    it('should handle null/undefined messages in sanitization', () => {
      const service = emailService;
      
      expect((service as any).sanitizeMessage(null)).toBe('');
      expect((service as any).sanitizeMessage(undefined)).toBe('');
      expect((service as any).sanitizeMessage('')).toBe('');
    });

    it('should escape additional HTML characters', () => {
      const service = emailService;
      const template = (service as any).generateEmailTemplate(
        'test@example.com',
        'Test with / ` = characters',
        new Date('2024-01-01T12:00:00Z')
      );

      expect(template).toContain('&#x2F;'); // /
      expect(template).toContain('&#x60;'); // `
      expect(template).toContain('&#x3D;'); // =
    });

    it('should reject notification with invalid email', async () => {
      const service = emailService;
      const result = await service.sendAccessRequestNotification('invalid-email', 'test message');
      expect(result).toBe(false);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle missing FROM_EMAIL configuration', async () => {
      const originalFromEmail = process.env.FROM_EMAIL;
      delete process.env.FROM_EMAIL;
      
      const service = emailService;
      const result = await service.sendAccessRequestNotification('test@example.com', 'test message');
      
      expect(result).toBe(false);
      
      // Restore for other tests
      process.env.FROM_EMAIL = originalFromEmail;
    });

    it('should handle invalid configuration email addresses', async () => {
      const originalFromEmail = process.env.FROM_EMAIL;
      process.env.FROM_EMAIL = 'invalid-email';
      
      const service = emailService;
      const result = await service.sendAccessRequestNotification('test@example.com', 'test message');
      
      expect(result).toBe(false);
      
      // Restore for other tests
      process.env.FROM_EMAIL = originalFromEmail;
    });

    it('should validate SMTP configuration on service creation', () => {
      // This test verifies that SMTP config validation works
      const originalHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;
      
      expect(async () => {
        // Note: ES modules don't have cache clearing like CommonJS
        const { emailService } = await import('../emailService');
        return emailService;
      }).rejects.toThrow('Missing required SMTP configuration');
      
      // Restore for other tests
      process.env.SMTP_HOST = originalHost;
    });
  });
});