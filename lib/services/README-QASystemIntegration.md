# QA System Integration

This document describes how the Automated QA System integrates with Kiro IDE through agent hooks and provides instructions for testing and using the system.

## Overview

The Automated QA System is integrated with Kiro IDE through an agent hook that can be triggered manually to generate and execute QA tests based on completed feature specifications.

## Integration Components

### 1. Agent Hook Configuration
- **Location**: `.kiro/hooks/automated-qa-system.kiro.hook`
- **Trigger**: Manual user trigger
- **Target**: Specifications in `.kiro/specs/**/*.md`

### 2. Main Orchestrator
- **File**: `lib/services/qaSystemOrchestrator.ts`
- **Purpose**: Coordinates all QA system components
- **Functions**: Manages the complete QA pipeline from spec analysis to report generation

### 3. Entry Point
- **File**: `lib/services/automatedQASystem.ts`
- **Purpose**: Main entry point called by the agent hook
- **Functions**: Provides simple interface for QA execution

## Usage

### Through Kiro IDE Agent Hook

1. **Open the Agent Hooks panel** in Kiro IDE
2. **Find "Automated QA System"** in the hooks list
3. **Click the trigger button** to execute QA for all completed specs
4. **Monitor progress** in the IDE console/output panel

### Through Command Line (Testing)

```bash
# Test system status
node scripts/test-qa-system.js --status

# Run QA for all completed specs
node scripts/test-qa-system.js

# Run QA for specific spec
node scripts/test-qa-system.js password-visibility-toggle
```

### Programmatic Usage

```typescript
import { executeAutomatedQA, getQASystemStatus } from './lib/services/automatedQASystem';

// Execute QA for all specs
await executeAutomatedQA();

// Execute QA for specific spec
await executeAutomatedQA('password-visibility-toggle');

// Check system status
await getQASystemStatus();
```

## Execution Flow

1. **System Validation**: Checks configuration and directory structure
2. **Spec Scanning**: Scans `.kiro/specs/` for completed specifications
3. **Requirements Analysis**: Parses requirements.md files for acceptance criteria
4. **Test Generation**: Creates Playwright test scripts from acceptance criteria
5. **Test Execution**: Runs tests with screenshot capture
6. **Report Generation**: Updates `QA/Tests-Summary.md` with results

## Output Structure

```
QA/
├── scripts/
│   └── {spec-name}/
│       └── {spec-name}-test.js
├── assets/
│   └── {spec-name}/
│       ├── step-1-screenshot.png
│       ├── step-2-screenshot.png
│       └── ...
└── Tests-Summary.md (updated with spec-based sections)
```

## Configuration

The system uses configuration from `lib/config/qaConfig.ts`:

- **Base URL**: Application URL for testing (default: http://localhost:3001)
- **Timeout**: Test execution timeout (default: 30 seconds)
- **Screenshot Quality**: Image quality for captures (default: 90%)
- **Browser Mode**: Headless vs headed execution

## Error Handling

The system includes comprehensive error handling:

- **Missing Specs**: Gracefully handles missing or incomplete specifications
- **Test Failures**: Captures screenshots and error details for debugging
- **Browser Issues**: Retries with different configurations
- **File System Errors**: Provides clear error messages and suggestions

## Progress Reporting

During execution, the system provides real-time progress updates:

- 📁 Scanning for specifications
- 🎯 Processing specifications
- 📖 Reading spec files
- 🔍 Analyzing requirements
- 📝 Generating test scripts
- 🎭 Executing Playwright tests
- 📊 Generating reports

## Troubleshooting

### Common Issues

1. **No specs found**: Ensure specs are marked as completed in their tasks.md files
2. **Playwright errors**: Check that the Playwright MCP server is running
3. **Permission errors**: Verify write permissions for QA directory
4. **Browser launch failures**: Check browser installation and configuration

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=qa-system node scripts/test-qa-system.js
```

### Manual Validation

Test individual components:
```typescript
import { QASystemOrchestrator } from './lib/services/qaSystemOrchestrator';

const orchestrator = new QASystemOrchestrator();
const validation = await orchestrator.validateSystem();
console.log('System validation:', validation);
```

## Integration Testing

Run the integration test suite:
```bash
npm run test:qa-integration
```

Or manually:
```typescript
import { testQAIntegration } from './lib/services/testQAIntegration';
await testQAIntegration();
```

## Next Steps

After successful integration:

1. **Test with MVP spec**: Validate using password-visibility-toggle specification
2. **Expand to other specs**: Apply to additional completed specifications
3. **Optimize performance**: Fine-tune based on execution results
4. **Add monitoring**: Set up alerts for QA execution failures

## Dependencies

- **Playwright MCP**: Browser automation server
- **Node.js/TypeScript**: Runtime environment
- **File System Access**: Read/write permissions for spec and QA directories
- **Kiro IDE**: Agent hook system for integration