/**
 * Unit tests for PlaywrightTestRunner
 */

import { PlaywrightTestRunner } from '../playwrightTestRunner';
import { MCPPlaywrightIntegration } from '../mcpPlaywrightIntegration';
import { TestScript, TestStep, PlaywrightAction } from '../../types/qaTypes';
import { QA_CONFIG } from '../../config/qaConfig';

// Mock the MCP service
const mockMCPService: jest.Mocked<MCPPlaywrightIntegration> = {
  navigate: jest.fn(),
  click: jest.fn(),
  type: jest.fn(),
  takeScreenshot: jest.fn(),
  snapshot: jest.fn(),
  waitFor: jest.fn(),
  elementExists: jest.fn(),
  evaluate: jest.fn()
};

// Mock the MCP service factory
jest.mock('../mcpPlaywrightIntegration', () => ({
  createMCPPlaywrightService: () => mockMCPService
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined)
}));

describe('PlaywrightTestRunner', () => {
  let testRunner: PlaywrightTestRunner;
  
  beforeEach(() => {
    jest.clearAllMocks();
    testRunner = new PlaywrightTestRunner();
    
    // Setup default mock responses
    mockMCPService.navigate.mockResolvedValue(undefined);
    mockMCPService.click.mockResolvedValue(undefined);
    mockMCPService.type.mockResolvedValue(undefined);
    mockMCPService.takeScreenshot.mockResolvedValue(undefined);
    mockMCPService.snapshot.mockResolvedValue({ snapshot: 'test' });
    mockMCPService.waitFor.mockResolvedValue(undefined);
    mockMCPService.elementExists.mockResolvedValue(true);
    mockMCPService.evaluate.mockResolvedValue({ result: 'test' });
  });

  describe('executeTest', () => {
    it('should execute a complete test script successfully', async () => {
      const testScript: TestScript = {
        fileName: 'test-script.js',
        content: 'test content',
        specName: 'test-spec',
        steps: [
          {
            id: 'step1',
            description: 'Navigate to page',
            action: { type: 'navigate', value: 'http://localhost:3001' },
            expectedResult: 'Page loads',
            screenshotName: 'step1.png',
            category: 'navigation'
          },
          {
            id: 'step2',
            description: 'Click button',
            action: { type: 'click', selector: '#test-button' },
            expectedResult: 'Button clicked',
            screenshotName: 'step2.png',
            category: 'ui-interaction'
          }
        ],
        metadata: {
          specName: 'test-spec',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 2,
          estimatedDuration: 5000
        }
      };

      const result = await testRunner.executeTest(testScript, 'test-spec');

      expect(result.specName).toBe('test-spec');
      expect(result.testScript).toBe('test-script.js');
      expect(result.overallStatus).toBe('Passed');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].status).toBe('Passed');
      expect(result.steps[1].status).toBe('Passed');
      
      // Verify MCP calls
      expect(mockMCPService.navigate).toHaveBeenCalledWith('http://localhost:3001');
      expect(mockMCPService.navigate).toHaveBeenCalledWith('http://localhost:3001'); // Base URL navigation
      expect(mockMCPService.click).toHaveBeenCalledWith('#test-button', undefined);
      expect(mockMCPService.takeScreenshot).toHaveBeenCalledTimes(2);
    });

    it('should handle test step failures with retries', async () => {
      const testScript: TestScript = {
        fileName: 'failing-test.js',
        content: 'test content',
        specName: 'failing-spec',
        steps: [
          {
            id: 'failing-step',
            description: 'Click non-existent button',
            action: { type: 'click', selector: '#non-existent' },
            expectedResult: 'Button clicked',
            screenshotName: 'failing-step.png',
            category: 'ui-interaction'
          }
        ],
        metadata: {
          specName: 'failing-spec',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 2000
        }
      };

      // Make click fail
      mockMCPService.click.mockRejectedValue(new Error('Element not found'));

      const result = await testRunner.executeTest(testScript, 'failing-spec');

      expect(result.overallStatus).toBe('Failed');
      expect(result.steps[0].status).toBe('Failed');
      expect(result.steps[0].errorMessage).toContain('Failed after 2 retries');
      
      // Should retry according to maxRetries (2) + initial attempt = 3 total calls
      expect(mockMCPService.click).toHaveBeenCalledTimes(3);
    });

    it('should capture screenshots on both success and failure', async () => {
      const testScript: TestScript = {
        fileName: 'screenshot-test.js',
        content: 'test content',
        specName: 'screenshot-spec',
        steps: [
          {
            id: 'success-step',
            description: 'Successful step',
            action: { type: 'navigate', value: 'http://localhost:3001' },
            expectedResult: 'Navigation successful',
            screenshotName: 'success.png',
            category: 'navigation'
          }
        ],
        metadata: {
          specName: 'screenshot-spec',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 1000
        }
      };

      const result = await testRunner.executeTest(testScript, 'screenshot-spec');

      expect(result.screenshots).toHaveLength(1);
      expect(mockMCPService.takeScreenshot).toHaveBeenCalled();
    });
  });

  describe('captureScreenshot', () => {
    it('should generate correct screenshot path and filename', async () => {
      const screenshotPath = await testRunner.captureScreenshot('test-step', 'test-spec');
      
      expect(screenshotPath).toContain('test-spec-test');
      expect(screenshotPath).toContain('test-spec-test-step.png');
      expect(mockMCPService.takeScreenshot).toHaveBeenCalled();
    });

    it('should handle screenshot failures gracefully', async () => {
      mockMCPService.takeScreenshot.mockRejectedValue(new Error('Screenshot failed'));
      
      const screenshotPath = await testRunner.captureScreenshot('test-step', 'test-spec');
      
      expect(screenshotPath).toBe('');
    });
  });

  describe('validateResult', () => {
    it('should validate element existence', async () => {
      const testStep: TestStep = {
        id: 'test-step',
        description: 'Test step',
        action: { type: 'click', selector: '#test-element' },
        expectedResult: 'Element exists',
        screenshotName: 'test.png',
        category: 'ui-interaction'
      };

      mockMCPService.elementExists.mockResolvedValue(true);
      
      const isValid = await testRunner.validateResult(testStep);
      
      expect(isValid).toBe(true);
      expect(mockMCPService.elementExists).toHaveBeenCalledWith('#test-element');
    });

    it('should return false when element does not exist', async () => {
      const testStep: TestStep = {
        id: 'test-step',
        description: 'Test step',
        action: { type: 'click', selector: '#missing-element' },
        expectedResult: 'Element exists',
        screenshotName: 'test.png',
        category: 'ui-interaction'
      };

      mockMCPService.elementExists.mockResolvedValue(false);
      
      const isValid = await testRunner.validateResult(testStep);
      
      expect(isValid).toBe(false);
    });
  });

  describe('setupBrowser', () => {
    it('should initialize browser successfully', async () => {
      await testRunner.setupBrowser();
      
      expect(mockMCPService.snapshot).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await testRunner.setupBrowser();
      await testRunner.setupBrowser();
      
      // Should only be called once
      expect(mockMCPService.snapshot).toHaveBeenCalledTimes(1);
    });

    it('should handle browser setup failures', async () => {
      mockMCPService.snapshot.mockRejectedValue(new Error('Browser setup failed'));
      
      await expect(testRunner.setupBrowser()).rejects.toThrow('Failed to setup browser');
    });
  });

  describe('teardownBrowser', () => {
    it('should teardown browser gracefully', async () => {
      await testRunner.setupBrowser();
      await testRunner.teardownBrowser();
      
      // Should be able to setup again after teardown
      await testRunner.setupBrowser();
      expect(mockMCPService.snapshot).toHaveBeenCalledTimes(2);
    });
  });

  describe('action execution', () => {
    it('should execute navigate action', async () => {
      const action: PlaywrightAction = {
        type: 'navigate',
        value: 'http://example.com'
      };

      const testStep: TestStep = {
        id: 'nav-step',
        description: 'Navigate to example',
        action,
        expectedResult: 'Page loads',
        screenshotName: 'nav.png',
        category: 'navigation'
      };

      const testScript: TestScript = {
        fileName: 'nav-test.js',
        content: 'test',
        specName: 'nav-spec',
        steps: [testStep],
        metadata: {
          specName: 'nav-spec',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 1000
        }
      };

      await testRunner.executeTest(testScript, 'nav-spec');
      
      expect(mockMCPService.navigate).toHaveBeenCalledWith('http://example.com');
    });

    it('should execute type action', async () => {
      const action: PlaywrightAction = {
        type: 'type',
        selector: '#input-field',
        value: 'test input'
      };

      const testStep: TestStep = {
        id: 'type-step',
        description: 'Type in input',
        action,
        expectedResult: 'Text entered',
        screenshotName: 'type.png',
        category: 'form-validation'
      };

      const testScript: TestScript = {
        fileName: 'type-test.js',
        content: 'test',
        specName: 'type-spec',
        steps: [testStep],
        metadata: {
          specName: 'type-spec',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 1000
        }
      };

      await testRunner.executeTest(testScript, 'type-spec');
      
      expect(mockMCPService.type).toHaveBeenCalledWith('#input-field', 'test input', undefined);
    });

    it('should handle wait actions', async () => {
      const waitTimeAction: PlaywrightAction = {
        type: 'wait',
        value: '1000'
      };

      const testStep: TestStep = {
        id: 'wait-step',
        description: 'Wait for time',
        action: waitTimeAction,
        expectedResult: 'Wait completed',
        screenshotName: 'wait.png',
        category: 'navigation'
      };

      const testScript: TestScript = {
        fileName: 'wait-test.js',
        content: 'test',
        specName: 'wait-spec',
        steps: [testStep],
        metadata: {
          specName: 'wait-spec',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 2000
        }
      };

      const result = await testRunner.executeTest(testScript, 'wait-spec');
      
      // For time-based waits, the implementation uses internal delay, not MCP service
      expect(result.steps[0].status).toBe('Passed');
      expect(result.steps[0].executionTime).toBeGreaterThan(0);
    });

    it('should handle wait for element actions', async () => {
      const waitElementAction: PlaywrightAction = {
        type: 'wait',
        selector: '#loading-element'
      };

      const testStep: TestStep = {
        id: 'wait-element-step',
        description: 'Wait for element to appear',
        action: waitElementAction,
        expectedResult: 'Element appears',
        screenshotName: 'element-wait.png',
        category: 'navigation'
      };

      const testScript: TestScript = {
        fileName: 'wait-element-test.js',
        content: 'test',
        specName: 'wait-element-spec',
        steps: [testStep],
        metadata: {
          specName: 'wait-element-spec',
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 2000
        }
      };

      await testRunner.executeTest(testScript, 'wait-element-spec');
      
      // For element-based waits, the implementation uses MCP service
      expect(mockMCPService.waitFor).toHaveBeenCalledWith({ time: 30000 }); // Default timeout
    });
  });
});