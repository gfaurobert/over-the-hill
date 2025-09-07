import { supabase } from "@/lib/supabaseClient"
import { Collection, Dot, Snapshot, ExportData } from "@/components/HillChartApp"
import { privacyService } from "./privacyService"
import { 
  validateDot, 
  validateCollection, 
  validateUserId, 
  validateCollectionId, 
  validateDotId, 
  validateImportData,
  validateArchiveOperation,
  validateUnarchiveOperation,
  validateDeleteOperation,
  validateReleaseLineConfig,
  ValidationError,
  sanitizeString,
  validateSnapshotId
} from "@/lib/validation"

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Types for Supabase table rows with encrypted fields
interface CollectionRow {
  id: string
  name_encrypted: string
  name_hash: string
  user_id: string
  status: string
  archived_at?: string
  deleted_at?: string
  release_line_config_encrypted?: string
}

interface DotRow {
  id: string
  label_encrypted: string
  label_hash: string
  x: number
  y: number
  color: string
  size: number
  archived: boolean
  user_id: string
  collection_id: string
}

interface SnapshotRow {
  id: string
  user_id: string
  collection_id: string
  collection_name_encrypted: string
  created_at: string
  snapshot_date: string
  dots_data_encrypted: string
  release_line_config_encrypted?: string
}

// Enhanced error handling wrapper
const handleServiceError = (error: any, operation: string): void => {
  if (error instanceof ValidationError) {
    console.error(`Validation error in ${operation}:`, error.message)
    throw error
  }
  console.error(`Database error in ${operation}:`, error)
  throw new Error(`Failed to ${operation}: ${error?.message || 'Unknown error'}`)
}

// Specialized error handling for JSON parsing failures
const handleJsonParseError = (
  error: any, 
  operation: string, 
  userId: string, 
  recordId?: string, 
  blobKey?: string
): never => {
  // Create contextual error information
  const errorContext = {
    operation,
    userId,
    recordId: recordId || 'unknown',
    blobKey: blobKey || 'unknown',
    timestamp: new Date().toISOString(),
    errorType: 'JSON_PARSE_FAILURE',
    errorMessage: error instanceof Error ? error.message : 'Unknown parsing error',
    errorStack: error instanceof Error ? error.stack : undefined
  }

  // Log the failure with contextual identifiers
  console.error(`[JSON_PARSE_ERROR] Failed to parse data in ${operation}:`, {
    ...errorContext,
    // Include truncated raw data for debugging (safe for logging)
    rawDataPreview: blobKey ? `${blobKey.substring(0, 50)}...` : 'No blob key available'
  })

  // Log additional context for debugging
  console.error(`[JSON_PARSE_ERROR] Context:`, {
    userId: errorContext.userId,
    recordId: errorContext.recordId,
    operation: errorContext.operation,
    timestamp: errorContext.timestamp
  })

  // Increment error tracking metrics
  incrementErrorMetric('json_parse_failures', { 
    operation, 
    userId, 
    recordId: recordId || 'unknown',
    errorType: errorContext.errorType 
  })
  
  // In production, you would also send this to your error tracking service
  // Example: Sentry.captureException(error, { extra: errorContext })
  // Example: DataDog.log('json_parse_failure', errorContext)
  // Example: NewRelic.recordCustomEvent('JsonParseFailure', errorContext)
  
  // Create a structured error for the caller
  const parseError = new Error(`Failed to parse data in ${operation}: ${errorContext.errorMessage}`)
  parseError.name = 'JsonParseError'
  ;(parseError as any).context = errorContext
  
  throw parseError
}

// Utility function to increment error tracking metrics
// This can be integrated with your monitoring service of choice
const incrementErrorMetric = (metricName: string, tags: Record<string, string> = {}): void => {
  // In production, integrate with your metrics service
  // Example: StatsD.increment(metricName, tags)
  // Example: Prometheus.counter(metricName).inc(tags)
  // Example: CloudWatch.putMetricData(metricName, tags)
  
  // For now, log the metric increment for debugging
  console.log(`[METRIC] ${metricName} incremented:`, tags)
}

