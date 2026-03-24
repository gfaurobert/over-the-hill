/**
 * Simple Data Service - No Caching, Always Fresh Data
 * 
 * This service bypasses all caching mechanisms and always fetches fresh data
 * from the database. Use this when you need guaranteed fresh data.
 */

import * as supabaseService from './supabaseService'
import type { Collection, Dot, Snapshot, ReleaseLineConfig } from '@/components/HillChartApp'
import type { UserPreferences } from './supabaseService'
import type { UserPreferencesUpdate } from '@/lib/validation'

/* eslint-disable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SimpleFetchOptions {
  // No caching options - always fresh
}

function warnUnsupportedSimpleOptions(methodName: string, options: SimpleFetchOptions): void {
  if (Object.keys(options).length > 0) {
    console.warn(`[SIMPLE_DATA] ${methodName} received unsupported options and ignored them`, options)
  }
}

/**
 * Simple data service that always fetches fresh data
 */
export class SimpleDataService {
  // Canonical runtime facade: this service is the production default.
  // Keep API explicit and avoid adding cache-like options here.
  
  // Collections operations
  async fetchCollections(
    userId: string,
    includeArchived: boolean = false,
    options: SimpleFetchOptions = {}
  ): Promise<Collection[]> {
    warnUnsupportedSimpleOptions('fetchCollections', options)
    console.log(`[SIMPLE_DATA] Fetching fresh collections from database (archived: ${includeArchived})`)
    return await supabaseService.fetchCollections(userId, includeArchived)
  }

  async createCollection(userId: string, name: string, id?: string): Promise<Collection | null> {
    console.log(`[SIMPLE_DATA] Creating new collection: ${name}`)
    const collection: Collection = {
      id: id || crypto.randomUUID(),
      name,
      status: 'active',
      dots: []
    }
    return await supabaseService.addCollection(collection, userId)
  }

  async updateCollection(userId: string, collectionId: string, updates: Partial<Collection>): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Updating collection: ${collectionId}`)
    if (updates.name) {
      return await supabaseService.updateCollection(collectionId, updates.name, userId)
    }
    return false
  }

  async deleteCollection(userId: string, collectionId: string): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Deleting collection: ${collectionId}`)
    return await supabaseService.deleteCollection(collectionId, userId)
  }

  async archiveCollection(userId: string, collectionId: string): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Archiving collection: ${collectionId}`)
    return await supabaseService.archiveCollection(collectionId, userId)
  }

  async unarchiveCollection(userId: string, collectionId: string): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Unarchiving collection: ${collectionId}`)
    return await supabaseService.unarchiveCollection(collectionId, userId)
  }

  async addCollection(userId: string, name: string, id?: string): Promise<Collection | null> {
    console.log(`[SIMPLE_DATA] Adding collection: ${name}`)
    return await this.createCollection(userId, name, id)
  }

  // Dots operations

  async createDot(userId: string, collectionId: string, dot: Omit<Dot, 'id'>): Promise<Dot | null> {
    console.log(`[SIMPLE_DATA] Creating new dot in collection: ${collectionId}`)
    const fullDot: Dot = {
      ...dot,
      id: crypto.randomUUID()
    }
    return await supabaseService.addDot(fullDot, collectionId, userId)
  }

  async addDot(userId: string, collectionId: string, dot: Omit<Dot, 'id'>): Promise<Dot | null> {
    console.log(`[SIMPLE_DATA] Adding dot to collection: ${collectionId}`)
    return await this.createDot(userId, collectionId, dot)
  }

  async updateDot(dot: Dot, userId: string): Promise<Dot | null> {
    console.log(`[SIMPLE_DATA] Updating dot: ${dot.id}`)
    return await supabaseService.updateDot(dot, userId)
  }

  async deleteDot(userId: string, collectionId: string, dotId: string): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Deleting dot: ${dotId} from collection: ${collectionId}`)
    const result = await supabaseService.deleteDot(dotId, userId)
    return result.success
  }

  // Snapshots operations
  async createSnapshot(
    userId: string,
    collectionId: string,
    collectionName: string,
    dots: Dot[],
    releaseLineConfig?: ReleaseLineConfig
  ): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Creating snapshot for collection: ${collectionId}`)
    return await supabaseService.createSnapshot(userId, collectionId, collectionName, dots, releaseLineConfig)
  }

  async fetchSnapshots(userId: string, options: SimpleFetchOptions = {}): Promise<Snapshot[]> {
    warnUnsupportedSimpleOptions('fetchSnapshots', options)
    console.log(`[SIMPLE_DATA] Fetching fresh snapshots from database`)
    return await supabaseService.fetchSnapshots(userId)
  }

  async loadSnapshot(userId: string, snapshotId: string): Promise<Snapshot | null> {
    console.log(`[SIMPLE_DATA] Loading snapshot: ${snapshotId}`)
    return await supabaseService.loadSnapshot(userId, snapshotId)
  }

  async deleteSnapshot(userId: string, snapshotId: string): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Deleting snapshot: ${snapshotId}`)
    return await supabaseService.deleteSnapshot(userId, snapshotId)
  }

  // User preferences operations
  async fetchUserPreferences(userId: string, options: SimpleFetchOptions = {}): Promise<UserPreferences | null> {
    warnUnsupportedSimpleOptions('fetchUserPreferences', options)
    console.log(`[SIMPLE_DATA] Fetching fresh user preferences from database`)
    return await supabaseService.fetchUserPreferences(userId)
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferencesUpdate>): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Updating user preferences`)
    return await supabaseService.upsertUserPreferences(userId, preferences)
  }

  // Utility functions
  async clearAllCache(): Promise<void> {
    console.warn(`[SIMPLE_DATA] clearAllCache called on simple service; operation is unsupported because this service has no cache`)
  }

  async clearUserCache(userId: string): Promise<void> {
    console.warn(`[SIMPLE_DATA] clearUserCache called for user ${userId}; operation is unsupported because this service has no cache`)
  }

  async importData(userId: string, data: any): Promise<Collection[]> {
    console.log(`[SIMPLE_DATA] Importing data for user: ${userId}`)
    return await supabaseService.importData(data, userId)
  }

  async resetAllCollections(userId: string): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Resetting all collections for user: ${userId}`)
    return await supabaseService.resetAllCollections(userId)
  }

  // Release line configuration operations
  async updateCollectionReleaseLineConfig(
    userId: string, 
    collectionId: string, 
    config: ReleaseLineConfig
  ): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Updating release line config for collection: ${collectionId}`)
    return await supabaseService.updateCollectionReleaseLineConfig(userId, collectionId, config)
  }

  async getCollectionReleaseLineConfig(
    userId: string, 
    collectionId: string
  ): Promise<ReleaseLineConfig | null> {
    console.log(`[SIMPLE_DATA] Getting release line config for collection: ${collectionId}`)
    return await supabaseService.getCollectionReleaseLineConfig(userId, collectionId)
  }
}

