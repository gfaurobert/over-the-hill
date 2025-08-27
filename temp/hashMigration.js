/**
 * Hash Migration Strategy - Migrate from unsalted to salted search hashes
 * 
 * This migration updates existing search hashes to use the new salted approach
 * while maintaining backward compatibility during the transition period.
 */

const { supabase } = require('../lib/supabaseClient');
const { createHash } = require('crypto');

class HashMigration {
    constructor(privacyService) {
        this.privacyService = privacyService;
        this.batchSize = 100; // Process records in batches
    }

    /**
     * Create legacy (unsalted) hash for backward compatibility
     */
    createLegacyHash(text) {
        const hash = createHash('sha256');
        hash.update(text.toLowerCase().trim());
        return hash.digest('hex');
    }

    /**
     * Check if a record needs migration by comparing legacy vs salted hash
     */
    needsMigration(currentHash, originalText, userId) {
        const legacyHash = this.createLegacyHash(originalText);
        const saltedHash = this.privacyService.createSearchHash(originalText, userId);
        
        // If current hash matches legacy hash, it needs migration
        return currentHash === legacyHash && currentHash !== saltedHash;
    }

    /**
     * Migrate collections table
     */
    async migrateCollections() {
        console.log('[MIGRATION] Starting collections hash migration...');
        
        let totalMigrated = 0;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            // Fetch batch of collections with encrypted names
            const { data: collections, error } = await supabase
                .from('collections')
                .select('id, user_id, name_encrypted, name_hash')
                .not('name_encrypted', 'is', null)
                .not('name_hash', 'is', null)
                .range(offset, offset + this.batchSize - 1)
                .order('id');

            if (error) {
                console.error('[MIGRATION] Error fetching collections:', error);
                throw error;
            }

            if (!collections || collections.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`[MIGRATION] Processing collections batch: ${offset + 1}-${offset + collections.length}`);

            // Process each collection in the batch
            const updates = [];
            for (const collection of collections) {
                try {
                    // Decrypt the name to get original text
                    const decryptedName = await this.privacyService.decryptData(
                        collection.name_encrypted, 
                        collection.user_id
                    );

                    // Check if migration is needed
                    if (this.needsMigration(collection.name_hash, decryptedName, collection.user_id)) {
                        // Generate new salted hash
                        const newHash = this.privacyService.createSearchHash(decryptedName, collection.user_id);
                        
                        updates.push({
                            id: collection.id,
                            name_hash: newHash
                        });

                        console.log(`[MIGRATION] Collection ${collection.id} needs migration`);
                    }
                } catch (decryptError) {
                    console.error(`[MIGRATION] Failed to decrypt collection ${collection.id}:`, decryptError);
                    // Continue with other records
                }
            }

            // Batch update the migrated hashes
            if (updates.length > 0) {
                for (const update of updates) {
                    const { error: updateError } = await supabase
                        .from('collections')
                        .update({ name_hash: update.name_hash })
                        .eq('id', update.id);

                    if (updateError) {
                        console.error(`[MIGRATION] Failed to update collection ${update.id}:`, updateError);
                    } else {
                        totalMigrated++;
                        console.log(`[MIGRATION] Updated collection ${update.id} hash`);
                    }
                }
            }

            offset += this.batchSize;
        }

