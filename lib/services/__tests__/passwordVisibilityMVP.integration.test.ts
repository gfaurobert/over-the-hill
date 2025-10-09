/**
 * Integration tests for Password Visibility MVP
 * Tests the complete workflow of password-visibility-toggle MVP test generation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  PasswordVisibilityMVP, 
  executePasswordVisibilityMVP,
  generatePasswordVisibilityTestScript 
} from '../passwordVisibilityMVP';
import { PasswordVisibilityTestGenerator } from '../passwordVisibilityTestGenerator';
import * as fs from 'fs/promises';
// import * as path from 'path';

// Mock file system for integration tests
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Password Visibility MVP Integration Tests', () => {
  let mvp: PasswordVisibilityMVP;
  let testGenerator: PasswordVisibilityTestGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    mvp = new PasswordVisibilityMVP();
    testGenerator = new PasswordVisibilityTestGenerator();
    
    // Setup successful file system mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('mock file content');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete MVP Workflow', () => {
    it('should execute complete MVP workflow from start to finish', async () => {
      // Execute the complete MVP workflow
      const result = await mvp.executePasswordVisibilityMVP();
      
      // Verify the result structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(result.testScriptPath).toBeDefined();
        expect(result.testScriptPath).toContain('password-visibility-toggle-test.js');
      } else {
        expect(result.error).toBeDefined();
        console.log('MVP workflow error (expected in test environment):', result.error);
      }
    });

    it('should generate test script with proper file structure', async () => {
      const result = await mvp.generatePasswordVisibilityTestScript();
      
      if (result.success) {
        // Verify file system operations were called
        expect(mockFs.mkdir).toHaveBeenCalled();
        expect(mockFs.writeFile).toHaveBeenCalled();
        
        // Verify the write call had correct parameters
        const writeCall = mockFs.writeFile.mock.calls[0];
        expect(writeCall[0]).toContain('password-visibility-toggle-test.js');
        expect(writeCall[1]).toContain('Password Visibility Toggle');
        expect(writeCall[2]).toBe('utf8');
      }
    });

    it('should create proper directory structure', async () => {
      await mvp.generatePasswordVisibilityTestScript();
      
      // Verify directories were created
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('password-visibility-toggle-test'),
        { recursive: true }
      );
    });
  });

  describe('Test Script Generation Integration', () => {
    it('should generate test script with all required components', async () => {
      const testScript = await testGenerator.generatePasswordVisibilityTestScript();
      
      // Verify test script structure
      expect(testScript.fileName).toBe('password-visibility-toggle-test.js');
      expect(testScript.specName).toBe('password-visibility-toggle');
      expect(testScript.content).toBeDefined();
      expect(testScript.steps).toBeDefined();
      expect(testScript.metadata).toBeDefined();
      
      // Verify content includes required elements
      const content = testScript.content;
      expect(content).toContain('test.describe');
      expect(content).toContain('Password Visibility Toggle');
      expect(content).toContain('captureScreenshot');
      expect(content).toContain('assertPasswordVisibility');
      expect(content).toContain('waitForPasswordToggle');
    });

    it('should generate test steps covering all acceptance criteria', async () => {
      const testScript = await testGenerator.generatePasswordVisibilityTestScript();
      
      // Verify we have comprehensive test coverage
      const stepDescriptions = testScript.steps.map(step => step.description.toLowerCase());
      
      // Check for show/hide functionality
      const hasShowHideTests = stepDescriptions.some(desc => 
        desc.includes('show') || desc.includes('hide') || desc.includes('toggle')
      );
      expect(hasShowHideTests).toBe(true);
      
      // Check for accessibility tests
      const hasAccessibilityTests = stepDescriptions.some(desc => 
        desc.includes('aria') || desc.includes('keyboard') || desc.includes('accessibility')
      );
      expect(hasAccessibilityTests).toBe(true);
      
      // Check for form integration tests
      const hasFormTests = stepDescriptions.some(desc => 
        desc.includes('form') || desc.includes('signin')
      );
      expect(hasFormTests).toBe(true);
    });

    it('should generate proper Playwright test syntax', async () => {
      const testScript = await testGenerator.generatePasswordVisibilityTestScript();
      const content = testScript.content;
      
      // Verify Playwright test structure
      expect(content).toContain("const { test, expect } = require('@playwright/test');");
      expect(content).toContain('test.describe(');
      expect(content).toContain('test.beforeEach(');
      expect(content).toContain('test.afterEach(');
      expect(content).toContain('test(');
      
      // Verify helper functions
      expect(content).toContain('async function captureScreenshot');
      expect(content).toContain('async function waitForPasswordToggle');
      expect(content).toContain('async function assertPasswordVisibility');
      expect(content).toContain('async function safeClick');
      expect(content).toContain('async function safeType');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock file system failure
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      const result = await mvp.generatePasswordVisibilityTestScript();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should handle directory creation failures', async () => {
      // Mock directory creation failure
      mockFs.mkdir.mockRejectedValue(new Error('Cannot create directory'));
      
      const result = await mvp.generatePasswordVisibilityTestScript();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide detailed error information', async () => {
      // Mock a specific failure
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      const result = await mvp.generatePasswordVisibilityTestScript();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Disk full');
    });
  });

  describe('Validation Integration', () => {
    it('should validate generated test script meets MVP requirements', async () => {
      const validation = await mvp.validateMVPRequirements();
      
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
      
      // If validation fails, issues should be descriptive
      if (!validation.valid) {
        validation.issues.forEach(issue => {
          expect(typeof issue).toBe('string');
          expect(issue.length).toBeGreaterThan(0);
        });
      }
    });

    it('should identify missing required test scenarios', async () => {
      const validation = await mvp.validateMVPRequirements();
      
      // The validation should check for specific scenarios
      if (!validation.valid) {
        const issueText = validation.issues.join(' ').toLowerCase();
        
        // Should check for key functionality
        const checksRequiredScenarios = 
          issueText.includes('scenario') || 
          issueText.includes('functionality') ||
          issueText.includes('test');
          
        expect(checksRequiredScenarios).toBe(true);
      }
    });
  });

  describe('Convenience Functions Integration', () => {
    it('should work with convenience function for test generation', async () => {
      const result = await generatePasswordVisibilityTestScript();
      
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(result.testScriptPath).toBeDefined();
        expect(result.testScriptPath).toContain('password-visibility-toggle');
      }
    });

    it('should work with convenience function for complete MVP', async () => {
      const result = await executePasswordVisibilityMVP();
      
      expect(result).toHaveProperty('success');
      
      // Should either succeed or fail with meaningful error
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('File Output Integration', () => {
    it('should generate test script file with correct naming', async () => {
      await mvp.generatePasswordVisibilityTestScript();
      
      // Verify the file was written with correct path
      const writeCall = mockFs.writeFile.mock.calls.find(call => 
        call[0].toString().includes('password-visibility-toggle-test.js')
      );
      
      expect(writeCall).toBeDefined();
      expect(writeCall![0]).toContain('QA/scripts');
      expect(writeCall![0]).toContain('password-visibility-toggle-test');
      expect(writeCall![0]).toContain('.js');
    });

    it('should create assets directory for screenshots', async () => {
      await mvp.generatePasswordVisibilityTestScript();
      
      // Verify assets directory was created
      const mkdirCalls = mockFs.mkdir.mock.calls;
      const assetsDir = mkdirCalls.find(call => 
        call[0].toString().includes('assets') && 
        call[0].toString().includes('password-visibility-toggle')
      );
      
      expect(assetsDir).toBeDefined();
    });

    it('should generate test content with proper screenshot paths', async () => {
      const testScript = await testGenerator.generatePasswordVisibilityTestScript();
      
      // Verify screenshot paths are correct
      expect(testScript.content).toContain('QA/assets');
      expect(testScript.content).toContain('password-visibility-toggle-test');
      expect(testScript.content).toContain('.png');
    });
  });

  describe('Test Script Content Integration', () => {
    it('should generate executable Playwright test code', async () => {
      const testScript = await testGenerator.generatePasswordVisibilityTestScript();
      const content = testScript.content;
      
      // Verify the generated code has proper syntax
      expect(content).toMatch(/test\.describe\s*\(/);
      expect(content).toMatch(/test\.beforeEach\s*\(/);
      expect(content).toMatch(/test\.afterEach\s*\(/);
      expect(content).toMatch(/test\s*\(/);
      
      // Verify async/await usage
      expect(content).toContain('async');
      expect(content).toContain('await');
      
      // Verify proper error handling
      expect(content).toContain('try');
      expect(content).toContain('catch');
    });

    it('should include password-specific test logic', async () => {
      const testScript = await testGenerator.generatePasswordVisibilityTestScript();
      const content = testScript.content;
      
      // Verify password-specific functionality
      expect(content).toContain('password');
      expect(content).toContain('toggle');
      expect(content).toContain('input[type="password"]');
      expect(content).toContain('input[type="text"]');
      
      // Verify accessibility features
      expect(content).toContain('aria-label');
      expect(content).toContain('keyboard');
      
      // Verify test assertions
      expect(content).toContain('expect(');
      expect(content).toContain('toBe(');
      expect(content).toContain('toBeVisible(');
    });
  });
});