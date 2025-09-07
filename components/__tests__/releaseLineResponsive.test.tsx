import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReleaseLineSettings } from '../ReleaseLineSettings'
import { ReleaseLineConfig } from '../HillChartApp'

// Mock the theme provider
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() })
}))

describe('ReleaseLineSettings - Responsive Design and Accessibility', () => {
  const defaultConfig: ReleaseLineConfig = {
    enabled: false,
    color: '#ff00ff',
    text: ''
  }

  const mockOnConfigChange = jest.fn()

  beforeEach(() => {
    mockOnConfigChange.mockClear()
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <ReleaseLineSettings
          config={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      )

      // Check for proper role and aria-labelledby
      expect(screen.getByRole('group')).toBeInTheDocument()
      
      // Check for screen reader only headings
      expect(screen.getByText('Release Line Settings')).toHaveClass('sr-only')
      
      // Check for proper labeling of toggle
      expect(screen.getByLabelText('Release Line')).toBeInTheDocument()
      
      // Check for aria-describedby on toggle
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-describedby', 'release-line-toggle-description')
    })

    it('should show additional accessibility features when enabled', () => {
      const enabledConfig = { ...defaultConfig, enabled: true }
      
      render(
        <ReleaseLineSettings
          config={enabledConfig}
          onConfigChange={mockOnConfigChange}
        />
      )

      // Check for color picker accessibility
      const colorPicker = screen.getByLabelText('Release line color picker')
      expect(colorPicker).toBeInTheDocument()
      expect(colorPicker).toHaveAttribute('aria-describedby', 'color-picker-description')

      // Check for color input accessibility
      const colorInput = screen.getByLabelText('Release line color hex value')
      expect(colorInput).toBeInTheDocument()
      expect(colorInput).toHaveAttribute('aria-describedby', 'color-input-description')

      // Check for text input accessibility
      const textInput = screen.getByLabelText('Label')
      expect(textInput).toBeInTheDocument()
      expect(textInput).toHaveAttribute('aria-describedby', 'text-input-description text-length-counter')

      // Check for live region on character counter
      const counter = screen.getByText('0/12 characters')
      expect(counter).toHaveAttribute('aria-live', 'polite')
    })

    it('should have proper focus management', () => {
      render(
        <ReleaseLineSettings
          config={{ ...defaultConfig, enabled: true }}
          onConfigChange={mockOnConfigChange}
        />
      )

      const colorPicker = screen.getByLabelText('Release line color picker')
      expect(colorPicker).toHaveClass('focus:ring-2', 'focus:ring-ring', 'focus:ring-offset-2')
    })

    it('should validate color input properly', () => {
      render(
        <ReleaseLineSettings
          config={{ ...defaultConfig, enabled: true }}
          onConfigChange={mockOnConfigChange}
        />
      )

      const colorInput = screen.getByLabelText('Release line color hex value')
      
      // Test valid hex color
      fireEvent.change(colorInput, { target: { value: '#123456' } })
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        enabled: true,
        color: '#123456'
      })

      mockOnConfigChange.mockClear()

      // Test invalid hex color - should not call onChange
      fireEvent.change(colorInput, { target: { value: 'invalid' } })
      expect(mockOnConfigChange).not.toHaveBeenCalled()
    })

    it('should enforce text length limit with live feedback', () => {
      const { rerender } = render(
        <ReleaseLineSettings
          config={{ ...defaultConfig, enabled: true }}
          onConfigChange={mockOnConfigChange}
        />
      )

      const textInput = screen.getByTestId('text-input')
      
      // Test within limit
      fireEvent.change(textInput, { target: { value: 'Q4 2024' } })
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        enabled: true,
        text: 'Q4 2024'
      })

      // Test counter with updated config
      rerender(
        <ReleaseLineSettings
          config={{ ...defaultConfig, enabled: true, text: 'Q4 2024' }}
          onConfigChange={mockOnConfigChange}
        />
      )

      // Check counter shows correct count
      expect(screen.getByText('7/12 characters')).toBeInTheDocument()

      mockOnConfigChange.mockClear()

      // Test at limit
      const newTextInput = screen.getByTestId('text-input')
      fireEvent.change(newTextInput, { target: { value: '123456789012' } })
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        enabled: true,
        text: '123456789012'
      })

      mockOnConfigChange.mockClear()

      // Test over limit - should not call onChange
      fireEvent.change(newTextInput, { target: { value: '1234567890123' } })
      expect(mockOnConfigChange).not.toHaveBeenCalled()
    })
  })

  describe('Responsive Design', () => {
    it('should render properly in different viewport sizes', () => {
      const { container } = render(
        <ReleaseLineSettings
          config={{ ...defaultConfig, enabled: true }}
          onConfigChange={mockOnConfigChange}
        />
      )

      // Check that the component uses responsive spacing
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('space-y-4')

      // Check that enabled settings have proper indentation
      const enabledSettings = screen.getByRole('group', { name: /Release Line Customization/i })
      expect(enabledSettings).toHaveClass('space-y-3', 'pl-4', 'border-l-2')
    })

    it('should handle color picker and input responsively', () => {
      render(
        <ReleaseLineSettings
          config={{ ...defaultConfig, enabled: true }}
          onConfigChange={mockOnConfigChange}
        />
      )

      // Check color picker container uses flex layout
      const colorContainer = screen.getByLabelText('Release line color picker').parentElement
      expect(colorContainer).toHaveClass('flex', 'items-center', 'gap-2')

      // Check color input uses flex-1 for responsive width
      const colorInput = screen.getByLabelText('Release line color hex value')
      expect(colorInput).toHaveClass('flex-1')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation through all interactive elements', () => {
      render(
        <ReleaseLineSettings
          config={{ ...defaultConfig, enabled: true }}
          onConfigChange={mockOnConfigChange}
        />
      )

      const toggle = screen.getByRole('switch')
      const colorPicker = screen.getByLabelText('Release line color picker')
      const colorInput = screen.getByLabelText('Release line color hex value')
      const textInput = screen.getByTestId('text-input')

      // All elements should be focusable
      expect(toggle).not.toHaveAttribute('tabindex', '-1')
      expect(colorPicker).not.toHaveAttribute('tabindex', '-1')
      expect(colorInput).not.toHaveAttribute('tabindex', '-1')
      expect(textInput).not.toHaveAttribute('tabindex', '-1')
    })

    it('should handle click on toggle', () => {
      render(
        <ReleaseLineSettings
          config={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)
      
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        enabled: true
      })
    })
  })
})