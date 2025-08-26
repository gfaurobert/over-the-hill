/**
 * Cache Service Test Utility
 * 
 * Simple test functions to verify cache operations work correctly
 * Run in browser console or as part of development testing
 */

import { CacheManager, getCacheManager, initializeCacheManager } from './cacheService'

// Test results interface
interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

// Test runner class
export class CacheServiceTester {
  private results: TestResult[] = []
  private cacheManager: CacheManager

  constructor() {
    this.cacheManager = new CacheManager({
      defaultTTL: 1000, // 1 second for fast testing
      storagePrefix: 'test_cache_',
    })
  }

  // Run a single test
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    
    try {
      await testFn()
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime
      })
      console.log(`✅ ${name}`)
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      })
      console.error(`❌ ${name}: ${error}`)
    }
  }

  // Test basic cache operations
  async testBasicOperations(): Promise<void> {
    await this.runTest('Basic set and get', async () => {
      const testData = { id: '1', name: 'Test Collection' }
      const cacheKey = 'user:123:collections'
      
      await this.cacheManager.set(cacheKey, testData)
      const retrieved = await this.cacheManager.get(cacheKey)
      
      if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('Retrieved data does not match set data')
      }
    })

    await this.runTest('Get non-existent key', async () => {
      const result = await this.cacheManager.get('non-existent-key')
      if (result !== null) {
        throw new Error('Expected null for non-existent key')
      }
    })

    await this.runTest('Cache invalidation', async () => {
      const testData = { id: '1', name: 'Test' }
      const cacheKey = 'user:123:test'
      
      await this.cacheManager.set(cacheKey, testData)
      const beforeInvalidation = await this.cacheManager.get(cacheKey)
      
      if (!beforeInvalidation) {
        throw new Error('Data should exist before invalidation')
      }
      
      await this.cacheManager.invalidate(cacheKey)
      const afterInvalidation = await this.cacheManager.get(cacheKey)
      
      if (afterInvalidation !== null) {
        throw new Error('Data should be null after invalidation')
      }
    })

    await this.runTest('Multiple key invalidation', async () => {
      const testData1 = { id: '1', name: 'Test1' }
      const testData2 = { id: '2', name: 'Test2' }
      const key1 = 'user:123:test1'
      const key2 = 'user:123:test2'
      
      await this.cacheManager.set(key1, testData1)
      await this.cacheManager.set(key2, testData2)
      
      await this.cacheManager.invalidate([key1, key2])
      
      const result1 = await this.cacheManager.get(key1)
      const result2 = await this.cacheManager.get(key2)
      
      if (result1 !== null || result2 !== null) {
        throw new Error('Both keys should be null after invalidation')
      }
    })

    await this.runTest('Clear all cache', async () => {
      const testData = { id: '1', name: 'Test' }
      
      await this.cacheManager.set('key1', testData)
      await this.cacheManager.set('key2', testData)
      
      await this.cacheManager.clear()
      
      const result1 = await this.cacheManager.get('key1')
      const result2 = await this.cacheManager.get('key2')
      
      if (result1 !== null || result2 !== null) {
        throw new Error('All keys should be null after clear')
      }
    })
  }

  // Test TTL behavior
  async testTTLBehavior(): Promise<void> {
    await this.runTest('Custom TTL expiration', async () => {
      const testData = { id: '1', name: 'Test' }
      const cacheKey = 'user:123:test'
      const customTTL = 100 // 100ms
      
      await this.cacheManager.set(cacheKey, testData, customTTL)
      
      // Should be available immediately
      const immediate = await this.cacheManager.get(cacheKey)
      if (!immediate) {
        throw new Error('Data should be available immediately')
      }
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, customTTL + 50))
      
      // Should be expired
      const expired = await this.cacheManager.get(cacheKey)
      if (expired !== null) {
        throw new Error('Data should be expired after TTL')
      }
    })

    await this.runTest('Staleness detection', async () => {
      const testData = { id: '1', name: 'Test' }
      const cacheKey = 'user:123:test'
      const shortTTL = 100
      
      await this.cacheManager.set(cacheKey, testData, shortTTL)
      
      // Should not be stale immediately
      const freshCheck = await this.cacheManager.isStale(cacheKey)
      if (freshCheck) {
        throw new Error('Data should not be stale immediately')
      }
      
      const freshnessCheck = await this.cacheManager.validateFreshness(cacheKey)
      if (!freshnessCheck) {
        throw new Error('Data should be fresh immediately')
      }
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50))
      
      // Should be stale
      const staleCheck = await this.cacheManager.isStale(cacheKey)
      if (!staleCheck) {
        throw new Error('Data should be stale after TTL')
      }
      
      const stalenessFreshnessCheck = await this.cacheManager.validateFreshness(cacheKey)
      if (stalenessFreshnessCheck) {
        throw new Error('Data should not be fresh after TTL')
      }
    })

    await this.runTest('Non-existent key staleness', async () => {
      const staleCheck = await this.cacheManager.isStale('non-existent')
      const freshnessCheck = await this.cacheManager.validateFreshness('non-existent')
      
      if (!staleCheck || freshnessCheck) {
        throw new Error('Non-existent keys should be stale and not fresh')
      }
    })
  }

  // Test entity type detection
  async testEntityTypes(): Promise<void> {
    await this.runTest('Collection entity type', async () => {
      const testData = { id: '1', name: 'Test Collection' }
      await this.cacheManager.set('user:123:collections:active', testData)
      
      const retrieved = await this.cacheManager.get('user:123:collections:active')
      if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('Collection data not retrieved correctly')
      }
    })

    await this.runTest('Dot entity type', async () => {
      const testData = { id: '1', label: 'Test Dot' }
      await this.cacheManager.set('user:123:dots:collection-1', testData)
      
      const retrieved = await this.cacheManager.get('user:123:dots:collection-1')
      if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('Dot data not retrieved correctly')
      }
    })

    await this.runTest('Snapshot entity type', async () => {
      const testData = { id: '1', date: '2024-01-01' }
      await this.cacheManager.set('user:123:snapshots', testData)
      
      const retrieved = await this.cacheManager.get('user:123:snapshots')
      if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('Snapshot data not retrieved correctly')
      }
    })

    await this.runTest('User preferences entity type', async () => {
      const testData = { theme: 'dark', copyFormat: 'PNG' }
      await this.cacheManager.set('user:123:preferences', testData)
      
      const retrieved = await this.cacheManager.get('user:123:preferences')
      if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
        throw new Error('Preferences data not retrieved correctly')
      }
    })
  }

  // Test singleton behavior
  async testSingleton(): Promise<void> {
    await this.runTest('Singleton instance', async () => {
      const instance1 = getCacheManager()
      const instance2 = getCacheManager()
      
      if (instance1 !== instance2) {
        throw new Error('getCacheManager should return same instance')
      }
    })

    await this.runTest('Initialize with user context', async () => {
      const userId = 'user-123'
      const sessionId = 'session-456'
      
      const cacheManager = initializeCacheManager(userId, sessionId)
      
      if (!cacheManager) {
        throw new Error('initializeCacheManager should return cache manager')
      }
    })
  }

  // Run all tests
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Cache Service Tests...\n')
    
    this.results = []
    
    console.log('📝 Testing basic operations...')
    await this.testBasicOperations()
    
    console.log('\n⏰ Testing TTL behavior...')
    await this.testTTLBehavior()
    
    console.log('\n🏷️ Testing entity types...')
    await this.testEntityTypes()
    
    console.log('\n🔄 Testing singleton behavior...')
    await this.testSingleton()
    
    // Clean up
    await this.cacheManager.clear()
    this.cacheManager.destroy()
    
    // Print summary
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)
    
    console.log(`\n📊 Test Summary:`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏱️ Total time: ${totalTime}ms`)
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:')
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`)
      })
    }
    
    return this.results
  }
}

// Export test runner for use in development
export const runCacheTests = async (): Promise<TestResult[]> => {
  const tester = new CacheServiceTester()
  return await tester.runAllTests()
}

// Auto-run tests if this file is imported in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Cache Service Test Utility loaded. Run runCacheTests() to test cache functionality.')
}