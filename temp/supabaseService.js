"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllUserData = exports.fetchUserPreferences = exports.resetAllCollections = exports.importData = exports.deleteSnapshot = exports.loadSnapshot = exports.fetchSnapshots = exports.createSnapshot = exports.deleteDot = exports.updateDot = exports.addDot = exports.deleteCollection = exports.unarchiveCollection = exports.archiveCollection = exports.updateCollection = exports.addCollection = exports.fetchCollections = void 0;
const supabaseClient_1 = require("@/lib/supabaseClient");
const privacyService_1 = require("./privacyService");
const validation_1 = require("@/lib/validation");
// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
// Enhanced error handling wrapper
const handleServiceError = (error, operation) => {
    if (error instanceof validation_1.ValidationError) {
        console.error(`Validation error in ${operation}:`, error.message);
        throw error;
    }
    console.error(`Database error in ${operation}:`, error);
    throw new Error(`Failed to ${operation}: ${error?.message || 'Unknown error'}`);
};
// Specialized error handling for JSON parsing failures
const handleJsonParseError = (error, operation, userId, recordId, blobKey) => {
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
    };
    // Log the failure with contextual identifiers
    console.error(`[JSON_PARSE_ERROR] Failed to parse data in ${operation}:`, {
        ...errorContext,
        // Include truncated raw data for debugging (safe for logging)
        rawDataPreview: blobKey ? `${blobKey.substring(0, 50)}...` : 'No blob key available'
    });
    // Log additional context for debugging
    console.error(`[JSON_PARSE_ERROR] Context:`, {
        userId: errorContext.userId,
        recordId: errorContext.recordId,
        operation: errorContext.operation,
        timestamp: errorContext.timestamp
    });
    // Increment error tracking metrics
    incrementErrorMetric('json_parse_failures', {
        operation,
        userId,
        recordId: recordId || 'unknown',
        errorType: errorContext.errorType
    });
    // In production, you would also send this to your error tracking service
    // Example: Sentry.captureException(error, { extra: errorContext })
    // Example: DataDog.log('json_parse_failure', errorContext)
    // Example: NewRelic.recordCustomEvent('JsonParseFailure', errorContext)
    // Create a structured error for the caller
    const parseError = new Error(`Failed to parse data in ${operation}: ${errorContext.errorMessage}`);
    parseError.name = 'JsonParseError';
    parseError.context = errorContext;
    throw parseError;
};
// Utility function to increment error tracking metrics
// This can be integrated with your monitoring service of choice
const incrementErrorMetric = (metricName, tags = {}) => {
    // In production, integrate with your metrics service
    // Example: StatsD.increment(metricName, tags)
    // Example: Prometheus.counter(metricName).inc(tags)
    // Example: CloudWatch.putMetricData(metricName, tags)
    // For now, log the metric increment for debugging
    console.log(`[METRIC] ${metricName} incremented:`, tags);
};
// Fetch all collections and their dots for the current user
const fetchCollections = async (userId, includeArchived = false) => {
    try {
        console.log('[FETCH_COLLECTIONS] Starting fetch for user:', userId, 'includeArchived:', includeArchived);
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        // Status filter: active + archived if requested, otherwise just active
        const statusFilter = includeArchived ? ['active', 'archived'] : ['active'];
        console.log('[FETCH_COLLECTIONS] Status filter:', statusFilter);
        const { data: collectionsData, error: collectionsError } = await supabaseClient_1.supabase
            .from("collections")
            .select("id, name_encrypted, name_hash, status, archived_at, deleted_at")
            .eq("user_id", validatedUserId)
            .in("status", statusFilter)
            .order("status", { ascending: true }) // Active first, then archived
            .order("name_hash", { ascending: true });
        if (collectionsError) {
            console.error('[FETCH_COLLECTIONS] Collections query error:', collectionsError);
            throw collectionsError;
        }
        console.log('[FETCH_COLLECTIONS] Raw collections data:', collectionsData);
        const { data: dotsData, error: dotsError } = await supabaseClient_1.supabase
            .from("dots")
            .select("*")
            .eq("user_id", validatedUserId);
        if (dotsError) {
            console.error('[FETCH_COLLECTIONS] Dots query error:', dotsError);
            throw dotsError;
        }
        console.log('[FETCH_COLLECTIONS] Raw dots data:', dotsData);
        // Decrypt collections and dots
        const decryptedCollections = await Promise.all(collectionsData.map(async (collection) => {
            try {
                console.log('[FETCH_COLLECTIONS] Decrypting collection:', collection.id);
                const decryptedCollection = await privacyService_1.privacyService.decryptCollection({
                    id: collection.id,
                    name_encrypted: collection.name_encrypted,
                    name_hash: collection.name_hash,
                    userId: validatedUserId
                });
                console.log('[FETCH_COLLECTIONS] Successfully decrypted collection:', decryptedCollection);
                const collectionDots = dotsData.filter((dot) => dot.collection_id === collection.id);
                console.log('[FETCH_COLLECTIONS] Found dots for collection:', collection.id, 'count:', collectionDots.length);
                const decryptedDots = await Promise.all(collectionDots.map(async (dot) => {
                    try {
                        const decryptedDot = await privacyService_1.privacyService.decryptDot({
                            id: dot.id,
                            label_encrypted: dot.label_encrypted,
                            label_hash: dot.label_hash,
                            userId: validatedUserId
                        });
                        return {
                            id: dot.id,
                            label: decryptedDot.label,
                            x: dot.x,
                            y: dot.y,
                            color: dot.color,
                            size: dot.size,
                            archived: dot.archived
                        };
                    }
                    catch (dotError) {
                        console.error('[FETCH_COLLECTIONS] Failed to decrypt dot:', dot.id, dotError);
                        throw dotError;
                    }
                }));
                return {
                    id: decryptedCollection.id,
                    name: decryptedCollection.name,
                    status: collection.status,
                    archived_at: collection.archived_at,
                    deleted_at: collection.deleted_at,
                    dots: decryptedDots
                };
            }
            catch (collectionError) {
                console.error('[FETCH_COLLECTIONS] Failed to decrypt collection:', collection.id, collectionError);
                throw collectionError;
            }
        }));
        console.log('[FETCH_COLLECTIONS] Successfully decrypted collections:', decryptedCollections.length);
        return decryptedCollections;
    }
    catch (error) {
        console.error('[FETCH_COLLECTIONS] Overall error:', error);
        handleServiceError(error, 'fetch collections');
        throw error;
    }
};
exports.fetchCollections = fetchCollections;
// Add a new collection
const addCollection = async (collection, userId) => {
    try {
        console.log('[ADD_COLLECTION] Starting collection creation:', { collectionId: collection.id, name: collection.name, userId });
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedCollection = (0, validation_1.validateCollection)(collection);
        console.log('[ADD_COLLECTION] Validation passed:', validatedCollection);
        // Encrypt collection data
        console.log('[ADD_COLLECTION] Encrypting collection data...');
        const encryptedCollection = await privacyService_1.privacyService.encryptCollection({
            id: validatedCollection.id,
            name: validatedCollection.name,
            userId: validatedUserId
        });
        console.log('[ADD_COLLECTION] Encryption successful:', { id: encryptedCollection.id, hasEncryptedName: !!encryptedCollection.name_encrypted, hasHash: !!encryptedCollection.name_hash });
        const { data, error } = await supabaseClient_1.supabase
            .from("collections")
            .insert([{
                id: encryptedCollection.id,
                name_encrypted: encryptedCollection.name_encrypted,
                name_hash: encryptedCollection.name_hash,
                user_id: validatedUserId,
                status: 'active'
            }])
            .select();
        if (error) {
            console.error('[ADD_COLLECTION] Database insert error:', error);
            throw error;
        }
        console.log('[ADD_COLLECTION] Database insert successful:', data);
        const result = data ? { ...validatedCollection, dots: [] } : null;
        console.log('[ADD_COLLECTION] Returning result:', result);
        return result;
    }
    catch (error) {
        console.error('[ADD_COLLECTION] Overall error:', error);
        handleServiceError(error, 'add collection');
        return null;
    }
};
exports.addCollection = addCollection;
// Update an existing collection
const updateCollection = async (collectionId, newName, userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedCollectionId = (0, validation_1.validateCollectionId)(collectionId);
        const validatedName = (0, validation_1.sanitizeString)(newName, 100);
        if (!validatedName) {
            throw new validation_1.ValidationError('Collection name cannot be empty');
        }
        // Encrypt the new name
        const { encrypted, hash } = await privacyService_1.privacyService.encryptData(validatedName, validatedUserId);
        const { error } = await supabaseClient_1.supabase
            .from("collections")
            .update({
            name_encrypted: encrypted,
            name_hash: hash
        })
            .eq("id", validatedCollectionId)
            .eq("user_id", validatedUserId);
        if (error) {
            throw error;
        }
        return true;
    }
    catch (error) {
        handleServiceError(error, 'update collection');
        return false;
    }
};
exports.updateCollection = updateCollection;
// Archive a collection (soft delete)
const archiveCollection = async (collectionId, userId) => {
    try {
        (0, validation_1.validateArchiveOperation)(collectionId, userId);
        const { error } = await supabaseClient_1.supabase
            .from("collections")
            .update({
            status: 'archived',
            archived_at: new Date().toISOString()
        })
            .eq("id", collectionId)
            .eq("user_id", userId)
            .eq("status", 'active'); // Only archive active collections
        if (error) {
            throw error;
        }
        return true;
    }
    catch (error) {
        handleServiceError(error, 'archive collection');
        return false;
    }
};
exports.archiveCollection = archiveCollection;
// Unarchive a collection (restore from archived)
const unarchiveCollection = async (collectionId, userId) => {
    try {
        (0, validation_1.validateUnarchiveOperation)(collectionId, userId);
        const { error } = await supabaseClient_1.supabase
            .from("collections")
            .update({
            status: 'active',
            archived_at: null
        })
            .eq("id", collectionId)
            .eq("user_id", userId)
            .eq("status", 'archived'); // Only unarchive archived collections
        if (error) {
            throw error;
        }
        return true;
    }
    catch (error) {
        handleServiceError(error, 'unarchive collection');
        return false;
    }
};
exports.unarchiveCollection = unarchiveCollection;
// Delete a collection permanently (hard delete)
const deleteCollection = async (collectionId, userId) => {
    try {
        (0, validation_1.validateDeleteOperation)(collectionId, userId);
        // Delete the collection (cascading will handle dots, snapshots, user_preferences)
        const { error } = await supabaseClient_1.supabase
            .from("collections")
            .delete()
            .eq("id", collectionId)
            .eq("user_id", userId);
        if (error) {
            throw error;
        }
        return true;
    }
    catch (error) {
        handleServiceError(error, 'delete collection');
        return false;
    }
};
exports.deleteCollection = deleteCollection;
// Add a new dot
const addDot = async (dot, collectionId, userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedCollectionId = (0, validation_1.validateCollectionId)(collectionId);
        const validatedDot = (0, validation_1.validateDot)(dot);
        // Verify collection ownership
        const { data: collectionData, error: collectionError } = await supabaseClient_1.supabase
            .from("collections")
            .select("id")
            .eq("id", validatedCollectionId)
            .eq("user_id", validatedUserId)
            .single();
        if (collectionError || !collectionData) {
            throw new Error('Collection not found or not owned by user');
        }
        // Encrypt dot data
        const encryptedDot = await privacyService_1.privacyService.encryptDot({
            id: validatedDot.id,
            label: validatedDot.label,
            userId: validatedUserId
        });
        const { data, error } = await supabaseClient_1.supabase
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
            .select();
        if (error) {
            throw error;
        }
        return data ? { ...validatedDot, archived: validatedDot.archived } : null;
    }
    catch (error) {
        handleServiceError(error, 'add dot');
        return null;
    }
};
exports.addDot = addDot;
// Update an existing dot
const updateDot = async (dot, userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedDot = (0, validation_1.validateDot)(dot);
        // Encrypt the updated label if it changed
        const encryptedDot = await privacyService_1.privacyService.encryptDot({
            id: validatedDot.id,
            label: validatedDot.label,
            userId: validatedUserId
        });
        const { data, error } = await supabaseClient_1.supabase
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
            .select();
        if (error) {
            throw error;
        }
        return data ? { ...validatedDot, archived: validatedDot.archived } : null;
    }
    catch (error) {
        handleServiceError(error, 'update dot');
        return null;
    }
};
exports.updateDot = updateDot;
// Delete a dot
const deleteDot = async (dotId, userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedDotId = (0, validation_1.validateDotId)(dotId);
        const { error } = await supabaseClient_1.supabase
            .from("dots")
            .delete()
            .eq("id", validatedDotId)
            .eq("user_id", validatedUserId);
        if (error) {
            throw error;
        }
        return { success: true };
    }
    catch (error) {
        handleServiceError(error, 'delete dot');
        return { success: false };
    }
};
exports.deleteDot = deleteDot;
// Create a snapshot of the current state
const createSnapshot = async (userId, collectionId, collectionName, dots) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedCollectionId = (0, validation_1.validateCollectionId)(collectionId);
        const validatedCollectionName = (0, validation_1.sanitizeString)(collectionName, 100);
        if (!validatedCollectionName) {
            throw new validation_1.ValidationError('Collection name cannot be empty');
        }
        // Validate all dots
        const validatedDots = dots.map(dot => (0, validation_1.validateDot)(dot));
        if (validatedDots.length > 1000) {
            throw new validation_1.ValidationError('Too many dots in snapshot. Maximum 1000 allowed');
        }
        // Encrypt collection name and dots data
        const { encrypted: encryptedName } = await privacyService_1.privacyService.encryptData(validatedCollectionName, validatedUserId);
        const { encrypted: encryptedDotsData } = await privacyService_1.privacyService.encryptData(JSON.stringify(validatedDots), validatedUserId);
        const now = new Date();
        const { error } = await supabaseClient_1.supabase
            .from("snapshots")
            .insert([{
                user_id: validatedUserId,
                collection_id: validatedCollectionId,
                collection_name_encrypted: encryptedName,
                created_at: now.toISOString(),
                snapshot_date: getLocalDateString(now),
                dots_data_encrypted: encryptedDotsData
            }]);
        if (error) {
            throw error;
        }
        return true;
    }
    catch (error) {
        handleServiceError(error, 'create snapshot');
        return false;
    }
};
exports.createSnapshot = createSnapshot;
// Fetch all snapshots for a user
const fetchSnapshots = async (userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const { data, error } = await supabaseClient_1.supabase
            .from("snapshots")
            .select("*")
            .eq("user_id", validatedUserId)
            .order("created_at", { ascending: false });
        if (error) {
            throw error;
        }
        // Decrypt snapshots
        const decryptedSnapshots = await Promise.all(data.map(async (row) => {
            const decryptedCollectionName = await privacyService_1.privacyService.decryptData(row.collection_name_encrypted, validatedUserId);
            const decryptedDotsData = await privacyService_1.privacyService.decryptData(row.dots_data_encrypted, validatedUserId);
            let dots = [];
            try {
                dots = JSON.parse(decryptedDotsData);
            }
            catch (error) {
                // If JSON parsing fails, we'll get a detailed error but continue with other snapshots
                // Log the error and use empty dots array for this specific snapshot
                console.warn(`[SNAPSHOT_PARSING] Skipping corrupted snapshot ${row.id} for user ${validatedUserId}`);
                dots = [];
            }
            return {
                date: row.snapshot_date,
                collectionId: row.collection_id,
                collectionName: decryptedCollectionName,
                dots: dots,
                timestamp: new Date(row.created_at).getTime()
            };
        }));
        return decryptedSnapshots;
    }
    catch (error) {
        handleServiceError(error, 'fetch snapshots');
        return [];
    }
};
exports.fetchSnapshots = fetchSnapshots;
// Load a specific snapshot
const loadSnapshot = async (userId, snapshotId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedSnapshotId = (0, validation_1.validateSnapshotId)(snapshotId);
        const { data, error } = await supabaseClient_1.supabase
            .from("snapshots")
            .select("*")
            .eq("id", validatedSnapshotId)
            .eq("user_id", validatedUserId)
            .single();
        if (error) {
            throw error;
        }
        if (!data)
            return null;
        // Decrypt snapshot data
        const decryptedCollectionName = await privacyService_1.privacyService.decryptData(data.collection_name_encrypted, validatedUserId);
        const decryptedDotsData = await privacyService_1.privacyService.decryptData(data.dots_data_encrypted, validatedUserId);
        let dots = [];
        try {
            dots = JSON.parse(decryptedDotsData);
        }
        catch (error) {
            // For individual snapshot loading, parsing failure means the snapshot is corrupted
            // Use the specialized error handler to log detailed information
            handleJsonParseError(error, 'load snapshot', validatedUserId, data.id, data.dots_data_encrypted);
        }
        return {
            date: data.snapshot_date,
            collectionId: data.collection_id,
            collectionName: decryptedCollectionName,
            dots: dots,
            timestamp: new Date(data.created_at).getTime()
        };
    }
    catch (error) {
        handleServiceError(error, 'load snapshot');
        return null;
    }
};
exports.loadSnapshot = loadSnapshot;
// Delete a snapshot
const deleteSnapshot = async (userId, snapshotId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedSnapshotId = (0, validation_1.validateSnapshotId)(snapshotId);
        const { error } = await supabaseClient_1.supabase
            .from("snapshots")
            .delete()
            .eq("id", validatedSnapshotId)
            .eq("user_id", validatedUserId);
        if (error) {
            throw error;
        }
        return true;
    }
    catch (error) {
        handleServiceError(error, 'delete snapshot');
        return false;
    }
};
exports.deleteSnapshot = deleteSnapshot;
// Import data with comprehensive validation and encryption
const importData = async (data, userId) => {
    try {
        console.log('[IMPORT_DATA] Starting import for user:', userId);
        console.log('[IMPORT_DATA] Input data:', {
            collections: data.collections?.length || 0,
            snapshots: data.snapshots?.length || 0
        });
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const validatedData = (0, validation_1.validateImportData)(data);
        console.log('[IMPORT_DATA] Validated data:', {
            collections: validatedData.collections?.length || 0,
            snapshots: validatedData.snapshots?.length || 0
        });
        const { collections, snapshots } = validatedData;
        // Prepare and encrypt collection rows
        console.log('[IMPORT_DATA] Encrypting collections...');
        const collectionRows = await Promise.all(collections.map(async (collection) => {
            const encryptedCollection = await privacyService_1.privacyService.encryptCollection({
                id: collection.id,
                name: collection.name,
                userId: validatedUserId
            });
            return {
                id: collection.id,
                name_encrypted: encryptedCollection.name_encrypted,
                name_hash: encryptedCollection.name_hash,
                user_id: validatedUserId,
                status: collection.status || 'active',
                archived_at: collection.archived_at || null,
                deleted_at: null
            };
        }));
        console.log('[IMPORT_DATA] Collection rows prepared:', collectionRows.length);
        const { error: collectionError } = await supabaseClient_1.supabase.from("collections").upsert(collectionRows);
        if (collectionError) {
            console.error('[IMPORT_DATA] Collection upsert error:', collectionError);
            throw collectionError;
        }
        console.log('[IMPORT_DATA] Collections imported successfully');
        // Prepare and encrypt dot rows - build a single flat array of encryption promises
        // This avoids the problematic flatMap(async ...) pattern that creates nested promises
        const allDotPromises = [];
        // Iterate collections synchronously and push per-dot encrypt promises into the array
        for (const collection of collections) {
            for (const dot of collection.dots) {
                const dotPromise = privacyService_1.privacyService.encryptDot({
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
                }));
                allDotPromises.push(dotPromise);
            }
        }
        console.log('[IMPORT_DATA] Dot encryption promises created:', allDotPromises.length);
        // Process dot encryption promises with controlled concurrency
        // This approach avoids nested promises and gives us control over concurrency
        const encryptionBatchSize = 50; // Control how many dots are encrypted concurrently
        const dotRows = [];
        // Process encryption in batches to control concurrency
        for (let i = 0; i < allDotPromises.length; i += encryptionBatchSize) {
            const batch = allDotPromises.slice(i, i + encryptionBatchSize);
            const batchResults = await Promise.all(batch);
            dotRows.push(...batchResults);
            // Optional: Log progress for large imports
            if (allDotPromises.length > 100) {
                console.log(`[IMPORT_DATA] Encrypted ${Math.min(i + encryptionBatchSize, allDotPromises.length)}/${allDotPromises.length} dots`);
            }
        }
        console.log('[IMPORT_DATA] All dots encrypted, processing in database...');
        // Process dots in batches to avoid overwhelming the database
        const batchSize = 100;
        console.log(`[IMPORT_DATA] Processing ${dotRows.length} dots in batches of ${batchSize}`);
        for (let i = 0; i < dotRows.length; i += batchSize) {
            const batch = dotRows.slice(i, i + batchSize);
            console.log(`[IMPORT_DATA] Processing batch ${Math.floor(i / batchSize) + 1}, dots:`, batch.length);
            const { error: dotError } = await supabaseClient_1.supabase.from("dots").upsert(batch);
            if (dotError) {
                console.error('[IMPORT_DATA] Dot batch error:', dotError);
                console.error('[IMPORT_DATA] Batch data sample:', batch[0]);
                throw dotError;
            }
        }
        console.log('[IMPORT_DATA] All dots imported successfully');
        // Process snapshots if present
        if (snapshots?.length) {
            console.log('[IMPORT_DATA] Processing snapshots:', snapshots.length);
            // Filter snapshots to only include those that reference imported collections
            const importedCollectionIds = new Set(collections.map(c => c.id));
            const validSnapshots = snapshots.filter(snapshot => importedCollectionIds.has(snapshot.collectionId));
            // Log if any snapshots were skipped
            if (validSnapshots.length < snapshots.length) {
                const skippedCount = snapshots.length - validSnapshots.length;
                console.log(`[IMPORT_DATA] Skipping ${skippedCount} snapshot${skippedCount > 1 ? 's' : ''} for non-existent or renamed collections`);
            }
            // Only process valid snapshots
            if (validSnapshots.length > 0) {
                const snapshotRows = await Promise.all(validSnapshots.map(async (snapshot) => {
                    const { encrypted: encryptedCollectionName } = await privacyService_1.privacyService.encryptData(snapshot.collectionName, validatedUserId);
                    const { encrypted: encryptedDotsData } = await privacyService_1.privacyService.encryptData(JSON.stringify(snapshot.dots), validatedUserId);
                    return {
                        user_id: validatedUserId,
                        collection_id: snapshot.collectionId,
                        collection_name_encrypted: encryptedCollectionName,
                        created_at: new Date(snapshot.timestamp).toISOString(),
                        snapshot_date: snapshot.date,
                        dots_data_encrypted: encryptedDotsData,
                    };
                }));
                const { error: snapshotError } = await supabaseClient_1.supabase.from("snapshots").upsert(snapshotRows);
                if (snapshotError) {
                    // This should be rare now since we've filtered invalid snapshots
                    console.warn("[IMPORT_DATA] Warning: Some snapshots could not be imported:", snapshotError.message);
                }
                else if (validSnapshots.length > 0) {
                    console.log(`[IMPORT_DATA] Successfully imported ${validSnapshots.length} snapshot${validSnapshots.length > 1 ? 's' : ''}`);
                }
            }
        }
        console.log('[IMPORT_DATA] Import completed successfully, returning collections:', collections.length);
        return collections;
    }
    catch (error) {
        console.error('[IMPORT_DATA] Import failed:', error);
        handleServiceError(error, 'import data');
        return []; // Unreachable but satisfies linter
    }
};
exports.importData = importData;
// Reset all collections, dots, and snapshots for a user
const resetAllCollections = async (userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        // Delete all collections for the user
        // Due to CASCADE constraints, this will automatically delete:
        // - All dots in those collections
        // - All snapshots for those collections
        // - All user preferences referencing those collections
        const { error } = await supabaseClient_1.supabase
            .from("collections")
            .delete()
            .eq("user_id", validatedUserId);
        if (error) {
            throw error;
        }
        return true;
    }
    catch (error) {
        handleServiceError(error, 'reset all collections');
        return false;
    }
};
exports.resetAllCollections = resetAllCollections;
// Fetch user preferences for a user
const fetchUserPreferences = async (userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        const { data, error } = await supabaseClient_1.supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", validatedUserId)
            .single();
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
                };
            }
            throw error;
        }
        // Decrypt the collection input if it exists
        let decryptedCollectionInput = '';
        if (data.collection_input_encrypted) {
            try {
                decryptedCollectionInput = await privacyService_1.privacyService.decryptData(data.collection_input_encrypted, validatedUserId);
            }
            catch (decryptError) {
                console.warn('Failed to decrypt collection input, using empty string:', decryptError);
                decryptedCollectionInput = '';
            }
        }
        return {
            selectedCollectionId: data.selected_collection_id,
            collectionInput: decryptedCollectionInput,
            hideCollectionName: data.hide_collection_name,
            copyFormat: data.copy_format,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }
    catch (error) {
        handleServiceError(error, 'fetch user preferences');
        return null;
    }
};
exports.fetchUserPreferences = fetchUserPreferences;
// Delete all user data and the user account
const deleteAllUserData = async (userId) => {
    try {
        const validatedUserId = (0, validation_1.validateUserId)(userId);
        // First, delete all collections for the user
        // Due to CASCADE constraints, this will automatically delete:
        // - All dots in those collections
        // - All snapshots for those collections
        // - All user preferences referencing those collections
        const { error: collectionsError } = await supabaseClient_1.supabase
            .from("collections")
            .delete()
            .eq("user_id", validatedUserId);
        if (collectionsError) {
            throw collectionsError;
        }
        // Delete the user account from auth.users
        // This requires admin privileges, so we'll need to handle this differently
        // For now, we'll delete all the data and let the user manually delete their account
        // or implement this through a serverless function with admin privileges
        return true;
    }
    catch (error) {
        handleServiceError(error, 'delete all user data');
        return false;
    }
};
exports.deleteAllUserData = deleteAllUserData;
