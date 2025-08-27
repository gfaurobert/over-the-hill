# Hash Migration Guide

This guide explains how to migrate from unsalted to salted search hashes for improved security.

## Overview

The privacy service has been updated to use salted hashes instead of plain SHA-256 hashes for search functionality. This prevents rainbow table attacks and provides better security isolation between users.

## Migration Strategy

### Phase 1: Preparation
1. **Backup your database** before running any migration
2. **Test the migration** on a copy of your production data
3. **Schedule maintenance window** for production migration

### Phase 2: Deploy Updated Code
1. Deploy the updated `privacyService.js` with backward compatibility
2. The service will automatically try both salted and legacy hashes during search
3. New data will use salted hashes, existing data will still work with legacy hashes

### Phase 3: Run Migration
1. **Dry Run** (recommended first):
   ```bash
   node temp/runHashMigration.js --dry-run
   ```

2. **Validate existing state**:
   ```bash
   node temp/runHashMigration.js --validate
   ```

3. **Run actual migration**:
   ```bash
   node temp/runHashMigration.js
   ```

4. **Custom batch size** (if needed):
   ```bash
   node temp/runHashMigration.js --batch-size=50
   ```

### Phase 4: Validation
1. **Post-migration validation** (automatic after migration)
2. **Manual testing** of search functionality
3. **Monitor logs** for any legacy hash usage

### Phase 5: Cleanup (Optional)
After confirming migration success, you can:
1. Remove the `createLegacyHash` method
2. Remove backward compatibility code from `searchCollectionsByName`
3. This step is optional and can be done in a future release

## Migration Process Details

### What Gets Migrated
- **Collections table**: `name_hash` column
- **Dots table**: `label_hash` column
- Any other tables using search hashes

### How Migration Works
1. **Fetch records** in batches (default: 100 records)
2. **Decrypt data** to get original text
3. **Compare hashes** to identify records needing migration
4. **Generate new salted hash** using the updated algorithm
5. **Update database** with new hash
6. **Validate results** to ensure correctness

### Safety Features
- **Batch processing** to avoid memory issues
- **Error handling** continues migration even if individual records fail
- **Validation** ensures migration correctness
- **Backward compatibility** maintains search functionality during migration
- **Dry run mode** to preview changes without making them

## Rollback Plan

If issues occur during migration:

1. **Stop the migration** (Ctrl+C)
2. **Restore from backup** if necessary
3. **Revert code** to previous version
4. **Investigate issues** and fix before retrying

## Expected Downtime

- **Code deployment**: ~5 minutes (no downtime due to backward compatibility)
- **Migration execution**: Depends on data size
  - ~1000 records: 2-5 minutes
  - ~10000 records: 10-30 minutes
  - ~100000 records: 1-3 hours

## Monitoring

During and after migration, monitor:

1. **Migration logs** for errors or warnings
2. **Application logs** for search functionality
3. **Database performance** during batch updates
4. **User reports** of search issues

## Troubleshooting

### Common Issues

1. **Decryption failures**:
   - Check user keys are available
   - Verify encryption key consistency
   - Individual failures won't stop migration

2. **Database connection issues**:
   - Check Supabase connection
   - Verify database permissions
   - Consider smaller batch sizes

3. **Memory issues**:
   - Reduce batch size with `--batch-size=50`
   - Monitor system resources

4. **Search not working after migration**:
   - Check validation results
   - Verify backward compatibility is working
   - Check application logs for errors

### Recovery Steps

1. **Partial migration failure**:
   ```bash
   # Check what was migrated
   node temp/runHashMigration.js --validate
   
   # Resume migration (it will skip already migrated records)
   node temp/runHashMigration.js
   ```

2. **Complete migration failure**:
   - Restore from backup
   - Fix underlying issues
   - Retry migration

## Post-Migration

### Verification Checklist
- [ ] Migration completed successfully
- [ ] Validation shows 100% success rate
- [ ] Search functionality works for existing data
- [ ] Search functionality works for new data
- [ ] No errors in application logs
- [ ] Performance is acceptable

### Cleanup (Future Release)
After confirming everything works (recommend waiting 1-2 weeks):

1. Remove backward compatibility code:
   ```javascript
   // Remove this method
   createLegacyHash(text) { ... }
   
   // Simplify searchCollectionsByName to only use salted hash
   ```

2. Update documentation to reflect new hash format

## Security Benefits

After migration:
- ✅ **Rainbow table resistance**: Salted hashes prevent precomputed attacks
- ✅ **User isolation**: Same search terms produce different hashes per user
- ✅ **Forward security**: New data automatically uses improved hashing
- ✅ **Backward compatibility**: Existing functionality preserved during transition

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review migration logs for specific errors
3. Test with a smaller dataset first
4. Consider running migration during low-traffic periods