/**
 * Unit tests for ReportGenerator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import ReportGenerator from '../reportGenerator';
import { TestResult, StepResult, SpecSection } from '../../types/qaTypes';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn()
  }
}));

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let mockTestResults: TestResult[];

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
    
    // Create mock test results
    const mockStepResult: StepResult = {
      stepId: 'step-1',
      description: 'Navigate to login page',
      status: 'Passed',
      screenshot: 'step1-navigate.png',
      executionTime: 1500,
      timestamp: new Date('2024-01-01T10:00:00Z')
    };

    const mockTestResult: TestResult = {
      specName: 'password-visibility-toggle',
      testScript: 'password-visibility-toggle-test.js',
      steps: [mockStepResult],
      overallStatus: 'Passed',
      executionTime: 5000,
      screenshots: ['step1-navigate.png'],
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T10:00:05Z')
    };

    mockTestResults = [mockTestResult];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('organizeBySpecs', () => {
    it('should organize test results by specification name', () => {
      const result1: TestResult = {
        ...mockTestResults[0],
        specName: 'spec-a'
      };
      
      const result2: TestResult = {
        ...mockTestResults[0],
        specName: 'spec-b'
      };
      
      const result3: TestResult = {
        ...mockTestResults[0],
        specName: 'spec-a'
      };

      const results = [result1, result2, result3];
      const organized = reportGenerator.organizeBySpecs(results);

      expect(organized).toHaveLength(2);
      expect(organized[0].specName).toBe('spec-a');
      expect(organized[0].testResults).toHaveLength(2);
      expect(organized[1].specName).toBe('spec-b');
      expect(organized[1].testResults).toHaveLength(1);
    });

    it('should calculate correct overall status for mixed results', () => {
      const passedResult: TestResult = {
        ...mockTestResults[0],
        specName: 'test-spec',
        overallStatus: 'Passed'
      };
      
      const failedResult: TestResult = {
        ...mockTestResults[0],
        specName: 'test-spec',
        overallStatus: 'Failed'
      };

      const results = [passedResult, failedResult];
      const organized = reportGenerator.organizeBySpecs(results);

      expect(organized[0].overallStatus).toBe('Mixed');
    });

    it('should calculate screenshot count correctly', () => {
      const result1: TestResult = {
        ...mockTestResults[0],
        screenshots: ['shot1.png', 'shot2.png']
      };
      
      const result2: TestResult = {
        ...mockTestResults[0],
        screenshots: ['shot3.png']
      };

      const results = [result1, result2];
      const organized = reportGenerator.organizeBySpecs(results);

      expect(organized[0].screenshotCount).toBe(3);
    });
  });

  describe('generateSpecSection', () => {
    it('should generate correct markdown section for a test result', () => {
      const section = reportGenerator.generateSpecSection(mockTestResults[0]);

      expect(section).toContain('### Password Visibility Toggle');
      expect(section).toContain('#### Description');
      expect(section).toContain('#### Script');
      expect(section).toContain('#### Steps');
      expect(section).toContain('QA/scripts/password-visibility-toggle/');
      expect(section).toContain('Navigate to login page');
      expect(section).toContain('Passed');
    });

    it('should handle test results without screenshots', () => {
      const resultWithoutScreenshot: TestResult = {
        ...mockTestResults[0],
        steps: [{
          ...mockTestResults[0].steps[0],
          screenshot: undefined
        }]
      };

      const section = reportGenerator.generateSpecSection(resultWithoutScreenshot);
      expect(section).toContain('No screenshot');
    });

    it('should handle failed test steps', () => {
      const failedResult: TestResult = {
        ...mockTestResults[0],
        steps: [{
          ...mockTestResults[0].steps[0],
          status: 'Failed',
          errorMessage: 'Element not found'
        }]
      };

      const section = reportGenerator.generateSpecSection(failedResult);
      expect(section).toContain('Failed');
      expect(section).toContain('Element not found');
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate complete markdown report with spec sections', () => {
      const specSections: SpecSection[] = [{
        specName: 'password-visibility-toggle',
        description: 'Test password visibility toggle functionality',
        testResults: mockTestResults,
        overallStatus: 'Passed',
        lastExecuted: new Date('2024-01-01T10:00:00Z'),
        screenshotCount: 1,
        executionTime: 5000
      }];

      const reportData = {
        generatedAt: new Date('2024-01-01T10:00:00Z'),
        summary: {
          totalSpecs: 1,
          totalTests: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          executionTime: 5000,
          screenshotsCaptured: 1
        },
        specSections,
        errors: []
      };

      const markdown = reportGenerator.generateMarkdownReport(reportData);

      expect(markdown).toContain('# Tests Summary');
      expect(markdown).toContain('## Specification Tests Overview');
      expect(markdown).toContain('Password Visibility Toggle');
      expect(markdown).toContain('✅');
      expect(markdown).toContain('## Password Visibility Toggle');
      expect(markdown).toContain('**Specification:** `.kiro/specs/password-visibility-toggle/`');
    });

    it('should generate future tests section when no specs are available', () => {
      const reportData = {
        generatedAt: new Date(),
        summary: {
          totalSpecs: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          executionTime: 0,
          screenshotsCaptured: 0
        },
        specSections: [],
        errors: []
      };

      const markdown = reportGenerator.generateMarkdownReport(reportData);
      expect(markdown).toContain('## Future Automated Tests');
      expect(markdown).toContain('Available Specifications');
    });
  });

  describe('updateTestsSummary', () => {
    it('should write markdown content to Tests-Summary.md', async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);

      await reportGenerator.updateTestsSummary(mockTestResults);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('QA'),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('Tests-Summary.md'),
        expect.stringContaining('# Tests Summary'),
        'utf-8'
      );
    });

    it('should handle file system errors gracefully', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      await expect(reportGenerator.updateTestsSummary(mockTestResults))
        .rejects.toThrow('Report generation failed: Permission denied');
    });
  });

  describe('helper methods', () => {
    it('should format spec names correctly', () => {
      const testResult: TestResult = {
        ...mockTestResults[0],
        specName: 'user-authentication-system'
      };

      const section = reportGenerator.generateSpecSection(testResult);
      expect(section).toContain('### User Authentication System');
    });

    it('should generate correct status icons', () => {
      const passedSection: SpecSection = {
        specName: 'test-spec',
        description: 'Test description',
        testResults: [],
        overallStatus: 'Passed',
        lastExecuted: new Date(),
        screenshotCount: 0,
        executionTime: 0
      };

      const reportData = {
        generatedAt: new Date(),
        summary: {
          totalSpecs: 1,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          executionTime: 0,
          screenshotsCaptured: 0
        },
        specSections: [passedSection],
        errors: []
      };

      const markdown = reportGenerator.generateMarkdownReport(reportData);
      expect(markdown).toContain('✅');
    });
  });
});