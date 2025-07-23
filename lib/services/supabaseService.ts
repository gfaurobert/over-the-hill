import { supabase } from "@/lib/supabaseClient"
import { Collection, Dot, Snapshot, ExportData } from "@/components/HillChartApp"

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

// Fetch all collections and their dots for the current user
export const fetchCollections = async (userId: string): Promise<Collection[]> => {
  const { data: collectionsData, error: collectionsError } = await supabase
    .from("collections")
    .select("id, name")
    .eq("user_id", userId)

  if (collectionsError) {
    console.error("Error fetching collections:", collectionsError)
    return []
  }

  const { data: dotsData, error: dotsError } = await supabase.from("dots").select("*").eq("user_id", userId)

  if (dotsError) {
    console.error("Error fetching dots:", dotsError)
    return []
  }

  return collectionsData.map((collection) => ({
    ...collection,
    dots: dotsData.filter((dot) => dot.collection_id === collection.id),
  }))
}

// Add a new collection
export const addCollection = async (collection: Collection, userId: string): Promise<Collection | null> => {
  const { data, error } = await supabase
    .from("collections")
    .insert([{ id: collection.id, name: collection.name, user_id: userId }])
    .select()

  if (error) {
    console.error("Error adding collection:", error)
    return null
  }
  return data ? { ...data[0], dots: [] } : null
}

// Update an existing collection
export const updateCollection = async (collectionId: string, newName: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("collections")
    .update({ name: newName })
    .eq("id", collectionId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error updating collection:", error)
    return false
  }
  return true
}

// Add a new dot
export const addDot = async (dot: Dot, collectionId: string, userId: string): Promise<Dot | null> => {
  const { data, error } = await supabase
    .from("dots")
    .insert([{ ...dot, collection_id: collectionId, user_id: userId }])
    .select()

  if (error) {
    console.error("Error adding dot:", error)
    return null
  }
  return data ? data[0] : null
}

// Update an existing dot
export const updateDot = async (dot: Dot, userId: string): Promise<Dot | null> => {
    const { data, error } = await supabase
        .from("dots")
        .update({
            label: dot.label,
            x: dot.x,
            y: dot.y,
            color: dot.color,
            size: dot.size
        })
        .eq("id", dot.id)
        .eq("user_id", userId)
        .select();

    if (error) {
        console.error("Error updating dot:", error);
        return null;
    }
    return data ? data[0] : null;
};

// Delete a dot
export const deleteDot = async (dotId: string, userId: string): Promise<{ success: boolean }> => {
  const { error } = await supabase.from("dots").delete().eq("id", dotId).eq("user_id", userId)

  if (error) {
    console.error("Error deleting dot:", error)
    return { success: false }
  }
  return { success: true }
}

// Create a snapshot of the current state
export const createSnapshot = async (userId: string, collectionId: string, collectionName: string, dots: Dot[]): Promise<boolean> => {
  const now = new Date()
  const { error } = await supabase
    .from("snapshots")
    .insert([{
      user_id: userId,
      collection_id: collectionId,
      collection_name: collectionName,
      created_at: now.toISOString(),
      snapshot_date: getLocalDateString(now),
      dots_data: dots
    }])

  if (error) {
    console.error("Error creating snapshot:", error)
    return false
  }
  return true
}

// Fetch all snapshots for a user
export const fetchSnapshots = async (userId: string): Promise<Snapshot[]> => {
  const { data, error } = await supabase
    .from("snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching snapshots:", error)
    return []
  }

  return data.map((row: SnapshotRow) => ({
    date: row.snapshot_date,
    collectionId: row.collection_id,
    collectionName: row.collection_name,
    dots: row.dots_data,
    timestamp: new Date(row.created_at).getTime()
  }))
}

// Load a specific snapshot
export const loadSnapshot = async (userId: string, snapshotId: string): Promise<Snapshot | null> => {
  const { data, error } = await supabase
    .from("snapshots")
    .select("*")
    .eq("id", snapshotId)
    .eq("user_id", userId)
    .single()

  if (error) {
    console.error("Error loading snapshot:", error)
    return null
  }

  if (!data) return null

  return {
    date: data.snapshot_date,
    collectionId: data.collection_id,
    collectionName: data.collection_name,
    dots: data.dots_data,
    timestamp: new Date(data.created_at).getTime()
  }
}

// Delete a snapshot
export const deleteSnapshot = async (userId: string, snapshotId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("snapshots")
    .delete()
    .eq("id", snapshotId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error deleting snapshot:", error)
    return false
  }
  return true
}

// Import data
export const importData = async (data: ExportData, userId: string): Promise<Collection[]> => {
  const { collections, snapshots } = data

  const collectionRows: CollectionRow[] = collections.map(({ id, name }) => ({
    id,
    name,
    user_id: userId,
  }))

  const { error: collectionError } = await supabase.from("collections").upsert(collectionRows)
  if (collectionError) {
    console.error("Error importing collections:", collectionError)
    throw new Error("Failed to import collections.")
  }

  const dotRows: DotRow[] = collections.flatMap((collection) =>
    collection.dots.map((dot) => ({
      ...dot,
      archived: dot.archived === true, // force boolean, default to false if missing
      user_id: userId,
      collection_id: collection.id,
    })),
  )

  const batchSize = 100
  for (let i = 0; i < dotRows.length; i += batchSize) {
    const batch = dotRows.slice(i, i + batchSize)
    const { error: dotError } = await supabase.from("dots").upsert(batch)
    if (dotError) {
      console.error("Error importing dots batch:", dotError)
      throw new Error("Failed to import dots.")
    }
  }

  if (snapshots?.length) {
    const snapshotRows = snapshots.map((snapshot) => ({
      user_id: userId,
      collection_id: snapshot.collectionId,
      collection_name: snapshot.collectionName,
      created_at: new Date(snapshot.timestamp).toISOString(),
      dots_data: snapshot.dots,
    }))

    const { error: snapshotError } = await supabase.from("snapshots").upsert(snapshotRows)
    if (snapshotError) {
      console.error("Error importing snapshots:", snapshotError)
    }
  }

  return collections
} 