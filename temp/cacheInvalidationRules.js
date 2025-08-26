"use strict";
/**
 * Cache Invalidation Rules
 *
 * Defines and manages invalidation rules for different data mutations
 * to ensure cache consistency across the application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEntityIdFromKey = exports.extractEntityTypeFromKey = exports.extractUserIdFromKey = exports.generateCacheKey = exports.getInvalidationRuleManager = exports.InvalidationRuleManager = exports.INVALIDATION_RULES = void 0;
// Predefined invalidation rules for common operations
exports.INVALIDATION_RULES = {
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
};
// Invalidation rule manager
class InvalidationRuleManager {
    constructor() {
        this.rules = new Map();
        // Load predefined rules
        Object.entries(exports.INVALIDATION_RULES).forEach(([operation, rules]) => {
            this.rules.set(operation, rules);
        });
    }
    // Get invalidation rules for an operation
    getRules(operation) {
        return this.rules.get(operation) || [];
    }
    // Add custom invalidation rule
    addRule(operation, rule) {
        const existingRules = this.rules.get(operation) || [];
        this.rules.set(operation, [...existingRules, rule]);
    }
    // Remove invalidation rule
    removeRule(operation, ruleIndex) {
        const existingRules = this.rules.get(operation) || [];
        if (ruleIndex >= 0 && ruleIndex < existingRules.length) {
            existingRules.splice(ruleIndex, 1);
            this.rules.set(operation, existingRules);
        }
    }
    // Get all patterns to invalidate for an operation
    getInvalidationPatterns(operation, entityId, userId) {
        const rules = this.getRules(operation);
        const patterns = [];
        for (const rule of rules) {
            let pattern = rule.pattern;
            // Replace placeholders with actual values
            if (entityId) {
                pattern = pattern.replace(/\{entityId\}/g, entityId);
            }
            if (userId) {
                pattern = pattern.replace(/\{userId\}/g, userId);
            }
            patterns.push(pattern);
            // Add cascade patterns
            if (rule.cascadeRules) {
                for (let cascadePattern of rule.cascadeRules) {
                    if (entityId) {
                        cascadePattern = cascadePattern.replace(/\{entityId\}/g, entityId);
                    }
                    if (userId) {
                        cascadePattern = cascadePattern.replace(/\{userId\}/g, userId);
                    }
                    patterns.push(cascadePattern);
                }
            }
        }
        return patterns;
    }
    // Check if operation should trigger invalidation
    shouldInvalidate(operation, trigger) {
        const rules = this.getRules(operation);
        return rules.some(rule => rule.trigger === trigger);
    }
    // Get entity types affected by operation
    getAffectedEntityTypes(operation) {
        const rules = this.getRules(operation);
        const entityTypes = new Set();
        rules.forEach(rule => {
            rule.entityTypes.forEach(type => {
                entityTypes.add(type);
            });
        });
        return Array.from(entityTypes);
    }
}
exports.InvalidationRuleManager = InvalidationRuleManager;
// Singleton instance
let ruleManagerInstance = null;
const getInvalidationRuleManager = () => {
    if (!ruleManagerInstance) {
        ruleManagerInstance = new InvalidationRuleManager();
    }
    return ruleManagerInstance;
};
exports.getInvalidationRuleManager = getInvalidationRuleManager;
// Helper function to generate cache keys for different entities
const generateCacheKey = (userId, entityType, entityId, suffix) => {
    let key = `user:${userId}:${entityType}`;
    if (entityId) {
        key += `:${entityId}`;
    }
    if (suffix) {
        key += `:${suffix}`;
    }
    return key;
};
exports.generateCacheKey = generateCacheKey;
// Helper function to extract user ID from cache key
const extractUserIdFromKey = (key) => {
    const match = key.match(/^user:([^:]+):/);
    return match ? match[1] : null;
};
exports.extractUserIdFromKey = extractUserIdFromKey;
// Helper function to extract entity type from cache key
const extractEntityTypeFromKey = (key) => {
    const match = key.match(/^user:[^:]+:([^:]+)/);
    return match ? match[1] : null;
};
exports.extractEntityTypeFromKey = extractEntityTypeFromKey;
// Helper function to extract entity ID from cache key
const extractEntityIdFromKey = (key) => {
    const parts = key.split(':');
    if (parts.length >= 4) {
        return parts[3];
    }
    return null;
};
exports.extractEntityIdFromKey = extractEntityIdFromKey;
