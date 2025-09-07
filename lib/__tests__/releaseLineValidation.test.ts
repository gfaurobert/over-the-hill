/**
 * Comprehensive unit tests for release line configuration validation
 * Tests all validation rules, edge cases, and error scenarios
 */

import { validateReleaseLineConfig, sanitizeHexColor, ValidationError } from '../validation'
import type { ReleaseLineConfig } from '@/components/HillChartApp'

describe('Release Line Configuration Validation', () => {
  describe('validateReleaseLineConfig', () => {
    describe('Valid configurations', () => {
      it('should validate complete valid configuration', () => {
        const config = {
          enabled: true,
          color: '#ff00ff',
          text: 'Q4 2024 Release'
        }

        const result = validateReleaseLineConfig(config)

        expect(result).toEqual({
          enabled: true,
          color: '#ff00ff',
          text: 'Q4 2024 Release'
        })
      })

      it('should validate minimal configuration', () => {
        const config = {
          enabled: false,
          color: '#000000',
          text: ''
        }

        const result = validateReleaseLineConfig(config)

        expect(result).toEqual({
          enabled: false,
          color: '#000000',
          text: ''
        })
      })

      it('should validate configuration with maximum text length', () => {
        const maxText = '12345678901234567890123456789012345678901234567890' // 50 chars
        const config = {
          enabled: true,
          color: '#ffffff',
          text: maxText
        }

        const result = validateReleaseLineConfig(config)

        expect(result.text).toBe(maxText)
        expect(result.text).toHaveLength(50)
      })

      it('should validate all valid hex color formats', () => {
        const validColors = [
          '#000000', // Black
          '#ffffff', // White
          '#ff0000', // Red
          '#00ff00', // Green
          '#0000ff', // Blue
          '#123abc', // Mixed lowercase
          '#ABCDEF', // Uppercase
          '#deadbe', // Mixed case
          '#f0f0f0'  // Gray
        ]

        validColors.forEach(color => {
          const config = { enabled: true, color, text: 'Test' }
          const result = validateReleaseLineConfig(config)
          expect(result.color).toBe(color)
        })
      })
    })

    describe('Default value handling', () => {
      it('should use defaults for empty configuration', () => {
        const result = validateReleaseLineConfig({})

        expect(result).toEqual({
          enabled: false,
          color: '#ff00ff',
          text: ''
        })
      })

      it('should use defaults for undefined values', () => {
        const config = {
          enabled: undefined,
          color: undefined,
          text: undefined
        }

        const result = validateReleaseLineConfig(config as any)

        expect(result).toEqual({
          enabled: false,
          color: '#ff00ff',
          text: ''
        })
      })

      it('should use defaults for null values', () => {
        const config = {
          enabled: null,
          color: null,
          text: null
        }

        const result = validateReleaseLineConfig(config as any)

        expect(result).toEqual({
          enabled: false,
          color: '#ff00ff',
          text: ''
        })
      })

      it('should use default color when color is missing', () => {
        const config = {
          enabled: true,
          text: 'Test'
        }

        const result = validateReleaseLineConfig(config)

        expect(result.color).toBe('#ff00ff')
      })

      it('should use default text when text is missing', () => {
        const config = {
          enabled: true,
          color: '#ff00ff'
        }

        const result = validateReleaseLineConfig(config)

        expect(result.text).toBe('')
      })
    })

    describe('Boolean enabled field validation', () => {
      it('should handle true boolean correctly', () => {
        const config = { enabled: true, color: '#ff00ff', text: '' }
        const result = validateReleaseLineConfig(config)
        expect(result.enabled).toBe(true)
      })

      it('should handle false boolean correctly', () => {
        const config = { enabled: false, color: '#ff00ff', text: '' }
        const result = validateReleaseLineConfig(config)
        expect(result.enabled).toBe(false)
      })

      it('should default to false for non-boolean values', () => {
        const nonBooleanValues = [
          'true',
          'false',
          1,
          0,
          [],
          {},
          'yes',
          'no'
        ]

        nonBooleanValues.forEach(value => {
          const config = { enabled: value as any, color: '#ff00ff', text: '' }
          const result = validateReleaseLineConfig(config)
          expect(result.enabled).toBe(false)
        })
      })
    })

    describe('Text sanitization and validation', () => {
      it('should trim whitespace from text', () => {
        const config = {
          enabled: true,
          color: '#ff00ff',
          text: '  Q4 2024 Release  '
        }

        const result = validateReleaseLineConfig(config)

        expect(result.text).toBe('Q4 2024 Release')
      })

      it('should handle text with tabs and newlines', () => {
        const config = {
          enabled: true,
          color: '#ff00ff',
          text: '\tQ4 2024\nRelease\t'
        }

        const result = validateReleaseLineConfig(config)

        expect(result.text).toBe('Q4 2024\nRelease')
      })

      it('should handle empty string text', () => {
        const config = {
          enabled: true,
          color: '#ff00ff',
          text: ''
        }

        const result = validateReleaseLineConfig(config)

        expect(result.text).toBe('')
      })

      it('should handle text with special characters', () => {
        const specialTexts = [
          'Q4-2024',
          'Release_v1.0',
          'Milestone #1',
          'Phase (Alpha)',
          'Beta & Gamma',
          'Release 2024.1'
        ]

        specialTexts.forEach(text => {
          const config = { enabled: true, color: '#ff00ff', text }
          const result = validateReleaseLineConfig(config)
          expect(result.text).toBe(text)
        })
      })
    })

    describe('Error scenarios', () => {
      it('should reject text longer than 50 characters', () => {
        const longText = 'a'.repeat(51)
        const config = {
          enabled: true,
          color: '#ff00ff',
          text: longText
        }

        expect(() => validateReleaseLineConfig(config)).toThrow('Input too long. Maximum 50 characters allowed')
      })

      it('should reject invalid hex colors', () => {
        const invalidColors = [
          '#fff',        // Too short
          '#gggggg',     // Invalid characters
          'red',         // Color name
          'rgb(255,0,0)', // RGB format
          '#12345',      // Wrong length
          '#1234567',    // Too long
          'invalid',     // Completely invalid
          '#',           // Just hash
          'ffffff',      // Missing hash
          '#xyz123'      // Invalid hex characters
        ]

        invalidColors.forEach(color => {
          const config = { enabled: true, color, text: 'Test' }
          expect(() => validateReleaseLineConfig(config)).toThrow('Invalid hex color format')
        })
      })

      it('should handle falsy non-string color values with defaults', () => {
        const falsyColors = [null, undefined, '', false, 0]

        falsyColors.forEach(color => {
          const config = { enabled: true, color: color as any, text: 'Test' }
          const result = validateReleaseLineConfig(config)
          expect(result.color).toBe('#ff00ff') // Should use default color
        })
      })

      it('should reject truthy non-string color values', () => {
        const truthyNonStringColors = [123, true, [], {}]

        truthyNonStringColors.forEach(color => {
          const config = { enabled: true, color: color as any, text: 'Test' }
          expect(() => validateReleaseLineConfig(config)).toThrow('Color must be a string')
        })
      })

      it('should handle falsy non-string text values with defaults', () => {
        const falsyTexts = [null, undefined, '', false, 0]

        falsyTexts.forEach(text => {
          const config = { enabled: true, color: '#ff00ff', text: text as any }
          const result = validateReleaseLineConfig(config)
          expect(result.text).toBe('') // Should use default empty text
        })
      })

      it('should reject truthy non-string text values', () => {
        const truthyNonStringTexts = [123, true, [], {}]

        truthyNonStringTexts.forEach(text => {
          const config = { enabled: true, color: '#ff00ff', text: text as any }
          expect(() => validateReleaseLineConfig(config)).toThrow('Input must be a string')
        })
      })
    })

    describe('Edge cases', () => {
      it('should handle configuration with extra properties', () => {
        const config = {
          enabled: true,
          color: '#ff00ff',
          text: 'Test',
          extraProperty: 'should be ignored'
        }

        const result = validateReleaseLineConfig(config as any)

        expect(result).toEqual({
          enabled: true,
          color: '#ff00ff',
          text: 'Test'
        })
        expect(result).not.toHaveProperty('extraProperty')
      })

      it('should handle text with only whitespace', () => {
        const config = {
          enabled: true,
          color: '#ff00ff',
          text: '   \t\n   '
        }

        const result = validateReleaseLineConfig(config)

        expect(result.text).toBe('')
      })

      it('should handle color with whitespace', () => {
        const config = {
          enabled: true,
          color: '  #ff00ff  ',
          text: 'Test'
        }

        const result = validateReleaseLineConfig(config)

        expect(result.color).toBe('#ff00ff')
      })
    })
  })

  describe('sanitizeHexColor', () => {
    it('should validate correct hex colors', () => {
      const validColors = [
        '#000000',
        '#ffffff',
        '#123abc',
        '#ABCDEF'
      ]

      validColors.forEach(color => {
        expect(sanitizeHexColor(color)).toBe(color)
      })
    })

    it('should trim whitespace from hex colors', () => {
      expect(sanitizeHexColor('  #ff00ff  ')).toBe('#ff00ff')
      expect(sanitizeHexColor('\t#123abc\n')).toBe('#123abc')
    })

    it('should reject invalid hex color formats', () => {
      const invalidColors = [
        '#fff',
        '#gggggg',
        'red',
        '#12345',
        '#1234567',
        'invalid'
      ]

      invalidColors.forEach(color => {
        expect(() => sanitizeHexColor(color)).toThrow('Invalid hex color format')
      })
    })

    it('should reject non-string inputs', () => {
      const nonStrings = [123, true, [], {}, null, undefined]

      nonStrings.forEach(input => {
        expect(() => sanitizeHexColor(input as any)).toThrow('Color must be a string')
      })
    })
  })

  describe('ValidationError class', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('ValidationError')
      expect(error instanceof Error).toBe(true)
    })

    it('should create error with message and field', () => {
      const error = new ValidationError('Test error', 'testField')
      expect(error.message).toBe('Test error')
      expect(error.field).toBe('testField')
      expect(error.name).toBe('ValidationError')
    })
  })

  describe('Type safety and interface compliance', () => {
    it('should return ReleaseLineConfig interface compliant object', () => {
      const config = {
        enabled: true,
        color: '#ff00ff',
        text: 'Test'
      }

      const result = validateReleaseLineConfig(config)

      // Type check - should have all required properties
      expect(typeof result.enabled).toBe('boolean')
      expect(typeof result.color).toBe('string')
      expect(typeof result.text).toBe('string')

      // Should not have any extra properties
      const keys = Object.keys(result)
      expect(keys).toEqual(['enabled', 'color', 'text'])
    })

    it('should handle partial ReleaseLineConfig input', () => {
      const partialConfigs: Partial<ReleaseLineConfig>[] = [
        { enabled: true },
        { color: '#ff00ff' },
        { text: 'Test' },
        { enabled: true, color: '#ff00ff' },
        { enabled: true, text: 'Test' },
        { color: '#ff00ff', text: 'Test' }
      ]

      partialConfigs.forEach(config => {
        const result = validateReleaseLineConfig(config)
        expect(result).toHaveProperty('enabled')
        expect(result).toHaveProperty('color')
        expect(result).toHaveProperty('text')
      })
    })
  })
})