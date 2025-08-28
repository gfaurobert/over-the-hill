import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PasswordInput } from './password-input'

describe('PasswordInput', () => {
  it('renders with password type by default', () => {
    render(<PasswordInput data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('renders with eye icon when password is hidden', () => {
    render(<PasswordInput />)
    const eyeIcon = screen.getByRole('button')
    expect(eyeIcon).toBeInTheDocument()
    // The Eye icon should be visible (not EyeOff)
    expect(eyeIcon.querySelector('svg')).toBeInTheDocument()
  })

  it('toggles password visibility when button is clicked', () => {
    render(<PasswordInput data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    const toggleButton = screen.getByRole('button')

    // Initially should be password type
    expect(input).toHaveAttribute('type', 'password')

    // Click to show password
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')

    // Click again to hide password
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('passes through all input props correctly', () => {
    const handleChange = jest.fn()
    render(
      <PasswordInput
        data-testid="password-input"
        placeholder="Enter password"
        value="test123"
        onChange={handleChange}
        disabled={false}
      />
    )
    
    const input = screen.getByTestId('password-input')
    expect(input).toHaveAttribute('placeholder', 'Enter password')
    expect(input).toHaveValue('test123')
    expect(input).not.toBeDisabled()
  })

  it('disables toggle button when input is disabled', () => {
    render(<PasswordInput disabled />)
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toBeDisabled()
  })

  it('has proper accessibility attributes', () => {
    render(<PasswordInput />)
    const toggleButton = screen.getByRole('button')
    
    // Should have proper ARIA label
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password')
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false')
    
    // Click to show password
    fireEvent.click(toggleButton)
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password')
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('responds to keyboard events', () => {
    render(<PasswordInput data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    const toggleButton = screen.getByRole('button')

    // Initially should be password type
    expect(input).toHaveAttribute('type', 'password')

    // Press Enter to toggle
    fireEvent.keyDown(toggleButton, { key: 'Enter' })
    expect(input).toHaveAttribute('type', 'text')

    // Press Space to toggle back
    fireEvent.keyDown(toggleButton, { key: ' ' })
    expect(input).toHaveAttribute('type', 'password')
  })

  it('preserves cursor position during toggle', async () => {
    render(<PasswordInput data-testid="password-input" defaultValue="test123" />)
    const input = screen.getByTestId('password-input') as HTMLInputElement
    const toggleButton = screen.getByRole('button')

    // Set cursor position to middle of text
    input.focus()
    input.setSelectionRange(3, 3)
    
    // Toggle visibility
    fireEvent.click(toggleButton)
    
    // Wait for async cursor position restoration
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Cursor position should be preserved
    expect(input.selectionStart).toBe(3)
    expect(input.selectionEnd).toBe(3)
  })

  it('starts with hidden state by default for security', () => {
    render(<PasswordInput data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    const toggleButton = screen.getByRole('button')
    
    // Should start hidden
    expect(input).toHaveAttribute('type', 'password')
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false')
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password')
  })

  it('resets visibility when component unmounts', () => {
    const { unmount } = render(<PasswordInput data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    const toggleButton = screen.getByRole('button')

    // Show password
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')

    // Unmount component
    unmount()

    // Re-render component - should start hidden again
    render(<PasswordInput data-testid="password-input-2" />)
    const newInput = screen.getByTestId('password-input-2')
    expect(newInput).toHaveAttribute('type', 'password')
  })

  it('hides password when page visibility changes', () => {
    render(<PasswordInput data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    const toggleButton = screen.getByRole('button')

    // Show password
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')

    // Simulate page becoming hidden
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: true,
    })
    fireEvent(document, new Event('visibilitychange'))

    // Password should be hidden
    expect(input).toHaveAttribute('type', 'password')
  })

  it('maintains form security during visibility toggle', () => {
    const handleSubmit = jest.fn()
    render(
      <form onSubmit={handleSubmit}>
        <PasswordInput data-testid="password-input" name="password" value="secret123" readOnly />
        <button type="submit">Submit</button>
      </form>
    )
    
    const input = screen.getByTestId('password-input')
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    const submitButton = screen.getByText('Submit')

    // Show password
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')

    // Submit form
    fireEvent.click(submitButton)

    // Form submission should work regardless of visibility state
    expect(handleSubmit).toHaveBeenCalled()
  })

  it('works correctly with controlled component pattern', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('initial')
      return (
        <PasswordInput
          data-testid="password-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )
    }

    render(<TestComponent />)
    const input = screen.getByTestId('password-input') as HTMLInputElement
    const toggleButton = screen.getByRole('button')

    // Initial value should be set
    expect(input.value).toBe('initial')

    // Change value
    fireEvent.change(input, { target: { value: 'updated' } })
    expect(input.value).toBe('updated')

    // Toggle visibility should still work
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')
    expect(input.value).toBe('updated')
  })
})