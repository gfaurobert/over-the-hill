import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReleaseLineSettings } from './ReleaseLineSettings'
import { ReleaseLineConfig } from './HillChartApp'

// Mock the UI components
jest.mock('./ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: React.ComponentProps<'input'> & { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void 
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="release-line-toggle"
      {...props}
    />
  ),
}))

jest.mock('./ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input data-testid={props['data-testid'] || 'input'} {...props} />,
}))

jest.mock('./ui/label', () => ({
  Label: ({ children, ...props }: React.ComponentProps<'label'> & { children: React.ReactNode }) => <label {...props}>{children}</label>,
}))

describe('ReleaseLineSettings', () => {
  const defaultConfig: ReleaseLineConfig = {
    enabled: false,
    color: '#ff00ff',
    text: '',
  }

  const mockOnConfigChange = jest.fn()

  beforeEach(() => {
    mockOnConfigChange.mockClear()
  })

  it('renders with default disabled state', () => {
    render(
      <ReleaseLineSettings config={defaultConfig} onConfigChange={mockOnConfigChange} />
    )

    expect(screen.getByText('Release Line')).toBeInTheDocument()
    expect(screen.getByTestId('release-line-toggle')).not.toBeChecked()
    
    // Color and text inputs should not be visible when disabled
    expect(screen.queryByText('Color')).not.toBeInTheDocument()
    expect(screen.queryByText('Label')).not.toBeInTheDocument()
  })

  it('shows color and text settings when enabled', () => {
    const enabledConfig: ReleaseLineConfig = {
      ...defaultConfig,
      enabled: true,
    }

    render(
      <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
    )

    expect(screen.getByTestId('release-line-toggle')).toBeChecked()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Label')).toBeInTheDocument()
  })

  it('calls onConfigChange when toggle is changed', () => {
    render(
      <ReleaseLineSettings config={defaultConfig} onConfigChange={mockOnConfigChange} />
    )

    const toggle = screen.getByTestId('release-line-toggle')
    fireEvent.click(toggle)

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...defaultConfig,
      enabled: true,
    })
  })

  it('calls onConfigChange when color is changed via color picker', () => {
    const enabledConfig: ReleaseLineConfig = {
      ...defaultConfig,
      enabled: true,
    }

    render(
      <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
    )

    const colorPicker = screen.getByTestId('color-picker')
    fireEvent.change(colorPicker, { target: { value: '#00ff00' } })

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...enabledConfig,
      color: '#00ff00',
    })
  })

  it('calls onConfigChange when text is changed', () => {
    const enabledConfig: ReleaseLineConfig = {
      ...defaultConfig,
      enabled: true,
    }

    render(
      <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
    )

    const textInput = screen.getByTestId('text-input')
    fireEvent.change(textInput, { target: { value: 'Q4 2024' } })

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...enabledConfig,
      text: 'Q4 2024',
    })
  })

  it('enforces 50 character limit for text input', () => {
    const enabledConfig: ReleaseLineConfig = {
      ...defaultConfig,
      enabled: true,
      text: 'This is a very long text that exceeds fifty chars',
    }

    render(
      <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
    )

    const textInput = screen.getByTestId('text-input')
    const longText = 'This is a very long text that definitely exceeds the fifty character limit'
    
    fireEvent.change(textInput, { target: { value: longText } })

    // Should not call onConfigChange because text exceeds 50 characters
    expect(mockOnConfigChange).not.toHaveBeenCalled()
  })

  it('shows character count for text input', () => {
    const enabledConfig: ReleaseLineConfig = {
      ...defaultConfig,
      enabled: true,
      text: 'Q4 2024',
    }

    render(
      <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
    )

    expect(screen.getByText('7/50 characters')).toBeInTheDocument()
  })

  it('displays correct color value in both color picker and text input', () => {
    const enabledConfig: ReleaseLineConfig = {
      ...defaultConfig,
      enabled: true,
      color: '#123456',
    }

    render(
      <ReleaseLineSettings config={enabledConfig} onConfigChange={mockOnConfigChange} />
    )

    const colorPicker = screen.getByTestId('color-picker')
    const colorTextInput = screen.getByTestId('color-text-input')
    
    expect(colorPicker).toHaveValue('#123456')
    expect(colorTextInput).toHaveValue('#123456')
  })
})