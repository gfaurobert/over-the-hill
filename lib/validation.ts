import { Dot, Collection, Snapshot, ExportData, ReleaseLineConfig } from "@/components/HillChartApp"

// Validation error class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Sanitization utilities
export const sanitizeString = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string')
  }
  
  // Remove null bytes and control characters except newlines and tabs
  const sanitized = input
    .replace(/\0/g, '') // Remove null bytes
    .replace(new RegExp('[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', 'g'), '') // Remove control chars
    .trim()
  
  if (sanitized.length > maxLength) {
    throw new ValidationError(`Input too long. Maximum ${maxLength} characters allowed`)
  }
  
  return sanitized
}

export const sanitizeNumber = (input: number, min?: number, max?: number): number => {
  if (typeof input !== 'number' || isNaN(input) || !isFinite(input)) {
    throw new ValidationError('Input must be a valid number')
  }
  
  if (min !== undefined && input < min) {
    throw new ValidationError(`Number must be at least ${min}`)
  }
  
  if (max !== undefined && input > max) {
    throw new ValidationError(`Number must be at most ${max}`)
  }
  
  return input
}

export const sanitizeId = (input: string): string => {
  if (typeof input !== 'string') {
    throw new ValidationError('ID must be a string')
  }
  
  // Allow alphanumeric, hyphens, underscores
  const sanitized = input.replace(/[^a-zA-Z0-9\-_]/g, '').trim()
  
  if (sanitized.length === 0) {
    throw new ValidationError('ID cannot be empty')
  }
  
  if (sanitized.length > 100) {
    throw new ValidationError('ID too long. Maximum 100 characters allowed')
  }
  
  return sanitized
}

export const sanitizeColor = (input: string): string => {
  if (typeof input !== 'string') {
    throw new ValidationError('Color must be a string')
  }
  
  // Allow hex colors (#RGB, #RRGGBB) and common CSS color names
  const validColorRegex = /^(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|[a-zA-Z]+)$/
  
  const sanitized = input.trim()
  
  if (!validColorRegex.test(sanitized)) {
    throw new ValidationError('Invalid color format')
  }
  
  if (sanitized.length > 50) {
    throw new ValidationError('Color string too long')
  }
  
  return sanitized
}

export const sanitizeHexColor = (input: string): string => {
  if (typeof input !== 'string') {
    throw new ValidationError('Color must be a string')
  }
  
  // Specifically validate hex colors for release line
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
  
  const sanitized = input.trim()
  
  if (!hexColorRegex.test(sanitized)) {
    throw new ValidationError('Invalid hex color format. Must be #RRGGBB')
  }
  
  return sanitized
}

// Validation functions
export const validateDot = (dot: Partial<Dot>): Dot => {
  const errors: string[] = []
  
  try {
    const validatedDot: Dot = {
      id: dot.id ? sanitizeId(dot.id) : '',
      label: dot.label ? sanitizeString(dot.label, 100) : '',
      // X coordinate is percentage (0-100)
      x: dot.x !== undefined ? sanitizeNumber(dot.x, 0, 100) : 0,
      // Y coordinate is SVG coordinate (can range from -10 to 150 based on getHillY function)
      y: dot.y !== undefined ? sanitizeNumber(dot.y, -10, 150) : 0,
      color: dot.color ? sanitizeColor(dot.color) : '#3b82f6',
      size: dot.size !== undefined ? sanitizeNumber(dot.size, 1, 5) : 3,
      archived: typeof dot.archived === 'boolean' ? dot.archived : false
    }
    
    // Additional validation
    if (!validatedDot.id) {
      errors.push('Dot ID is required')
    }
    
    if (!validatedDot.label) {
      errors.push('Dot label is required')
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '))
    }
    
    return validatedDot
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('Invalid dot data')
  }
}

export const validateReleaseLineConfig = (config: Partial<ReleaseLineConfig>): ReleaseLineConfig => {
  const errors: string[] = []
  
  try {
    const validatedConfig: ReleaseLineConfig = {
      enabled: typeof config.enabled === 'boolean' ? config.enabled : false,
      color: config.color ? sanitizeHexColor(config.color) : '#ff00ff',
      text: config.text ? sanitizeString(config.text, 50) : ''
    }
    
    // Additional validation for text length
    if (validatedConfig.text.length > 50) {
      errors.push('Release line text must be 50 characters or less')
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '))
    }
    
    return validatedConfig
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('Invalid release line configuration')
  }
}

