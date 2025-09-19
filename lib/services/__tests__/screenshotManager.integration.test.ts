/**
 * Integration tests for ScreenshotManager with PlaywrightTestRunner
 */

import { PlaywrightTestRunner } from '../playwrightTestRunner';
import { TestScript, TestStep, PlaywrightAction } from '../../types/qaTypes';
import fs from 'fs/promises';
import path from 'path';

// Mock fs operations for integration test
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ScreenshotManager Integration', () => {
  let testRunner: PlaywrightTestRunner;

  beforeEach(() => {
    testRunner = new PlaywrightTestRunner({
      baseUrl: 'http://localhost:3001',
      testTimeout: 5000,
      maxRetries: 1
    });
    jest.clearAllMocks();
  });

  describe('Screenshot capture during test execution', () => {
    it('should capture screenshots for each test step', async () => {
      const specName = 'password-visibility-toggle';
      
      // Mock file system operations
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({ screenshots: [] }));

      const testScript: TestScript = {
        fileName: 'password-visibility-toggle-test.js',
        content: '// Test content',
        specName,
        steps: [
          {
            id: 'navigate-to-login',
            description: 'Navigate to login page',
            action: {
              type: 'navigate',
              value: 'http://localhost:3001/login'
            } as PlaywrightAction,
            expectedResult: 'Login page loads',
            screenshotName: 'navigate-to-login.png',
            category: 'navigation'
          },
          {
            id: 'click-password-toggle',
            description: 'Click password visibility toggle',
            action: {
              type: 'click',
              selector: '[data-testid="password-toggle"]'
            } as PlaywrightAction,
            expectedResult: 'Password becomes visible',
            screenshotName: 'click-password-toggle.png',
            category: 'ui-interaction'
          }
        ],
        metadata: {
          specName,
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 2,
          estimatedDuration: 10000
        }
      };

      const result = await testRunner.executeTest(testScript, specName);

      // Verify test execution
      expect(result.specName).toBe(specName);
      expect(result.steps).toHaveLength(2);
      expect(result.screenshots).toHaveLength(2);

      // Verify asset directory structure was created
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('password-visibility-toggle-test'),
        { recursive: true }
      );

      // Verify screenshots were captured for each step
      expect(result.steps[0].screenshot).toContain('navigate-to-login');
      expect(result.steps[1].screenshot).toContain('click-password-toggle');

      // Verify metadata was updated
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.stringContaining(specName),
        undefined
      );
    });

    it('should capture error screenshots when steps fail', async () => {
      const specName = 'failing-test';
      
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 2048 } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({ screenshots: [] }));

      const testScript: TestScript = {
        fileName: 'failing-test.js',
        content: '// Test content',
        specName,
        steps: [
          {
            id: 'failing-step',
            description: 'This step will fail',
            action: {
              type: 'click',
              selector: '[data-testid="non-existent-element"]'
            } as PlaywrightAction,
            expectedResult: 'Element should be clicked',
            screenshotName: 'failing-step.png',
            category: 'ui-interaction'
          }
        ],
        metadata: {
          specName,
          generatedAt: new Date(),
          version: '1.0.0',
          totalSteps: 1,
          estimatedDuration: 5000
        }
      };

      const result = await testRunner.executeTest(testScript, specName);

      // Verify test failed
      expect(result.overallStatus).toBe('Failed');
      expect(result.steps[0].status).toBe('Failed');

      // Verify error screenshot was captured
      expect(result.steps[0].screenshot).toContain('failing-step-error');

      // Verify error details were saved
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('failing-step-error-details.json'),
        expect.stringContaining('stepId'),
        undefined
      );
    });
  });

  describe('Asset management operations', () => {
    it('should provide asset directory information', async () => {
      const specName = 'test-spec';
      
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        screenshots: [
          { filename: 'test1.png', fileSize: 1024 },
          { filename: 'test2.png', fileSize: 2048 }
        ],
        totalFileSize: 3072,
        lastUpdated: '2023-01-01T00:00:00.000Z'
      }));

      const info = await testRunner.getAssetDirectoryInfo(specName);

      expect(info.exists).toBe(true);
      expect(info.screenshotCount).toBe(2);
      expect(info.totalSize).toBe(3072);
      expect(info.lastUpdated).toEqual(new Date('2023-01-01T00:00:00.000Z'));
    });

    it('should clean up old screenshots', async () => {
      const specName = 'test-spec';
      const maxAge = 1000; // 1 second for testing
      
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['old-screenshot.png'] as any);
      mockFs.stat.mockResolvedValue({ 
        mtime: new Date(Date.now() - 2000) // 2 seconds ago
      } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      await testRunner.cleanupOldScreenshots(specName, maxAge);

      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('old-screenshot.png')
      );
    });
  });

  describe('Screenshot naming conventions', () => {
    it('should generate proper screenshot filenames', async () => {
      const specName = 'complex-spec-name';
      const stepId = 'step-with-special-chars!@#';
      
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024 } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({ screenshots: [] }));

      const screenshotManager = testRunner.getScreenshotManager();
      const result = await screenshotManager.captureScreenshot(stepId, specName);

      // Verify filename is safe and follows naming convention
      expect(result.filename).toMatch(/^complex-spec-name-step-step-with-special-chars----\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.png$/);
      expect(result.filename).not.toContain('!@#');
    });

    it('should generate proper error screenshot filenames', async () => {
      const specName = 'error-test';
      const stepId = 'error-step';
      const errorMessage = 'Element not found';
      
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 2048 } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify({ screenshots: [] }));

      const screenshotManager = testRunner.getScreenshotManager();
      const result = await screenshotManager.captureErrorScreenshot(stepId, specName, errorMessage);

      expect(result.filename).toMatch(/^error-test-error-error-step-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.png$/);
      expect(result.stepId).toBe('error-step-error');
    });
  });
});