// Fetch all collections and their dots for the current user
export const fetchCollections = async (
  userId: string, 
  includeArchived: boolean = false
): Promise<Collection[]> => {
  try {
    console.log('[FETCH_COLLECTIONS] Starting fetch for user:', userId, 'includeArchived:', includeArchived)
    const validatedUserId = validateUserId(userId)

    // Status filter: active + archived if requested, otherwise just active
    const statusFilter = includeArchived ? ['active', 'archived'] : ['active']
    console.log('[FETCH_COLLECTIONS] Status filter:', statusFilter)

    const { data: collectionsData, error: collectionsError } = await supabase
      .from("collections")
      .select("id, name_encrypted, name_hash, status, archived_at, deleted_at, release_line_config_encrypted")
      .eq("user_id", validatedUserId)
      .in("status", statusFilter)
      .order("status", { ascending: true }) // Active first, then archived
      .order("name_hash", { ascending: true })

    if (collectionsError) {
      console.error('[FETCH_COLLECTIONS] Collections query error:', collectionsError)
      throw collectionsError
    }

    console.log('[FETCH_COLLECTIONS] Raw collections data:', collectionsData)

    const { data: dotsData, error: dotsError } = await supabase
      .from("dots")
      .select("*")
      .eq("user_id", validatedUserId)

    if (dotsError) {
      console.error('[FETCH_COLLECTIONS] Dots query error:', dotsError)
      throw dotsError
    }

    console.log('[FETCH_COLLECTIONS] Raw dots data:', dotsData)

    // Decrypt collections and dots
    const decryptedCollections = await Promise.all(
      collectionsData.map(async (collection) => {
        try {
          console.log('[FETCH_COLLECTIONS] Decrypting collection:', collection.id)
          const decryptedCollection = await privacyService.decryptCollection({
            id: collection.id,
            name_encrypted: collection.name_encrypted,
            name_hash: collection.name_hash,
            userId: validatedUserId
          })
          console.log('[FETCH_COLLECTIONS] Successfully decrypted collection:', decryptedCollection)

          const collectionDots = dotsData.filter((dot) => dot.collection_id === collection.id)
          console.log('[FETCH_COLLECTIONS] Found dots for collection:', collection.id, 'count:', collectionDots.length)
          
          const decryptedDots = await Promise.all(
            collectionDots.map(async (dot) => {
              try {
                const decryptedDot = await privacyService.decryptDot({
                  id: dot.id,
                  label_encrypted: dot.label_encrypted,
                  label_hash: dot.label_hash,
                  userId: validatedUserId
                })
                return {
                  id: dot.id,
                  label: decryptedDot.label,
                  x: dot.x,
                  y: dot.y,
                  color: dot.color,
                  size: dot.size,
                  archived: dot.archived
                }
              } catch (dotError) {
                console.error('[FETCH_COLLECTIONS] Failed to decrypt dot:', dot.id, dotError)
                throw dotError
              }
            })
          )

          // Decrypt release line config if present
          let releaseLineConfig: { enabled: boolean; color: string; text: string } | undefined = undefined
          if (collection.release_line_config_encrypted) {
            try {
              const encryptedConfig = JSON.parse(collection.release_line_config_encrypted)
              releaseLineConfig = await privacyService.decryptReleaseLineConfig(encryptedConfig, validatedUserId)
              console.log('[FETCH_COLLECTIONS] Successfully decrypted release line config for collection:', collection.id)
            } catch (releaseLineError) {
              console.warn('[FETCH_COLLECTIONS] Failed to decrypt release line config for collection:', collection.id, releaseLineError)
              // Use default values if decryption fails
              releaseLineConfig = {
                enabled: false,
                color: '#ff00ff',
                text: ''
              }
            }
          }

          return {
            id: decryptedCollection.id,
            name: decryptedCollection.name,
            status: collection.status as 'active' | 'archived' | 'deleted',
            archived_at: collection.archived_at,
            deleted_at: collection.deleted_at,
            dots: decryptedDots,
            releaseLineConfig
          }
        } catch (collectionError) {
          console.error('[FETCH_COLLECTIONS] Failed to decrypt collection:', collection.id, collectionError)
          throw collectionError
        }
      })
    )

    console.log('[FETCH_COLLECTIONS] Successfully decrypted collections:', decryptedCollections.length)
    return decryptedCollections
  } catch (error) {
    console.error('[FETCH_COLLECTIONS] Overall error:', error)
    handleServiceError(error, 'fetch collections')
    throw error
  }
}

