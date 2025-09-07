/**
 * Accessibility and component behavior tests for release line functionality
 * Tests keyboard navigation, ARIA labels, and user interaction patterns
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReleaseLineSettings } from '../ReleaseLineSettings'
import { HillChartApp } from '../HillChartApp'
import type { ReleaseLineConfig, Collection, Dot } from '../HillChartApp'

// Mock the UI components with accessibility features
jest.mock('../ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: React.ComponentProps<'input'> & { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void 
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="release-line-toggle"
      aria-label="Enable release line"
      {...props}
    />
  ),
}))

jest.mock('../ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => (
    <input 
      data-testid={props['data-testid'] || 'input'} 
      aria-label={props['aria-label']}
      {...props} 
    />
  ),
}))

jest.mock('../ui/label', () => ({
  Label: ({ children, htmlFor, ...props }: React.ComponentProps<'label'> & { children: React.ReactNode }) => (
    <label htmlFor={htmlFor} {...props}>{children}</label>
  ),
}))

describe('Release Line Accessibility', () => {
  const user = userEvent.setup()

  const defaultConfig: ReleaseLineConfig = {
    enabled: false,
    color: '#ff00ff',
    text: '',
  }

  const mockOnConfigChange = jest.fn()

  beforeEach(() => {
    mockOnConfigChange.mockClear()
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for toggle switch', async () => {
      render(
        <ReleaseLineSettings config={defaultConfig} onConfigChange={mockOnConfigChange} />
      )

      const toggle = screen.getByTestId('release-line-toggle')
      
      // Focus the toggle
      toggle.focus()
      expect(toggle).toHaveFocus()

      // Activate with Space key
      await user.keyboard(' ')
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        enabled: true,
      })
    })

    it('should support keyboard navigation for color picker', async () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const colorPicker = screen.getByTestId('color-picker')
      
      // Focus the color picker
      colorPicker.focus()
      expect(colorPicker).toHaveFocus()

      // Change color value
      await user.clear(colorPicker)
      await user.type(colorPicker, '#00ff00')

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...enabledConfig,
        color: '#00ff00',
      })
    })

    it('should support keyboard navigation for text input', async () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const textInput = screen.getByTestId('text-input')
      
      // Focus the text input
      textInput.focus()
      expect(textInput).toHaveFocus()

      // Type text
      await user.type(textInput, 'Q4 2024')

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...enabledConfig,
        text: 'Q4 2024',
      })
    })

    it('should support Tab navigation between controls', async () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const toggle = screen.getByTestId('release-line-toggle')
      const colorPicker = screen.getByTestId('color-picker')
      const textInput = screen.getByTestId('text-input')

      // Start with toggle focused
      toggle.focus()
      expect(toggle).toHaveFocus()

      // Tab to color picker
      await user.tab()
      expect(colorPicker).toHaveFocus()

      // Tab to text input
      await user.tab()
      expect(textInput).toHaveFocus()

      // Shift+Tab back to color picker
      await user.tab({ shift: true })
      expect(colorPicker).toHaveFocus()
    })
  })

  describe('ARIA Labels and Accessibility Attributes', () => {
    it('should have proper ARIA labels for all controls', () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      // Check toggle has aria-label
      const toggle = screen.getByTestId('release-line-toggle')
      expect(toggle).toHaveAttribute('aria-label', 'Enable release line')

      // Check color picker has aria-label
      const colorPicker = screen.getByTestId('color-picker')
      expect(colorPicker).toHaveAttribute('aria-label')

      // Check text input has aria-label
      const textInput = screen.getByTestId('text-input')
      expect(textInput).toHaveAttribute('aria-label')
    })

    it('should associate labels with form controls', () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      // Check that labels are properly associated
      expect(screen.getByText('Release Line')).toBeInTheDocument()
      expect(screen.getByText('Color')).toBeInTheDocument()
      expect(screen.getByText('Label')).toBeInTheDocument()
    })

    it('should indicate required fields appropriately', () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      // Color should be required when enabled
      const colorPicker = screen.getByTestId('color-picker')
      expect(colorPicker).toHaveAttribute('required')

      // Text should be optional
      const textInput = screen.getByTestId('text-input')
      expect(textInput).not.toHaveAttribute('required')
    })

    it('should provide feedback for invalid inputs', async () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const textInput = screen.getByTestId('text-input')
      
      // Try to enter text that's too long
      const longText = 'a'.repeat(13) // Exceeds 12 character limit
      await user.type(textInput, longText)

      // Should not call onConfigChange for invalid input
      expect(mockOnConfigChange).not.toHaveBeenCalled()

      // Should show character count feedback
      expect(screen.getByText(/characters/)).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce state changes to screen readers', async () => {
      render(
        <ReleaseLineSettings config={defaultConfig} onConfigChange={mockOnConfigChange} />
      )

      const toggle = screen.getByTestId('release-line-toggle')
      
      // Initial state should be announced
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      // Change state
      await user.click(toggle)

      // New state should be announced
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        enabled: true,
      })
    })

    it('should provide descriptive text for complex controls', () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
        text: 'Q4 2024',
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      // Character count should be announced
      expect(screen.getByText('7/12 characters')).toBeInTheDocument()
    })

    it('should handle dynamic content updates accessibly', async () => {
      const { rerender } = render(
        <ReleaseLineSettings config={defaultConfig} onConfigChange={mockOnConfigChange} />
      )

      // Initially, color and text controls should not be visible
      expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument()
      expect(screen.queryByTestId('text-input')).not.toBeInTheDocument()

      // Enable release line
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      rerender(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      // Controls should now be visible and accessible
      expect(screen.getByTestId('color-picker')).toBeInTheDocument()
      expect(screen.getByTestId('text-input')).toBeInTheDocument()
    })
  })

  describe('High Contrast and Theme Support', () => {
    it('should work with high contrast themes', () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
        color: '#ffffff', // High contrast white
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const colorPicker = screen.getByTestId('color-picker')
      expect(colorPicker).toHaveValue('#ffffff')
    })

    it('should maintain readability in dark themes', () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
        color: '#000000', // High contrast black
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const colorPicker = screen.getByTestId('color-picker')
      expect(colorPicker).toHaveValue('#000000')
    })
  })

  describe('Error Handling and User Feedback', () => {
    it('should provide clear error messages for invalid inputs', async () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const textInput = screen.getByTestId('text-input')
      
      // Enter text that exceeds limit
      const longText = 'This text is too long for the input field'
      await user.type(textInput, longText)

      // Should show character count warning
      const characterCount = screen.getByText(/characters/)
      expect(characterCount).toBeInTheDocument()
    })

    it('should handle rapid user interactions gracefully', async () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const toggle = screen.getByTestId('release-line-toggle')
      
      // Rapid clicking should not cause issues
      await user.click(toggle)
      await user.click(toggle)
      await user.click(toggle)

      // Should handle all interactions
      expect(mockOnConfigChange).toHaveBeenCalledTimes(3)
    })

    it('should maintain focus after state changes', async () => {
      render(
        <ReleaseLineSettings config={defaultConfig} onConfigChange={mockOnConfigChange} />
      )

      const toggle = screen.getByTestId('release-line-toggle')
      
      // Focus and activate toggle
      toggle.focus()
      await user.click(toggle)

      // Focus should be maintained
      expect(toggle).toHaveFocus()
    })
  })

  describe('Mobile and Touch Accessibility', () => {
    it('should support touch interactions', async () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      const colorPicker = screen.getByTestId('color-picker')
      
      // Simulate touch interaction
      fireEvent.touchStart(colorPicker)
      fireEvent.change(colorPicker, { target: { value: '#00ff00' } })
      fireEvent.touchEnd(colorPicker)

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...enabledConfig,
        color: '#00ff00',
      })
    })

    it('should have appropriate touch targets', () => {
      const enabledConfig: ReleaseLineConfig = {
        ...defaultConfig,
        enabled: true,
      }

      render(
        <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
      )

      // All interactive elements should be present and accessible
      expect(screen.getByTestId('release-line-toggle')).toBeInTheDocument()
      expect(screen.getByTestId('color-picker')).toBeInTheDocument()
      expect(screen.getByTestId('text-input')).toBeInTheDocument()
    })
  })

  describe('Integration with Hill Chart Accessibility', () => {
    const mockCollection: Collection = {
      id: 'test-collection',
      name: 'Test Collection',
      status: 'active',
      dots: [] as Dot[]
    }

    const mockReleaseLineConfig: ReleaseLineConfig = {
      enabled: true,
      color: '#ff00ff',
      text: 'Q4 2024'
    }

    it('should provide accessible SVG elements', () => {
      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('role', 'img')
      expect(svg).toHaveAttribute('aria-label')

      // Release line should have descriptive attributes
      const releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toBeInTheDocument()
    })

    it('should announce release line information to screen readers', () => {
      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      // SVG should have descriptive aria-label that includes release line info
      const svg = container.querySelector('svg')
      const ariaLabel = svg?.getAttribute('aria-label')
      expect(ariaLabel).toContain('release line') // Should mention release line
    })

    it('should handle release line visibility changes accessibly', () => {
      const { container, rerender } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      // Initially should have release line
      let releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toBeInTheDocument()

      // Disable release line
      const disabledConfig: ReleaseLineConfig = {
        ...mockReleaseLineConfig,
        enabled: false
      }

      rerender(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: disabledConfig }}
        />
      )

      // Release line should be removed
      releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).not.toBeInTheDocument()
    })
  })
})