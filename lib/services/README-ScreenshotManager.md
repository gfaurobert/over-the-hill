# ScreenshotManager

The ScreenshotManager is a core component of the automated QA system that handles screenshot capture, asset management, and file organization for test execution.

## Features

### 🖼️ Screenshot Capture
- **Automated capture** during test execution using Playwright MCP integration
- **Step identification** with unique naming conventions
- **Error screenshots** with detailed error information
- **Configurable options** for quality, format, and dimensions

### 📁 Asset Management
- **Organized directory structure** for each spec
- **Metadata tracking** for all screenshots
- **File size optimization** and compression
- **Automatic cleanup** of old screenshots

### 🏷️ Naming Conventions
- **Safe filenames** with special character sanitization
- **Timestamp-based** unique identification
- **Step-based** organization for easy navigation
- **Error differentiation** for failed test steps

## Directory Structure

```
QA/assets/{spec-name}-test/
├── screenshots/           # Regular test step screenshots
│   ├── spec-step-1-2023-12-01T10-30-45-123Z.png
│   ├── spec-step-2-2023-12-01T10-30-45-456Z.png
│   └── ...
├── errors/               # Error screenshots and details
│   ├── spec-error-failed-step-2023-12-01T10-31-00-789Z.png
│   ├── failed-step-error-details.json
│   └── ...
└── metadata.json         # Screenshot metadata and tracking
```

## Usage

### Basic Usage

```typescript
import { ScreenshotManager } from './screenshotManager';
import { createMCPPlaywrightService } from './mcpPlaywrightIntegration';

// Create screenshot manager
const mcpService = createMCPPlaywrightService();
const screenshotManager = new ScreenshotManager(mcpService);

// Capture screenshot for a test step
const metadata = await screenshotManager.captureScreenshot('login-step', 'user-auth-spec');
console.log(`Screenshot saved: ${metadata.filename}`);
```

### With Custom Options

```typescript
const screenshotManager = new ScreenshotManager(mcpService, {
  quality: 85,
  fullPage: true,
  format: 'jpeg',
  maxWidth: 1280,
  maxHeight: 720
});
```

### Error Screenshot Capture

```typescript
// Capture error screenshot with details
const errorMetadata = await screenshotManager.captureErrorScreenshot(
  'validation-failed',
  'form-validation-spec',
  'Required field validation error'
);
```

### Asset Directory Management

```typescript
// Create directory structure
const structure = await screenshotManager.createAssetDirectoryStructure('my-spec');

// Get directory information
const info = await screenshotManager.getAssetDirectoryInfo('my-spec');
console.log(`Screenshots: ${info.screenshotCount}, Size: ${info.totalSize} bytes`);

// List all screenshots
const screenshots = await screenshotManager.listScreenshots('my-spec');
screenshots.forEach(s => console.log(`${s.stepId}: ${s.filename}`));
```

### Cleanup Management

```typescript
// Clean up screenshots older than 7 days
await screenshotManager.cleanupOldScreenshots('my-spec', 7 * 24 * 60 * 60 * 1000);
```

## Integration with PlaywrightTestRunner

The ScreenshotManager is automatically integrated with the PlaywrightTestRunner:

```typescript
import { PlaywrightTestRunner } from './playwrightTestRunner';

const testRunner = new PlaywrightTestRunner();

// Screenshots are automatically captured during test execution
const result = await testRunner.executeTest(testScript, 'my-spec');

// Access screenshot manager for additional operations
const screenshotManager = testRunner.getScreenshotManager();
await screenshotManager.cleanupOldScreenshots('my-spec');
```

## Configuration

Screenshot behavior is configured through the QA_CONFIG:

```typescript
// lib/config/qaConfig.ts
export const QA_CONFIG = {
  SCREENSHOT_CONFIG: {
    maxFileSize: 5 * 1024 * 1024,        // 5MB max file size
    defaultQuality: 90,                   // PNG/JPEG quality
    defaultFormat: 'png',                 // Default format
    maxAge: 7 * 24 * 60 * 60 * 1000,    // 7 days retention
    compressionThreshold: 2 * 1024 * 1024, // 2MB compression threshold
    maxScreenshotsPerSpec: 100            // Max screenshots per spec
  }
};
```

## Filename Conventions

### Regular Screenshots
- Pattern: `{spec-name}-step-{step-id}-{timestamp}.png`
- Example: `password-toggle-step-click-button-2023-12-01T10-30-45-123Z.png`

### Error Screenshots
- Pattern: `{spec-name}-error-{step-id}-{timestamp}.png`
- Example: `password-toggle-error-validation-failed-2023-12-01T10-31-00-456Z.png`

### Special Character Handling
- Special characters (`!@#$%^&*()[]{}|;:'"<>?/\`) are replaced with hyphens (`-`)
- Spaces are replaced with hyphens
- Multiple consecutive hyphens are preserved for readability

## Metadata Format

The `metadata.json` file tracks all screenshots for a spec:

```json
{
  "specName": "password-visibility-toggle",
  "createdAt": "2023-12-01T10:00:00.000Z",
  "lastUpdated": "2023-12-01T10:35:00.000Z",
  "totalScreenshots": 5,
  "totalFileSize": 2048576,
  "screenshots": [
    {
      "filename": "password-toggle-step-navigate-2023-12-01T10-30-00-123Z.png",
      "stepId": "navigate",
      "timestamp": "2023-12-01T10:30:00.123Z",
      "fileSize": 409600,
      "path": "/path/to/screenshot.png"
    }
  ]
}
```

## Error Handling

The ScreenshotManager includes comprehensive error handling:

- **MCP Service Errors**: Gracefully handles browser automation failures
- **File System Errors**: Manages permission and disk space issues
- **Invalid Parameters**: Validates input parameters and provides clear error messages
- **Cleanup Failures**: Continues operation even if individual file cleanup fails

## Performance Considerations

- **Lazy Directory Creation**: Directories are created only when needed
- **Efficient Metadata Updates**: Metadata is updated incrementally
- **Compression Awareness**: Large files are flagged for potential optimization
- **Cleanup Scheduling**: Old screenshots are cleaned up to manage disk space

## Testing

The ScreenshotManager includes comprehensive unit tests:

```bash
npm run test:unit -- lib/services/__tests__/screenshotManager.test.ts
```

Test coverage includes:
- Filename generation and sanitization
- MCP service integration
- Configuration option handling
- Error scenarios and edge cases

## Examples

See `lib/services/screenshotManager.example.ts` for complete usage examples and demonstrations.