        console.log(`[MIGRATION] Collections migration complete. Migrated ${totalMigrated} records.`);
        return totalMigrated;
    }

    /**
     * Migrate dots table (assuming it exists based on the code)
     */
    async migrateDots() {
        console.log('[MIGRATION] Starting dots hash migration...');
        
        let totalMigrated = 0;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            // Fetch batch of dots with encrypted labels
            const { data: dots, error } = await supabase
                .from('dots')
                .select('id, user_id, label_encrypted, label_hash')
                .not('label_encrypted', 'is', null)
                .not('label_hash', 'is', null)
                .range(offset, offset + this.batchSize - 1)
                .order('id');

            if (error) {
                console.error('[MIGRATION] Error fetching dots:', error);
                throw error;
            }

            if (!dots || dots.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`[MIGRATION] Processing dots batch: ${offset + 1}-${offset + dots.length}`);

            // Process each dot in the batch
            const updates = [];
            for (const dot of dots) {
                try {
                    // Decrypt the label to get original text
                    const decryptedLabel = await this.privacyService.decryptData(
                        dot.label_encrypted, 
                        dot.user_id
                    );

                    // Check if migration is needed
                    if (this.needsMigration(dot.label_hash, decryptedLabel, dot.user_id)) {
                        // Generate new salted hash
                        const newHash = this.privacyService.createSearchHash(decryptedLabel, dot.user_id);
                        
                        updates.push({
                            id: dot.id,
                            label_hash: newHash
                        });

                        console.log(`[MIGRATION] Dot ${dot.id} needs migration`);
                    }
                } catch (decryptError) {
                    console.error(`[MIGRATION] Failed to decrypt dot ${dot.id}:`, decryptError);
                    // Continue with other records
                }
            }

            // Batch update the migrated hashes
            if (updates.length > 0) {
                for (const update of updates) {
                    const { error: updateError } = await supabase
                        .from('dots')
                        .update({ label_hash: update.label_hash })
                        .eq('id', update.id);

                    if (updateError) {
                        console.error(`[MIGRATION] Failed to update dot ${update.id}:`, updateError);
                    } else {
                        totalMigrated++;
                        console.log(`[MIGRATION] Updated dot ${update.id} hash`);
                    }
                }
            }

            offset += this.batchSize;
        }

        console.log(`[MIGRATION] Dots migration complete. Migrated ${totalMigrated} records.`);
        return totalMigrated;
    }

    /**
     * Update migration tracking in database (optional)
     */
    async updateMigrationTracking(status, recordsProcessed = 0, notes = '') {
        try {
            const { error } = await supabase
                .from('data_migrations')
                .update({
                    status,
                    records_processed: recordsProcessed,
                    notes,
                    executed_at: status === 'completed' ? new Date().toISOString() : undefined
                })
                .eq('migration_name', 'hash_salting_migration');

            if (error) {
                console.warn('[MIGRATION] Failed to update tracking:', error);
            }
        } catch (error) {
            console.warn('[MIGRATION] Migration tracking not available:', error.message);
        }
    }

    /**
     * Run full migration for all tables
     */
    async runFullMigration() {
        console.log('[MIGRATION] Starting full hash migration...');
        
        const startTime = Date.now();
        let totalMigrated = 0;

        try {
            // Update tracking to running status
            await this.updateMigrationTracking('running', 0, 'Migration started');

            // Migrate collections
            const collectionsMigrated = await this.migrateCollections();
            totalMigrated += collectionsMigrated;

            // Migrate dots
            const dotsMigrated = await this.migrateDots();
            totalMigrated += dotsMigrated;

            const duration = Date.now() - startTime;
            console.log(`[MIGRATION] Full migration complete! Migrated ${totalMigrated} records in ${duration}ms`);
            
            // Update tracking to completed status
            await this.updateMigrationTracking(
                'completed', 
                totalMigrated, 
                `Migration completed successfully. Collections: ${collectionsMigrated}, Dots: ${dotsMigrated}, Duration: ${duration}ms`
            );
            
            return {
                success: true,
                totalMigrated,
                duration,
                collections: collectionsMigrated,
                dots: dotsMigrated
            };

        } catch (error) {
            console.error('[MIGRATION] Migration failed:', error);
            
            // Update tracking to failed status
            await this.updateMigrationTracking(
                'failed', 
                totalMigrated, 
                `Migration failed: ${error.message}`
            );
            
            return {
                success: false,
                error: error.message,
                totalMigrated
            };
        }
    }

    /**
     * Validate migration by checking a sample of records
     */
    async validateMigration(sampleSize = 10) {
        console.log('[MIGRATION] Validating migration...');
        
        const validationResults = {
            collections: { checked: 0, valid: 0, invalid: 0 },
            dots: { checked: 0, valid: 0, invalid: 0 }
        };

        // Validate collections
        const { data: sampleCollections } = await supabase
            .from('collections')
            .select('id, user_id, name_encrypted, name_hash')
            .not('name_encrypted', 'is', null)
            .limit(sampleSize);

        if (sampleCollections) {
            for (const collection of sampleCollections) {
                try {
                    const decryptedName = await this.privacyService.decryptData(
                        collection.name_encrypted, 
                        collection.user_id
                    );
                    const expectedHash = this.privacyService.createSearchHash(decryptedName, collection.user_id);
                    
                    validationResults.collections.checked++;
                    if (collection.name_hash === expectedHash) {
                        validationResults.collections.valid++;
                    } else {
                        validationResults.collections.invalid++;
                        console.warn(`[MIGRATION] Invalid hash for collection ${collection.id}`);
                    }
                } catch (error) {
                    validationResults.collections.invalid++;
                    console.error(`[MIGRATION] Validation error for collection ${collection.id}:`, error);
                }
            }
        }

        // Validate dots
        const { data: sampleDots } = await supabase
            .from('dots')
            .select('id, user_id, label_encrypted, label_hash')
            .not('label_encrypted', 'is', null)
            .limit(sampleSize);

        if (sampleDots) {
            for (const dot of sampleDots) {
                try {
                    const decryptedLabel = await this.privacyService.decryptData(
                        dot.label_encrypted, 
                        dot.user_id
                    );
                    const expectedHash = this.privacyService.createSearchHash(decryptedLabel, dot.user_id);
                    
                    validationResults.dots.checked++;
                    if (dot.label_hash === expectedHash) {
                        validationResults.dots.valid++;
                    } else {
                        validationResults.dots.invalid++;
                        console.warn(`[MIGRATION] Invalid hash for dot ${dot.id}`);
                    }
                } catch (error) {
                    validationResults.dots.invalid++;
                    console.error(`[MIGRATION] Validation error for dot ${dot.id}:`, error);
                }
            }
        }

        console.log('[MIGRATION] Validation results:', validationResults);
        return validationResults;
    }
}

module.exports = { HashMigration };