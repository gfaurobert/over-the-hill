"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImportData = exports.validateDeleteOperation = exports.validateUnarchiveOperation = exports.validateArchiveOperation = exports.validateSnapshotId = exports.validateDotId = exports.validateCollectionId = exports.validateUserId = exports.validateCollection = exports.validateReleaseLineConfig = exports.validateDot = exports.sanitizeHexColor = exports.sanitizeColor = exports.sanitizeId = exports.sanitizeNumber = exports.sanitizeString = exports.ValidationError = void 0;
// Validation error class
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
// Sanitization utilities
const sanitizeString = (input, maxLength = 255) => {
    if (typeof input !== 'string') {
        throw new ValidationError('Input must be a string');
    }
    // Remove null bytes and control characters except newlines and tabs
    const sanitized = input
        .replace(/\0/g, '') // Remove null bytes
        .replace(new RegExp('[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', 'g'), '') // Remove control chars
        .trim();
    if (sanitized.length > maxLength) {
        throw new ValidationError(`Input too long. Maximum ${maxLength} characters allowed`);
    }
    return sanitized;
};
exports.sanitizeString = sanitizeString;
const sanitizeNumber = (input, min, max) => {
    if (typeof input !== 'number' || isNaN(input) || !isFinite(input)) {
        throw new ValidationError('Input must be a valid number');
    }
    if (min !== undefined && input < min) {
        throw new ValidationError(`Number must be at least ${min}`);
    }
    if (max !== undefined && input > max) {
        throw new ValidationError(`Number must be at most ${max}`);
    }
    return input;
};
exports.sanitizeNumber = sanitizeNumber;
const sanitizeId = (input) => {
    if (typeof input !== 'string') {
        throw new ValidationError('ID must be a string');
    }
    // Allow alphanumeric, hyphens, underscores
    const sanitized = input.replace(/[^a-zA-Z0-9\-_]/g, '').trim();
    if (sanitized.length === 0) {
        throw new ValidationError('ID cannot be empty');
    }
    if (sanitized.length > 100) {
        throw new ValidationError('ID too long. Maximum 100 characters allowed');
    }
    return sanitized;
};
exports.sanitizeId = sanitizeId;
const sanitizeColor = (input) => {
    if (typeof input !== 'string') {
        throw new ValidationError('Color must be a string');
    }
    // Allow hex colors (#RGB, #RRGGBB) and common CSS color names
    const validColorRegex = /^(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|[a-zA-Z]+)$/;
    const sanitized = input.trim();
    if (!validColorRegex.test(sanitized)) {
        throw new ValidationError('Invalid color format');
    }
    if (sanitized.length > 50) {
        throw new ValidationError('Color string too long');
    }
    return sanitized;
};
exports.sanitizeColor = sanitizeColor;
const sanitizeHexColor = (input) => {
    if (typeof input !== 'string') {
        throw new ValidationError('Color must be a string');
    }
    // Specifically validate hex colors for release line
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    const sanitized = input.trim();
    if (!hexColorRegex.test(sanitized)) {
        throw new ValidationError('Invalid hex color format. Must be #RRGGBB');
    }
    return sanitized;
};
exports.sanitizeHexColor = sanitizeHexColor;
// Validation functions
const validateDot = (dot) => {
    const errors = [];
    try {
        const validatedDot = {
            id: dot.id ? (0, exports.sanitizeId)(dot.id) : '',
            label: dot.label ? (0, exports.sanitizeString)(dot.label, 100) : '',
            // X coordinate is percentage (0-100)
            x: dot.x !== undefined ? (0, exports.sanitizeNumber)(dot.x, 0, 100) : 0,
            // Y coordinate is SVG coordinate (can range from -10 to 150 based on getHillY function)
            y: dot.y !== undefined ? (0, exports.sanitizeNumber)(dot.y, -10, 150) : 0,
            color: dot.color ? (0, exports.sanitizeColor)(dot.color) : '#3b82f6',
            size: dot.size !== undefined ? (0, exports.sanitizeNumber)(dot.size, 1, 5) : 3,
            archived: typeof dot.archived === 'boolean' ? dot.archived : false
        };
        // Additional validation
        if (!validatedDot.id) {
            errors.push('Dot ID is required');
        }
        if (!validatedDot.label) {
            errors.push('Dot label is required');
        }
        if (errors.length > 0) {
            throw new ValidationError(errors.join(', '));
        }
        return validatedDot;
    }
    catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError('Invalid dot data');
    }
};
exports.validateDot = validateDot;
const validateReleaseLineConfig = (config) => {
    const errors = [];
    try {
        const validatedConfig = {
            enabled: typeof config.enabled === 'boolean' ? config.enabled : false,
            color: config.color ? (0, exports.sanitizeHexColor)(config.color) : '#ff00ff',
            text: config.text ? (0, exports.sanitizeString)(config.text, 50) : ''
        };
        // Additional validation for text length
        if (validatedConfig.text.length > 50) {
            errors.push('Release line text must be 50 characters or less');
        }
        if (errors.length > 0) {
            throw new ValidationError(errors.join(', '));
        }
        return validatedConfig;
    }
    catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError('Invalid release line configuration');
    }
};
exports.validateReleaseLineConfig = validateReleaseLineConfig;
const validateCollection = (collection) => {
    const errors = [];
    try {
        // Validate status field
        const validStatuses = ['active', 'archived', 'deleted'];
        const status = collection.status || 'active';
        if (!validStatuses.includes(status)) {
            errors.push('Invalid collection status. Must be active, archived, or deleted');
        }
        // Validate timestamp fields if present
        let archived_at = undefined;
        let deleted_at = undefined;
        if (collection.archived_at) {
            if (typeof collection.archived_at !== 'string') {
                errors.push('archived_at must be a string');
            }
            else {
                const date = new Date(collection.archived_at);
                if (isNaN(date.getTime())) {
                    errors.push('archived_at must be a valid date string');
                }
                else {
                    archived_at = collection.archived_at;
                }
            }
        }
        if (collection.deleted_at) {
            if (typeof collection.deleted_at !== 'string') {
                errors.push('deleted_at must be a string');
            }
            else {
                const date = new Date(collection.deleted_at);
                if (isNaN(date.getTime())) {
                    errors.push('deleted_at must be a valid date string');
                }
                else {
                    deleted_at = collection.deleted_at;
                }
            }
        }
        // Cross-field validation for business rules
        if (archived_at && deleted_at) {
            errors.push('Collection cannot have both archived_at and deleted_at set simultaneously');
        }
        if (status === 'archived' && !archived_at) {
            errors.push('Archived collections must have archived_at timestamp');
        }
        if (status === 'deleted' && !deleted_at) {
            errors.push('Deleted collections must have deleted_at timestamp');
        }
        if (status === 'active' && (archived_at || deleted_at)) {
            errors.push('Active collections cannot have archived_at or deleted_at timestamps');
        }
        if (status === 'archived' && deleted_at) {
            errors.push('Archived collections cannot have deleted_at timestamp');
        }
        if (status === 'deleted' && archived_at) {
            errors.push('Deleted collections cannot have archived_at timestamp');
        }
        // Validate release line config if present
        let releaseLineConfig = undefined;
        if (collection.releaseLineConfig) {
            try {
                releaseLineConfig = (0, exports.validateReleaseLineConfig)(collection.releaseLineConfig);
            }
            catch (error) {
                errors.push(`Invalid release line configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        const validatedCollection = {
            id: collection.id ? (0, exports.sanitizeId)(collection.id) : '',
            name: collection.name ? (0, exports.sanitizeString)(collection.name, 100) : '',
            status: status,
            archived_at,
            deleted_at,
            releaseLineConfig
        };
        if (!validatedCollection.id) {
            errors.push('Collection ID is required');
        }
        if (!validatedCollection.name) {
            errors.push('Collection name is required');
        }
        if (errors.length > 0) {
            throw new ValidationError(errors.join(', '));
        }
        return validatedCollection;
    }
    catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError('Invalid collection data');
    }
};
exports.validateCollection = validateCollection;
const validateUserId = (userId) => {
    if (typeof userId !== 'string') {
        throw new ValidationError('User ID must be a string');
    }
    // UUID format validation (Supabase uses UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        throw new ValidationError('Invalid user ID format');
    }
    return userId;
};
exports.validateUserId = validateUserId;
const validateCollectionId = (collectionId) => {
    return (0, exports.sanitizeId)(collectionId);
};
exports.validateCollectionId = validateCollectionId;
const validateDotId = (dotId) => {
    return (0, exports.sanitizeId)(dotId);
};
exports.validateDotId = validateDotId;
const validateSnapshotId = (snapshotId) => {
    return (0, exports.sanitizeId)(snapshotId);
};
exports.validateSnapshotId = validateSnapshotId;
// Archive operation validation
const validateArchiveOperation = (collectionId, userId, currentStatus) => {
    (0, exports.validateCollectionId)(collectionId);
    (0, exports.validateUserId)(userId);
    if (currentStatus && currentStatus !== 'active') {
        throw new ValidationError('Only active collections can be archived');
    }
};
exports.validateArchiveOperation = validateArchiveOperation;
const validateUnarchiveOperation = (collectionId, userId, currentStatus) => {
    (0, exports.validateCollectionId)(collectionId);
    (0, exports.validateUserId)(userId);
    if (currentStatus && currentStatus !== 'archived') {
        throw new ValidationError('Only archived collections can be unarchived');
    }
};
exports.validateUnarchiveOperation = validateUnarchiveOperation;
const validateDeleteOperation = (collectionId, userId) => {
    (0, exports.validateCollectionId)(collectionId);
    (0, exports.validateUserId)(userId);
    // Delete operation can be performed on any status (active or archived)
};
exports.validateDeleteOperation = validateDeleteOperation;
const validateImportData = (data) => {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Import data must be an object');
    }
    if (!Array.isArray(data.collections)) {
        throw new ValidationError('Import data must contain a collections array');
    }
    if (data.collections.length > 100) {
        throw new ValidationError('Too many collections. Maximum 100 allowed');
    }
    // Validate each collection and filter out deleted ones
    const validatedCollections = data.collections
        .filter((collection, index) => {
        // Never import deleted collections
        const status = collection.status || 'active';
        if (status === 'deleted') {
            console.warn(`Skipping deleted collection at index ${index} during import`);
            return false;
        }
        return true;
    })
        .map((collection, index) => {
        try {
            const validatedCollection = (0, exports.validateCollection)(collection);
            if (!Array.isArray(collection.dots)) {
                throw new ValidationError(`Collection ${index} must have a dots array`);
            }
            if (collection.dots.length > 1000) {
                throw new ValidationError(`Collection ${index} has too many dots. Maximum 1000 allowed`);
            }
            const validatedDots = collection.dots.map((dot) => (0, exports.validateDot)(dot));
            return {
                ...validatedCollection,
                dots: validatedDots
            };
        }
        catch (error) {
            throw new ValidationError(`Invalid collection at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Validate snapshots if present
    const validatedSnapshots = [];
    if (data.snapshots && Array.isArray(data.snapshots)) {
        if (data.snapshots.length > 1000) {
            throw new ValidationError('Too many snapshots. Maximum 1000 allowed');
        }
        data.snapshots.forEach((snapshot, index) => {
            try {
                if (!snapshot.collectionId || !snapshot.collectionName || !Array.isArray(snapshot.dots)) {
                    throw new ValidationError(`Snapshot ${index} is invalid`);
                }
                validatedSnapshots.push({
                    date: (0, exports.sanitizeString)(snapshot.date, 20),
                    collectionId: (0, exports.sanitizeId)(snapshot.collectionId),
                    collectionName: (0, exports.sanitizeString)(snapshot.collectionName, 100),
                    dots: snapshot.dots.map((dot) => (0, exports.validateDot)(dot)),
                    timestamp: (0, exports.sanitizeNumber)(snapshot.timestamp, 0)
                });
            }
            catch (error) {
                throw new ValidationError(`Invalid snapshot at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    return {
        collections: validatedCollections,
        snapshots: validatedSnapshots,
        exportDate: data.exportDate ? (0, exports.sanitizeString)(data.exportDate, 50) : new Date().toISOString(),
        version: data.version ? (0, exports.sanitizeString)(data.version, 20) : '1.0'
    };
};
exports.validateImportData = validateImportData;
