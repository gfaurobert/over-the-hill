import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabaseClient'

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

    // Generate key based on type
    switch (keyType) {
      case 'primary': {
        // Create a deterministic but secure key from user ID and the environment secret
        const combinedKeyMaterial = `${userId}:${keyMaterial}`
        const hash = createHash('sha256')
        hash.update(combinedKeyMaterial)
        encryptionKey = hash.digest('hex').substring(0, 64) // Use first 64 chars for AES-256 (32 bytes)
        break
      }
      
      case 'fallback': {
        // Generate fallback key for backwards compatibility
        const hash = createHash('sha256')
        hash.update(`fallback-key-${userId}-${keyMaterial}`)
        encryptionKey = hash.digest('hex').substring(0, 64)
        break
      }
      
      case 'legacy': {
        // Generate legacy key using the old hard-coded secret for backwards compatibility
        const legacySecret = 'fixed-app-secret-for-hill-chart-encryption-long-enough-secret'
        const combinedKeyMaterial = `${userId}:${legacySecret}`
        const hash = createHash('sha256')
        hash.update(combinedKeyMaterial)
        encryptionKey = hash.digest('hex').substring(0, 64)
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
