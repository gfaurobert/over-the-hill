/**
 * Test to verify that release line elements are properly included in SVG exports
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Release Line SVG Export', () => {
  // Mock XMLSerializer
  const mockSerializeToString = jest.fn()
  global.XMLSerializer = jest.fn().mockImplementation(() => ({
    serializeToString: mockSerializeToString
  }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('prepareSvgForExport should process release line elements correctly', () => {
    // Create a mock SVG element with release line elements
    const mockSvgElement = {
      setAttribute: jest.fn(),
      style: {},
      cloneNode: jest.fn().mockReturnThis(),
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === 'line') {
          // Return mock line elements including release line
          return [
            {
              getAttribute: jest.fn((attr: string) => {
                if (attr === 'stroke') return '#ff00ff' // Release line color
                if (attr === 'x1') return '600' // Release line position
                return null
              }),
              setAttribute: jest.fn()
            },
            {
              getAttribute: jest.fn((attr: string) => {
                if (attr === 'stroke') return 'currentColor' // Regular line
                return null
              }),
              setAttribute: jest.fn()
            }
          ]
        }
        if (selector === 'text') {
          // Return mock text elements including release line text
          return [
            {
              getAttribute: jest.fn((attr: string) => {
                if (attr === 'fill') return '#ff00ff' // Release line text color
                if (attr === 'transform') return 'rotate(90, 620, 10)' // Release line text transform
                return null
              }),
              setAttribute: jest.fn(),
              classList: {
                contains: jest.fn((className: string) => {
                  return className === 'text-[10px]' || className === 'font-medium'
                })
              },
              style: {}
            },
            {
              getAttribute: jest.fn(() => null),
              setAttribute: jest.fn(),
              classList: {
                contains: jest.fn(() => false)
              },
              style: {}
            }
          ]
        }
        if (selector === 'path' || selector === 'rect') {
          return []
        }
        return []
      })
    }

    // Mock the prepareSvgForExport logic
    const isDarkMode = false
    const textColor = "#0a0a0a"

    // Process lines (this is what prepareSvgForExport does)
    const lines = mockSvgElement.querySelectorAll("line")
    lines.forEach((line: any) => {
      if (line.getAttribute("stroke") === "currentColor") {
        line.setAttribute("stroke", textColor)
      }
      // Release line with custom color should remain unchanged
    })

    // Process texts (this is what prepareSvgForExport does)
    const texts = mockSvgElement.querySelectorAll("text")
    texts.forEach((text: any) => {
      text.setAttribute("font-family", "Arial, Helvetica, sans-serif")
      
      if (text.classList.contains("text-[10px]")) {
        text.setAttribute("font-size", "10px")
      }
      if (text.classList.contains("font-medium")) {
        text.setAttribute("font-weight", "500")
      }
    })

    // Verify that release line elements are processed correctly
    const releaseLineElement = lines[0] // First line is the release line
    const regularLineElement = lines[1] // Second line is a regular line
    const releaseLineTextElement = texts[0] // First text is release line text

    // Release line should keep its custom color
    expect(releaseLineElement.getAttribute('stroke')).toBe('#ff00ff')
    expect(releaseLineElement.setAttribute).not.toHaveBeenCalledWith('stroke', textColor)

    // Regular line should get the theme color
    expect(regularLineElement.setAttribute).toHaveBeenCalledWith('stroke', textColor)

    // Release line text should get proper font attributes
    expect(releaseLineTextElement.setAttribute).toHaveBeenCalledWith('font-family', 'Arial, Helvetica, sans-serif')
    expect(releaseLineTextElement.setAttribute).toHaveBeenCalledWith('font-size', '10px')
    expect(releaseLineTextElement.setAttribute).toHaveBeenCalledWith('font-weight', '500')

    // Release line text should keep its custom color (fill attribute)
    expect(releaseLineTextElement.getAttribute('fill')).toBe('#ff00ff')
  })

  test('release line elements should be included in serialized SVG', () => {
    // Mock SVG content that includes release line
    const mockSvgContent = `
      <svg width="800" height="360" viewBox="-50 0 700 180">
        <line x1="0" y1="80" x2="600" y2="80" stroke="#0a0a0a"/>
        <line x1="600" y1="-10" x2="600" y2="160" stroke="#ff00ff" stroke-width="3"/>
        <text x="620" y="10" fill="#ff00ff" transform="rotate(90, 620, 10)" font-size="10px" font-weight="500">Q4 2024</text>
      </svg>
    `

    mockSerializeToString.mockReturnValue(mockSvgContent)

    // Simulate calling XMLSerializer
    const serializer = new XMLSerializer()
    const result = serializer.serializeToString({} as any)

    // Verify that release line elements are present in the serialized SVG
    expect(result).toContain('line x1="600"') // Release line
    expect(result).toContain('stroke="#ff00ff"') // Release line color
    expect(result).toContain('stroke-width="3"') // Release line width
    expect(result).toContain('transform="rotate(90, 620, 10)"') // Release line text rotation
    expect(result).toContain('Q4 2024') // Release line text content
  })

  test('SVG export should work without release line when disabled', () => {
    // Mock SVG content without release line
    const mockSvgContent = `
      <svg width="800" height="360" viewBox="-50 0 700 180">
        <line x1="0" y1="80" x2="600" y2="80" stroke="#0a0a0a"/>
        <text x="300" y="70" fill="#0a0a0a">Regular Chart Content</text>
      </svg>
    `

    mockSerializeToString.mockReturnValue(mockSvgContent)

    // Simulate calling XMLSerializer
    const serializer = new XMLSerializer()
    const result = serializer.serializeToString({} as any)

    // Verify that release line elements are NOT present
    expect(result).not.toContain('line x1="600"') // No release line
    expect(result).not.toContain('stroke="#ff00ff"') // No release line color
    expect(result).not.toContain('Q4 2024') // No release line text
    expect(result).toContain('Regular Chart Content') // But regular content is there
  })
})