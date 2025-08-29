import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  try {
    // Create admin client with service role key inside the function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify the request is authenticated (you might want to add more validation here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete the user account from auth.users
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'User account deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in delete-account API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
