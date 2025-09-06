# Implementation Plan

- [x] 1. Set up data model and type definitions
  - Create ReleaseLineConfig interface and related types
  - Extend Collection interface to include releaseLineConfig field
  - Add validation schemas for release line configuration
  - _Requirements: 1.1, 2.1, 3.1, 5.1_

- [x] 2. Implement database schema and migration
  - Add release_line_config_encrypted column to collections table
  - Create database migration script for the new column
  - Test migration on development database
  - _Requirements: 5.1, 5.2, 7.1_

- [x] 3. Extend privacy service for release line encryption
  - Add encryption methods for release line color and text data
  - Implement decryption methods for release line configuration
  - Create unit tests for encryption/decryption roundtrip
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Update Supabase service layer
  - Extend supabaseService to handle encrypted release line storage
  - Implement CRUD operations for release line configuration
  - Add error handling for invalid or missing release line data
  - _Requirements: 5.1, 5.2, 6.1, 7.1_

- [x] 5. Update simple data service
  - Add updateCollectionReleaseLineConfig method
  - Add getCollectionReleaseLineConfig method
  - Integrate release line operations with existing collection methods
  - _Requirements: 1.4, 2.3, 3.3, 5.1_

- [x] 6. Create release line settings UI components
  - Build toggle switch component for enable/disable functionality
  - Create color picker component for release line color selection
  - Implement text input field with validation for release line label
  - _Requirements: 1.1, 2.1, 3.1, 3.5_

- [ ] 7. Integrate release line settings into HillChartApp
  - Add release line state management to main component
  - Integrate settings panel into existing collection controls
  - Implement real-time updates when settings change
  - _Requirements: 1.2, 1.4, 2.2, 3.2_

- [ ] 8. Implement release line SVG visualization
  - Add vertical line rendering to hill chart SVG
  - Position line at right edge of chart area (x=600)
  - Implement text rendering along the release line
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 9. Add release line to export functionality
  - Include release line in PNG export generation
  - Include release line in SVG export generation
  - Ensure proper positioning and styling in exports
  - _Requirements: 4.4, 6.1_

- [ ] 10. Implement collection switching and persistence
  - Load appropriate release line settings when switching collections
  - Apply default settings for new collections
  - Persist settings changes to database
  - _Requirements: 5.1, 5.2, 1.4_

- [ ] 11. Update snapshot functionality
  - Include release line configuration in snapshot data
  - Restore release line settings when loading snapshots
  - Handle snapshots without release line data gracefully
  - _Requirements: 5.3, 5.4_

- [ ] 12. Extend JSON export/import functionality
  - Include release line config in JSON export format
  - Handle release line data during JSON import
  - Implement validation and error handling for imported release line data
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 13. Add responsive design and accessibility features
  - Ensure release line scales properly with chart dimensions
  - Add ARIA labels and keyboard accessibility to settings
  - Test text positioning and readability across screen sizes
  - _Requirements: 4.5, 3.5_

- [ ] 14. Create comprehensive test suite
  - Write unit tests for release line configuration validation
  - Create integration tests for data persistence and encryption
  - Add visual tests for SVG rendering and export functionality
  - _Requirements: 1.1-1.4, 2.1-2.4, 3.1-3.5, 4.1-4.5, 5.1-5.4, 6.1-6.4, 7.1-7.4_

- [ ] 15. Handle edge cases and error scenarios
  - Implement graceful degradation for missing or corrupted config
  - Add validation for color format and text length limits
  - Test behavior with existing collections without release line data
  - _Requirements: 6.3, 6.4, 3.5_