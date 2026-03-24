import {
  sanitizeHexColor,
  sanitizeNumber,
  sanitizeString,
  validateCollection,
  validateDot,
  validateImportData,
  validateReleaseLineConfig,
  validateUserId,
  validateUserPreferencesUpdate,
  ValidationError,
} from './validation'

describe('validation', () => {
  describe('sanitize primitives', () => {
    it('sanitizes strings and strips control characters', () => {
      expect(sanitizeString('  Hello\x00\x01World  ')).toBe('HelloWorld')
    })

    it('enforces numeric boundaries', () => {
      expect(sanitizeNumber(5, 0, 10)).toBe(5)
      expect(() => sanitizeNumber(11, 0, 10)).toThrow(ValidationError)
    })

    it('validates strict hex color values', () => {
      expect(sanitizeHexColor('#A1B2C3')).toBe('#A1B2C3')
      expect(() => sanitizeHexColor('#fff')).toThrow('Invalid hex color format')
    })
  })

  describe('dot and collection validation', () => {
    it('accepts valid dots and applies defaults', () => {
      const dot = validateDot({ id: 'dot_1', label: 'Dot', x: 20, y: 30 })
      expect(dot).toMatchObject({
        id: 'dot_1',
        label: 'Dot',
        x: 20,
        y: 30,
        size: 3,
        archived: false,
        flag_for_today: false,
      })
    })

    it('rejects invalid dot coordinates', () => {
      expect(() => validateDot({ id: 'a', label: 'b', x: 120, y: 1 })).toThrow('Number must be at most 100')
    })

    it('validates collection status and timestamps coherently', () => {
      expect(() =>
        validateCollection({
          id: 'collection-a',
          name: 'Alpha',
          status: 'archived',
        })
      ).toThrow('Archived collections must have archived_at timestamp')

      const archivedAt = new Date().toISOString()
      const collection = validateCollection({
        id: 'collection-a',
        name: 'Alpha',
        status: 'archived',
        archived_at: archivedAt,
      })
      expect(collection.archived_at).toBe(archivedAt)
    })

    it('validates release line configuration', () => {
      const config = validateReleaseLineConfig({ enabled: true, color: '#123456', text: 'Release' })
      expect(config).toEqual({ enabled: true, color: '#123456', text: 'Release' })
      expect(() => validateReleaseLineConfig({ color: 'pink' })).toThrow(ValidationError)
    })
  })

  describe('user and preference validation', () => {
    it('accepts valid supabase-style user IDs', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000'
      expect(validateUserId(id)).toBe(id)
      expect(() => validateUserId('bad-id')).toThrow('Invalid user ID format')
    })

    it('normalizes user preferences with defaults', () => {
      const preferences = validateUserPreferencesUpdate({
        collectionInput: '  Team A  ',
        copyFormat: 'SVG',
        dotColorDiscovery: '#112233',
      })
      expect(preferences.collectionInput).toBe('Team A')
      expect(preferences.copyFormat).toBe('SVG')
      expect(preferences.dotColorDone).toBe('#d0bdfb')
      expect(preferences.showTodayCollection).toBe(true)
    })
  })

  describe('import validation', () => {
    it('filters deleted collections and validates nested snapshots', () => {
      const data = validateImportData({
        collections: [
          {
            id: 'active-1',
            name: 'Active',
            status: 'active',
            dots: [{ id: 'd1', label: 'D1', x: 10, y: 20 }],
          },
          {
            id: 'deleted-1',
            name: 'Deleted',
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            dots: [{ id: 'd2', label: 'D2', x: 10, y: 20 }],
          },
        ],
        snapshots: [
          {
            date: '2025-01-01',
            collectionId: 'active-1',
            collectionName: 'Active',
            dots: [{ id: 'd1', label: 'D1', x: 10, y: 20 }],
            timestamp: Date.now(),
          },
        ],
      })

      expect(data.collections).toHaveLength(1)
      expect(data.collections[0].id).toBe('active-1')
      expect(data.snapshots).toHaveLength(1)
    })
  })
})
