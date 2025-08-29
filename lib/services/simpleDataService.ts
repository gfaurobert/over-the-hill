/**
 * Simple Data Service - No Caching, Always Fresh Data
 * 
 * This service bypasses all caching mechanisms and always fetches fresh data
 * from the database. Use this when you need guaranteed fresh data.
 */

import * as supabaseService from './supabaseService'
import type { Collection, Dot, Snapshot } from '@/components/HillChartApp'

export interface SimpleFetchOptions {
  // No caching options - always fresh
}

/**
 * Simple data service that always fetches fresh data
 */
export class SimpleDataService {
  
  // Collections operations
  async fetchCollections(
    userId: string,
    includeArchived: boolean = false,
    options: SimpleFetchOptions = {}
  ): Promise<Collection[]> {
    console.log(`[SIMPLE_DATA] Fetching fresh collections from database (archived: ${includeArchived})`)
    return await supabaseService.fetchCollections(userId, includeArchived)
  }

  async createCollection(userId: string, name: string): Promise<Collection | null> {
    console.log(`[SIMPLE_DATA] Creating new collection: ${name}`)
    const collection: Collection = {
      id: crypto.randomUUID(),
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

  async addCollection(userId: string, name: string): Promise<Collection | null> {
    console.log(`[SIMPLE_DATA] Adding collection: ${name}`)
    return await this.createCollection(userId, name)
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
    dots: Dot[]
  ): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Creating snapshot for collection: ${collectionId}`)
    return await supabaseService.createSnapshot(userId, collectionId, collectionName, dots)
  }

  async fetchSnapshots(userId: string, options: SimpleFetchOptions = {}): Promise<Snapshot[]> {
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
  async fetchUserPreferences(userId: string, options: SimpleFetchOptions = {}): Promise<any> {
    console.log(`[SIMPLE_DATA] Fetching fresh user preferences from database`)
    return await supabaseService.fetchUserPreferences(userId)
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Updating user preferences`)
    // This function doesn't exist in supabaseService, so we'll implement it directly
    try {
      const { supabase } = await import('@/lib/supabaseClient')
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, preferences })
      
      if (error) {
        console.error('[SIMPLE_DATA] Failed to update user preferences:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('[SIMPLE_DATA] Error updating user preferences:', error)
      return false
    }
  }

  // Utility functions
  async clearAllCache(): Promise<void> {
    console.log(`[SIMPLE_DATA] No cache to clear - always fresh data`)
    // No-op since we don't use cache
  }

  async clearUserCache(userId: string): Promise<void> {
    console.log(`[SIMPLE_DATA] No cache to clear for user: ${userId}`)
    // No-op since we don't use cache
  }

  async importData(userId: string, data: any): Promise<Collection[]> {
    console.log(`[SIMPLE_DATA] Importing data for user: ${userId}`)
    return await supabaseService.importData(data, userId)
  }

  async resetAllCollections(userId: string): Promise<boolean> {
    console.log(`[SIMPLE_DATA] Resetting all collections for user: ${userId}`)
    return await supabaseService.resetAllCollections(userId)
  }
}

// Export singleton instance
export const simpleDataService = new SimpleDataService()

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
export const importData = simpleDataService.importData.bind(simpleDataService)
export const resetAllCollections = simpleDataService.resetAllCollections.bind(simpleDataService)
