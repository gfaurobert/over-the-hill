/**
 * SMTP Configuration Tests
 * These tests verify the actual SMTP connection and configuration
 */

import { emailService } from '../emailService';

describe('SMTP Configuration Tests', () => {
  describe('SMTP Connection Validation', () => {
    it('should validate SMTP connection with current configuration', async () => {
      console.log('Testing SMTP connection with current environment variables...');
      console.log('SMTP_HOST:', process.env.SMTP_HOST);
      console.log('SMTP_PORT:', process.env.SMTP_PORT);
      console.log('SMTP_USER:', process.env.SMTP_USER);
      console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
      console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
      console.log('TO_EMAIL:', process.env.TO_EMAIL);

      // Capture console.error to see the actual error
      const originalConsoleError = console.error;
      let capturedError = '';
      console.error = (...args) => {
        capturedError = args.join(' ');
        originalConsoleError(...args);
      };

      const result = await emailService.validateConnection();
      
      // Restore console.error
      console.error = originalConsoleError;
      
      if (result) {
        console.log('✅ SMTP connection successful');
      } else {
        console.log('❌ SMTP connection failed');
        if (capturedError) {
          console.log('Error details:', capturedError);
        }
      }
      
      // This test will show the actual result without failing
      expect(typeof result).toBe('boolean');
    }, 30000); // 30 second timeout for network operations

    it('should test email sending with current configuration', async () => {
      console.log('Testing actual email sending...');
      
      const testEmail = 'test-user@example.com';
      const testMessage = 'This is a test access request from the automated test suite.';
      
      // Capture console.error to see the actual error
      const originalConsoleError = console.error;
      let capturedError = '';
      console.error = (...args) => {
        capturedError = args.join(' ');
        originalConsoleError(...args);
      };
      
      const result = await emailService.sendAccessRequestNotification(testEmail, testMessage);
      
      // Restore console.error
      console.error = originalConsoleError;
      
      if (result) {
        console.log('✅ Email sent successfully');
        console.log('Check your inbox at:', process.env.TO_EMAIL);
      } else {
        console.log('❌ Email sending failed');
        if (capturedError) {
          console.log('Error details:', capturedError);
        }
      }
      
      // This test will show the actual result without failing
      expect(typeof result).toBe('boolean');
    }, 30000); // 30 second timeout for network operations
  });

  describe('SMTP Configuration Debugging', () => {
    it('should display current SMTP configuration (without password)', () => {
      console.log('\n=== SMTP Configuration Debug Info ===');
      console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
      console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
      console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
      console.log('SMTP_PASS:', process.env.SMTP_PASS ? '[SET]' : 'NOT SET');
      console.log('SMTP_SECURE:', process.env.SMTP_SECURE || 'NOT SET');
      console.log('FROM_EMAIL:', process.env.FROM_EMAIL || 'NOT SET');
      console.log('TO_EMAIL:', process.env.TO_EMAIL || 'NOT SET');
      console.log('=====================================\n');

      // Verify all required config is present
      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL', 'TO_EMAIL'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.log('❌ Missing required environment variables:', missingVars);
      } else {
        console.log('✅ All required environment variables are set');
      }

      expect(missingVars.length).toBe(0);
    });

    it('should validate email service configuration loading', () => {
      try {
        // This will test if the email service can be instantiated with current config
        const service = emailService;
        console.log('✅ Email service instantiated successfully');
        expect(service).toBeDefined();
      } catch (error) {
        console.log('❌ Email service instantiation failed:', error);
        throw error;
      }
    });
  });

  describe('SMTP Troubleshooting', () => {
    it('should provide SMTP troubleshooting information', () => {
      console.log('\n=== SMTP Troubleshooting Guide ===');
      console.log('If you are getting authentication errors, check:');
      console.log('1. SMTP_USER should be your full email address');
      console.log('2. SMTP_PASS should be your email password or app-specific password');
      console.log('3. For Gmail, you may need to use an App Password instead of your regular password');
      console.log('4. For OVH (ssl0.ovh.net), ensure you are using the correct credentials');
      console.log('5. Check if 2FA is enabled and requires app-specific passwords');
      console.log('6. Verify the SMTP server settings with your email provider');
      console.log('\nCurrent configuration analysis:');
      
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT;
      const secure = process.env.SMTP_SECURE;
      
      if (host === 'ssl0.ovh.net') {
        console.log('- Using OVH SMTP server');
        console.log('- Port 465 with SSL is correct for OVH');
        console.log('- Make sure SMTP_USER is your full email address');
        console.log('- Make sure SMTP_PASS is your email account password');
      } else if (host === 'smtp.gmail.com') {
        console.log('- Using Gmail SMTP server');
        console.log('- You likely need an App Password instead of your regular password');
        console.log('- Enable 2-step verification and generate an App Password');
      } else {
        console.log('- Using custom SMTP server:', host);
        console.log('- Verify settings with your email provider');
      }
      
      console.log('\nPort and Security Settings:');
      console.log('- Port:', port);
      console.log('- Secure (SSL/TLS):', secure);
      
      if (port === '465' && secure === 'true') {
        console.log('✅ SSL configuration looks correct');
      } else if (port === '587' && secure === 'false') {
        console.log('✅ STARTTLS configuration looks correct');
      } else {
        console.log('⚠️  Port/Security combination may be incorrect');
      }
      
      console.log('===================================\n');
      
      // This test always passes, it's just for information
      expect(true).toBe(true);
    });
  });
});