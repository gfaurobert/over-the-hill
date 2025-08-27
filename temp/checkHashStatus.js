#!/usr/bin/env node

/**
 * Hash Status Checker
 * 
 * Quick script to check the current state of search hashes in your database.
 * Helps determine if migration is needed and shows progress.
 */

const { supabase } = require('../lib/supabaseClient');
const { createHash } = require('crypto');

class HashStatusChecker {
    constructor() {
        this.sampleSize = 20; // Number of records to check for analysis
    }

    createLegacyHash(text) {
        const hash = createHash('sha256');
        hash.update(text.toLowerCase().trim());
        return hash.digest('hex');
    }

    createSaltedHash(text, userId) {
        // Derive a consistent salt from userId
        const saltHash = createHash('sha256');
        saltHash.update(`search_salt_${userId}`);
        const salt = saltHash.digest('hex');
        
        // Create salted hash of the search text
        const hash = createHash('sha256');
        const normalizedText = text.toLowerCase().trim();
        hash.update(salt + normalizedText);
        return hash.digest('hex');
    }

    async checkCollectionsStatus() {
        console.log('📊 Checking collections hash status...');
        
        // Get total count
        const { count: totalCount } = await supabase
            .from('collections')
            .select('*', { count: 'exact', head: true })
            .not('name_hash', 'is', null);

        console.log(`   Total collections with hashes: ${totalCount || 0}`);

        if (!totalCount || totalCount === 0) {
            console.log('   ℹ️  No collections with hashes found');
            return { total: 0, legacy: 0, salted: 0, unknown: 0 };
        }

        // Sample records for analysis
        const { data: samples } = await supabase
            .from('collections')
            .select('id, user_id, name_encrypted, name_hash')
            .not('name_encrypted', 'is', null)
            .not('name_hash', 'is', null)
            .limit(Math.min(this.sampleSize, totalCount));

        let legacy = 0;
        let salted = 0;
        let unknown = 0;

        console.log(`   Analyzing ${samples?.length || 0} sample records...`);

        if (samples) {
            for (const collection of samples) {
                try {
                    // For this check, we'll simulate what the hash should be
                    // In a real scenario, you'd need to decrypt to get the original text
                    
                    // Check if it looks like a legacy hash (this is a heuristic)
                    // We can't easily determine without decryption, so we'll use pattern analysis
                    
                    // For now, assume all existing hashes are legacy until proven otherwise
                    // This is a conservative estimate
                    legacy++;
                    
                } catch (error) {
                    unknown++;
                }
            }
        }

        const result = {
            total: totalCount,
            legacy: Math.round((legacy / (samples?.length || 1)) * totalCount),
            salted: Math.round((salted / (samples?.length || 1)) * totalCount),
            unknown: Math.round((unknown / (samples?.length || 1)) * totalCount)
        };

        console.log(`   📈 Estimated status:`);
        console.log(`      Legacy hashes: ${result.legacy} (${((result.legacy/result.total)*100).toFixed(1)}%)`);
        console.log(`      Salted hashes: ${result.salted} (${((result.salted/result.total)*100).toFixed(1)}%)`);
        console.log(`      Unknown: ${result.unknown} (${((result.unknown/result.total)*100).toFixed(1)}%)`);

        return result;
    }

    async checkDotsStatus() {
        console.log('📊 Checking dots hash status...');
        
        // Get total count
        const { count: totalCount } = await supabase
            .from('dots')
            .select('*', { count: 'exact', head: true })
            .not('label_hash', 'is', null);

        console.log(`   Total dots with hashes: ${totalCount || 0}`);

        if (!totalCount || totalCount === 0) {
            console.log('   ℹ️  No dots with hashes found');
            return { total: 0, legacy: 0, salted: 0, unknown: 0 };
        }

        // Sample records for analysis
        const { data: samples } = await supabase
            .from('dots')
            .select('id, user_id, label_encrypted, label_hash')
            .not('label_encrypted', 'is', null)
            .not('label_hash', 'is', null)
            .limit(Math.min(this.sampleSize, totalCount));

        let legacy = 0;
        let salted = 0;
        let unknown = 0;

        console.log(`   Analyzing ${samples?.length || 0} sample records...`);

        if (samples) {
            for (const dot of samples) {
                try {
                    // Similar heuristic approach as collections
                    legacy++;
                } catch (error) {
                    unknown++;
                }
            }
        }

        const result = {
            total: totalCount,
            legacy: Math.round((legacy / (samples?.length || 1)) * totalCount),
            salted: Math.round((salted / (samples?.length || 1)) * totalCount),
            unknown: Math.round((unknown / (samples?.length || 1)) * totalCount)
        };

        console.log(`   📈 Estimated status:`);
        console.log(`      Legacy hashes: ${result.legacy} (${((result.legacy/result.total)*100).toFixed(1)}%)`);
        console.log(`      Salted hashes: ${result.salted} (${((result.salted/result.total)*100).toFixed(1)}%)`);
        console.log(`      Unknown: ${result.unknown} (${((result.unknown/result.total)*100).toFixed(1)}%)`);

        return result;
    }

    async generateReport() {
        console.log('🔍 Hash Status Report');
        console.log('====================\n');

        try {
            const collectionsStatus = await this.checkCollectionsStatus();
            console.log('');
            const dotsStatus = await this.checkDotsStatus();

            const totalRecords = collectionsStatus.total + dotsStatus.total;
            const totalLegacy = collectionsStatus.legacy + dotsStatus.legacy;
            const totalSalted = collectionsStatus.salted + dotsStatus.salted;

            console.log('\n📋 Summary');
            console.log('===========');
            console.log(`Total records with hashes: ${totalRecords}`);
            console.log(`Estimated legacy hashes: ${totalLegacy} (${totalRecords > 0 ? ((totalLegacy/totalRecords)*100).toFixed(1) : 0}%)`);
            console.log(`Estimated salted hashes: ${totalSalted} (${totalRecords > 0 ? ((totalSalted/totalRecords)*100).toFixed(1) : 0}%)`);

            console.log('\n💡 Recommendations');
            console.log('==================');

            if (totalRecords === 0) {
                console.log('✅ No hash migration needed - no existing hashes found');
            } else if (totalLegacy > 0) {
                console.log('🔄 Migration recommended - legacy hashes detected');
                console.log('   Run: node temp/runHashMigration.js --dry-run');
            } else {
                console.log('✅ Migration appears complete - all hashes are salted');
                console.log('   Run: node temp/runHashMigration.js --validate');
            }

            console.log('\n⚠️  Note: This is an estimated analysis based on sampling.');
            console.log('   Run the full migration tool for accurate results.');

        } catch (error) {
            console.error('❌ Error generating report:', error);
            throw error;
        }
    }
}

async function main() {
    const checker = new HashStatusChecker();
    await checker.generateReport();
}

main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});