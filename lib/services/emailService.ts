import * as nodemailer from 'nodemailer';
import { emailMonitoring } from './emailMonitoring';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}



class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: SMTPConfig;

  constructor() {
    this.config = this.loadSMTPConfig();
  }

  /**
   * Load SMTP configuration from environment variables
   */
  private loadSMTPConfig(): SMTPConfig {
    // Force reload environment variables to avoid Next.js caching issues
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE;

    // Remove quotes if they exist (Next.js might add them)
    if (pass && pass.startsWith('"') && pass.endsWith('"')) {
      pass = pass.slice(1, -1);
    }

    console.log('🔧 Loading SMTP config:');
    console.log(`- Host: ${host}`);
    console.log(`- Port: ${port}`);
    console.log(`- User: ${user}`);
    console.log(`- Pass: ${pass ? `[${pass.length} chars] ${pass[0]}...${pass[pass.length-1]}` : 'NOT SET'}`);
    console.log(`- Secure: ${secure}`);

    if (!host || !port || !user || !pass) {
      throw new Error('Missing required SMTP configuration. Please check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.');
    }

    return {
      host,
      port: parseInt(port, 10),
      secure: secure === 'true',
      auth: {
        user,
        pass,
      },
    };
  }

  /**
   * Create and configure Nodemailer transporter
   * Creates a fresh transporter for each use to avoid connection issues
   */
  private async createTransporter(): Promise<nodemailer.Transporter> {
    try {
      console.log(`🔧 Creating fresh SMTP transporter for ${this.config.host}:${this.config.port}`);
      
      // Add a small delay to avoid rapid authentication attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const transportConfig = {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
        // Add timeout configuration
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 15000,     // 15 seconds
        // Force new connection for each email
        pool: false,
        // Add debug logging for troubleshooting
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development',
      };

      const transporter = nodemailer.createTransport(transportConfig);

      return transporter;
    } catch (error) {
      // Sanitize error to avoid logging SMTP credentials
      const sanitizedError = error instanceof Error 
        ? { message: error.message }
        : 'Unknown transporter creation error';
        
      console.error('❌ Failed to create email transporter:', sanitizedError);
      console.error(`📡 SMTP Host: ${this.config.host}:${this.config.port}`);
      throw new Error('Failed to initialize email service');
    }
  }

  /**
   * Validate SMTP connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const transporter = await this.createTransporter();
      await transporter.verify();
      const duration = Date.now() - startTime;
      
      console.log(`✅ SMTP connection validated successfully (${duration}ms)`);
      console.log(`📡 Connected to: ${this.config.host}:${this.config.port} (secure: ${this.config.secure})`);
      return true;
    } catch (error) {
      const sanitizedError = error instanceof Error 
        ? { message: error.message, code: (error as any).code }
        : 'Unknown SMTP error';
        
      console.error('❌ SMTP connection validation failed:', sanitizedError);
      console.error(`📡 Failed to connect to: ${this.config.host}:${this.config.port}`);
      return false;
    }
  }

  /**
   * Validate email address format
   */
  private validateEmailAddress(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Additional security checks
    const hasValidLength = email.length <= 254; // RFC 5321 limit
    const hasNoControlChars = !/[\x00-\x1F\x7F]/.test(email); // No control characters
    const hasNoInjectionChars = !/[<>"\r\n]/.test(email); // No potential injection characters
    
    return emailRegex.test(email) && hasValidLength && hasNoControlChars && hasNoInjectionChars;
  }

  /**
   * Sanitize message content to prevent injection attacks
   */
  private sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return '';
    }

    // Remove control characters and potential injection sequences
    let sanitized = message
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters except \t, \n, \r
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Convert remaining \r to \n
      .trim();

    // Limit message length to prevent abuse
    const maxLength = 5000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '... [message truncated]';
    }

    return sanitized;
  }

  /**
   * Send access request notification email
   */
  async sendAccessRequestNotification(
    requesterEmail: string,
    message: string
  ): Promise<boolean> {
    const fromEmail = process.env.FROM_EMAIL;
    const toEmail = process.env.TO_EMAIL;
    
    // Debug environment variables
    console.log('🔍 SMTP Debug Info:');
    console.log(`- SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`- SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`- SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '[SET - Length: ' + process.env.SMTP_PASS.length + '] First/Last: ' + process.env.SMTP_PASS[0] + '...' + process.env.SMTP_PASS[process.env.SMTP_PASS.length - 1] : 'NOT SET'}`);
    console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE}`);
    console.log(`- FROM_EMAIL: ${fromEmail}`);
    console.log(`- TO_EMAIL: ${toEmail}`);
    console.log(`- Config loaded: host=${this.config.host}, port=${this.config.port}, user=${this.config.auth.user}`);
    
    try {
      // Validate and sanitize inputs
      if (!this.validateEmailAddress(requesterEmail)) {
        console.error('❌ Invalid email address provided:', requesterEmail);
        console.warn('🔍 Email validation failed - check email format and security rules');
        return false;
      }

      const sanitizedMessage = this.sanitizeMessage(message);

      const transporter = await this.createTransporter();

      if (!fromEmail || !toEmail) {
        throw new Error('Missing FROM_EMAIL or TO_EMAIL environment variables');
      }

      // Validate configuration email addresses as well
      if (!this.validateEmailAddress(fromEmail) || !this.validateEmailAddress(toEmail)) {
        throw new Error('Invalid FROM_EMAIL or TO_EMAIL configuration');
      }

      const submittedAt = new Date();
      const emailTemplate = this.generateEmailTemplate(requesterEmail, sanitizedMessage, submittedAt);
      const plainTextTemplate = this.generatePlainTextTemplate(requesterEmail, sanitizedMessage, submittedAt);

      const mailOptions = {
        from: fromEmail,
        to: toEmail,
        subject: `Over The Hill - New Access Request from ${requesterEmail}`,
        html: emailTemplate,
        text: plainTextTemplate,
      };

      const emailStartTime = Date.now();
      const result = await transporter.sendMail(mailOptions);
      const emailDuration = Date.now() - emailStartTime;
      
      console.log(`✅ Access request notification sent successfully (${emailDuration}ms)`);
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log(`📧 From: ${fromEmail} → To: ${toEmail}`);
      console.log(`👤 Requester: ${requesterEmail}`);
      console.log(`📝 Message length: ${sanitizedMessage.length} characters`);
      
      // Record success metrics
      emailMonitoring.recordSuccess(emailDuration, requesterEmail);
      
      return true;
    } catch (error) {
      // Sanitize error to avoid logging sensitive information
      const sanitizedError = error instanceof Error 
        ? { 
            message: error.message, 
            code: (error as any).code,
            command: (error as any).command 
          }
        : 'Unknown email sending error';
        
      console.error('❌ Failed to send access request notification:', sanitizedError);
      console.error(`📧 Failed to send from ${fromEmail} to ${toEmail}`);
      console.error(`👤 Requester: ${requesterEmail}`);
      
      // Record failure metrics
      const errorMessage = typeof sanitizedError === 'string' 
        ? sanitizedError 
        : sanitizedError.message || 'Unknown error';
      emailMonitoring.recordFailure(errorMessage, requesterEmail);
      
      return false;
    }
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(
    requesterEmail: string,
    message: string,
    submittedAt: Date
  ): string {
    // Escape HTML to prevent injection attacks
    const escapeHtml = (text: string): string => {
      if (!text || typeof text !== 'string') {
        return '';
      }

      const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;',
      };
      
      return text.replace(/[&<>"'`=/]/g, (m) => map[m]);
    };

    const escapedEmail = escapeHtml(requesterEmail);
    const escapedMessage = message && message.trim() ? escapeHtml(message) : 'No message provided';
    const formattedDate = submittedAt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Access Request</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 30px -30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .info-section {
            margin-bottom: 25px;
            padding: 15px;
            background-color: #f8fafc;
            border-left: 4px solid #2563eb;
            border-radius: 4px;
        }
        .info-label {
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 16px;
            word-break: break-word;
        }
        .message-section {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            margin: 20px 0;
        }
        .message-content {
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .cta {
            background-color: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin-top: 20px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 New Access Request</h1>
        </div>
        
        <div class="info-section">
            <div class="info-label">Requester Email:</div>
            <div class="info-value">${escapedEmail}</div>
        </div>
        
        <div class="info-section">
            <div class="info-label">Submitted At:</div>
            <div class="info-value">${formattedDate}</div>
        </div>
        
        <div class="message-section">
            <div class="info-label">Message:</div>
            <div class="message-content">${escapedMessage}</div>
        </div>
        
        <div style="text-align: center;">
            <a href="mailto:${escapedEmail}" class="cta">Reply to Requester</a>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from Over The Hill access request system.</p>
            <p>Please review and respond to this access request promptly.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get email service health and metrics
   */
  getHealthStatus(): {
    isHealthy: boolean;
    status: string;
    metrics: any;
  } {
    return {
      isHealthy: emailMonitoring.isHealthy(),
      status: emailMonitoring.getHealthStatus(),
      metrics: emailMonitoring.getMetrics(),
    };
  }

  /**
   * Log email service metrics summary
   */
  logMetricsSummary(): void {
    emailMonitoring.logSummary();
  }

  /**
   * Generate plain text email template
   */
  private generatePlainTextTemplate(
    requesterEmail: string,
    message: string,
    submittedAt: Date
  ): string {
    const formattedDate = submittedAt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const displayMessage = (message && message.trim()) || 'No message provided';

    return `
NEW ACCESS REQUEST

Requester Email: ${requesterEmail}
Submitted At: ${formattedDate}

Message:
${displayMessage}

---
Reply to requester: ${requesterEmail}

This is an automated notification from Over The Hill access request system.
Please review and respond to this access request promptly.
    `.trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;