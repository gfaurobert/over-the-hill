/**
 * Tests for ScreenshotManager
 */

import { ScreenshotManager } from '../screenshotManager';
import { MCPPlaywrightIntegration } from '../mcpPlaywrightIntegration';

// Mock the MCP service
const mockMCPService: MCPPlaywrightIntegration = {
  navigate: jest.fn(),
  click: jest.fn(),
  type: jest.fn(),
  takeScreenshot: jest.fn(),
  snapshot: jest.fn(),
  waitFor: jest.fn(),
  elementExists: jest.fn(),
  evaluate: jest.fn()
};

describe('ScreenshotManager', () => {
  let screenshotManager: ScreenshotManager;

  beforeEach(() => {
    screenshotManager = new ScreenshotManager(mockMCPService);
    jest.clearAllMocks();
  });

  describe('filename generation', () => {
    it('should generate safe screenshot filenames', () => {
      const specName = 'test-spec';
      const stepId = 'step-1';
      const timestamp = '2023-01-01T00-00-00-000Z';
      
      // Access private method through type assertion for testing
      const manager = screenshotManager as any;
      const filename = manager.generateScreenshotFilename(specName, stepId, timestamp);
      
      expect(filename).toBe('test-spec-step-step-1-2023-01-01T00-00-00-000Z.png');
    });

    it('should sanitize special characters in filenames', () => {
      const specName = 'complex-spec!@#';
      const stepId = 'step with spaces & symbols!';
      const timestamp = '2023-01-01T00-00-00-000Z';
      
      const manager = screenshotManager as any;
      const filename = manager.generateScreenshotFilename(specName, stepId, timestamp);
      
      expect(filename).toBe('complex-spec----step-step-with-spaces---symbols--2023-01-01T00-00-00-000Z.png');
      expect(filename).not.toContain('!@# &');
    });

    it('should generate error screenshot filenames', () => {
      const specName = 'error-test';
      const stepId = 'failing-step';
      const timestamp = '2023-01-01T00-00-00-000Z';
      
      const manager = screenshotManager as any;
      const filename = manager.generateErrorScreenshotFilename(specName, stepId, timestamp);
      
      expect(filename).toBe('error-test-error-failing-step-2023-01-01T00-00-00-000Z.png');
    });
  });

  describe('MCP integration', () => {
    it('should call MCP service for screenshot capture', async () => {
      const stepId = 'test-step';
      const specName = 'test-spec';
      
      // Mock successful MCP call
      (mockMCPService.takeScreenshot as jest.Mock).mockResolvedValue(undefined);

      // We can't easily test the full flow without mocking fs, but we can test the MCP integration
      try {
        await screenshotManager.captureScreenshot(stepId, specName);
      } catch (error) {
        // Expected to fail due to fs operations, but MCP should be called
      }

      expect(mockMCPService.takeScreenshot).toHaveBeenCalled();
    });

    it('should handle MCP service errors', async () => {
      const stepId = 'error-step';
      const specName = 'test-spec';
      
      (mockMCPService.takeScreenshot as jest.Mock).mockRejectedValue(new Error('MCP Screenshot failed'));

      await expect(screenshotManager.captureScreenshot(stepId, specName))
        .rejects.toThrow('Failed to capture screenshot for step error-step');
    });
  });

  describe('screenshot options', () => {
    it('should use default options when none provided', () => {
      const manager = new ScreenshotManager(mockMCPService);
      const defaultOptions = (manager as any).defaultOptions;
      
      expect(defaultOptions.fullPage).toBe(false);
      expect(defaultOptions.quality).toBe(90);
      expect(defaultOptions.format).toBe('png');
      expect(defaultOptions.maxWidth).toBe(1920);
      expect(defaultOptions.maxHeight).toBe(1080);
    });

    it('should merge custom options with defaults', () => {
      const customOptions = {
        fullPage: true,
        quality: 80,
        format: 'jpeg' as const
      };
      
      const manager = new ScreenshotManager(mockMCPService, customOptions);
      const mergedOptions = (manager as any).defaultOptions;
      
      expect(mergedOptions.fullPage).toBe(true);
      expect(mergedOptions.quality).toBe(80);
      expect(mergedOptions.format).toBe('jpeg');
      expect(mergedOptions.maxWidth).toBe(1920); // Should keep default
    });
  });
});