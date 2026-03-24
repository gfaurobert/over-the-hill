import {
  ValidationError,
  sanitizeColor,
  sanitizeHexColor,
  sanitizeId,
  sanitizeNumber,
  sanitizeString,
  validateCollectionId,
  validateCollection,
  validateDeleteOperation,
  validateDot,
  validateDotId,
  validateImportData,
  validateReleaseLineConfig,
  validateSnapshotId,
  validateUserId,
  validateUserPreferencesUpdate,
  validateArchiveOperation,
  validateUnarchiveOperation,
} from './validation'

describe('validation critical paths', () => {
  describe('collection integrity rules', () => {
    it('rejects archived status without archived_at timestamp', () => {
      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Archived collection',
          status: 'archived',
        }),
      ).toThrow('Archived collections must have archived_at timestamp')
    })

    it('rejects active status with archived/deleted timestamps', () => {
      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Active with timestamps',
          status: 'active',
          archived_at: new Date().toISOString(),
        }),
      ).toThrow('Active collections cannot have archived_at or deleted_at timestamps')
    })

    it('accepts deleted collection with deleted_at only', () => {
      const deletedAt = new Date().toISOString()
      const result = validateCollection({
        id: 'c1',
        name: 'Deleted',
        status: 'deleted',
        deleted_at: deletedAt,
      })

      expect(result.status).toBe('deleted')
      expect(result.deleted_at).toBe(deletedAt)
    })

    it('rejects invalid status and timestamp combinations', () => {
      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Bad status',
          status: 'paused' as 'active',
        }),
      ).toThrow('Invalid collection status. Must be active, archived, or deleted')

      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Archived+deleted',
          status: 'archived',
          archived_at: new Date().toISOString(),
          deleted_at: new Date().toISOString(),
        }),
      ).toThrow('Collection cannot have both archived_at and deleted_at set simultaneously')

      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Deleted without date',
          status: 'deleted',
        }),
      ).toThrow('Deleted collections must have deleted_at timestamp')

      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Deleted with archived timestamp',
          status: 'deleted',
          archived_at: new Date().toISOString(),
          deleted_at: new Date().toISOString(),
        }),
      ).toThrow('Deleted collections cannot have archived_at timestamp')
    })

    it('rejects invalid timestamp types and malformed dates', () => {
      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Archived not string',
          status: 'archived',
          archived_at: 123 as unknown as string,
        }),
      ).toThrow('archived_at must be a string')

      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Deleted invalid date',
          status: 'deleted',
          deleted_at: 'not-a-date',
        }),
      ).toThrow('deleted_at must be a valid date string')

      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Archived invalid date',
          status: 'archived',
          archived_at: 'not-a-date',
        }),
      ).toThrow('archived_at must be a valid date string')

      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Deleted not string',
          status: 'deleted',
          deleted_at: 123 as unknown as string,
        }),
      ).toThrow('deleted_at must be a string')
    })

    it('rejects missing required collection fields', () => {
      expect(() =>
        validateCollection({
          id: '',
          name: '',
          status: 'active',
        }),
      ).toThrow('Collection ID is required, Collection name is required')
    })

    it('surfaces nested release line configuration errors', () => {
      expect(() =>
        validateCollection({
          id: 'c1',
          name: 'Has bad release line',
          status: 'active',
          releaseLineConfig: { color: 'pink' },
        }),
      ).toThrow('Invalid release line configuration')
    })
  })

  describe('import data integrity', () => {
    it('skips deleted collections while importing valid data', () => {
      const input = {
        collections: [
          {
            id: 'c-active',
            name: 'Active',
            status: 'active',
            dots: [
              { id: 'd1', label: 'Dot', x: 10, y: 10, color: '#abcdef', size: 3, archived: false },
            ],
          },
          {
            id: 'c-deleted',
            name: 'Deleted',
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            dots: [],
          },
        ],
      }

      const result = validateImportData(input)
      expect(result.collections).toHaveLength(1)
      expect(result.collections[0].id).toBe('c-active')
    })

    it('rejects malformed snapshots', () => {
      expect(() =>
        validateImportData({
          collections: [],
          snapshots: [{ collectionId: 'c1', collectionName: 'C1', dots: 'not-an-array' }],
        }),
      ).toThrow(ValidationError)
    })

    it('rejects invalid top-level import payloads and limits', () => {
      expect(() => validateImportData(null)).toThrow('Import data must be an object')
      expect(() => validateImportData({ snapshots: [] })).toThrow('Import data must contain a collections array')
      expect(() =>
        validateImportData({
          collections: Array.from({ length: 101 }, (_, idx) => ({
            id: `c-${idx}`,
            name: `Collection ${idx}`,
            status: 'active',
            dots: [],
          })),
        }),
      ).toThrow('Too many collections. Maximum 100 allowed')
    })

    it('rejects invalid collection shapes and dot limits during import', () => {
      expect(() =>
        validateImportData({
          collections: [{ id: 'c1', name: 'No dots array', status: 'active', dots: null }],
        }),
      ).toThrow('Collection 0 must have a dots array')

      expect(() =>
        validateImportData({
          collections: [
            {
              id: 'c1',
              name: 'Too many dots',
              status: 'active',
              dots: Array.from({ length: 1001 }, (_, idx) => ({
                id: `d-${idx}`,
                label: `Dot ${idx}`,
                x: 10,
                y: 20,
              })),
            },
          ],
        }),
      ).toThrow('Collection 0 has too many dots. Maximum 1000 allowed')
    })

    it('rejects snapshot limits and invalid release line config in snapshots', () => {
      expect(() =>
        validateImportData({
          collections: [],
          snapshots: Array.from({ length: 1001 }, (_, idx) => ({
            date: `2026-01-${(idx % 28) + 1}`,
            collectionId: 'c1',
            collectionName: 'C1',
            dots: [],
            timestamp: idx,
          })),
        }),
      ).toThrow('Too many snapshots. Maximum 1000 allowed')

      expect(() =>
        validateImportData({
          collections: [],
          snapshots: [
            {
              date: '2025-01-01',
              collectionId: 'c1',
              collectionName: 'C1',
              dots: [],
              timestamp: Date.now(),
              releaseLineConfig: { color: 'pink' },
            },
          ],
        }),
      ).toThrow('Invalid release line configuration in snapshot 0')

      const withReleaseLineConfig = validateImportData({
        collections: [],
        snapshots: [
          {
            date: '2025-01-01',
            collectionId: 'c1',
            collectionName: 'C1',
            dots: [],
            timestamp: Date.now(),
            releaseLineConfig: { enabled: true, color: '#123456', text: 'RL' },
          },
        ],
      })
      expect(withReleaseLineConfig.snapshots[0].releaseLineConfig).toEqual({
        enabled: true,
        color: '#123456',
        text: 'RL',
      })
    })
  })

  describe('auth/session/privacy related validation guards', () => {
    it('sanitizes preference payload with defaults and strict formats', () => {
      const result = validateUserPreferencesUpdate({
        selectedCollectionId: '  c_1 !! ',
        copyFormat: 'SVG',
        dotColorDiscovery: '#123456',
      })

      expect(result.selectedCollectionId).toBe('c_1')
      expect(result.copyFormat).toBe('SVG')
      expect(result.dotColorDiscovery).toBe('#123456')
      expect(result.showTodayCollection).toBe(true)
    })

    it('rejects invalid copy format and invalid operation statuses', () => {
      expect(() => validateUserPreferencesUpdate({ copyFormat: 'PDF' as 'PNG' })).toThrow(
        'Invalid copy format. Must be PNG or SVG',
      )
      expect(() =>
        validateArchiveOperation('c1', '123e4567-e89b-12d3-a456-426614174000', 'archived'),
      ).toThrow('Only active collections can be archived')
      expect(() =>
        validateUnarchiveOperation('c1', '123e4567-e89b-12d3-a456-426614174000', 'active'),
      ).toThrow('Only archived collections can be unarchived')
    })

    it('rejects invalid ids on sanitizeId', () => {
      expect(() => sanitizeId('!!!')).toThrow('ID cannot be empty')
    })

    it('validates operation guard wrappers and user IDs', () => {
      const validUserId = '123e4567-e89b-12d3-a456-426614174000'
      expect(validateUserId(validUserId)).toBe(validUserId)
      expect(() => validateUserId('not-a-uuid')).toThrow('Invalid user ID format')
      expect(() => validateCollectionId('!!!')).toThrow('ID cannot be empty')
      expect(() => validateDotId('!!!')).toThrow('ID cannot be empty')
      expect(() => validateSnapshotId('!!!')).toThrow('ID cannot be empty')
      expect(() => validateDeleteOperation('!!!', validUserId)).toThrow('ID cannot be empty')
      expect(() => validateDeleteOperation('collection_ok', 'bad-user-id')).toThrow('Invalid user ID format')
    })

    it('accepts valid archive/unarchive/delete operations', () => {
      const validUserId = '123e4567-e89b-12d3-a456-426614174000'
      expect(() => validateArchiveOperation('collection_ok', validUserId, 'active')).not.toThrow()
      expect(() => validateArchiveOperation('collection_ok', validUserId)).not.toThrow()
      expect(() => validateUnarchiveOperation('collection_ok', validUserId, 'archived')).not.toThrow()
      expect(() => validateUnarchiveOperation('collection_ok', validUserId)).not.toThrow()
      expect(() => validateDeleteOperation('collection_ok', validUserId)).not.toThrow()
    })
  })

  describe('primitive and focused branch coverage', () => {
    it('covers primitive sanitizer failure branches', () => {
      expect(() => sanitizeString(123 as unknown as string)).toThrow('Input must be a string')
      expect(() => sanitizeString('x'.repeat(256))).toThrow('Input too long. Maximum 255 characters allowed')
      expect(() => sanitizeNumber(NaN)).toThrow('Input must be a valid number')
      expect(() => sanitizeNumber(-1, 0)).toThrow('Number must be at least 0')
      expect(() => sanitizeHexColor(123 as unknown as string)).toThrow('Color must be a string')
      expect(() => sanitizeColor(123 as unknown as string)).toThrow('Color must be a string')
      expect(() => sanitizeColor('#12')).toThrow('Invalid color format')
      expect(() => sanitizeColor('rgb(999, 1, 1)')).not.toThrow()
      expect(() => sanitizeColor('a'.repeat(51))).toThrow('Color string too long')
      expect(() => sanitizeId('a'.repeat(101))).toThrow('ID too long. Maximum 100 characters allowed')
    })

    it('validates release line and dot required field branches', () => {
      expect(() => validateReleaseLineConfig({ color: 'bad' })).toThrow('Invalid hex color format')
      expect(validateReleaseLineConfig({})).toEqual({ enabled: false, color: '#ff00ff', text: '' })
      expect(() => validateDot({ id: '', label: 'x', x: 1, y: 1 })).toThrow('Dot ID is required')
      expect(() => validateDot({ id: 'd1', label: '', x: 1, y: 1 })).toThrow('Dot label is required')
      expect(() => validateDot({ id: 123 as unknown as string, label: 'x', x: 1, y: 1 })).toThrow('ID must be a string')
      expect(() => validateUserId(123 as unknown as string)).toThrow('User ID must be a string')
    })

    it('normalizes unexpected internal errors into validation errors', () => {
      const dotWithThrowingGetter = {} as { id: string }
      Object.defineProperty(dotWithThrowingGetter, 'id', {
        get() {
          throw new Error('boom-dot')
        },
      })
      expect(() => validateDot(dotWithThrowingGetter)).toThrow('Invalid dot data')

      const releaseLineWithThrowingGetter = {} as { color: string }
      Object.defineProperty(releaseLineWithThrowingGetter, 'color', {
        get() {
          throw new Error('boom-release')
        },
      })
      expect(() => validateReleaseLineConfig(releaseLineWithThrowingGetter)).toThrow(
        'Invalid release line configuration',
      )

      const collectionWithThrowingGetter = {} as { status: string }
      Object.defineProperty(collectionWithThrowingGetter, 'status', {
        get() {
          throw new Error('boom-collection')
        },
      })
      expect(() => validateCollection(collectionWithThrowingGetter)).toThrow('Invalid collection data')
    })

    it('covers import metadata and user preference nullable branches', () => {
      const data = validateImportData({
        collections: [],
        exportDate: ' 2026-01-01 ',
        version: ' 2.0 ',
      })
      expect(data.exportDate).toBe('2026-01-01')
      expect(data.version).toBe('2.0')

      const prefs = validateUserPreferencesUpdate({
        selectedCollectionId: null,
        gradientStartColor: null,
        gradientEndColor: undefined,
      })
      expect(prefs.selectedCollectionId).toBeNull()
      expect(prefs.gradientStartColor).toBeNull()
      expect(prefs.gradientEndColor).toBeNull()
    })
  })
})
