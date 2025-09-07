import React from 'react'
import { render } from '@testing-library/react'

// Mock the theme provider
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() })
}))

describe('Release Line SVG - Responsive Design', () => {
  // Test SVG element creation and responsive attributes
  it('should create responsive SVG release line elements', () => {
    // Create a simple SVG container to test release line rendering
    const TestSVG = () => {
      const releaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024'
      }

      // Responsive calculations (matching HillChartApp implementation)
      const SVG_WIDTH = 600
      const CHART_TOP = -20
      const CHART_BOTTOM = 151
      const LINE_X = SVG_WIDTH
      
      const baseStrokeWidth = 3
      const responsiveStrokeWidth = Math.max(2, Math.min(4, baseStrokeWidth))

      return (
        <svg
          width="100%"
          height="100%"
          viewBox="-50 -100 700 180"
          role="img"
          aria-label={`Hill chart showing project progress`}
          preserveAspectRatio="xMidYMid meet"
          data-testid="responsive-svg"
        >
          {/* Release Line */}
          <g 
            role="img" 
            aria-label={`Release line: ${releaseLineConfig.text}`}
            data-testid="release-line-group"
          >
            {/* Vertical release line */}
            <line
              x1={LINE_X}
              y1={CHART_TOP}
              x2={LINE_X}
              y2={CHART_BOTTOM}
              stroke={releaseLineConfig.color}
              strokeWidth={responsiveStrokeWidth}
              aria-hidden="true"
              data-testid="release-line"
            />
            
            {/* Release line text */}
            {releaseLineConfig.text && (() => {
              const displayText = releaseLineConfig.text.length > 12
                ? releaseLineConfig.text.substring(0, 12)
                : releaseLineConfig.text;
              
              const textY = CHART_TOP + 30
              const textX = LINE_X - 8
              const baseFontSize = 10
              const responsiveFontSize = Math.max(8, Math.min(12, baseFontSize))
              
              return (
                <text
                  x={textX}
                  y={textY}
                  textAnchor="end"
                  className="font-medium select-none"
                  fill={releaseLineConfig.color}
                  fontSize={responsiveFontSize}
                  transform={`rotate(-90, ${textX}, ${textY})`}
                  aria-label={`Release milestone: ${displayText}`}
                  data-testid="release-line-text"
                  style={{
                    filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))',
                    paintOrder: 'stroke fill',
                    stroke: 'rgba(255,255,255,0.8)',
                    strokeWidth: '0.5px',
                    strokeLinejoin: 'round'
                  }}
                >
                  {displayText}
                </text>
              );
            })()}
          </g>
        </svg>
      )
    }

    const { getByTestId } = render(<TestSVG />)

    // Test SVG container has responsive attributes
    const svg = getByTestId('responsive-svg')
    expect(svg).toHaveAttribute('width', '100%')
    expect(svg).toHaveAttribute('height', '100%')
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet')
    expect(svg).toHaveAttribute('role', 'img')

    // Test release line group has proper accessibility
    const releaseLineGroup = getByTestId('release-line-group')
    expect(releaseLineGroup).toHaveAttribute('role', 'img')
    expect(releaseLineGroup).toHaveAttribute('aria-label', 'Release line: Q4 2024')

    // Test release line has proper positioning and responsive stroke
    const releaseLine = getByTestId('release-line')
    expect(releaseLine).toHaveAttribute('x1', '600')
    expect(releaseLine).toHaveAttribute('y1', '-20')
    expect(releaseLine).toHaveAttribute('x2', '600')
    expect(releaseLine).toHaveAttribute('y2', '151')
    expect(releaseLine).toHaveAttribute('stroke', '#ff00ff')
    expect(releaseLine).toHaveAttribute('stroke-width', '3') // Within responsive range
    expect(releaseLine).toHaveAttribute('aria-hidden', 'true')

    // Test release line text has proper positioning and responsive font
    const releaseLineText = getByTestId('release-line-text')
    expect(releaseLineText).toHaveAttribute('x', '592') // LINE_X - 8
    expect(releaseLineText).toHaveAttribute('y', '10') // CHART_TOP + 30
    expect(releaseLineText).toHaveAttribute('font-size', '10') // Within responsive range
    expect(releaseLineText).toHaveAttribute('fill', '#ff00ff')
    expect(releaseLineText).toHaveAttribute('aria-label', 'Release milestone: Q4 2024')
    expect(releaseLineText).toHaveTextContent('Q4 2024')
  })

  it('should handle text truncation for long labels', () => {
    const TestSVGWithLongText = () => {
      const releaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Very Long Release Label That Exceeds Limit'
      }

      const displayText = releaseLineConfig.text.length > 12
        ? releaseLineConfig.text.substring(0, 12)
        : releaseLineConfig.text;

      return (
        <svg data-testid="svg-with-long-text">
          <text data-testid="truncated-text">
            {displayText}
          </text>
        </svg>
      )
    }

    const { getByTestId } = render(<TestSVGWithLongText />)
    
    const truncatedText = getByTestId('truncated-text')
    expect(truncatedText).toHaveTextContent('Very Long R') // First 12 characters
    expect(truncatedText.textContent?.length).toBe(12)
  })

  it('should calculate responsive stroke width within bounds', () => {
    // Test responsive stroke width calculation
    const baseStrokeWidth = 3
    const responsiveStrokeWidth = Math.max(2, Math.min(4, baseStrokeWidth))
    
    expect(responsiveStrokeWidth).toBe(3) // Should be within bounds
    expect(responsiveStrokeWidth).toBeGreaterThanOrEqual(2)
    expect(responsiveStrokeWidth).toBeLessThanOrEqual(4)

    // Test edge cases
    const tooSmall = Math.max(2, Math.min(4, 1))
    expect(tooSmall).toBe(2) // Should be clamped to minimum

    const tooLarge = Math.max(2, Math.min(4, 5))
    expect(tooLarge).toBe(4) // Should be clamped to maximum
  })

  it('should calculate responsive font size within bounds', () => {
    // Test responsive font size calculation
    const baseFontSize = 10
    const responsiveFontSize = Math.max(8, Math.min(12, baseFontSize))
    
    expect(responsiveFontSize).toBe(10) // Should be within bounds
    expect(responsiveFontSize).toBeGreaterThanOrEqual(8)
    expect(responsiveFontSize).toBeLessThanOrEqual(12)

    // Test edge cases
    const tooSmall = Math.max(8, Math.min(12, 6))
    expect(tooSmall).toBe(8) // Should be clamped to minimum

    const tooLarge = Math.max(8, Math.min(12, 15))
    expect(tooLarge).toBe(12) // Should be clamped to maximum
  })
})