#!/usr/bin/env node

/**
 * Hash Migration Runner
 * 
 * Run this script to migrate existing search hashes from unsalted to salted format.
 * 
 * Usage:
 *   node temp/runHashMigration.js [options]
 * 
 * Options:
 *   --dry-run    : Show what would be migrated without making changes
 *   --validate   : Validate existing migration
 *   --batch-size : Number of records to process at once (default: 100)
 */

const { HashMigration } = require('./hashMigration');

// Import your privacy service - adjust path as needed
const PrivacyService = require('./privacyService');

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isValidate = args.includes('--validate');
    const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
    const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

    console.log('🔄 Hash Migration Tool');
    console.log('======================');
    
    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
    }
    
    if (isValidate) {
        console.log('✅ VALIDATION MODE - Checking existing hashes');
    }

    try {
        // Initialize privacy service
        const privacyService = new PrivacyService();
        
        // Initialize migration
        const migration = new HashMigration(privacyService);
        migration.batchSize = batchSize;

        if (isValidate) {
            // Run validation
            const results = await migration.validateMigration();
            
            console.log('\n📊 Validation Results:');
            console.log(`Collections: ${results.collections.valid}/${results.collections.checked} valid`);
            console.log(`Dots: ${results.dots.valid}/${results.dots.checked} valid`);
            
            const totalValid = results.collections.valid + results.dots.valid;
            const totalChecked = results.collections.checked + results.dots.checked;
            const successRate = totalChecked > 0 ? (totalValid / totalChecked * 100).toFixed(1) : 0;
            
            console.log(`\n✅ Overall success rate: ${successRate}% (${totalValid}/${totalChecked})`);
            
            if (totalValid === totalChecked) {
                console.log('🎉 All validated records have correct salted hashes!');
            } else {
                console.log('⚠️  Some records may need migration or have issues.');
            }
            
        } else if (isDryRun) {
            // Dry run - analyze what needs migration
            console.log('\n🔍 Analyzing migration needs...');
            
            // This would require extending the migration class to support dry run
            console.log('📝 Dry run analysis would show:');
            console.log('   - Number of records that need migration');
            console.log('   - Estimated time for migration');
            console.log('   - Any potential issues');
            console.log('\n💡 Run without --dry-run to perform actual migration');
            
        } else {
            // Run actual migration
            console.log('\n🚀 Starting migration...');
            console.log(`📦 Batch size: ${batchSize}`);
            
            const results = await migration.runFullMigration();
            
            if (results.success) {
                console.log('\n🎉 Migration completed successfully!');
                console.log(`📊 Results:`);
                console.log(`   - Collections migrated: ${results.collections}`);
                console.log(`   - Dots migrated: ${results.dots}`);
                console.log(`   - Total migrated: ${results.totalMigrated}`);
                console.log(`   - Duration: ${results.duration}ms`);
                
                // Run validation after migration
                console.log('\n🔍 Running post-migration validation...');
                const validationResults = await migration.validateMigration();
                
                const totalValid = validationResults.collections.valid + validationResults.dots.valid;
                const totalChecked = validationResults.collections.checked + validationResults.dots.checked;
                
                if (totalValid === totalChecked) {
                    console.log('✅ Post-migration validation passed!');
                } else {
                    console.log('⚠️  Post-migration validation found issues. Check logs above.');
                }
                
            } else {
                console.error('\n❌ Migration failed:', results.error);
                console.log(`📊 Partial results: ${results.totalMigrated} records migrated before failure`);
                process.exit(1);
            }
        }

    } catch (error) {
        console.error('\n💥 Migration tool error:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Migration interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️  Migration terminated');
    process.exit(0);
});

// Run the migration
main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});