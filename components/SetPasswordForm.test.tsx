import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SetPasswordForm from './SetPasswordForm'

describe('SetPasswordForm Integration', () => {
  const mockOnPasswordSet = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with password visibility toggles for both password fields', () => {
    render(<SetPasswordForm onPasswordSet={mockOnPasswordSet} />)
    
    // Check that both password fields are present
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    
    expect(passwordInput).toBeInTheDocument()
    expect(confirmPasswordInput).toBeInTheDocument()
    
    // Check that both have visibility toggles
    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    expect(toggleButtons).toHaveLength(2)
    
    // Both should start hidden
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmPasswordInput).toHaveAttribute('type', 'password')
  })

  it('allows independent toggling of password visibility for both fields', () => {
    render(<SetPasswordForm onPasswordSet={mockOnPasswordSet} />)
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    
    // Toggle first password field
    fireEvent.click(toggleButtons[0])
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'password') // Should remain hidden
    
    // Toggle second password field
    fireEvent.click(toggleButtons[1])
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
    
    // Toggle first field back
    const hideButtons = screen.getAllByRole('button', { name: /hide password/i })
    fireEvent.click(hideButtons[0]) // Click the first password field's toggle
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmPasswordInput).toHaveAttribute('type', 'text') // Should remain visible
  })

  it('shows password strength indicator and allows visibility toggle', () => {
    render(<SetPasswordForm onPasswordSet={mockOnPasswordSet} />)
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    const toggleButton = screen.getAllByRole('button', { name: /show password/i })[0]
    
    // Enter a weak password
    fireEvent.change(passwordInput, { target: { value: '123' } })
    
    // Password strength indicator should appear
    expect(screen.getByText(/weak/i)).toBeInTheDocument()
    
    // Toggle visibility
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(passwordInput).toHaveValue('123')
    
    // Strength indicator should still be visible
    expect(screen.getByText(/weak/i)).toBeInTheDocument()
  })

  it('validates password match with visibility toggles active', async () => {
    render(<SetPasswordForm onPasswordSet={mockOnPasswordSet} />)
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    
    // Enter strong password
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    
    // Show both passwords
    fireEvent.click(toggleButtons[0])
    fireEvent.click(toggleButtons[1])
    
    // Both should be visible
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
    
    // Enter matching confirm password
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    
    // Both passwords should be visible and have the same value
    expect(passwordInput).toHaveValue('StrongPass123!')
    expect(confirmPasswordInput).toHaveValue('StrongPass123!')
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
  })

  it('disables password toggles when form is loading', async () => {
    // Mock slow password setting
    mockOnPasswordSet.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<SetPasswordForm onPasswordSet={mockOnPasswordSet} />)
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    const submitButton = screen.getByRole('button', { name: /set password/i })
    
    // Enter valid passwords
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    
    // Submit form
    fireEvent.click(submitButton)
    
    // Toggle buttons should be disabled during loading
    await waitFor(() => {
      toggleButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  it('maintains password visibility state during validation errors', () => {
    render(<SetPasswordForm onPasswordSet={mockOnPasswordSet} />)
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    const submitButton = screen.getByRole('button', { name: /set password/i })
    
    // Show passwords
    fireEvent.click(toggleButtons[0])
    fireEvent.click(toggleButtons[1])
    
    // Enter weak password
    fireEvent.change(passwordInput, { target: { value: 'weak' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } })
    
    // Try to submit (should fail due to weak password)
    fireEvent.click(submitButton)
    
    // Passwords should remain visible after validation error
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
    
    // Toggle buttons should still work
    const hideButtons = screen.getAllByRole('button', { name: /hide password/i })
    fireEvent.click(hideButtons[0]) // Click the first password field's toggle
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})