export const validateCollection = (collection: Partial<Collection>): Omit<Collection, 'dots'> => {
  const errors: string[] = []

  try {
    // Validate status field
    const validStatuses: Array<'active' | 'archived' | 'deleted'> = ['active', 'archived', 'deleted']
    const status = collection.status || 'active'

    if (!validStatuses.includes(status as any)) {
      errors.push('Invalid collection status. Must be active, archived, or deleted')
    }

    // Validate timestamp fields if present
    let archived_at: string | undefined = undefined
    let deleted_at: string | undefined = undefined

    if (collection.archived_at) {
      if (typeof collection.archived_at !== 'string') {
        errors.push('archived_at must be a string')
      } else {
        const date = new Date(collection.archived_at)
        if (isNaN(date.getTime())) {
          errors.push('archived_at must be a valid date string')
        } else {
          archived_at = collection.archived_at
        }
      }
    }

    if (collection.deleted_at) {
      if (typeof collection.deleted_at !== 'string') {
        errors.push('deleted_at must be a string')
      } else {
        const date = new Date(collection.deleted_at)
        if (isNaN(date.getTime())) {
          errors.push('deleted_at must be a valid date string')
        } else {
          deleted_at = collection.deleted_at
        }
      }
    }

    // Cross-field validation for business rules
    if (archived_at && deleted_at) {
      errors.push('Collection cannot have both archived_at and deleted_at set simultaneously')
    }
    if (status === 'archived' && !archived_at) {
      errors.push('Archived collections must have archived_at timestamp')
    }
    if (status === 'deleted' && !deleted_at) {
      errors.push('Deleted collections must have deleted_at timestamp')
    }
    if (status === 'active' && (archived_at || deleted_at)) {
      errors.push('Active collections cannot have archived_at or deleted_at timestamps')
    }
    if (status === 'archived' && deleted_at) {
      errors.push('Archived collections cannot have deleted_at timestamp')
    }
    if (status === 'deleted' && archived_at) {
      errors.push('Deleted collections cannot have archived_at timestamp')
    }

    // Validate release line config if present
    let releaseLineConfig: ReleaseLineConfig | undefined = undefined
    if (collection.releaseLineConfig) {
      try {
        releaseLineConfig = validateReleaseLineConfig(collection.releaseLineConfig)
      } catch (error) {
        errors.push(`Invalid release line configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const validatedCollection = {
      id: collection.id ? sanitizeId(collection.id) : '',
      name: collection.name ? sanitizeString(collection.name, 100) : '',
      status: status as 'active' | 'archived' | 'deleted',
      archived_at,
      deleted_at,
      releaseLineConfig
    }

    if (!validatedCollection.id) {
      errors.push('Collection ID is required')
    }

    if (!validatedCollection.name) {
      errors.push('Collection name is required')
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '))
    }

    return validatedCollection
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('Invalid collection data')
  }
}

export const validateUserId = (userId: string): string => {
  if (typeof userId !== 'string') {
    throw new ValidationError('User ID must be a string')
  }
  
  // UUID format validation (Supabase uses UUIDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(userId)) {
    throw new ValidationError('Invalid user ID format')
  }
  
  return userId
}

export const validateCollectionId = (collectionId: string): string => {
  return sanitizeId(collectionId)
}

export const validateDotId = (dotId: string): string => {
  return sanitizeId(dotId)
}

export const validateSnapshotId = (snapshotId: string): string => {
  return sanitizeId(snapshotId)
}

// Archive operation validation
export const validateArchiveOperation = (collectionId: string, userId: string, currentStatus?: string): void => {
  validateCollectionId(collectionId)
  validateUserId(userId)
  
  if (currentStatus && currentStatus !== 'active') {
    throw new ValidationError('Only active collections can be archived')
  }
}

export const validateUnarchiveOperation = (collectionId: string, userId: string, currentStatus?: string): void => {
  validateCollectionId(collectionId)
  validateUserId(userId)
  
  if (currentStatus && currentStatus !== 'archived') {
    throw new ValidationError('Only archived collections can be unarchived')
  }
}

export const validateDeleteOperation = (collectionId: string, userId: string): void => {
  validateCollectionId(collectionId)
  validateUserId(userId)
  
  // Delete operation can be performed on any status (active or archived)
}

export const validateImportData = (data: any): ExportData => {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Import data must be an object')
  }
  
  if (!Array.isArray(data.collections)) {
    throw new ValidationError('Import data must contain a collections array')
  }
  
  if (data.collections.length > 100) {
    throw new ValidationError('Too many collections. Maximum 100 allowed')
  }
  
  // Validate each collection and filter out deleted ones
  const validatedCollections: Collection[] = data.collections
    .filter((collection: any, index: number) => {
      // Never import deleted collections
      const status = collection.status || 'active'
      if (status === 'deleted') {
        console.warn(`Skipping deleted collection at index ${index} during import`)
        return false
      }
      return true
    })
    .map((collection: any, index: number) => {
      try {
        const validatedCollection = validateCollection(collection)
        
        if (!Array.isArray(collection.dots)) {
          throw new ValidationError(`Collection ${index} must have a dots array`)
        }
        
        if (collection.dots.length > 1000) {
          throw new ValidationError(`Collection ${index} has too many dots. Maximum 1000 allowed`)
        }
        
        const validatedDots = collection.dots.map((dot: any) => validateDot(dot))
        
        return {
          ...validatedCollection,
          dots: validatedDots
        }
    } catch (error) {
      throw new ValidationError(`Invalid collection at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
  
  // Validate snapshots if present
  const validatedSnapshots: Snapshot[] = []
  if (data.snapshots && Array.isArray(data.snapshots)) {
    if (data.snapshots.length > 1000) {
      throw new ValidationError('Too many snapshots. Maximum 1000 allowed')
    }
    
    data.snapshots.forEach((snapshot: any, index: number) => {
      try {
        if (!snapshot.collectionId || !snapshot.collectionName || !Array.isArray(snapshot.dots)) {
          throw new ValidationError(`Snapshot ${index} is invalid`)
        }
        
        validatedSnapshots.push({
          date: sanitizeString(snapshot.date, 20),
          collectionId: sanitizeId(snapshot.collectionId),
          collectionName: sanitizeString(snapshot.collectionName, 100),
          dots: snapshot.dots.map((dot: any) => validateDot(dot)),
          timestamp: sanitizeNumber(snapshot.timestamp, 0)
        })
      } catch (error) {
        throw new ValidationError(`Invalid snapshot at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
  }
  
  return {
    collections: validatedCollections,
    snapshots: validatedSnapshots,
    exportDate: data.exportDate ? sanitizeString(data.exportDate, 50) : new Date().toISOString(),
    version: data.version ? sanitizeString(data.version, 20) : '1.0'
  }
}