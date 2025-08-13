import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'
import { supabase } from '@/lib/supabaseClient'

// Helper function to derive a 32-byte key using HMAC-SHA256 KDF
function deriveKey(keyMaterial: string, userId: string, context: string): string {
  // Use HMAC-SHA256 with the environment secret as the key
  const hmac = createHmac('sha256', keyMaterial)
  
  // Include userId and context for domain separation
  hmac.update(userId)
  hmac.update(':')
  hmac.update(context)
  
  // Get the full 32-byte digest and return as hex
  return hmac.digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, userId, keyType = 'primary' } = body

    // Validate required parameters
    if (!accessToken || !userId) {
      return NextResponse.json(
        { error: 'Access token and user ID are required' },
        { status: 400 }
      )
    }

    // Verify the access token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      )
    }

    // Verify the user ID matches the authenticated user
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Get the encryption key material from environment
    const keyMaterial = process.env.KEY_MATERIAL
    if (!keyMaterial) {
      return NextResponse.json(
        { error: 'Server configuration error: KEY_MATERIAL not configured' },
        { status: 500 }
      )
    }

    // Validate key material length for security
    if (keyMaterial.length < 32) {
      return NextResponse.json(
        { error: 'Server configuration error: KEY_MATERIAL too short' },
        { status: 500 }
      )
    }

    let encryptionKey: string

    // Generate key based on type using proper KDF with domain separation
    switch (keyType) {
      case 'primary': {
        // Derive primary key using HMAC-SHA256 KDF with "auth:primary" context
        encryptionKey = deriveKey(keyMaterial, userId, 'auth:primary')
        break
      }
      
      case 'fallback': {
        // Derive fallback key using HMAC-SHA256 KDF with "auth:fallback" context
        encryptionKey = deriveKey(keyMaterial, userId, 'auth:fallback')
        break
      }
      
      case 'legacy': {
        // Derive legacy key using HMAC-SHA256 KDF with "auth:legacy" context
        const legacySecret = 'fixed-app-secret-for-hill-chart-encryption-long-enough-secret'
        encryptionKey = deriveKey(legacySecret, userId, 'auth:legacy')
        break
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid key type. Must be primary, fallback, or legacy' },
          { status: 400 }
        )
    }

    return NextResponse.json({ encryptionKey })

  } catch (error) {
    console.error('Key generation API error:', error)
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error during key generation' },
      { status: 500 }
    )
  }
}
