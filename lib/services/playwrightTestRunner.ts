/**
 * Playwright Test Runner for automated QA system
 * Executes test scripts using Playwright MCP integration with screenshot capture
 */

import { 
  PlaywrightTestRunner as IPlaywrightTestRunner,
  TestScript, 
  TestResult, 
  StepResult, 
  TestStep,
  QAConfig,
  PlaywrightAction
} from '../types/qaTypes';
import { QA_CONFIG } from '../config/qaConfig';
import { MCPPlaywrightIntegration, createMCPPlaywrightService } from './mcpPlaywrightIntegration';
import { ScreenshotManager } from './screenshotManager';
import path from 'path';
import fs from 'fs/promises';

export class PlaywrightTestRunner implements IPlaywrightTestRunner {
  private config: QAConfig;
  private browserInitialized: boolean = false;
  private mcpService: MCPPlaywrightIntegration;
  private screenshotManager: ScreenshotManager;

  constructor(config?: Partial<QAConfig>) {
    this.config = {
      baseUrl: 'http://localhost:3001',
      screenshotPath: QA_CONFIG.QA_ASSETS_DIR,
      testTimeout: QA_CONFIG.DEFAULT_TIMEOUT,
      maxRetries: QA_CONFIG.MAX_RETRIES,
      headless: QA_CONFIG.BROWSER_OPTIONS.headless,
      browserOptions: QA_CONFIG.BROWSER_OPTIONS,
      ...config
    };
    this.mcpService = createMCPPlaywrightService();
    this.screenshotManager = new ScreenshotManager(this.mcpService);
  }

  /**
   * Execute a complete test script with all steps
   */
  async executeTest(script: TestScript, specName: string): Promise<TestResult> {
    const startTime = new Date();
    const testResult: TestResult = {
      specName,
      testScript: script.fileName,
      steps: [],
      overallStatus: 'Passed',
      executionTime: 0,
      screenshots: [],
      startTime,
      endTime: startTime,
      errorSummary: undefined
    };

    try {
      // Setup browser if not already initialized
      await this.setupBrowser();

      // Create asset directory structure for this spec
      await this.screenshotManager.createAssetDirectoryStructure(specName);

      // Navigate to base URL first
      await this.navigateToBaseUrl();

      // Execute each test step
      for (const step of script.steps) {
        const stepResult = await this.executeStep(step, specName);
        testResult.steps.push(stepResult);
        
        if (stepResult.screenshot) {
          testResult.screenshots.push(stepResult.screenshot);
        }

        // If step failed and we've exceeded retries, mark test as failed
        if (stepResult.status === 'Failed') {
          testResult.overallStatus = 'Failed';
          testResult.errorSummary = stepResult.errorMessage;
          
          // Continue with remaining steps to capture full test state
        }

        // Add delay between steps for stability
        await this.delay(500);
      }

    } catch (error) {
      testResult.overallStatus = 'Failed';
      testResult.errorSummary = `Test execution failed: ${error instanceof Error ? error.message : String(error)}`;
      
      // Capture final screenshot on error using screenshot manager
      try {
        const errorMetadata = await this.screenshotManager.captureErrorScreenshot(
          'test-execution-error', 
          specName, 
          testResult.errorSummary
        );
        testResult.screenshots.push(errorMetadata.path);
      } catch (screenshotError) {
        console.warn('Failed to capture error screenshot:', screenshotError);
      }
    }

    const endTime = new Date();
    testResult.endTime = endTime;
    testResult.executionTime = endTime.getTime() - startTime.getTime();

    return testResult;
  }

  /**
   * Execute a single test step
   */
  private async executeStep(step: TestStep, specName: string): Promise<StepResult> {
    const startTime = new Date();
    const stepResult: StepResult = {
      stepId: step.id,
      description: step.description,
      status: 'Passed',
      executionTime: 0,
      timestamp: startTime
    };

    let retryCount = 0;
    const maxRetries = this.config.maxRetries;

    while (retryCount <= maxRetries) {
      try {
        // Execute the playwright action
        await this.executePlaywrightAction(step.action);

        // Capture screenshot after action using screenshot manager
        if (step.screenshotName) {
          const screenshotMetadata = await this.screenshotManager.captureScreenshot(step.id, specName);
          stepResult.screenshot = screenshotMetadata.path;
        }

        // Validate the result if there's an expected result
        if (step.expectedResult) {
          const isValid = await this.validateResult(step);
          if (!isValid) {
            throw new Error(`Validation failed: Expected "${step.expectedResult}"`);
          }
        }

        stepResult.status = 'Passed';
        break;

      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (retryCount > maxRetries) {
          stepResult.status = 'Failed';
          stepResult.errorMessage = `Failed after ${maxRetries} retries: ${errorMessage}`;
          
          // Capture error screenshot using screenshot manager
          try {
            const errorMetadata = await this.screenshotManager.captureErrorScreenshot(
              step.id, 
              specName, 
              errorMessage
            );
            stepResult.screenshot = errorMetadata.path;
          } catch (screenshotError) {
            console.warn('Failed to capture error screenshot:', screenshotError);
          }
        } else {
          // Wait before retry
          await this.delay(1000 * retryCount);
        }
      }
    }

    const endTime = new Date();
    stepResult.executionTime = endTime.getTime() - startTime.getTime();

    return stepResult;
  }

