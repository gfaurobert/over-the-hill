/**
 * Integration tests for PlaywrightTestRunner
 * Tests the complete flow with real-like scenarios
 */

import { PlaywrightTestRunner } from '../playwrightTestRunner';
import { TestScript, TestStep } from '../../types/qaTypes';
import { QA_CONFIG } from '../../config/qaConfig';
import fs from 'fs/promises';
import path from 'path';

// Mock fs operations
const mockMkdir = jest.fn().mockResolvedValue(undefined);
jest.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('mock file content'),
  access: jest.fn().mockResolvedValue(undefined)
}));

// Mock the MCP service
jest.mock('../mcpPlaywrightIntegration', () => ({
  createMCPPlaywrightService: () => ({
    navigate: jest.fn().mockImplementation((url: string) => {
      if (url.includes('invalid-url-that-does-not-exist')) {
        return Promise.reject(new Error('Navigation failed: net::ERR_NAME_NOT_RESOLVED'));
      }
      return Promise.resolve();
    }),
    click: jest.fn().mockImplementation((selector: string) => {
      if (selector === '#this-element-does-not-exist') {
        return Promise.reject(new Error('Element not found'));
      }
      return Promise.resolve();
    }),
    type: jest.fn().mockResolvedValue(undefined),
    takeScreenshot: jest.fn().mockResolvedValue(undefined),
    snapshot: jest.fn().mockResolvedValue({ snapshot: 'mock-snapshot-data' }),
    waitFor: jest.fn().mockResolvedValue(undefined),
    elementExists: jest.fn().mockImplementation((selector: string) => {
      if (selector === '#this-element-does-not-exist') {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    }),
    evaluate: jest.fn().mockResolvedValue({ result: 'mock-evaluation-result' })
  })
}));

describe('PlaywrightTestRunner Integration', () => {
  let testRunner: PlaywrightTestRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    testRunner = new PlaywrightTestRunner({
      baseUrl: 'http://localhost:3001',
      testTimeout: 5000,
      maxRetries: 1 // Reduce retries for faster tests
    });
  });

  describe('Password Visibility Toggle Test Scenario', () => {
    it('should execute password visibility toggle test script', async () => {
      const passwordToggleScript: TestScript = {
        fileName: 'password-visibility-toggle-test.js',
        content: 'Generated test script content',
        specName: 'password-visibility-toggle',
        steps: [
          {
            id: 'navigate-to-login',
            description: 'Navigate to login page',
            action: {
              type: 'navigate',
              value: 'http://localhost:3001/login'
            },
            expectedResult: 'Login page loads',
            screenshotName: 'login-page.png',
            category: 'navigation'
          },
          {
            id: 'find-password-field',
            description: 'Locate password input field',
            action: {
              type: 'assert',
              selector: 'input[type="password"]'
            },
            expectedResult: 'Password field is visible',
            screenshotName: 'password-field.png',
            category: 'ui-interaction'
          },
          {
            id: 'find-toggle-button',
            description: 'Locate password visibility toggle button',
            action: {
              type: 'assert',
              selector: '[data-testid="password-toggle"]'
            },
            expectedResult: 'Toggle button is visible',
            screenshotName: 'toggle-button.png',
            category: 'ui-interaction'
          },
          {
            id: 'enter-password',
            description: 'Enter password in field',
            action: {
              type: 'type',
              selector: 'input[type="password"]',
              value: 'testpassword123'
            },
            expectedResult: 'Password is entered and masked',
            screenshotName: 'password-entered.png',
            category: 'form-validation'
          },
          {
            id: 'click-toggle-show',
            description: 'Click toggle to show password',
            action: {
              type: 'click',
              selector: '[data-testid="password-toggle"]'
            },
            expectedResult: 'Password becomes visible',
            screenshotName: 'password-visible.png',
            category: 'ui-interaction'
          },
          {
            id: 'verify-password-visible',
            description: 'Verify password field type changed to text',
            action: {
              type: 'assert',
              selector: 'input[type="text"]'
            },
            expectedResult: 'Password field type is now text',
            screenshotName: 'password-text-field.png',
            category: 'form-validation'
          },
          {
            id: 'click-toggle-hide',
            description: 'Click toggle to hide password',
            action: {
              type: 'click',
              selector: '[data-testid="password-toggle"]'
            },
            expectedResult: 'Password becomes hidden',
            screenshotName: 'password-hidden.png',
            category: 'ui-interaction'
          },
          {
            id: 'verify-password-hidden',
            description: 'Verify password field type changed back to password',
            action: {
              type: 'assert',
              selector: 'input[type="password"]'
            },
            expectedResult: 'Password field type is back to password',
            screenshotName: 'password-field-final.png',
            category: 'form-validation'
          }
        ],
        metadata: {
          specName: 'password-visibility-toggle',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 8,
          estimatedDuration: 15000
        }
      };

      const result = await testRunner.executeTest(passwordToggleScript, 'password-visibility-toggle');

      // Verify test execution results
      expect(result.specName).toBe('password-visibility-toggle');
      expect(result.testScript).toBe('password-visibility-toggle-test.js');
      expect(result.steps).toHaveLength(8);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);

      // Verify all steps were executed
      const stepIds = result.steps.map(step => step.stepId);
      expect(stepIds).toContain('navigate-to-login');
      expect(stepIds).toContain('find-password-field');
      expect(stepIds).toContain('click-toggle-show');
      expect(stepIds).toContain('verify-password-visible');

      // Verify screenshots were captured
      expect(result.screenshots.length).toBeGreaterThan(0);
    }, 15000); // 15 second timeout
  });

  describe('Error Handling Scenarios', () => {
    it('should handle network failures gracefully', async () => {
      const networkFailureScript: TestScript = {
        fileName: 'network-failure-test.js',
        content: 'Test script with network issues',
        specName: 'network-failure',
        steps: [
          {
            id: 'navigate-invalid-url',
            description: 'Navigate to invalid URL',
            action: {
              type: 'navigate',
              value: 'http://invalid-url-that-does-not-exist.com'
            },
            expectedResult: 'Page should load',
            screenshotName: 'invalid-navigation.png',
            category: 'navigation'
          }
        ],
        metadata: {
          specName: 'network-failure',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 5000
        }
      };

      const result = await testRunner.executeTest(networkFailureScript, 'network-failure');

      // Should complete execution even with failures
      expect(result.specName).toBe('network-failure');
      expect(result.steps).toHaveLength(1);
      
      // Should capture error details
      if (result.overallStatus === 'Failed') {
        expect(result.errorSummary).toBeDefined();
        expect(result.screenshots.length).toBeGreaterThan(0); // Error screenshot
      }
    });

    it('should handle missing elements with retries', async () => {
      const missingElementScript: TestScript = {
        fileName: 'missing-element-test.js',
        content: 'Test script with missing elements',
        specName: 'missing-element',
        steps: [
          {
            id: 'navigate-to-page',
            description: 'Navigate to test page',
            action: {
              type: 'navigate',
              value: 'http://localhost:3001'
            },
            expectedResult: 'Page loads',
            screenshotName: 'page-loaded.png',
            category: 'navigation'
          },
          {
            id: 'click-missing-element',
            description: 'Try to click non-existent element',
            action: {
              type: 'click',
              selector: '#this-element-does-not-exist'
            },
            expectedResult: 'Element should be clicked',
            screenshotName: 'missing-element.png',
            category: 'ui-interaction'
          }
        ],
        metadata: {
          specName: 'missing-element',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 2,
          estimatedDuration: 8000
        }
      };

      const result = await testRunner.executeTest(missingElementScript, 'missing-element');

      expect(result.specName).toBe('missing-element');
      expect(result.steps).toHaveLength(2);
      
      // First step (navigation) should pass
      expect(result.steps[0].status).toBe('Passed');
      
      // Second step (missing element) should fail after retries
      expect(result.steps[1].status).toBe('Failed');
      expect(result.steps[1].errorMessage).toContain('retries');
    });
  });

  describe('Screenshot Management', () => {
    it('should create proper directory structure for screenshots', async () => {
      const screenshotPath = await testRunner.captureScreenshot('test-step', 'test-spec');
      
      // Verify the screenshot path follows the expected pattern
      expect(screenshotPath).toContain('QA/assets/test-spec-test');
      expect(screenshotPath).toContain('test-spec-test-step.png');
      expect(screenshotPath).toMatch(/QA\/assets\/test-spec-test\/test-spec-test-step\.png$/);
    });

    it('should generate unique screenshot names', async () => {
      const screenshot1 = await testRunner.captureScreenshot('step1', 'spec1');
      const screenshot2 = await testRunner.captureScreenshot('step2', 'spec1');
      const screenshot3 = await testRunner.captureScreenshot('step1', 'spec2');

      expect(screenshot1).toContain('spec1-step1.png');
      expect(screenshot2).toContain('spec1-step2.png');
      expect(screenshot3).toContain('spec2-step1.png');
    });
  });

  describe('Performance and Timing', () => {
    it('should track execution time accurately', async () => {
      const timedScript: TestScript = {
        fileName: 'timed-test.js',
        content: 'Timed test script',
        specName: 'timed-test',
        steps: [
          {
            id: 'wait-step',
            description: 'Wait for specific time',
            action: {
              type: 'wait',
              value: '1000' // 1 second wait
            },
            expectedResult: 'Wait completes',
            screenshotName: 'wait-complete.png',
            category: 'navigation'
          }
        ],
        metadata: {
          specName: 'timed-test',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 2000
        }
      };

      const startTime = Date.now();
      const result = await testRunner.executeTest(timedScript, 'timed-test');
      const endTime = Date.now();

      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(endTime - startTime + 1000); // Allow some margin
      expect(result.steps[0].executionTime).toBeGreaterThan(0);
    });
  });

  describe('Browser Lifecycle', () => {
    it('should handle browser setup and teardown', async () => {
      await testRunner.setupBrowser();
      
      // Should be able to execute tests after setup
      const simpleScript: TestScript = {
        fileName: 'simple-test.js',
        content: 'Simple test',
        specName: 'simple',
        steps: [
          {
            id: 'navigate',
            description: 'Navigate to page',
            action: { type: 'navigate', value: 'http://localhost:3001' },
            expectedResult: 'Page loads',
            screenshotName: 'page.png',
            category: 'navigation'
          }
        ],
        metadata: {
          specName: 'simple',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 2000
        }
      };

      const result = await testRunner.executeTest(simpleScript, 'simple');
      expect(result.overallStatus).toBe('Passed');

      await testRunner.teardownBrowser();
    });
  });
});