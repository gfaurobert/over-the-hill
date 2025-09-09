/**
 * Cache Invalidation Rules
 * 
 * Defines and manages invalidation rules for different data mutations
 * to ensure cache consistency across the application.
 */

import { InvalidationRule, CacheEntry } from './cacheService'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Predefined invalidation rules for common operations
export const INVALIDATION_RULES: Record<string, InvalidationRule[]> = {
  // Collection operations
  'collection:create': [
    {
      trigger: 'mutation',
      pattern: '*:collections*',
      entityTypes: ['collection'],
      cascadeRules: ['*:user:*:collections*']
    }
  ],

  'collection:update': [
    {
      trigger: 'mutation',
      pattern: '*:collection:*',
      entityTypes: ['collection'],
      cascadeRules: ['*:collections*', '*:dots:*', '*:snapshots:*']
    }
  ],

  'collection:delete': [
    {
      trigger: 'mutation',
      pattern: '*:collection:*',
      entityTypes: ['collection'],
      cascadeRules: ['*:collections*', '*:dots:*', '*:snapshots:*']
    }
  ],

  'collection:archive': [
    {
      trigger: 'mutation',
      pattern: '*:collection:*',
      entityTypes: ['collection'],
      cascadeRules: ['*:collections*']
    }
  ],

  // Dot operations
  'dot:create': [
    {
      trigger: 'mutation',
      pattern: '*:dots:*',
      entityTypes: ['dot'],
      cascadeRules: ['*:collection:*', '*:collections*']
    }
  ],

  'dot:update': [
    {
      trigger: 'mutation',
      pattern: '*:dot:*',
      entityTypes: ['dot'],
      cascadeRules: ['*:dots:*', '*:collection:*']
    }
  ],

  'dot:delete': [
    {
      trigger: 'mutation',
      pattern: '*:dot:*',
      entityTypes: ['dot'],
      cascadeRules: ['*:dots:*', '*:collection:*']
    }
  ],

  'dot:archive': [
    {
      trigger: 'mutation',
      pattern: '*:dot:*',
      entityTypes: ['dot'],
      cascadeRules: ['*:dots:*', '*:collection:*']
    }
  ],

  // Snapshot operations
  'snapshot:create': [
    {
      trigger: 'mutation',
      pattern: '*:snapshots*',
      entityTypes: ['snapshot']
    }
  ],

  'snapshot:delete': [
    {
      trigger: 'mutation',
      pattern: '*:snapshot:*',
      entityTypes: ['snapshot'],
      cascadeRules: ['*:snapshots*']
    }
  ],

  // User preference operations
  'preferences:update': [
    {
      trigger: 'mutation',
      pattern: '*:preferences*',
      entityTypes: ['user_preferences'],
      cascadeRules: ['*:ui:*']
    }
  ],

  // Session-based invalidation
  'session:login': [
    {
      trigger: 'session',
      pattern: '*',
      entityTypes: ['collection', 'dot', 'snapshot', 'user_preferences']
    }
  ],

  'session:logout': [
    {
      trigger: 'session',
      pattern: '*',
      entityTypes: ['collection', 'dot', 'snapshot', 'user_preferences']
    }
  ],

  'session:expire': [
    {
      trigger: 'session',
      pattern: '*',
      entityTypes: ['collection', 'dot', 'snapshot', 'user_preferences']
    }
  ],

  // Time-based invalidation
  'time:stale': [
    {
      trigger: 'time',
      pattern: '*',
      entityTypes: ['collection', 'dot', 'snapshot', 'user_preferences']
    }
  ]
}

// Invalidation rule manager
export class InvalidationRuleManager {
  private rules: Map<string, InvalidationRule[]> = new Map()

  constructor() {
    // Load predefined rules
    Object.entries(INVALIDATION_RULES).forEach(([operation, rules]) => {
      this.rules.set(operation, rules)
    })
  }

  // Get invalidation rules for an operation
  getRules(operation: string): InvalidationRule[] {
    return this.rules.get(operation) || []
  }