// Export singleton instance
export const simpleDataService = new SimpleDataService()

// Keep one export style in this module: bound functions from the singleton.
// New APIs should follow this pattern to keep throw/catch ownership explicit.
// Export individual functions to match the cached service interface
export const fetchCollections = simpleDataService.fetchCollections.bind(simpleDataService)
export const addCollection = simpleDataService.addCollection.bind(simpleDataService)
export const updateCollection = simpleDataService.updateCollection.bind(simpleDataService)
export const archiveCollection = simpleDataService.archiveCollection.bind(simpleDataService)
export const unarchiveCollection = simpleDataService.unarchiveCollection.bind(simpleDataService)
export const deleteCollection = simpleDataService.deleteCollection.bind(simpleDataService)
export const addDot = simpleDataService.addDot.bind(simpleDataService)
export const updateDot = simpleDataService.updateDot.bind(simpleDataService)
export const deleteDot = simpleDataService.deleteDot.bind(simpleDataService)
export const createSnapshot = simpleDataService.createSnapshot.bind(simpleDataService)
export const fetchSnapshots = simpleDataService.fetchSnapshots.bind(simpleDataService)
export const loadSnapshot = simpleDataService.loadSnapshot.bind(simpleDataService)
export const deleteSnapshot = simpleDataService.deleteSnapshot.bind(simpleDataService)
export const fetchUserPreferences = simpleDataService.fetchUserPreferences.bind(simpleDataService)
export const updateUserPreferences = simpleDataService.updateUserPreferences.bind(simpleDataService)
export const importData = simpleDataService.importData.bind(simpleDataService)
export const resetAllCollections = simpleDataService.resetAllCollections.bind(simpleDataService)
export const updateCollectionReleaseLineConfig = simpleDataService.updateCollectionReleaseLineConfig.bind(simpleDataService)
export const getCollectionReleaseLineConfig = simpleDataService.getCollectionReleaseLineConfig.bind(simpleDataService)