// Add a new collection
export const addCollection = async (collection: Collection, userId: string): Promise<Collection | null> => {
  try {
    console.log('[ADD_COLLECTION] Starting collection creation:', { collectionId: collection.id, name: collection.name, userId })
    const validatedUserId = validateUserId(userId)
    const validatedCollection = validateCollection(collection)
    console.log('[ADD_COLLECTION] Validation passed:', validatedCollection)

    // Encrypt collection data
    console.log('[ADD_COLLECTION] Encrypting collection data...')
    const encryptedCollection = await privacyService.encryptCollection({
      id: validatedCollection.id,
      name: validatedCollection.name,
      userId: validatedUserId
    })
    console.log('[ADD_COLLECTION] Encryption successful:', { id: encryptedCollection.id, hasEncryptedName: !!encryptedCollection.name_encrypted, hasHash: !!encryptedCollection.name_hash })

    // Encrypt release line config if present
    let releaseLineConfigEncrypted: string | null = null
    if (validatedCollection.releaseLineConfig) {
      console.log('[ADD_COLLECTION] Encrypting release line config...')
      const encryptedReleaseLineConfig = await privacyService.encryptReleaseLineConfig(validatedCollection.releaseLineConfig, validatedUserId)
      releaseLineConfigEncrypted = JSON.stringify(encryptedReleaseLineConfig)
      console.log('[ADD_COLLECTION] Release line config encryption successful')
    }

    const { data, error } = await supabase
      .from("collections")
      .insert([{ 
        id: encryptedCollection.id, 
        name_encrypted: encryptedCollection.name_encrypted,
        name_hash: encryptedCollection.name_hash,
        user_id: validatedUserId,
        status: 'active',
        release_line_config_encrypted: releaseLineConfigEncrypted
      }])
      .select()

    if (error) {
      console.error('[ADD_COLLECTION] Database insert error:', error)
      throw error
    }
    
    console.log('[ADD_COLLECTION] Database insert successful:', data)
    const result = data ? { ...validatedCollection, dots: [] } : null
    console.log('[ADD_COLLECTION] Returning result:', result)
    return result
  } catch (error) {
    console.error('[ADD_COLLECTION] Overall error:', error)
    handleServiceError(error, 'add collection')
    return null
  }
}

// Update an existing collection
export const updateCollection = async (collectionId: string, newName: string, userId: string): Promise<boolean> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedCollectionId = validateCollectionId(collectionId)
    const validatedName = sanitizeString(newName, 100)

    if (!validatedName) {
      throw new ValidationError('Collection name cannot be empty')
    }

    // Encrypt the new name
    const { encrypted, hash } = await privacyService.encryptData(validatedName, validatedUserId)

    const { error } = await supabase
      .from("collections")
      .update({ 
        name_encrypted: encrypted,
        name_hash: hash
      })
      .eq("id", validatedCollectionId)
      .eq("user_id", validatedUserId)

    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    handleServiceError(error, 'update collection')
    return false
  }
}

// Archive a collection (soft delete)
export const archiveCollection = async (collectionId: string, userId: string): Promise<boolean> => {
  try {
    validateArchiveOperation(collectionId, userId)
    
    const { error } = await supabase
      .from("collections")
      .update({ 
        status: 'archived',
        archived_at: new Date().toISOString()
      })
      .eq("id", collectionId)
      .eq("user_id", userId)
      .eq("status", 'active') // Only archive active collections

    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    handleServiceError(error, 'archive collection')
    return false
  }
}

// Unarchive a collection (restore from archived)
export const unarchiveCollection = async (collectionId: string, userId: string): Promise<boolean> => {
  try {
    validateUnarchiveOperation(collectionId, userId)

    const { error } = await supabase
      .from("collections")
      .update({ 
        status: 'active',
        archived_at: null
      })
      .eq("id", collectionId)
      .eq("user_id", userId)
      .eq("status", 'archived') // Only unarchive archived collections

    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    handleServiceError(error, 'unarchive collection')
    return false
  }
}

// Delete a collection permanently (hard delete)
export const deleteCollection = async (collectionId: string, userId: string): Promise<boolean> => {
  try {
    validateDeleteOperation(collectionId, userId)

    // Delete the collection (cascading will handle dots, snapshots, user_preferences)
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", userId)

    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    handleServiceError(error, 'delete collection')
    return false
  }
}

// Add a new dot
export const addDot = async (dot: Dot, collectionId: string, userId: string): Promise<Dot | null> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedCollectionId = validateCollectionId(collectionId)
    const validatedDot = validateDot(dot)

    // Verify collection ownership
    const { data: collectionData, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", validatedCollectionId)
      .eq("user_id", validatedUserId)
      .single()
    if (collectionError || !collectionData) {
      throw new Error('Collection not found or not owned by user')
    }

    // Encrypt dot data
    const encryptedDot = await privacyService.encryptDot({
      id: validatedDot.id,
      label: validatedDot.label,
      userId: validatedUserId
    })

    const { data, error } = await supabase
      .from("dots")
      .insert([{ 
        id: encryptedDot.id,
        label_encrypted: encryptedDot.label_encrypted,
        label_hash: encryptedDot.label_hash,
        x: validatedDot.x,
        y: validatedDot.y,
        color: validatedDot.color,
        size: validatedDot.size,
        archived: validatedDot.archived,
        collection_id: validatedCollectionId, 
        user_id: validatedUserId 
      }])
      .select()

    if (error) {
      throw error
    }
    
    return data ? { ...validatedDot, archived: validatedDot.archived } : null
  } catch (error) {
    handleServiceError(error, 'add dot')
    return null
  }
}

