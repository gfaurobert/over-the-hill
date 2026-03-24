import {
  InvalidationRuleManager,
  generateCacheKey,
  extractUserIdFromKey,
  extractEntityTypeFromKey,
  extractEntityIdFromKey,
  getInvalidationRuleManager,
} from '../cacheInvalidationRules'

describe('cacheInvalidationRules', () => {
  describe('InvalidationRuleManager', () => {
    it('returns empty rules for unknown operation', () => {
      const manager = new InvalidationRuleManager()
      expect(manager.getRules('unknown:operation')).toEqual([])
    })

    it('adds and removes custom rules immutably', () => {
      const manager = new InvalidationRuleManager()
      manager.addRule('custom:op', {
        trigger: 'mutation',
        pattern: 'user:{userId}:custom:{entityId}',
        entityTypes: ['collection'],
        cascadeRules: ['user:{userId}:collections'],
      })

      expect(manager.getRules('custom:op')).toHaveLength(1)
      expect(manager.getInvalidationPatterns('custom:op', 'c1', 'u1')).toEqual([
        'user:u1:custom:c1',
        'user:u1:collections',
      ])

      manager.removeRule('custom:op', 0)
      expect(manager.getRules('custom:op')).toEqual([])
    })

    it('ignores removeRule with out-of-range index', () => {
      const manager = new InvalidationRuleManager()
      manager.addRule('custom:op', {
        trigger: 'mutation',
        pattern: 'user:{userId}:custom:{entityId}',
        entityTypes: ['collection'],
      })
      manager.removeRule('custom:op', 99)
      expect(manager.getRules('custom:op')).toHaveLength(1)
    })

    it('ignores removeRule for negative index and unknown operation', () => {
      const manager = new InvalidationRuleManager()
      manager.addRule('custom:op', {
        trigger: 'mutation',
        pattern: 'user:{userId}:custom:{entityId}',
        entityTypes: ['collection'],
      })

      manager.removeRule('custom:op', -1)
      manager.removeRule('missing:op', 0)

      expect(manager.getRules('custom:op')).toHaveLength(1)
      expect(manager.getRules('missing:op')).toEqual([])
    })

    it('keeps placeholders when entityId or userId are omitted', () => {
      const manager = new InvalidationRuleManager()
      manager.addRule('custom:op:placeholders', {
        trigger: 'mutation',
        pattern: 'user:{userId}:custom:{entityId}',
        entityTypes: ['collection'],
        cascadeRules: ['user:{userId}:collections:{entityId}'],
      })

      expect(
        manager.getInvalidationPatterns('custom:op:placeholders', undefined, 'u1')
      ).toEqual(['user:u1:custom:{entityId}', 'user:u1:collections:{entityId}'])

      expect(
        manager.getInvalidationPatterns('custom:op:placeholders', 'c1', undefined)
      ).toEqual(['user:{userId}:custom:c1', 'user:{userId}:collections:c1'])
    })

    it('returns deduplicated affected entity types and trigger checks', () => {
      const manager = new InvalidationRuleManager()
      manager.addRule('custom:op', {
        trigger: 'mutation',
        pattern: 'a',
        entityTypes: ['collection', 'dot'],
      })
      manager.addRule('custom:op', {
        trigger: 'mutation',
        pattern: 'b',
        entityTypes: ['dot'],
      })

      const affected = manager.getAffectedEntityTypes('custom:op').sort()
      expect(affected).toEqual(['collection', 'dot'])
      expect(manager.shouldInvalidate('custom:op', 'mutation')).toBe(true)
      expect(manager.shouldInvalidate('custom:op', 'time')).toBe(false)
    })
  })

  describe('singleton manager', () => {
    it('returns same instance across calls', () => {
      const first = getInvalidationRuleManager()
      const second = getInvalidationRuleManager()
      expect(first).toBe(second)
    })
  })

  describe('cache key helpers', () => {
    it('generates and extracts cache key parts', () => {
      const key = generateCacheKey('user-1', 'collection', 'col-1', 'list')
      expect(key).toBe('user:user-1:collection:col-1:list')
      expect(extractUserIdFromKey(key)).toBe('user-1')
      expect(extractEntityTypeFromKey(key)).toBe('collection')
      expect(extractEntityIdFromKey(key)).toBe('col-1')
    })

    it('returns null for keys without entity id or known suffix ids', () => {
      expect(extractEntityIdFromKey('user:u1:collections:list')).toBeNull()
      expect(extractEntityIdFromKey('user:u1:collections:all')).toBeNull()
      expect(extractEntityIdFromKey('user:u1:collections:metadata')).toBeNull()
      expect(extractEntityIdFromKey('invalid-key')).toBeNull()
    })

    it('generates keys when optional segments are missing', () => {
      expect(generateCacheKey('u1', 'collection')).toBe('user:u1:collection')
      expect(generateCacheKey('u1', 'collection', 'c1')).toBe('user:u1:collection:c1')
      expect(generateCacheKey('u1', 'collection', undefined, 'list')).toBe(
        'user:u1:collection:list'
      )
    })

    it('returns null for invalid user and entity type key formats', () => {
      expect(extractUserIdFromKey('u1:collection:c1')).toBeNull()
      expect(extractEntityTypeFromKey('useronly')).toBeNull()
    })
  })
})
