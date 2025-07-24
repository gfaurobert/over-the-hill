import { supabase } from "@/lib/supabaseClient"
import { Collection, Dot, Snapshot, ExportData } from "@/components/HillChartApp"
import { 
  validateDot, 
  validateCollection, 
  validateUserId, 
  validateCollectionId, 
  validateDotId, 
  validateImportData,
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

// Types for Supabase table rows
interface CollectionRow {
  id: string
  name: string
  user_id: string
}

interface DotRow {
  id: string
  label: string
  x: number
  y: number
  color: string
  size: number
  user_id: string
  collection_id: string
}

interface SnapshotRow {
  id: string
  user_id: string
  collection_id: string
  collection_name: string
  created_at: string
  snapshot_date: string
  dots_data: Dot[]
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

// Fetch all collections and their dots for the current user
export const fetchCollections = async (userId: string): Promise<Collection[]> => {
  try {
    const validatedUserId = validateUserId(userId)

    const { data: collectionsData, error: collectionsError } = await supabase
      .from("collections")
      .select("id, name")
      .eq("user_id", validatedUserId)

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

    return collectionsData.map((collection) => ({
      ...collection,
      dots: dotsData.filter((dot) => dot.collection_id === collection.id),
    }))
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

    const { data, error } = await supabase
      .from("collections")
      .insert([{ 
        id: validatedCollection.id, 
        name: validatedCollection.name, 
        user_id: validatedUserId 
      }])
      .select()

    if (error) {
      throw error
    }
    
    return data ? { ...data[0], dots: [] } : null
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

    const { error } = await supabase
      .from("collections")
      .update({ name: validatedName })
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

    const { data, error } = await supabase
      .from("dots")
      .insert([{ 
        ...validatedDot, 
        collection_id: validatedCollectionId, 
        user_id: validatedUserId 
      }])
      .select()

    if (error) {
      throw error
    }
    
    return data ? data[0] : null
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

    const { data, error } = await supabase
      .from("dots")
      .update({
        label: validatedDot.label,
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
    
    return data ? data[0] : null
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

    const now = new Date()
    const { error } = await supabase
      .from("snapshots")
      .insert([{
        user_id: validatedUserId,
        collection_id: validatedCollectionId,
        collection_name: validatedCollectionName,
        created_at: now.toISOString(),
        snapshot_date: getLocalDateString(now),
        dots_data: validatedDots
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

    return data.map((row: SnapshotRow) => ({
      date: row.snapshot_date,
      collectionId: row.collection_id,
      collectionName: row.collection_name,
      dots: row.dots_data,
      timestamp: new Date(row.created_at).getTime()
    }))
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

    return {
      date: data.snapshot_date,
      collectionId: data.collection_id,
      collectionName: data.collection_name,
      dots: data.dots_data,
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

// Import data with comprehensive validation
export const importData = async (data: ExportData, userId: string): Promise<Collection[]> => {
  try {
    const validatedUserId = validateUserId(userId)
    const validatedData = validateImportData(data)

    const { collections, snapshots } = validatedData

    // Prepare collection rows
    const collectionRows: CollectionRow[] = collections.map(({ id, name }) => ({
      id,
      name,
      user_id: validatedUserId,
    }))

    const { error: collectionError } = await supabase.from("collections").upsert(collectionRows)
    if (collectionError) {
      throw collectionError
    }

    // Prepare dot rows with batch processing
    const dotRows: DotRow[] = collections.flatMap((collection) =>
      collection.dots.map((dot) => ({
        ...dot,
        archived: dot.archived === true, // force boolean, default to false if missing
        user_id: validatedUserId,
        collection_id: collection.id,
      })),
    )

    // Process dots in batches to avoid overwhelming the database
    const batchSize = 100
    for (let i = 0; i < dotRows.length; i += batchSize) {
      const batch = dotRows.slice(i, i + batchSize)
      const { error: dotError } = await supabase.from("dots").upsert(batch)
      if (dotError) {
        throw dotError
      }
    }

    // Process snapshots if present
    if (snapshots?.length) {
      const snapshotRows = snapshots.map((snapshot) => ({
        user_id: validatedUserId,
        collection_id: snapshot.collectionId,
        collection_name: snapshot.collectionName,
        created_at: new Date(snapshot.timestamp).toISOString(),
        dots_data: snapshot.dots,
      }))

      const { error: snapshotError } = await supabase.from("snapshots").upsert(snapshotRows)
      if (snapshotError) {
        console.error("Error importing snapshots:", snapshotError)
        // Don't throw here as snapshots are optional
      }
    }

    return collections
  } catch (error) {
    handleServiceError(error, 'import data')
    return [] // Unreachable but satisfies linter
  }
} 