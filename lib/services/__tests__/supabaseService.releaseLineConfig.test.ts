import { validateReleaseLineConfig } from '@/lib/validation'

describe('Release Line Configuration', () => {
  describe('validateReleaseLineConfig', () => {
    it('should validate a valid release line config', () => {
      const config = {
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024'
      }
      
      const result = validateReleaseLineConfig(config)
      
      expect(result).toEqual({
        enabled: true,
        color: '#ff00ff',
        text: 'Q4 2024'
      })
    })

    it('should use default values for missing properties', () => {
      const config = {}
      
      const result = validateReleaseLineConfig(config)
      
      expect(result).toEqual({
        enabled: false,
        color: '#ff00ff',
        text: ''
      })
    })

    it('should validate hex color format', () => {
      const config = {
        enabled: true,
        color: 'invalid-color',
        text: 'Test'
      }
      
      expect(() => validateReleaseLineConfig(config)).toThrow('Invalid hex color format')
    })

    it('should limit text length to 50 characters', () => {
      const longText = 'a'.repeat(51)
      const config = {
        enabled: true,
        color: '#ff00ff',
        text: longText
      }
      
      expect(() => validateReleaseLineConfig(config)).toThrow('Input too long. Maximum 50 characters allowed')
    })

    it('should sanitize text input', () => {
      const config = {
        enabled: true,
        color: '#ff00ff',
        text: '  Q4 2024  '
      }
      
      const result = validateReleaseLineConfig(config)
      
      expect(result.text).toBe('Q4 2024')
    })

    it('should accept valid hex colors', () => {
      const validColors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#123abc']
      
      validColors.forEach(color => {
        const config = { enabled: true, color, text: 'Test' }
        const result = validateReleaseLineConfig(config)
        expect(result.color).toBe(color)
      })
    })

    it('should reject invalid hex colors', () => {
      const invalidColors = ['#fff', '#gggggg', 'red', 'rgb(255,0,0)', '#12345', '#1234567']
      
      invalidColors.forEach(color => {
        const config = { enabled: true, color, text: 'Test' }
        expect(() => validateReleaseLineConfig(config)).toThrow('Invalid hex color format')
      })
    })

    it('should handle empty text', () => {
      const config = {
        enabled: true,
        color: '#ff00ff',
        text: ''
      }
      
      const result = validateReleaseLineConfig(config)
      
      expect(result.text).toBe('')
    })

    it('should handle boolean enabled values correctly', () => {
      expect(validateReleaseLineConfig({ enabled: true, color: '#ff00ff', text: '' }).enabled).toBe(true)
      expect(validateReleaseLineConfig({ enabled: false, color: '#ff00ff', text: '' }).enabled).toBe(false)
      expect(validateReleaseLineConfig({ color: '#ff00ff', text: '' }).enabled).toBe(false)
    })
  })
})