  // Add custom invalidation rule
  addRule(operation: string, rule: InvalidationRule): void {
    const existingRules = this.rules.get(operation) || []
    this.rules.set(operation, [...existingRules, rule])
  }

  // Remove invalidation rule
  removeRule(operation: string, ruleIndex: number): void {
    const existingRules = this.rules.get(operation) || []
    if (ruleIndex >= 0 && ruleIndex < existingRules.length) {
      // Create new array without the rule at ruleIndex (immutable operation)
      const newRules = existingRules.filter((_, index) => index !== ruleIndex)
      this.rules.set(operation, newRules)
    }
  }

  // Get all patterns to invalidate for an operation
  getInvalidationPatterns(operation: string, entityId?: string, userId?: string): string[] {
    const rules = this.getRules(operation)
    const patterns: string[] = []

    for (const rule of rules) {
      let pattern = rule.pattern

      // Replace placeholders with actual values
      if (entityId) {
        pattern = pattern.replace(/\{entityId\}/g, entityId)
      }
      if (userId) {
        pattern = pattern.replace(/\{userId\}/g, userId)
      }

      patterns.push(pattern)

      // Add cascade patterns
      if (rule.cascadeRules) {
        for (let cascadePattern of rule.cascadeRules) {
          if (entityId) {
            cascadePattern = cascadePattern.replace(/\{entityId\}/g, entityId)
          }
          if (userId) {
            cascadePattern = cascadePattern.replace(/\{userId\}/g, userId)
          }
          patterns.push(cascadePattern)
        }
      }
    }

    return patterns
  }

  // Check if operation should trigger invalidation
  shouldInvalidate(operation: string, trigger: InvalidationRule['trigger']): boolean {
    const rules = this.getRules(operation)
    return rules.some(rule => rule.trigger === trigger)
  }

  // Get entity types affected by operation
  getAffectedEntityTypes(operation: string): CacheEntry<any>['entityType'][] {
    const rules = this.getRules(operation)
    const entityTypes = new Set<CacheEntry<any>['entityType']>()

    rules.forEach(rule => {
      rule.entityTypes.forEach(type => {
        entityTypes.add(type as CacheEntry<any>['entityType'])
      })
    })

    return Array.from(entityTypes)
  }
}

// Singleton instance
let ruleManagerInstance: InvalidationRuleManager | null = null

export const getInvalidationRuleManager = (): InvalidationRuleManager => {
  if (!ruleManagerInstance) {
    ruleManagerInstance = new InvalidationRuleManager()
  }
  return ruleManagerInstance
}

// Helper function to generate cache keys for different entities
export const generateCacheKey = (
  userId: string,
  entityType: string,
  entityId?: string,
  suffix?: string
): string => {
  let key = `user:${userId}:${entityType}`

  if (entityId) {
    key += `:${entityId}`
  }

  if (suffix) {
    key += `:${suffix}`
  }

  return key
}

// Helper function to extract user ID from cache key
export const extractUserIdFromKey = (key: string): string | null => {
  const match = key.match(/^user:([^:]+):/)
  return match ? match[1] : null
}

// Helper function to extract entity type from cache key
export const extractEntityTypeFromKey = (key: string): string | null => {
  const match = key.match(/^user:[^:]+:([^:]+)/)
  return match ? match[1] : null
}

// Helper function to extract entity ID from cache key
export const extractEntityIdFromKey = (key: string): string | null => {
  const parts = key.split(':')

  // Key format: user:${userId}:${entityType}[:${entityId}][:${suffix}]
  // Only return entityId if the key structure indicates it has one
  if (parts.length >= 4 && parts[0] === 'user') {
    // Check if parts[3] looks like an entityId (not empty and not a known suffix pattern)
    const potentialEntityId = parts[3]

    // EntityId should not be empty and should not be common suffix patterns
    if (potentialEntityId &&
      potentialEntityId !== 'list' &&
      potentialEntityId !== 'all' &&
      potentialEntityId !== 'metadata') {
      return potentialEntityId
    }
  }

  return null
}