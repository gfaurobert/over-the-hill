/**
 * Example usage of ScreenshotManager
 * This demonstrates how to use the screenshot capture and asset management system
 */

import { ScreenshotManager } from './screenshotManager';
import { createMCPPlaywrightService } from './mcpPlaywrightIntegration';

async function demonstrateScreenshotManager() {
  console.log('=== ScreenshotManager Example ===\n');

  // Create MCP service and screenshot manager
  const mcpService = createMCPPlaywrightService();
  const screenshotManager = new ScreenshotManager(mcpService, {
    quality: 85,
    fullPage: false,
    format: 'png'
  });

  const specName = 'password-visibility-toggle';

  try {
    // 1. Create asset directory structure
    console.log('1. Creating asset directory structure...');
    const assetStructure = await screenshotManager.createAssetDirectoryStructure(specName);
    console.log('Asset directories created:');
    console.log(`  - Asset dir: ${assetStructure.assetDir}`);
    console.log(`  - Screenshot dir: ${assetStructure.screenshotDir}`);
    console.log(`  - Error dir: ${assetStructure.errorDir}`);
    console.log(`  - Metadata file: ${assetStructure.metadataFile}\n`);

    // 2. Capture regular screenshots
    console.log('2. Capturing screenshots for test steps...');
    
    const screenshots = [];
    const testSteps = [
      'navigate-to-login',
      'click-password-toggle',
      'verify-password-visible',
      'click-toggle-again',
      'verify-password-hidden'
    ];

    for (const stepId of testSteps) {
      try {
        console.log(`  Capturing screenshot for step: ${stepId}`);
        const metadata = await screenshotManager.captureScreenshot(stepId, specName);
        screenshots.push(metadata);
        console.log(`    ✓ Screenshot saved: ${metadata.filename} (${metadata.fileSize} bytes)`);
      } catch (error) {
        console.log(`    ✗ Failed to capture screenshot for ${stepId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 3. Capture error screenshot
    console.log('\n3. Capturing error screenshot...');
    try {
      const errorMetadata = await screenshotManager.captureErrorScreenshot(
        'failed-validation',
        specName,
        'Password toggle element not found'
      );
      console.log(`  ✓ Error screenshot saved: ${errorMetadata.filename}`);
    } catch (error) {
      console.log(`  ✗ Failed to capture error screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 4. Get asset directory information
    console.log('\n4. Getting asset directory information...');
    const assetInfo = await screenshotManager.getAssetDirectoryInfo(specName);
    console.log(`  Directory exists: ${assetInfo.exists}`);
    console.log(`  Screenshot count: ${assetInfo.screenshotCount}`);
    console.log(`  Total size: ${Math.round(assetInfo.totalSize / 1024)} KB`);
    console.log(`  Last updated: ${assetInfo.lastUpdated?.toISOString() || 'N/A'}`);

    // 5. List all screenshots
    console.log('\n5. Listing all screenshots...');
    const allScreenshots = await screenshotManager.listScreenshots(specName);
    console.log(`  Found ${allScreenshots.length} screenshots:`);
    allScreenshots.forEach((screenshot, index) => {
      console.log(`    ${index + 1}. ${screenshot.filename} (Step: ${screenshot.stepId})`);
      console.log(`       Size: ${screenshot.fileSize} bytes, Taken: ${screenshot.timestamp.toISOString()}`);
    });

    // 6. Demonstrate cleanup (with very short age for demo)
    console.log('\n6. Demonstrating cleanup of old screenshots...');
    const maxAge = 1000; // 1 second for demo purposes
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait a bit
    
    try {
      await screenshotManager.cleanupOldScreenshots(specName, maxAge);
      console.log('  ✓ Cleanup completed');
    } catch (error) {
      console.log(`  ✗ Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 7. Show final asset info
    console.log('\n7. Final asset directory information...');
    const finalAssetInfo = await screenshotManager.getAssetDirectoryInfo(specName);
    console.log(`  Screenshots remaining: ${finalAssetInfo.screenshotCount}`);
    console.log(`  Total size: ${Math.round(finalAssetInfo.totalSize / 1024)} KB`);

  } catch (error) {
    console.error('Example failed:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n=== Example Complete ===');
}

// Demonstrate filename generation patterns
function demonstrateFilenameGeneration() {
  console.log('\n=== Filename Generation Examples ===\n');

  const mcpService = createMCPPlaywrightService();
  const screenshotManager = new ScreenshotManager(mcpService);
  
  // Access private methods for demonstration
  const manager = screenshotManager as any;
  
  const testCases = [
    { specName: 'simple-spec', stepId: 'step-1' },
    { specName: 'complex-spec-name!@#', stepId: 'step with spaces & symbols!' },
    { specName: 'password-visibility-toggle', stepId: 'click-toggle-button' },
    { specName: 'form-validation', stepId: 'validate-email-field' }
  ];

  const timestamp = '2023-12-01T10-30-45-123Z';

  console.log('Regular screenshot filenames:');
  testCases.forEach(({ specName, stepId }) => {
    const filename = manager.generateScreenshotFilename(specName, stepId, timestamp);
    console.log(`  ${specName} + ${stepId} → ${filename}`);
  });

  console.log('\nError screenshot filenames:');
  testCases.forEach(({ specName, stepId }) => {
    const filename = manager.generateErrorScreenshotFilename(specName, stepId, timestamp);
    console.log(`  ${specName} + ${stepId} → ${filename}`);
  });
}

// Run examples if this file is executed directly
if (require.main === module) {
  demonstrateFilenameGeneration();
  demonstrateScreenshotManager().catch(console.error);
}

export { demonstrateScreenshotManager, demonstrateFilenameGeneration };