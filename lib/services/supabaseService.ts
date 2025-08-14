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
    const validatedUserId = validateUserId(userId)

    // Status filter: active + archived if requested, otherwise just active
    const statusFilter = includeArchived ? ['active', 'archived'] : ['active']

    const { data: collectionsData, error: collectionsError } = await supabase
      .from("collections")
      .select("id, name_encrypted, name_hash, status, archived_at, deleted_at")
      .eq("user_id", validatedUserId)
      .in("status", statusFilter)
      .order("status", { ascending: true }) // Active first, then archived
      .order("name_hash", { ascending: true })

    if (collectionsError) {
      throw collectionsError
    }

    const { data: dotsData, error: dotsError } = await supabase
      .from("dots")
      .select("*")
      .eq("user_id", validatedUserId)

    if (dotsError) {
      throw dotsError
    }

    // Decrypt collections and dots
    const decryptedCollections = await Promise.all(
      collectionsData.map(async (collection) => {
        const decryptedCollection = await privacyService.decryptCollection({
          id: collection.id,
          name_encrypted: collection.name_encrypted,
          name_hash: collection.name_hash,
          userId: validatedUserId
        })

        const collectionDots = dotsData.filter((dot) => dot.collection_id === collection.id)
        const decryptedDots = await Promise.all(
          collectionDots.map(async (dot) => {
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
          })
        )

        return {
          id: decryptedCollection.id,
          name: decryptedCollection.name,
          status: collection.status as 'active' | 'archived' | 'deleted',
          archived_at: collection.archived_at,
          deleted_at: collection.deleted_at,
          dots: decryptedDots
        }
      })
    )

    return decryptedCollections
  } catch (error) {
    handleServiceError(error, 'fetch collections')
    throw error
  }
}

// Add a new collection
export const addCollection = async (collection: Collection, userId: string): Promise<Collection | null> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedCollection = validateCollection(collection)

    // Encrypt collection data
    const encryptedCollection = await privacyService.encryptCollection({
      id: validatedCollection.id,
      name: validatedCollection.name,
      userId: validatedUserId
    })

    const { data, error } = await supabase
      .from("collections")
      .insert([{ 
        id: encryptedCollection.id, 
        name_encrypted: encryptedCollection.name_encrypted,
        name_hash: encryptedCollection.name_hash,
        user_id: validatedUserId,
        status: 'active'
      }])
      .select()

    if (error) {
      throw error
    }
    
    return data ? { ...validatedCollection, dots: [] } : null
  } catch (error) {
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
export const createSnapshot = async (userId: string, collectionId: string, collectionName: string, dots: Dot[]): Promise<boolean> => {
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

    // Encrypt collection name and dots data
    const { encrypted: encryptedName } = await privacyService.encryptData(validatedCollectionName, validatedUserId)
    const { encrypted: encryptedDotsData } = await privacyService.encryptData(JSON.stringify(validatedDots), validatedUserId)

    const now = new Date()
    const { error } = await supabase
      .from("snapshots")
      .insert([{
        user_id: validatedUserId,
        collection_id: validatedCollectionId,
        collection_name_encrypted: encryptedName,
        created_at: now.toISOString(),
        snapshot_date: getLocalDateString(now),
        dots_data_encrypted: encryptedDotsData
      }])

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
        
        return {
          date: row.snapshot_date,
          collectionId: row.collection_id,
          collectionName: decryptedCollectionName,
          dots: dots,
          timestamp: new Date(row.created_at).getTime()
        }
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

    return {
      date: data.snapshot_date,
      collectionId: data.collection_id,
      collectionName: decryptedCollectionName,
      dots: dots,
      timestamp: new Date(data.created_at).getTime()
    }
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
    const validatedUserId = validateUserId(userId)
    const validatedData = validateImportData(data)

    const { collections, snapshots } = validatedData

    // Prepare and encrypt collection rows
    const collectionRows = await Promise.all(
      collections.map(async (collection) => {
        const encryptedCollection = await privacyService.encryptCollection({
          id: collection.id,
          name: collection.name,
          userId: validatedUserId
        })

        return {
          id: collection.id,
          name_encrypted: encryptedCollection.name_encrypted,
          name_hash: encryptedCollection.name_hash,
          user_id: validatedUserId,
          status: (collection as any).status || 'active',
          archived_at: (collection as any).archived_at || null,
          deleted_at: null
        }
      })
    )

    const { error: collectionError } = await supabase.from("collections").upsert(collectionRows)
    if (collectionError) {
      throw collectionError
    }

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
        console.log(`Encrypted ${Math.min(i + encryptionBatchSize, allDotPromises.length)}/${allDotPromises.length} dots`)
      }
    }

    // Process dots in batches to avoid overwhelming the database
    const batchSize = 100
    console.log(`Processing ${dotRows.length} dots in batches of ${batchSize}`)
    
    for (let i = 0; i < dotRows.length; i += batchSize) {
      const batch = dotRows.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}, dots:`, batch.length)
      
      const { error: dotError } = await supabase.from("dots").upsert(batch)
      if (dotError) {
        console.error('Dot batch error:', dotError)
        console.error('Batch data sample:', batch[0])
        throw dotError
      }
    }

    // Process snapshots if present
    if (snapshots?.length) {
      // Filter snapshots to only include those that reference imported collections
      const importedCollectionIds = new Set(collections.map(c => c.id))
      const validSnapshots = snapshots.filter(snapshot => 
        importedCollectionIds.has(snapshot.collectionId)
      )
      
      // Log if any snapshots were skipped
      if (validSnapshots.length < snapshots.length) {
        const skippedCount = snapshots.length - validSnapshots.length
        console.log(`Skipping ${skippedCount} snapshot${skippedCount > 1 ? 's' : ''} for non-existent or renamed collections`)
      }
      
      // Only process valid snapshots
      if (validSnapshots.length > 0) {
        const snapshotRows = await Promise.all(
          validSnapshots.map(async (snapshot) => {
            const { encrypted: encryptedCollectionName } = await privacyService.encryptData(snapshot.collectionName, validatedUserId)
            const { encrypted: encryptedDotsData } = await privacyService.encryptData(JSON.stringify(snapshot.dots), validatedUserId)

            return {
              user_id: validatedUserId,
              collection_id: snapshot.collectionId,
              collection_name_encrypted: encryptedCollectionName,
              created_at: new Date(snapshot.timestamp).toISOString(),
              snapshot_date: snapshot.date,
              dots_data_encrypted: encryptedDotsData,
            }
          })
        )

        const { error: snapshotError } = await supabase.from("snapshots").upsert(snapshotRows)
        if (snapshotError) {
          // This should be rare now since we've filtered invalid snapshots
          console.warn("Warning: Some snapshots could not be imported:", snapshotError.message)
        } else if (validSnapshots.length > 0) {
          console.log(`Successfully imported ${validSnapshots.length} snapshot${validSnapshots.length > 1 ? 's' : ''}`)
        }
      }
    }

    return collections
  } catch (error) {
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