// Update an existing dot
export const updateDot = async (dot: Dot, userId: string): Promise<Dot | null> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedDot = validateDot(dot)

    // Encrypt the updated label if it changed
    const encryptedDot = await privacyService.encryptDot({
      id: validatedDot.id,
      label: validatedDot.label,
      userId: validatedUserId
    })

    const { data, error } = await supabase
      .from("dots")
      .update({
        label_encrypted: encryptedDot.label_encrypted,
        label_hash: encryptedDot.label_hash,
        x: validatedDot.x,
        y: validatedDot.y,
        color: validatedDot.color,
        size: validatedDot.size,
        archived: validatedDot.archived
      })
      .eq("id", validatedDot.id)
      .eq("user_id", validatedUserId)
      .select()

    if (error) {
      throw error
    }
    
    return data ? { ...validatedDot, archived: validatedDot.archived } : null
  } catch (error) {
    handleServiceError(error, 'update dot')
    return null
  }
}

// Delete a dot
export const deleteDot = async (dotId: string, userId: string): Promise<{ success: boolean }> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedDotId = validateDotId(dotId)

    const { error } = await supabase
      .from("dots")
      .delete()
      .eq("id", validatedDotId)
      .eq("user_id", validatedUserId)

    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    handleServiceError(error, 'delete dot')
    return { success: false }
  }
}

// Create a snapshot of the current state
export const createSnapshot = async (userId: string, collectionId: string, collectionName: string, dots: Dot[], releaseLineConfig?: ReleaseLineConfig): Promise<boolean> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedCollectionId = validateCollectionId(collectionId)
    const validatedCollectionName = sanitizeString(collectionName, 100)
    
    if (!validatedCollectionName) {
      throw new ValidationError('Collection name cannot be empty')
    }

    // Validate all dots
    const validatedDots = dots.map(dot => validateDot(dot))

    if (validatedDots.length > 1000) {
      throw new ValidationError('Too many dots in snapshot. Maximum 1000 allowed')
    }

    // Validate release line config if provided
    let validatedReleaseLineConfig: ReleaseLineConfig | undefined
    if (releaseLineConfig) {
      validatedReleaseLineConfig = validateReleaseLineConfig(releaseLineConfig)
    }

    // Encrypt collection name and dots data
    const { encrypted: encryptedName } = await privacyService.encryptData(validatedCollectionName, validatedUserId)
    const { encrypted: encryptedDotsData } = await privacyService.encryptData(JSON.stringify(validatedDots), validatedUserId)

    // Encrypt release line config if provided
    let encryptedReleaseLineConfig: string | undefined
    if (validatedReleaseLineConfig) {
      const { encrypted } = await privacyService.encryptData(JSON.stringify(validatedReleaseLineConfig), validatedUserId)
      encryptedReleaseLineConfig = encrypted
    }

    const now = new Date()
    const insertData: any = {
      user_id: validatedUserId,
      collection_id: validatedCollectionId,
      collection_name_encrypted: encryptedName,
      created_at: now.toISOString(),
      snapshot_date: getLocalDateString(now),
      dots_data_encrypted: encryptedDotsData
    }

    // Only include release_line_config_encrypted if we have data
    if (encryptedReleaseLineConfig) {
      insertData.release_line_config_encrypted = encryptedReleaseLineConfig
    }

    const { error } = await supabase
      .from("snapshots")
      .insert([insertData])

    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    handleServiceError(error, 'create snapshot')
    return false
  }
}

