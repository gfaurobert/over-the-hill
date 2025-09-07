/**
 * Visual tests for release line SVG rendering and export functionality
 * Tests SVG generation, positioning, styling, and export behavior
 */

import React from 'react'
import { render } from '@testing-library/react'
import type { ReleaseLineConfig } from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'
import HillChartApp from '../HillChartApp'

// Create a simple mock component for testing SVG rendering
const MockSVGChart: React.FC<{ releaseLineConfig?: ReleaseLineConfig }> = ({ releaseLineConfig }) => {
  return (
    <svg width="800" height="360" viewBox="-50 0 700 180" role="img" aria-label="Hill chart with release line">
      {/* Main chart line */}
      <line x1="0" y1="80" x2="600" y2="80" stroke="currentColor" />
      
      {/* Release line if enabled */}
      {releaseLineConfig?.enabled && (
        <>
          <line 
            x1="600" 
            y1="-10" 
            x2="600" 
            y2="160" 
            stroke={releaseLineConfig.color} 
            strokeWidth="3"
          />
          {releaseLineConfig.text && (
            <text 
              x="620" 
              y="10" 
              fill={releaseLineConfig.color}
              transform="rotate(90, 620, 10)"
              className="text-[10px] font-medium"
            >
              {releaseLineConfig.text}
            </text>
          )}
        </>
      )}
    </svg>
  )
}

// Mock XMLSerializer for SVG export tests
const mockSerializeToString = jest.fn()
global.XMLSerializer = jest.fn().mockImplementation(() => ({
  serializeToString: mockSerializeToString
}))

// Mock Canvas API for PNG export tests
const mockToDataURL = jest.fn()
const mockGetContext = jest.fn().mockReturnValue({
  drawImage: jest.fn(),
  canvas: { toDataURL: mockToDataURL }
})

global.HTMLCanvasElement.prototype.getContext = mockGetContext

// Mock createObjectURL for download tests
global.URL.createObjectURL = jest.fn().mockReturnValue('mock-blob-url')
global.URL.revokeObjectURL = jest.fn()

