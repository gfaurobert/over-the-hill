import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SignInForm from './SignInForm'

// Mock Supabase client
const mockSignInWithPassword = jest.fn()
const mockSignInWithOtp = jest.fn()

jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOtp: jest.fn(),
    },
  },
}))

// Get the mocked functions
import { supabase } from '../lib/supabaseClient'
beforeEach(() => {
  supabase.auth.signInWithPassword.mockImplementation(mockSignInWithPassword)
  supabase.auth.signInWithOtp.mockImplementation(mockSignInWithOtp)
})

describe('SignInForm Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with password visibility toggle', () => {
    render(<SignInForm />)
    
    // Check that form elements are present
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    
    // Check that password visibility toggle is present
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    expect(toggleButton).toBeInTheDocument()
    
    // Password should start hidden
    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('allows toggling password visibility during form interaction', () => {
    render(<SignInForm />)
    
    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    
    // Enter password
    fireEvent.change(passwordInput, { target: { value: 'mypassword123' } })
    expect(passwordInput).toHaveValue('mypassword123')
    
    // Toggle visibility
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password')
    
    // Password value should still be there
    expect(passwordInput).toHaveValue('mypassword123')
    
    // Toggle back to hidden
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password')
  })

  it('submits form with correct password regardless of visibility state', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    
    const mockOnSignIn = jest.fn()
    render(<SignInForm onSignIn={mockOnSignIn} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    
    // Fill form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    
    // Show password
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    // Submit form
    fireEvent.click(signInButton)
    
    // Verify Supabase was called with correct credentials
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
    
    // Verify success callback was called
    await waitFor(() => {
      expect(mockOnSignIn).toHaveBeenCalled()
    })
  })

  it('handles form validation with password visibility toggle', async () => {
    render(<SignInForm />)
    
    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    
    // Try to submit without filling required fields
    fireEvent.click(signInButton)
    
    // Form should not submit (HTML5 validation)
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    
    // Toggle password visibility should still work
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('disables password toggle when form is loading', async () => {
    // Mock a slow response
    mockSignInWithPassword.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)))
    
    render(<SignInForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    
    // Fill form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    
    // Submit form
    fireEvent.click(signInButton)
    
    // Toggle button should be disabled during loading
    await waitFor(() => {
      expect(toggleButton).toBeDisabled()
    })
  })

  it('resets password visibility on component remount', () => {
    const { unmount } = render(<SignInForm />)
    
    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    
    // Show password
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    // Unmount component
    unmount()
    
    // Remount component - should start hidden again
    render(<SignInForm />)
    const newPasswordInput = screen.getByLabelText('Password')
    expect(newPasswordInput).toHaveAttribute('type', 'password')
  })
})