// Fetch all snapshots for a user
export const fetchSnapshots = async (userId: string): Promise<Snapshot[]> => {
  try {
    const validatedUserId = validateUserId(userId)

    const { data, error } = await supabase
      .from("snapshots")
      .select("*")
      .eq("user_id", validatedUserId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // Decrypt snapshots
    const decryptedSnapshots = await Promise.all(
      data.map(async (row: SnapshotRow) => {
        const decryptedCollectionName = await privacyService.decryptData(row.collection_name_encrypted, validatedUserId)
        const decryptedDotsData = await privacyService.decryptData(row.dots_data_encrypted, validatedUserId)
        
        let dots = []
        try {
          dots = JSON.parse(decryptedDotsData)
        } catch (error) {
          // If JSON parsing fails, we'll get a detailed error but continue with other snapshots
          // Log the error and use empty dots array for this specific snapshot
          console.warn(`[SNAPSHOT_PARSING] Skipping corrupted snapshot ${row.id} for user ${validatedUserId}`)
          dots = []
        }

        // Decrypt release line config if present
        let releaseLineConfig: ReleaseLineConfig | undefined
        if (row.release_line_config_encrypted) {
          try {
            const decryptedReleaseLineConfig = await privacyService.decryptData(row.release_line_config_encrypted, validatedUserId)
            releaseLineConfig = JSON.parse(decryptedReleaseLineConfig)
          } catch (error) {
            // If release line config parsing fails, log warning but continue without it
            console.warn(`[SNAPSHOT_PARSING] Failed to parse release line config for snapshot ${row.id}, using default`)
            releaseLineConfig = undefined
          }
        }
        
        const snapshot: Snapshot = {
          date: row.snapshot_date,
          collectionId: row.collection_id,
          collectionName: decryptedCollectionName,
          dots: dots,
          timestamp: new Date(row.created_at).getTime()
        }

        // Only include releaseLineConfig if it exists
        if (releaseLineConfig) {
          snapshot.releaseLineConfig = releaseLineConfig
        }

        return snapshot
      })
    )

    return decryptedSnapshots
  } catch (error) {
    handleServiceError(error, 'fetch snapshots')
    return []
  }
}

// Load a specific snapshot
export const loadSnapshot = async (userId: string, snapshotId: string): Promise<Snapshot | null> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedSnapshotId = validateSnapshotId(snapshotId)

    const { data, error } = await supabase
      .from("snapshots")
      .select("*")
      .eq("id", validatedSnapshotId)
      .eq("user_id", validatedUserId)
      .single()

    if (error) {
      throw error
    }

    if (!data) return null

    // Decrypt snapshot data
    const decryptedCollectionName = await privacyService.decryptData(data.collection_name_encrypted, validatedUserId)
    const decryptedDotsData = await privacyService.decryptData(data.dots_data_encrypted, validatedUserId)

    let dots = []
    try {
      dots = JSON.parse(decryptedDotsData)
    } catch (error) {
      // For individual snapshot loading, parsing failure means the snapshot is corrupted
      // Use the specialized error handler to log detailed information
      handleJsonParseError(error, 'load snapshot', validatedUserId, data.id, data.dots_data_encrypted)
    }

    // Decrypt release line config if present
    let releaseLineConfig: ReleaseLineConfig | undefined
    if (data.release_line_config_encrypted) {
      try {
        const decryptedReleaseLineConfig = await privacyService.decryptData(data.release_line_config_encrypted, validatedUserId)
        releaseLineConfig = JSON.parse(decryptedReleaseLineConfig)
      } catch (error) {
        // If release line config parsing fails, log warning but continue without it
        console.warn(`[SNAPSHOT_PARSING] Failed to parse release line config for snapshot ${data.id}, using default`)
        releaseLineConfig = undefined
      }
    }

    const snapshot: Snapshot = {
      date: data.snapshot_date,
      collectionId: data.collection_id,
      collectionName: decryptedCollectionName,
      dots: dots,
      timestamp: new Date(data.created_at).getTime()
    }

    // Only include releaseLineConfig if it exists
    if (releaseLineConfig) {
      snapshot.releaseLineConfig = releaseLineConfig
    }

    return snapshot
  } catch (error) {
    handleServiceError(error, 'load snapshot')
    return null
  }
}

// Delete a snapshot
export const deleteSnapshot = async (userId: string, snapshotId: string): Promise<boolean> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedSnapshotId = validateSnapshotId(snapshotId)

    const { error } = await supabase
      .from("snapshots")
      .delete()
      .eq("id", validatedSnapshotId)
      .eq("user_id", validatedUserId)

    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    handleServiceError(error, 'delete snapshot')
    return false
  }
}

