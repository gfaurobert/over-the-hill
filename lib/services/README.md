# Playwright Test Runner

The PlaywrightTestRunner is a core component of the automated QA system that executes test scripts using Playwright MCP integration. It provides comprehensive test execution with screenshot capture, error handling, and result collection.

## Features

- **MCP Integration**: Uses Playwright MCP server for browser automation
- **Screenshot Capture**: Automatically captures screenshots at each test step
- **Error Handling**: Robust error handling with retry mechanisms
- **Result Collection**: Comprehensive test result tracking and reporting
- **Browser Lifecycle**: Proper browser setup and teardown management
- **Flexible Configuration**: Configurable timeouts, retries, and browser options

## Usage

### Basic Usage

```typescript
import { PlaywrightTestRunner } from './playwrightTestRunner';
import { TestScript } from '../types/qaTypes';

const testRunner = new PlaywrightTestRunner({
  baseUrl: 'http://localhost:3001',
  testTimeout: 10000,
  maxRetries: 2,
  headless: false
});

const testScript: TestScript = {
  fileName: 'my-test.js',
  content: 'Generated test script',
  specName: 'my-spec',
  steps: [
    {
      id: 'navigate',
      description: 'Navigate to home page',
      action: { type: 'navigate', value: 'http://localhost:3001' },
      expectedResult: 'Page loads',
      screenshotName: 'home.png',
      category: 'navigation'
    }
  ],
  metadata: {
    specName: 'my-spec',
    generatedAt: new Date(),
    version: '1.0.0',
    totalSteps: 1,
    estimatedDuration: 5000
  }
};

const result = await testRunner.executeTest(testScript, 'my-spec');
console.log(`Test ${result.overallStatus}: ${result.executionTime}ms`);
```

### Configuration Options

```typescript
interface QAConfig {
  baseUrl: string;           // Base URL for navigation
  screenshotPath: string;    // Path for screenshot storage
  testTimeout: number;       // Default timeout for actions (ms)
  maxRetries: number;        // Maximum retry attempts for failed steps
  headless: boolean;         // Run browser in headless mode
  browserOptions: {          // Playwright browser options
    headless: boolean;
    viewport: { width: number; height: number };
    ignoreHTTPSErrors: boolean;
    slowMo: number;
  };
}
```

### Supported Actions

The test runner supports the following Playwright actions:

#### Navigate
```typescript
{
  type: 'navigate',
  value: 'http://localhost:3001/login'
}
```

#### Click
```typescript
{
  type: 'click',
  selector: '#submit-button',
  options: { button: 'left', doubleClick: false }
}
```

#### Type
```typescript
{
  type: 'type',
  selector: 'input[name="username"]',
  value: 'testuser',
  options: { slowly: false }
}
```

#### Wait
```typescript
// Wait for time
{
  type: 'wait',
  value: '2000' // milliseconds
}

// Wait for element
{
  type: 'wait',
  selector: '#loading-spinner',
  timeout: 10000
}
```

#### Assert
```typescript
{
  type: 'assert',
  selector: '.success-message',
  value: 'Login successful'
}
```

#### Screenshot
```typescript
{
  type: 'screenshot'
}
```

## Test Results

The test runner returns comprehensive results:

```typescript
interface TestResult {
  specName: string;
  testScript: string;
  steps: StepResult[];
  overallStatus: 'Passed' | 'Failed' | 'Skipped';
  executionTime: number;
  screenshots: string[];
  startTime: Date;
  endTime: Date;
  errorSummary?: string;
}

interface StepResult {
  stepId: string;
  description: string;
  status: 'Passed' | 'Failed' | 'Skipped';
  screenshot?: string;
  errorMessage?: string;
  executionTime: number;
  timestamp: Date;
}
```

## Error Handling

The test runner includes robust error handling:

- **Retry Mechanism**: Failed steps are retried up to `maxRetries` times
- **Screenshot on Failure**: Captures screenshots when steps fail
- **Graceful Degradation**: Continues execution even after step failures
- **Error Recovery**: Provides detailed error messages and stack traces

## Screenshot Management

Screenshots are automatically managed:

- **Directory Structure**: `QA/assets/{spec-name}-test/`
- **Naming Convention**: `{spec-name}-{step-id}.png`
- **Error Screenshots**: `{spec-name}-{step-id}-error.png`
- **Automatic Cleanup**: Old screenshots can be cleaned up automatically

## MCP Integration

The test runner integrates with Playwright MCP server:

- **Browser Automation**: Uses MCP functions for all browser interactions
- **Screenshot Capture**: Leverages MCP screenshot capabilities
- **Element Detection**: Uses MCP for element existence checks
- **Navigation**: Handles page navigation through MCP

## Examples

See `playwrightTestRunner.example.ts` for comprehensive usage examples including:

- Basic test execution
- Password visibility toggle testing (MVP scenario)
- Error handling and recovery
- Running multiple tests in sequence

## Testing

The PlaywrightTestRunner includes comprehensive tests:

- **Unit Tests**: `__tests__/playwrightTestRunner.test.ts`
- **Integration Tests**: `__tests__/playwrightTestRunner.integration.test.ts`

Run tests with:
```bash
npm run test:unit -- lib/services/__tests__/playwrightTestRunner.test.ts
npm run test:unit -- lib/services/__tests__/playwrightTestRunner.integration.test.ts
```

## Dependencies

- **Playwright MCP**: Browser automation through MCP server
- **Node.js fs/promises**: File system operations for screenshots
- **Path utilities**: Cross-platform path handling

## Best Practices

1. **Always call teardownBrowser()** after test execution
2. **Use appropriate timeouts** for different types of actions
3. **Handle errors gracefully** and provide meaningful error messages
4. **Capture screenshots** at key points for debugging
5. **Use descriptive step IDs** for better traceability
6. **Configure retries** based on test stability requirements

## Troubleshooting

### Common Issues

1. **Browser not starting**: Ensure MCP Playwright server is configured
2. **Screenshots not saving**: Check file permissions and directory structure
3. **Elements not found**: Verify selectors and wait for page load
4. **Timeouts**: Increase timeout values for slow-loading pages
5. **Memory issues**: Call teardownBrowser() to clean up resources

### Debug Mode

Enable debug logging by setting environment variables:
```bash
DEBUG=playwright:* npm run test
```

## Future Enhancements

- **Parallel Test Execution**: Run multiple tests concurrently
- **Video Recording**: Capture video of test execution
- **Performance Metrics**: Track page load times and performance
- **Mobile Testing**: Support for mobile device emulation
- **Cross-browser Testing**: Support for multiple browser engines