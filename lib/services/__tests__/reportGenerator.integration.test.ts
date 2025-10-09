/**
 * Integration tests for ReportGenerator
 * Tests integration with existing QA framework and file system operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import ReportGenerator from '../reportGenerator';
import { TestResult, StepResult } from '../../types/qaTypes';

describe('ReportGenerator Integration', () => {
  let reportGenerator: ReportGenerator;
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    
    // Create temporary directory for testing
    tempDir = join(process.cwd(), 'temp-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create QA directory structure
    await fs.mkdir(join(tempDir, 'QA'), { recursive: true });
    await fs.mkdir(join(tempDir, 'QA', 'assets'), { recursive: true });
    await fs.mkdir(join(tempDir, 'QA', 'scripts'), { recursive: true });
    
    // Change to temp directory
    process.chdir(tempDir);
    
    // Create ReportGenerator after changing directory
    reportGenerator = new ReportGenerator();
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  it('should create Tests-Summary.md with spec-based organization', async () => {
    const mockStepResults: StepResult[] = [
      {
        stepId: 'step-1',
        description: 'Navigate to application',
        status: 'Passed',
        screenshot: 'step1-navigate.png',
        executionTime: 1000,
        timestamp: new Date()
      },
      {
        stepId: 'step-2',
        description: 'Click password visibility toggle',
        status: 'Passed',
        screenshot: 'step2-toggle.png',
        executionTime: 500,
        timestamp: new Date()
      }
    ];

    const mockTestResults: TestResult[] = [
      {
        specName: 'password-visibility-toggle',
        testScript: 'password-visibility-toggle-test.js',
        steps: mockStepResults,
        overallStatus: 'Passed',
        executionTime: 3000,
        screenshots: ['step1-navigate.png', 'step2-toggle.png'],
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:03Z')
      },
      {
        specName: 'user-authentication',
        testScript: 'auth-test.js',
        steps: [mockStepResults[0]],
        overallStatus: 'Failed',
        executionTime: 2000,
        screenshots: ['step1-navigate.png'],
        startTime: new Date('2024-01-01T10:01:00Z'),
        endTime: new Date('2024-01-01T10:01:02Z')
      }
    ];

    await reportGenerator.updateTestsSummary(mockTestResults);

    // Verify file was created
    const summaryPath = join(tempDir, 'QA', 'Tests-Summary.md');
    const exists = await fs.access(summaryPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    // Read and verify content
    const content = await fs.readFile(summaryPath, 'utf-8');
    
    // Check header and structure
    expect(content).toContain('# Tests Summary');
    expect(content).toContain('## Specification Tests Overview');
    
    // Check spec-based organization (not category-based)
    expect(content).toContain('Password Visibility Toggle');
    expect(content).toContain('User Authentication');
    expect(content).not.toContain('Authentication Tests'); // Old category-based format
    expect(content).not.toContain('User Interface Tests'); // Old category-based format
    
    // Check status indicators
    expect(content).toContain('✅'); // Passed status
    expect(content).toContain('❌'); // Failed status
    
    // Check detailed sections
    expect(content).toContain('## Password Visibility Toggle');
    expect(content).toContain('## User Authentication');
    expect(content).toContain('**Specification:** `.kiro/specs/password-visibility-toggle/`');
    expect(content).toContain('**Specification:** `.kiro/specs/user-authentication/`');
    
    // Check test steps are included
    expect(content).toContain('Navigate to application');
    expect(content).toContain('Click password visibility toggle');
    
    // Check screenshot references
    expect(content).toContain('assets/password-visibility-toggle/step1-navigate.png');
    expect(content).toContain('assets/password-visibility-toggle/step2-toggle.png');
  });

  it('should handle empty test results gracefully', async () => {
    await reportGenerator.updateTestsSummary([]);

    const summaryPath = join(tempDir, 'QA', 'Tests-Summary.md');
    const content = await fs.readFile(summaryPath, 'utf-8');
    
    expect(content).toContain('# Tests Summary');
    expect(content).toContain('## Future Automated Tests');
    expect(content).toContain('Available Specifications');
  });

  it('should maintain compatibility with existing QA framework structure', async () => {
    // Create existing QA structure
    await fs.mkdir(join(tempDir, 'QA', 'assets', 'password-visibility-toggle'), { recursive: true });
    await fs.mkdir(join(tempDir, 'QA', 'scripts', 'password-visibility-toggle'), { recursive: true });
    
    // Create mock screenshot files
    await fs.writeFile(join(tempDir, 'QA', 'assets', 'password-visibility-toggle', 'step1.png'), 'mock-image');
    
    const mockTestResult: TestResult = {
      specName: 'password-visibility-toggle',
      testScript: 'password-visibility-toggle-test.js',
      steps: [{
        stepId: 'step-1',
        description: 'Test step',
        status: 'Passed',
        screenshot: 'step1.png',
        executionTime: 1000,
        timestamp: new Date()
      }],
      overallStatus: 'Passed',
      executionTime: 1000,
      screenshots: ['step1.png'],
      startTime: new Date(),
      endTime: new Date()
    };

    await reportGenerator.updateTestsSummary([mockTestResult]);

    const summaryPath = join(tempDir, 'QA', 'Tests-Summary.md');
    const content = await fs.readFile(summaryPath, 'utf-8');
    
    // Check that paths reference existing QA structure
    expect(content).toContain('QA/scripts/password-visibility-toggle/');
    expect(content).toContain('assets/password-visibility-toggle/');
  });

  it('should organize multiple test results for the same spec', async () => {
    const testResults: TestResult[] = [
      {
        specName: 'password-visibility-toggle',
        testScript: 'test-1.js',
        steps: [{
          stepId: 'step-1',
          description: 'First test step',
          status: 'Passed',
          executionTime: 1000,
          timestamp: new Date()
        }],
        overallStatus: 'Passed',
        executionTime: 1000,
        screenshots: [],
        startTime: new Date(),
        endTime: new Date()
      },
      {
        specName: 'password-visibility-toggle',
        testScript: 'test-2.js',
        steps: [{
          stepId: 'step-2',
          description: 'Second test step',
          status: 'Failed',
          errorMessage: 'Element not found',
          executionTime: 500,
          timestamp: new Date()
        }],
        overallStatus: 'Failed',
        executionTime: 500,
        screenshots: [],
        startTime: new Date(),
        endTime: new Date()
      }
    ];

    await reportGenerator.updateTestsSummary(testResults);

    const summaryPath = join(tempDir, 'QA', 'Tests-Summary.md');
    const content = await fs.readFile(summaryPath, 'utf-8');
    
    // Should have one spec section with multiple tests
    expect(content).toContain('## Password Visibility Toggle');
    expect(content).toContain('**Tests:** 2');
    expect(content).toContain('**Status:** ⚠️ Mixed'); // Mixed status due to one pass, one fail
    expect(content).toContain('#### Test 1: test-1.js');
    expect(content).toContain('#### Test 2: test-2.js');
    expect(content).toContain('First test step');
    expect(content).toContain('Second test step');
    expect(content).toContain('Element not found');
  });

  it('should handle file system errors appropriately', async () => {
    // Make QA directory read-only to simulate permission error
    await fs.chmod(join(tempDir, 'QA'), 0o444);

    const mockTestResult: TestResult = {
      specName: 'test-spec',
      testScript: 'test.js',
      steps: [],
      overallStatus: 'Passed',
      executionTime: 1000,
      screenshots: [],
      startTime: new Date(),
      endTime: new Date()
    };

    await expect(reportGenerator.updateTestsSummary([mockTestResult]))
      .rejects.toThrow('Report generation failed');

    // Restore permissions for cleanup
    await fs.chmod(join(tempDir, 'QA'), 0o755);
  });
});