// Import data with comprehensive validation and encryption
export const importData = async (data: ExportData, userId: string): Promise<Collection[]> => {
  try {
    console.log('[IMPORT_DATA] Starting import for user:', userId)
    console.log('[IMPORT_DATA] Input data:', { 
      collections: data.collections?.length || 0, 
      snapshots: data.snapshots?.length || 0 
    })
    
    const validatedUserId = validateUserId(userId)
    const validatedData = validateImportData(data)
    
    console.log('[IMPORT_DATA] Validated data:', { 
      collections: validatedData.collections?.length || 0, 
      snapshots: validatedData.snapshots?.length || 0 
    })

    const { collections, snapshots } = validatedData

    // Prepare and encrypt collection rows
    console.log('[IMPORT_DATA] Encrypting collections...')
    const collectionRows = await Promise.all(
      collections.map(async (collection) => {
        const encryptedCollection = await privacyService.encryptCollection({
          id: collection.id,
          name: collection.name,
          userId: validatedUserId
        })

        // Encrypt release line config if present
        let releaseLineConfigEncrypted: string | null = null
        if (collection.releaseLineConfig) {
          const encryptedReleaseLineConfig = await privacyService.encryptReleaseLineConfig(collection.releaseLineConfig, validatedUserId)
          releaseLineConfigEncrypted = JSON.stringify(encryptedReleaseLineConfig)
        }

        return {
          id: collection.id,
          name_encrypted: encryptedCollection.name_encrypted,
          name_hash: encryptedCollection.name_hash,
          user_id: validatedUserId,
          status: (collection as any).status || 'active',
          archived_at: (collection as any).archived_at || null,
          deleted_at: null,
          release_line_config_encrypted: releaseLineConfigEncrypted
        }
      })
    )
    
    console.log('[IMPORT_DATA] Collection rows prepared:', collectionRows.length)

    const { error: collectionError } = await supabase.from("collections").upsert(collectionRows)
    if (collectionError) {
      console.error('[IMPORT_DATA] Collection upsert error:', collectionError)
      throw collectionError
    }
    
    console.log('[IMPORT_DATA] Collections imported successfully')

    // Prepare and encrypt dot rows - build a single flat array of encryption promises
    // This avoids the problematic flatMap(async ...) pattern that creates nested promises
    const allDotPromises: Promise<any>[] = []
    
    // Iterate collections synchronously and push per-dot encrypt promises into the array
    for (const collection of collections) {
      for (const dot of collection.dots) {
        const dotPromise = privacyService.encryptDot({
          id: dot.id,
          label: dot.label,
          userId: validatedUserId
        }).then(encryptedDot => ({
          id: dot.id,
          label_encrypted: encryptedDot.label_encrypted,
          label_hash: encryptedDot.label_hash,
          x: dot.x,
          y: dot.y,
          color: dot.color,
          size: dot.size,
          archived: dot.archived === true,
          user_id: validatedUserId,
          collection_id: collection.id,
        }))
        
        allDotPromises.push(dotPromise)
      }
    }
    
    console.log('[IMPORT_DATA] Dot encryption promises created:', allDotPromises.length)
    
    // Process dot encryption promises with controlled concurrency
    // This approach avoids nested promises and gives us control over concurrency
    const encryptionBatchSize = 50 // Control how many dots are encrypted concurrently
    const dotRows: any[] = []
    
    // Process encryption in batches to control concurrency
    for (let i = 0; i < allDotPromises.length; i += encryptionBatchSize) {
      const batch = allDotPromises.slice(i, i + encryptionBatchSize)
      const batchResults = await Promise.all(batch)
      dotRows.push(...batchResults)
      
      // Optional: Log progress for large imports
      if (allDotPromises.length > 100) {
        console.log(`[IMPORT_DATA] Encrypted ${Math.min(i + encryptionBatchSize, allDotPromises.length)}/${allDotPromises.length} dots`)
      }
    }
    
    console.log('[IMPORT_DATA] All dots encrypted, processing in database...')

    // Process dots in batches to avoid overwhelming the database
    const batchSize = 100
    console.log(`[IMPORT_DATA] Processing ${dotRows.length} dots in batches of ${batchSize}`)
    
    for (let i = 0; i < dotRows.length; i += batchSize) {
      const batch = dotRows.slice(i, i + batchSize)
      console.log(`[IMPORT_DATA] Processing batch ${Math.floor(i/batchSize) + 1}, dots:`, batch.length)
      
      const { error: dotError } = await supabase.from("dots").upsert(batch)
      if (dotError) {
        console.error('[IMPORT_DATA] Dot batch error:', dotError)
        console.error('[IMPORT_DATA] Batch data sample:', batch[0])
        throw dotError
      }
    }
    
    console.log('[IMPORT_DATA] All dots imported successfully')

    // Process snapshots if present
    if (snapshots?.length) {
      console.log('[IMPORT_DATA] Processing snapshots:', snapshots.length)
      // Filter snapshots to only include those that reference imported collections
      const importedCollectionIds = new Set(collections.map(c => c.id))
      const validSnapshots = snapshots.filter(snapshot => 
        importedCollectionIds.has(snapshot.collectionId)
      )
      
      // Log if any snapshots were skipped
      if (validSnapshots.length < snapshots.length) {
        const skippedCount = snapshots.length - validSnapshots.length
        console.log(`[IMPORT_DATA] Skipping ${skippedCount} snapshot${skippedCount > 1 ? 's' : ''} for non-existent or renamed collections`)
      }
      
      // Only process valid snapshots
      if (validSnapshots.length > 0) {
        const snapshotRows = await Promise.all(
          validSnapshots.map(async (snapshot) => {
            const { encrypted: encryptedCollectionName } = await privacyService.encryptData(snapshot.collectionName, validatedUserId)
            const { encrypted: encryptedDotsData } = await privacyService.encryptData(JSON.stringify(snapshot.dots), validatedUserId)

            // Encrypt release line config if present in snapshot
            let encryptedReleaseLineConfig: string | undefined
            if (snapshot.releaseLineConfig) {
              const { encrypted } = await privacyService.encryptData(JSON.stringify(snapshot.releaseLineConfig), validatedUserId)
              encryptedReleaseLineConfig = encrypted
            }

            const snapshotRow: any = {
              user_id: validatedUserId,
              collection_id: snapshot.collectionId,
              collection_name_encrypted: encryptedCollectionName,
              created_at: new Date(snapshot.timestamp).toISOString(),
              snapshot_date: snapshot.date,
              dots_data_encrypted: encryptedDotsData,
            }

            // Only include release_line_config_encrypted if we have data
            if (encryptedReleaseLineConfig) {
              snapshotRow.release_line_config_encrypted = encryptedReleaseLineConfig
            }

            return snapshotRow
          })
        )

        const { error: snapshotError } = await supabase.from("snapshots").upsert(snapshotRows)
        if (snapshotError) {
          // This should be rare now since we've filtered invalid snapshots
          console.warn("[IMPORT_DATA] Warning: Some snapshots could not be imported:", snapshotError.message)
        } else if (validSnapshots.length > 0) {
          console.log(`[IMPORT_DATA] Successfully imported ${validSnapshots.length} snapshot${validSnapshots.length > 1 ? 's' : ''}`)
        }
      }
    }

    console.log('[IMPORT_DATA] Import completed successfully, returning collections:', collections.length)
    return collections
  } catch (error) {
    console.error('[IMPORT_DATA] Import failed:', error)
    handleServiceError(error, 'import data')
    return [] // Unreachable but satisfies linter
  }
} 

