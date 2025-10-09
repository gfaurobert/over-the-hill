# ReportGenerator

The ReportGenerator is a core component of the automated QA system that creates spec-based test reports and updates the Tests-Summary.md file with organized results.

## Overview

The ReportGenerator transforms test execution results into comprehensive markdown reports organized by specification folders rather than test categories. This provides better traceability from feature specifications to their corresponding tests.

## Key Features

### Spec-Based Organization
- **Before (Category-based)**: Tests grouped by categories like "Authentication Tests", "UI Tests"
- **After (Spec-based)**: Tests grouped by specification folders like "password-visibility-toggle", "user-authentication"

### Comprehensive Reporting
- Test execution summaries with pass/fail status
- Screenshot integration with proper asset linking
- Execution time tracking and performance metrics
- Error reporting with detailed failure information
- Links to original specification files

### Framework Integration
- Maintains existing QA directory structure
- Compatible with current screenshot naming conventions
- Preserves markdown table format for test steps
- Works alongside existing manual QA tests

## Usage

### Basic Usage

```typescript
import { ReportGenerator } from '../services/reportGenerator';
import { TestResult } from '../types/qaTypes';

const reportGenerator = new ReportGenerator();

// Update Tests-Summary.md with test results
const testResults: TestResult[] = [
  // ... your test results
];

await reportGenerator.updateTestsSummary(testResults);
```

### Organizing Results by Specs

```typescript
// Organize test results by specification
const specSections = reportGenerator.organizeBySpecs(testResults);

console.log(`Found ${specSections.length} specifications:`);
specSections.forEach(section => {
  console.log(`- ${section.specName}: ${section.overallStatus}`);
});
```

### Generating Individual Sections

```typescript
// Generate markdown section for a specific test result
const section = reportGenerator.generateSpecSection(testResult);
console.log(section);
```

## Report Structure

The generated Tests-Summary.md follows this structure:

```markdown
# Tests Summary

## Specification Tests Overview
| Specification | Tests | Status | Last Executed |
| ------------- | ----- | ------ | ------------- |
| [Spec Name](#anchor) | 2 | ✅ | 1/15/2024 |

---

## Spec Name

**Specification:** `.kiro/specs/spec-name/`
**Status:** ✅ Passed
**Tests:** 2
**Screenshots:** 8
**Execution Time:** 5.20s
**Last Executed:** 1/15/2024, 10:00:00 AM

### Description
Automated testing for Spec Name specification...

**Script:** QA/scripts/spec-name/test-script.js

##### Steps
| Step | Description | Expected | Actual | Status |
| ---- | ----------- | -------- | ------ | ------ |
| 1 | Test step | Expected behavior | Actual result | ✅ Passed |
```

## Integration Points

### File System Structure
```
QA/
├── Tests-Summary.md          # Updated by ReportGenerator
├── assets/
│   └── {spec-name}/         # Spec-based asset folders
│       └── screenshots...
└── scripts/
    └── {spec-name}/         # Spec-based script folders
        └── test-scripts...
```

### Configuration
The ReportGenerator uses paths from `QA_CONFIG`:
- `TESTS_SUMMARY_FILE`: Path to Tests-Summary.md
- `QA_ASSETS_DIR`: Base directory for test assets
- `QA_SCRIPTS_DIR`: Base directory for test scripts

## API Reference

### ReportGenerator Class

#### Methods

##### `updateTestsSummary(results: TestResult[]): Promise<void>`
Updates the Tests-Summary.md file with spec-based organization.

**Parameters:**
- `results`: Array of test results to include in the report

**Throws:**
- Error if file system operations fail

##### `organizeBySpecs(results: TestResult[]): SpecSection[]`
Organizes test results by specification folders.

**Parameters:**
- `results`: Array of test results to organize

**Returns:**
- Array of SpecSection objects grouped by spec name

##### `generateSpecSection(result: TestResult): string`
Generates a markdown section for a specific test result.

**Parameters:**
- `result`: Test result to generate section for

**Returns:**
- Markdown string for the test result section

##### `generateMarkdownReport(data: ReportData): string`
Generates the complete markdown report.

**Parameters:**
- `data`: Report data including summary and spec sections

**Returns:**
- Complete markdown report string

## Error Handling

The ReportGenerator includes comprehensive error handling:

### File System Errors
- Permission issues: Logged with suggestions for manual intervention
- Disk space: Checks available space and suggests cleanup
- Path conflicts: Generates unique names to avoid overwrites

### Data Validation
- Missing test results: Generates empty report with future tests section
- Malformed data: Extracts what's possible and continues processing
- Invalid paths: Validates all file paths before operations

## Testing

The ReportGenerator includes comprehensive test coverage:

### Unit Tests
- `lib/services/__tests__/reportGenerator.test.ts`
- Tests all core functionality and edge cases
- Mocks file system operations for isolated testing

### Integration Tests
- `lib/services/__tests__/reportGenerator.integration.test.ts`
- Tests real file system operations
- Validates integration with existing QA framework

### Example Usage
- `lib/services/reportGenerator.example.ts`
- Demonstrates practical usage scenarios
- Shows integration patterns

## Migration from Category-Based Reports

When migrating from the old category-based format:

1. **Backup existing Tests-Summary.md**
2. **Run ReportGenerator with new test results**
3. **Verify spec-based organization**
4. **Update any external references to test categories**

The new format provides:
- Better traceability from specs to tests
- Clearer organization by feature
- Easier maintenance and updates
- Improved navigation and searchability

## Future Enhancements

Planned improvements include:
- Test trend analysis and historical reporting
- Integration with CI/CD pipelines
- Advanced filtering and search capabilities
- Export to multiple formats (PDF, HTML)
- Real-time test result streaming