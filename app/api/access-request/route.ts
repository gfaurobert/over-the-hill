import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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