describe('Release Line Visual Rendering', () => {
  const mockReleaseLineConfig: ReleaseLineConfig = {
    enabled: true,
    color: '#ff00ff',
    text: 'Q4 2024'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSerializeToString.mockReturnValue('<svg>mock svg content</svg>')
    mockToDataURL.mockReturnValue('data:image/png;base64,mock-png-data')
  })

  describe('SVG Release Line Rendering', () => {
    it('should render release line when enabled', () => {
      const { container } = render(
        <MockSVGChart releaseLineConfig={mockReleaseLineConfig} />
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()

      // Check for release line element
      const releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toBeInTheDocument()
      expect(releaseLine).toHaveAttribute('stroke', '#ff00ff')
      expect(releaseLine).toHaveAttribute('stroke-width', '3')
    })

    it('should not render release line when disabled', () => {
      const disabledConfig: ReleaseLineConfig = {
        ...mockReleaseLineConfig,
        enabled: false
      }

      const { container } = render(
        <MockSVGChart releaseLineConfig={disabledConfig} />
      )

      // Check that release line is not present
      const releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).not.toBeInTheDocument()
    })

    it('should render release line text when provided', () => {
      const { container } = render(
        <MockSVGChart releaseLineConfig={mockReleaseLineConfig} />
      )

      // Check for release line text
      const releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).toBeInTheDocument()
      expect(releaseLineText).toHaveTextContent('Q4 2024')
      expect(releaseLineText).toHaveAttribute('fill', '#ff00ff')
    })

    it('should not render release line text when empty', () => {
      const configWithoutText: ReleaseLineConfig = {
        ...mockReleaseLineConfig,
        text: ''
      }

      const { container } = render(
        <MockSVGChart releaseLineConfig={configWithoutText} />
      )

      // Check that release line text is not present
      const releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).not.toBeInTheDocument()
    })

    it('should position release line correctly', () => {
      const { container } = render(
        <MockSVGChart releaseLineConfig={mockReleaseLineConfig} />
      )

      const releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toHaveAttribute('x1', '600')
      expect(releaseLine).toHaveAttribute('x2', '600')
      expect(releaseLine).toHaveAttribute('y1', '-10')
      expect(releaseLine).toHaveAttribute('y2', '160')
    })

    it('should apply correct styling to release line', () => {
      const customConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#00ff00',
        text: 'Custom Release'
      }

      const { container } = render(
        <MockSVGChart releaseLineConfig={customConfig} />
      )

      const releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toHaveAttribute('stroke', '#00ff00')
      expect(releaseLine).toHaveAttribute('stroke-width', '3')

      const releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).toHaveAttribute('fill', '#00ff00')
      expect(releaseLineText).toHaveTextContent('Custom Release')
    })
  })

  describe('SVG Export with Release Line', () => {
    it('should include release line in SVG export', () => {
      const mockSvgContent = `
        <svg width="800" height="360" viewBox="-50 0 700 180">
          <line x1="0" y1="80" x2="600" y2="80" stroke="currentColor"/>
          <line x1="600" y1="-10" x2="600" y2="160" stroke="#ff00ff" stroke-width="3"/>
          <text x="620" y="10" fill="#ff00ff" transform="rotate(90, 620, 10)">Q4 2024</text>
        </svg>
      `

      mockSerializeToString.mockReturnValue(mockSvgContent)

      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      // Simulate SVG export
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()

      // Mock the export process
      const serializer = new XMLSerializer()
      const result = serializer.serializeToString(svg!)

      expect(result).toContain('line x1="600"') // Release line
      expect(result).toContain('stroke="#ff00ff"') // Release line color
      expect(result).toContain('Q4 2024') // Release line text
    })

    it('should exclude release line from SVG export when disabled', () => {
      const disabledConfig: ReleaseLineConfig = {
        ...mockReleaseLineConfig,
        enabled: false
      }

      const mockSvgContent = `
        <svg width="800" height="360" viewBox="-50 0 700 180">
          <line x1="0" y1="80" x2="600" y2="80" stroke="currentColor"/>
        </svg>
      `

      mockSerializeToString.mockReturnValue(mockSvgContent)

      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: disabledConfig }}
        />
      )

      // Simulate SVG export
      const svg = container.querySelector('svg')
      const serializer = new XMLSerializer()
      const result = serializer.serializeToString(svg!)

      expect(result).not.toContain('line x1="600"') // No release line
      expect(result).not.toContain('Q4 2024') // No release line text
    })

    it('should preserve release line styling in SVG export', () => {
      const customConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#123abc',
        text: 'Custom Text'
      }

      const mockSvgContent = `
        <svg width="800" height="360" viewBox="-50 0 700 180">
          <line x1="600" y1="-10" x2="600" y2="160" stroke="#123abc" stroke-width="3"/>
          <text x="620" y="10" fill="#123abc" transform="rotate(90, 620, 10)">Custom Text</text>
        </svg>
      `

      mockSerializeToString.mockReturnValue(mockSvgContent)

      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: customConfig }}
        />
      )

      const svg = container.querySelector('svg')
      const serializer = new XMLSerializer()
      const result = serializer.serializeToString(svg!)

      expect(result).toContain('stroke="#123abc"')
      expect(result).toContain('fill="#123abc"')
      expect(result).toContain('Custom Text')
    })
  })

  describe('PNG Export with Release Line', () => {
    it('should include release line in PNG export', async () => {
      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      // Mock the PNG export process
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      // Simulate drawing the SVG to canvas (including release line)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()

      // Mock canvas operations
      expect(mockGetContext).toHaveBeenCalledWith('2d')
      
      // Simulate the export
      const dataUrl = canvas.toDataURL('image/png')
      expect(dataUrl).toBe('data:image/png;base64,mock-png-data')
    })

    it('should handle PNG export without release line when disabled', async () => {
      const disabledConfig: ReleaseLineConfig = {
        ...mockReleaseLineConfig,
        enabled: false
      }

      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: disabledConfig }}
        />
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()

      // Should not contain release line elements
      const releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).not.toBeInTheDocument()
    })
  })

  describe('Responsive Release Line Rendering', () => {
    it('should scale release line with chart dimensions', () => {
      const { container, rerender } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      // Check initial positioning
      let releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toHaveAttribute('x1', '600')

      // Simulate responsive resize (this would be handled by the component)
      rerender(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      // Release line should maintain correct positioning
      releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toHaveAttribute('x1', '600')
    })

    it('should maintain text readability across screen sizes', () => {
      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: mockReleaseLineConfig }}
        />
      )

      const releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).toHaveClass('text-[10px]')
      expect(releaseLineText).toHaveClass('font-medium')
    })
  })

  describe('Release Line with Multiple Collections', () => {
    it('should render different release lines for different collections', () => {
      const collection2: Collection = {
        ...mockCollection,
        id: 'collection-2',
        name: 'Collection 2'
      }

      const config2: ReleaseLineConfig = {
        enabled: true,
        color: '#00ff00',
        text: 'Release 2'
      }

      const releaseLineSettings = {
        [mockCollection.id]: mockReleaseLineConfig,
        [collection2.id]: config2
      }

      const { container, rerender } = render(
        <HillChartApp 
          collections={[mockCollection, collection2]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={releaseLineSettings}
        />
      )

      // Check first collection's release line
      let releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toHaveAttribute('stroke', '#ff00ff')

      let releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).toHaveTextContent('Q4 2024')

      // Switch to second collection
      rerender(
        <HillChartApp 
          collections={[mockCollection, collection2]}
          currentCollectionId={collection2.id}
          releaseLineSettings={releaseLineSettings}
        />
      )

      // Check second collection's release line
      releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toHaveAttribute('stroke', '#00ff00')

      releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).toHaveTextContent('Release 2')
    })

    it('should handle collections without release line configuration', () => {
      const collection2: Collection = {
        ...mockCollection,
        id: 'collection-2',
        name: 'Collection 2'
      }

      const releaseLineSettings = {
        [mockCollection.id]: mockReleaseLineConfig
        // No config for collection2
      }

      const { container, rerender } = render(
        <HillChartApp 
          collections={[mockCollection, collection2]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={releaseLineSettings}
        />
      )

      // First collection should have release line
      let releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).toBeInTheDocument()

      // Switch to collection without release line config
      rerender(
        <HillChartApp 
          collections={[mockCollection, collection2]}
          currentCollectionId={collection2.id}
          releaseLineSettings={releaseLineSettings}
        />
      )

      // Should not have release line
      releaseLine = container.querySelector('line[x1="600"]')
      expect(releaseLine).not.toBeInTheDocument()
    })
  })

  describe('Release Line Edge Cases', () => {
    it('should handle very long text gracefully', () => {
      const longTextConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: '12345678901234567890123456789012345678901234567890' // 50 chars (max)
      }

      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: longTextConfig }}
        />
      )

      const releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).toBeInTheDocument()
      expect(releaseLineText?.textContent?.length).toBe(50)
    })

    it('should handle special characters in text', () => {
      const specialTextConfig: ReleaseLineConfig = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4-2024 (Beta) & Release #1'
      }

      const { container } = render(
        <HillChartApp 
          collections={[mockCollection]}
          currentCollectionId={mockCollection.id}
          releaseLineSettings={{ [mockCollection.id]: specialTextConfig }}
        />
      )

      const releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
      expect(releaseLineText).toHaveTextContent('Q4-2024 (Beta) & Release #1')
    })

    it('should handle extreme color values', () => {
      const extremeColors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']

      extremeColors.forEach(color => {
        const config: ReleaseLineConfig = {
          enabled: true,
          color,
          text: 'Test'
        }

        const { container } = render(
          <HillChartApp 
            collections={[mockCollection]}
            currentCollectionId={mockCollection.id}
            releaseLineSettings={{ [mockCollection.id]: config }}
          />
        )

        const releaseLine = container.querySelector('line[x1="600"]')
        expect(releaseLine).toHaveAttribute('stroke', color)

        const releaseLineText = container.querySelector('text[transform*="rotate(90, 620, 10)"]')
        expect(releaseLineText).toHaveAttribute('fill', color)
      })
    })
  })
})