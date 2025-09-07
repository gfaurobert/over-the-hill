import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { emailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, message } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    let messageEncrypted = '';
    
    // For access requests, we'll store the message as-is since these are public form submissions
    // from users who don't have accounts yet. The message_encrypted field can store plain text.
    if (message && typeof message === 'string' && message.trim()) {
      messageEncrypted = message.trim();
    }

    // Insert into database with correct column name
    const { error: insertError } = await supabase
      .from('access_requests')
      .insert({
        email: email.toLowerCase().trim(),
        message_encrypted: messageEncrypted
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      
      // Handle duplicate email constraint
      if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'An access request with this email already exists. Please check your email or contact support.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to submit access request. Please try again.' },
        { status: 500 }
      );
    }

    // Send email notification after successful database insertion
    // This is done asynchronously and failures won't affect the access request success
    const emailStartTime = Date.now();
    try {
      console.log(`Attempting to send email notification for access request: ${email}`);
      
      const emailSent = await emailService.sendAccessRequestNotification(
        email.toLowerCase().trim(),
        messageEncrypted || ''
      );
      
      const emailDuration = Date.now() - emailStartTime;
      
      if (emailSent) {
        console.log(`✅ Email notification sent successfully for access request: ${email} (${emailDuration}ms)`);
        console.log(`📧 Notification sent to admin: ${process.env.TO_EMAIL}`);
      } else {
        console.warn(`⚠️ Email notification failed for access request: ${email} (${emailDuration}ms)`);
        console.warn(`📧 Failed to notify admin: ${process.env.TO_EMAIL}`);
      }
    } catch (emailError) {
      const emailDuration = Date.now() - emailStartTime;
      
      // Log email errors but don't fail the request
      // Ensure we don't log sensitive SMTP credentials
      const sanitizedError = emailError instanceof Error 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? { message: emailError.message, code: (emailError as any).code }
        : 'Unknown email error';
        
      console.error(`❌ Email notification error for ${email} (${emailDuration}ms):`, sanitizedError);
      console.warn(`✅ Access request stored successfully but email notification failed for: ${email}`);
      console.info(`🔧 Check SMTP configuration and connectivity`);
    }

    return NextResponse.json(
      { message: 'Access request submitted successfully' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Access request API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}