// Reset all collections, dots, and snapshots for a user
export const resetAllCollections = async (userId: string): Promise<boolean> => {
  try {
    const validatedUserId = validateUserId(userId)

    // Delete all collections for the user
    // Due to CASCADE constraints, this will automatically delete:
    // - All dots in those collections
    // - All snapshots for those collections
    // - All user preferences referencing those collections
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("user_id", validatedUserId)

    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    handleServiceError(error, 'reset all collections')
    return false
  }
} 

// Fetch user preferences for a user
export const fetchUserPreferences = async (userId: string): Promise<{
  selectedCollectionId: string | null
  collectionInput: string
  hideCollectionName: boolean
  copyFormat: 'PNG' | 'SVG'
  createdAt: string
  updatedAt: string
} | null> => {
  try {
    const validatedUserId = validateUserId(userId)

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", validatedUserId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, return default values
        return {
          selectedCollectionId: null,
          collectionInput: '',
          hideCollectionName: false,
          copyFormat: 'PNG',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
      throw error
    }

    // Decrypt the collection input if it exists
    let decryptedCollectionInput = ''
    if (data.collection_input_encrypted) {
      try {
        decryptedCollectionInput = await privacyService.decryptData(
          data.collection_input_encrypted, 
          validatedUserId
        )
      } catch (decryptError) {
        console.warn('Failed to decrypt collection input, using empty string:', decryptError)
        decryptedCollectionInput = ''
      }
    }

    return {
      selectedCollectionId: data.selected_collection_id,
      collectionInput: decryptedCollectionInput,
      hideCollectionName: data.hide_collection_name,
      copyFormat: data.copy_format as 'PNG' | 'SVG',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    handleServiceError(error, 'fetch user preferences')
    return null
  }
} 

// Delete all user data and the user account
export const deleteAllUserData = async (userId: string): Promise<boolean> => {
  try {
    const validatedUserId = validateUserId(userId)

    // First, delete all collections for the user
    // Due to CASCADE constraints, this will automatically delete:
    // - All dots in those collections
    // - All snapshots for those collections
    // - All user preferences referencing those collections
    const { error: collectionsError } = await supabase
      .from("collections")
      .delete()
      .eq("user_id", validatedUserId)

    if (collectionsError) {
      throw collectionsError
    }

    // Delete the user account from auth.users
    // This requires admin privileges, so we'll need to handle this differently
    // For now, we'll delete all the data and let the user manually delete their account
    // or implement this through a serverless function with admin privileges
    
    return true
  } catch (error) {
    handleServiceError(error, 'delete all user data')
    return false
  }
}

// Release Line Configuration Functions

// Update release line configuration for a collection
export const updateCollectionReleaseLineConfig = async (
  userId: string, 
  collectionId: string, 
  config: { enabled: boolean; color: string; text: string }
): Promise<boolean> => {
  try {
    console.log('[UPDATE_RELEASE_LINE_CONFIG] Starting update:', { userId, collectionId, config })
    const validatedUserId = validateUserId(userId)
    const validatedCollectionId = validateCollectionId(collectionId)
    
    // Validate the release line configuration
    const validatedConfig = validateReleaseLineConfig(config)
    console.log('[UPDATE_RELEASE_LINE_CONFIG] Validation passed:', validatedConfig)

    // Verify collection ownership
    const { data: collectionData, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", validatedCollectionId)
      .eq("user_id", validatedUserId)
      .single()
    
    if (collectionError || !collectionData) {
      console.error('[UPDATE_RELEASE_LINE_CONFIG] Collection not found or not owned by user:', collectionError)
      throw new Error('Collection not found or not owned by user')
    }

    // Encrypt the release line configuration
    console.log('[UPDATE_RELEASE_LINE_CONFIG] Encrypting release line config...')
    const encryptedConfig = await privacyService.encryptReleaseLineConfig(validatedConfig, validatedUserId)
    console.log('[UPDATE_RELEASE_LINE_CONFIG] Encryption successful:', { enabled: encryptedConfig.enabled, hasColorEncrypted: !!encryptedConfig.color_encrypted, hasTextEncrypted: !!encryptedConfig.text_encrypted })

    // Store as JSON in the database
    const configJson = JSON.stringify(encryptedConfig)

    const { error } = await supabase
      .from("collections")
      .update({ 
        release_line_config_encrypted: configJson
      })
      .eq("id", validatedCollectionId)
      .eq("user_id", validatedUserId)

    if (error) {
      console.error('[UPDATE_RELEASE_LINE_CONFIG] Database update error:', error)
      throw error
    }
    
    console.log('[UPDATE_RELEASE_LINE_CONFIG] Update successful')
    return true
  } catch (error) {
    console.error('[UPDATE_RELEASE_LINE_CONFIG] Overall error:', error)
    handleServiceError(error, 'update release line configuration')
    return false
  }
}

// Get release line configuration for a collection
export const getCollectionReleaseLineConfig = async (
  userId: string, 
  collectionId: string
): Promise<{ enabled: boolean; color: string; text: string } | null> => {
  try {
    console.log('[GET_RELEASE_LINE_CONFIG] Starting fetch:', { userId, collectionId })
    const validatedUserId = validateUserId(userId)
    const validatedCollectionId = validateCollectionId(collectionId)

    const { data, error } = await supabase
      .from("collections")
      .select("release_line_config_encrypted")
      .eq("id", validatedCollectionId)
      .eq("user_id", validatedUserId)
      .single()

    if (error) {
      console.error('[GET_RELEASE_LINE_CONFIG] Database query error:', error)
      throw error
    }

    if (!data) {
      console.log('[GET_RELEASE_LINE_CONFIG] Collection not found')
      return null
    }

    // If no release line config exists, return default values
    if (!data.release_line_config_encrypted) {
      console.log('[GET_RELEASE_LINE_CONFIG] No release line config found, returning defaults')
      return {
        enabled: false,
        color: '#ff00ff',
        text: ''
      }
    }

    try {
      // Parse the JSON configuration
      const encryptedConfig = JSON.parse(data.release_line_config_encrypted)
      console.log('[GET_RELEASE_LINE_CONFIG] Parsed encrypted config:', { enabled: encryptedConfig.enabled, hasColorEncrypted: !!encryptedConfig.color_encrypted, hasTextEncrypted: !!encryptedConfig.text_encrypted })

      // Decrypt the configuration
      const decryptedConfig = await privacyService.decryptReleaseLineConfig(encryptedConfig, validatedUserId)
      console.log('[GET_RELEASE_LINE_CONFIG] Decryption successful:', decryptedConfig)

      return decryptedConfig
    } catch (parseError) {
      console.error('[GET_RELEASE_LINE_CONFIG] Failed to parse or decrypt release line config:', parseError)
      // Return default values if parsing/decryption fails
      return {
        enabled: false,
        color: '#ff00ff',
        text: ''
      }
    }
  } catch (error) {
    console.error('[GET_RELEASE_LINE_CONFIG] Overall error:', error)
    handleServiceError(error, 'get release line configuration')
    return null
  }
}

// Delete release line configuration for a collection (reset to defaults)
export const deleteCollectionReleaseLineConfig = async (
  userId: string, 
  collectionId: string
): Promise<boolean> => {
  try {
    console.log('[DELETE_RELEASE_LINE_CONFIG] Starting delete:', { userId, collectionId })
    const validatedUserId = validateUserId(userId)
    const validatedCollectionId = validateCollectionId(collectionId)

    // Verify collection ownership
    const { data: collectionData, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", validatedCollectionId)
      .eq("user_id", validatedUserId)
      .single()
    
    if (collectionError || !collectionData) {
      console.error('[DELETE_RELEASE_LINE_CONFIG] Collection not found or not owned by user:', collectionError)
      throw new Error('Collection not found or not owned by user')
    }

    const { error } = await supabase
      .from("collections")
      .update({ 
        release_line_config_encrypted: null
      })
      .eq("id", validatedCollectionId)
      .eq("user_id", validatedUserId)

    if (error) {
      console.error('[DELETE_RELEASE_LINE_CONFIG] Database update error:', error)
      throw error
    }
    
    console.log('[DELETE_RELEASE_LINE_CONFIG] Delete successful')
    return true
  } catch (error) {
    console.error('[DELETE_RELEASE_LINE_CONFIG] Overall error:', error)
    handleServiceError(error, 'delete release line configuration')
    return false
  }
} 