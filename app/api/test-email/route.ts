import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing email service from API endpoint...');
    
    // Test SMTP connection first
    console.log('📡 Testing SMTP connection...');
    const connectionValid = await emailService.validateConnection();
    
    if (!connectionValid) {
      return NextResponse.json(
        { 
          error: 'SMTP connection failed',
          success: false,
          connectionValid: false
        },
        { status: 500 }
      );
    }

    console.log('📧 Sending test email...');
    
    // Send test email
    const emailSent = await emailService.sendAccessRequestNotification(
      'test-user@example.com',
      'This is a test email from the API endpoint to verify SMTP functionality.'
    );

    if (emailSent) {
      console.log('✅ Test email sent successfully');
      
      // Get health status
      const healthStatus = emailService.getHealthStatus();
      
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        connectionValid: true,
        emailSent: true,
        healthStatus,
      });
    } else {
      console.log('❌ Test email failed to send');
      
      return NextResponse.json(
        { 
          error: 'Email sending failed',
          success: false,
          connectionValid: true,
          emailSent: false
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('🚨 Test email API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during email test',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting email service health status...');
    
    const healthStatus = emailService.getHealthStatus();
    emailService.logMetricsSummary();
    
    return NextResponse.json({
      success: true,
      healthStatus,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('🚨 Health check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get health status',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}