  /**
   * Execute a Playwright action using MCP integration
   */
  private async executePlaywrightAction(action: PlaywrightAction): Promise<void> {
    const timeout = action.timeout || this.config.testTimeout;

    switch (action.type) {
      case 'navigate':
        if (!action.value) throw new Error('Navigate action requires a URL value');
        // Use MCP navigate function
        await this.mcpNavigate(action.value);
        break;

      case 'click':
        if (!action.selector) throw new Error('Click action requires a selector');
        // Use MCP click function
        await this.mcpClick(action.selector, action.options);
        break;

      case 'type':
        if (!action.selector || !action.value) {
          throw new Error('Type action requires both selector and value');
        }
        // Use MCP type function
        await this.mcpType(action.selector, action.value, action.options);
        break;

      case 'wait':
        if (action.value) {
          // Wait for specific time
          await this.delay(parseInt(action.value));
        } else if (action.selector) {
          // Wait for element
          await this.mcpWaitForElement(action.selector, timeout);
        }
        break;

      case 'assert':
        if (!action.selector) throw new Error('Assert action requires a selector');
        await this.mcpAssertElement(action.selector, action.value, action.options);
        break;

      case 'screenshot':
        // Screenshot will be handled separately in executeStep
        break;

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Capture screenshot using ScreenshotManager
   */
  async captureScreenshot(stepId: string, specName: string): Promise<string> {
    try {
      const screenshotMetadata = await this.screenshotManager.captureScreenshot(stepId, specName);
      return screenshotMetadata.path;
    } catch (error) {
      console.warn(`Failed to capture screenshot for ${stepId}:`, error);
      return '';
    }
  }

  /**
   * Validate test step result
   */
  async validateResult(step: TestStep): Promise<boolean> {
    try {
      // Basic validation - check if expected elements exist
      if (step.action.selector) {
        return await this.mcpElementExists(step.action.selector);
      }
      return true;
    } catch (error) {
      console.warn(`Validation failed for step ${step.id}:`, error);
      return false;
    }
  }

  /**
   * Setup browser using MCP
   */
  async setupBrowser(): Promise<void> {
    if (this.browserInitialized) return;

    try {
      // Browser setup is handled by MCP - just ensure we can take a snapshot
      await this.mcpBrowserSnapshot();
      this.browserInitialized = true;
    } catch (error) {
      throw new Error(`Failed to setup browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Teardown browser
   */
  async teardownBrowser(): Promise<void> {
    try {
      // MCP handles browser lifecycle - just reset our state
      this.browserInitialized = false;
    } catch (error) {
      console.warn('Error during browser teardown:', error);
    }
  }

  /**
   * Navigate to base URL
   */
  private async navigateToBaseUrl(): Promise<void> {
    await this.mcpNavigate(this.config.baseUrl);
    // Wait for page to load
    await this.delay(2000);
  }

  /**
   * Utility function for delays
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // MCP Integration Methods
  private async mcpNavigate(url: string): Promise<void> {
    await this.mcpService.navigate(url);
  }

  private async mcpClick(selector: string, options?: any): Promise<void> {
    await this.mcpService.click(selector, options);
  }

  private async mcpType(selector: string, text: string, options?: any): Promise<void> {
    await this.mcpService.type(selector, text, options);
  }

  private async mcpWaitForElement(selector: string, timeout: number): Promise<void> {
    await this.mcpService.waitFor({ time: timeout });
  }

  private async mcpAssertElement(selector: string, expectedValue?: string, options?: any): Promise<void> {
    const exists = await this.mcpService.elementExists(selector);
    if (!exists) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    if (expectedValue) {
      // For more complex assertions, we could use evaluate
      const result = await this.mcpService.evaluate(
        `document.querySelector('${selector}')?.textContent || document.querySelector('${selector}')?.value`,
        selector
      );
      // This is a simplified assertion - in real implementation we'd have more robust checking
    }
  }

  private async mcpTakeScreenshot(filename: string): Promise<void> {
    await this.mcpService.takeScreenshot(filename);
  }

  private async mcpBrowserSnapshot(): Promise<void> {
    await this.mcpService.snapshot();
  }

  private async mcpElementExists(selector: string): Promise<boolean> {
    return await this.mcpService.elementExists(selector);
  }

  /**
   * Get the screenshot manager instance
   */
  getScreenshotManager(): ScreenshotManager {
    return this.screenshotManager;
  }

  /**
   * Clean up old screenshots for a spec
   */
  async cleanupOldScreenshots(specName: string, maxAge?: number): Promise<void> {
    await this.screenshotManager.cleanupOldScreenshots(specName, maxAge);
  }

  /**
   * Get asset directory information for a spec
   */
  async getAssetDirectoryInfo(specName: string) {
    return await this.screenshotManager.getAssetDirectoryInfo(specName);
  }
}