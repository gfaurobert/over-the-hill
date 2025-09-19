"use strict";
/**
 * Configuration constants for the automated QA system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QA_CONFIG = void 0;
exports.QA_CONFIG = {
    // Directory paths
    SPECS_DIR: '.kiro/specs',
    QA_SCRIPTS_DIR: 'QA/scripts',
    QA_ASSETS_DIR: 'QA/assets',
    QA_RESOURCES_DIR: 'QA/resources',
    TESTS_SUMMARY_FILE: 'QA/Tests-Summary.md',
    // Spec processing
    SUPPORTED_SPEC_STATUS: ['completed'],
    REQUIRED_SPEC_FILES: ['requirements.md', 'design.md', 'tasks.md'],
    // Test execution
    DEFAULT_TIMEOUT: 30000,
    MAX_RETRIES: 2,
    SCREENSHOT_QUALITY: 90,
    MAX_SCREENSHOT_SIZE: '1920x1080',
    // Browser configuration
    BROWSER_OPTIONS: {
        headless: false,
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        slowMo: 100
    },
    // File naming patterns
    NAMING_PATTERNS: {
        testScript: (specName) => `${specName}-test.js`,
        screenshot: (specName, stepId) => `${specName}-${stepId}.png`,
        assetDir: (specName) => `${specName}-test`,
        scriptDir: (specName) => `${specName}-test`
    },
    // EARS format patterns for parsing requirements
    EARS_PATTERNS: {
        WHEN_THEN: /WHEN\s+(.+?)\s+THEN\s+(.+?)\s+SHALL\s+(.+?)(?=\s*\d+\.|$)/gi,
        IF_THEN: /IF\s+(.+?)\s+THEN\s+(.+?)\s+SHALL\s+(.+?)(?=\s*\d+\.|$)/gi,
        WHILE_THEN: /WHILE\s+(.+?)\s+THEN\s+(.+?)\s+SHALL\s+(.+?)(?=\s*\d+\.|$)/gi
    },
    // Test categories for classification
    TEST_CATEGORIES: {
        UI_INTERACTION: 'ui-interaction',
        FORM_VALIDATION: 'form-validation',
        NAVIGATION: 'navigation',
        ACCESSIBILITY: 'accessibility',
        DATA_PERSISTENCE: 'data-persistence',
        ERROR_HANDLING: 'error-handling'
    },
    // Report formatting
    REPORT_CONFIG: {
        maxScreenshotsPerTest: 10,
        includeTimestamps: true,
        includeErrorDetails: true,
        organizationMode: 'by-spec'
    }
};
