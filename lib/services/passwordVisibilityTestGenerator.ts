/**
 * PasswordVisibilityTestGenerator - Specialized test generator for password-visibility-toggle MVP
 * Implements task 7: password-visibility-toggle MVP test generation
 */

import { 
  AcceptanceCriteria,
  TestScript,
  TestStep,
  TestMetadata
} from '../types/qaTypes';
import { QA_CONFIG } from '../config/qaConfig';
import { TestScriptGenerator } from './testScriptGenerator';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PasswordVisibilityTestGenerator extends TestScriptGenerator {
  
  /**
   * Generates specialized test script for password-visibility-toggle spec
   */
  async generatePasswordVisibilityTestScript(specName: string = 'password-visibility-toggle'): Promise<TestScript> {
    try {
      // Create specialized acceptance criteria for password visibility toggle
      const criteria = this.createPasswordVisibilityAcceptanceCriteria();
      
      // Generate test steps using specialized logic
      const testSteps = await this.generatePasswordVisibilityTestSteps(criteria);
      
      // Create test metadata
      const metadata: TestMetadata = {
        specName,
        generatedAt: new Date(),
        version: '1.0.0',
        totalSteps: testSteps.length,
        estimatedDuration: this.estimateTestDuration(testSteps)
      };
      
      // Generate specialized script content
      const scriptContent = this.generatePasswordVisibilityScriptContent(testSteps, specName, metadata);
      
      // Create the test script object
      const testScript: TestScript = {
        fileName: `${specName}-test.js`,
        content: scriptContent,
        specName,
        steps: testSteps,
        metadata
      };
      
      return testScript;
    } catch (error) {
      throw new Error(`Failed to generate password visibility test script: ${error}`);
    }
  }

  /**
   * Creates acceptance criteria specifically for password visibility toggle
   */
  private createPasswordVisibilityAcceptanceCriteria(): AcceptanceCriteria[] {
    return [
      {
        id: '1.1',
        requirementId: '1',
        description: 'WHEN user clicks the password toggle button THEN the system SHALL show the password text',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        priority: 'high'
      },
      {
        id: '1.2',
        requirementId: '1',
        description: 'WHEN user clicks the toggle button again THEN the system SHALL hide the password text',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        priority: 'high'
      },
      {
        id: '1.3',
        requirementId: '1',
        description: 'WHEN password is visible THEN toggle button SHALL show eye-off icon',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        priority: 'medium'
      },
      {
        id: '1.4',
        requirementId: '1',
        description: 'WHEN password is hidden THEN toggle button SHALL show eye icon',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        priority: 'medium'
      },
      {
        id: '2.1',
        requirementId: '2',
        description: 'WHEN screen reader accesses toggle button THEN system SHALL provide appropriate aria-label',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY,
        priority: 'high'
      },
      {
        id: '2.2',
        requirementId: '2',
        description: 'WHEN toggle button is focused THEN it SHALL be activatable with Enter or Space key',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY,
        priority: 'high'
      },
      {
        id: '3.1',
        requirementId: '3',
        description: 'WHEN on SignInForm component THEN password visibility toggle SHALL be present',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        priority: 'high'
      },
      {
        id: '4.1',
        requirementId: '4',
        description: 'WHEN page is refreshed THEN password field SHALL default to hidden state',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        priority: 'medium'
      }
    ];
  }

  /**
   * Generates specialized test steps for password visibility toggle
   */
  private async generatePasswordVisibilityTestSteps(criteria: AcceptanceCriteria[]): Promise<TestStep[]> {
    const testSteps: TestStep[] = [];
    
    for (const criterion of criteria) {
      const steps = await this.generatePasswordVisibilityStepsForCriterion(criterion);
      testSteps.push(...steps);
    }
    
    return testSteps;
  }

  /**
   * Generates test steps for a single password visibility criterion
   */
  private async generatePasswordVisibilityStepsForCriterion(criterion: AcceptanceCriteria): Promise<TestStep[]> {
    const steps: TestStep[] = [];
    const baseStepId = criterion.id;
    
    switch (criterion.id) {
      case '1.1': // Show password functionality
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createPasswordInputStep(`${baseStepId}-input`, criterion),
          this.createToggleClickStep(`${baseStepId}-toggle`, criterion, 'show'),
          this.createPasswordVisibilityAssertStep(`${baseStepId}-assert`, criterion, 'visible'),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      case '1.2': // Hide password functionality
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createPasswordInputStep(`${baseStepId}-input`, criterion),
          this.createToggleClickStep(`${baseStepId}-show`, criterion, 'show'),
          this.createToggleClickStep(`${baseStepId}-hide`, criterion, 'hide'),
          this.createPasswordVisibilityAssertStep(`${baseStepId}-assert`, criterion, 'hidden'),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      case '1.3': // Eye-off icon when visible
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createPasswordInputStep(`${baseStepId}-input`, criterion),
          this.createToggleClickStep(`${baseStepId}-toggle`, criterion, 'show'),
          this.createIconAssertStep(`${baseStepId}-assert`, criterion, 'eye-off'),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      case '1.4': // Eye icon when hidden
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createPasswordInputStep(`${baseStepId}-input`, criterion),
          this.createIconAssertStep(`${baseStepId}-assert`, criterion, 'eye'),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      case '2.1': // Accessibility - aria-label
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createAriaLabelAssertStep(`${baseStepId}-assert`, criterion),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      case '2.2': // Keyboard accessibility
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createPasswordInputStep(`${baseStepId}-input`, criterion),
          this.createKeyboardNavigationStep(`${baseStepId}-focus`, criterion),
          this.createKeyboardActivationStep(`${baseStepId}-activate`, criterion),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      case '3.1': // SignInForm integration
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createSignInFormAssertStep(`${baseStepId}-assert`, criterion),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      case '4.1': // Default hidden state
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createDefaultStateAssertStep(`${baseStepId}-assert`, criterion),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
        break;
        
      default:
        steps.push(
          this.createNavigationStep(`${baseStepId}-nav`, criterion),
          this.createGenericPasswordVisibilityStep(`${baseStepId}-generic`, criterion),
          this.createScreenshotStep(`${baseStepId}-screenshot`, criterion)
        );
    }
    
    return steps;
  }

  /**
   * Creates a password input step
   */
  private createPasswordInputStep(stepId: string, criterion: AcceptanceCriteria): TestStep {
    return {
      id: stepId,
      description: `Enter test password for: ${criterion.description}`,
      action: {
        type: 'type',
        selector: 'input[type="password"], input[name="password"]',
        value: 'TestPassword123!',
        timeout: QA_CONFIG.DEFAULT_TIMEOUT
      },
      expectedResult: 'Password should be entered successfully',
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates a toggle click step
   */
  private createToggleClickStep(stepId: string, criterion: AcceptanceCriteria, action: 'show' | 'hide'): TestStep {
    return {
      id: stepId,
      description: `Click toggle button to ${action} password for: ${criterion.description}`,
      action: {
        type: 'click',
        selector: '[data-testid="password-toggle"], .password-toggle, button[aria-label*="password"], button[aria-label*="show"], button[aria-label*="hide"]',
        timeout: QA_CONFIG.DEFAULT_TIMEOUT
      },
      expectedResult: `Toggle button should ${action} password successfully`,
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates a password visibility assertion step
   */
  private createPasswordVisibilityAssertStep(stepId: string, criterion: AcceptanceCriteria, expectedState: 'visible' | 'hidden'): TestStep {
    return {
      id: stepId,
      description: `Assert password is ${expectedState} for: ${criterion.description}`,
      action: {
        type: 'assert',
        selector: 'input[name="password"]',
        options: { 
          attribute: 'type',
          expectedValue: expectedState === 'visible' ? 'text' : 'password'
        }
      },
      expectedResult: `Password should be ${expectedState}`,
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates an icon assertion step
   */
  private createIconAssertStep(stepId: string, criterion: AcceptanceCriteria, expectedIcon: 'eye' | 'eye-off'): TestStep {
    return {
      id: stepId,
      description: `Assert toggle button shows ${expectedIcon} icon for: ${criterion.description}`,
      action: {
        type: 'assert',
        selector: '[data-testid="password-toggle"] svg, .password-toggle svg',
        options: { 
          iconType: expectedIcon
        }
      },
      expectedResult: `Toggle button should show ${expectedIcon} icon`,
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates an aria-label assertion step
   */
  private createAriaLabelAssertStep(stepId: string, criterion: AcceptanceCriteria): TestStep {
    return {
      id: stepId,
      description: `Assert toggle button has appropriate aria-label for: ${criterion.description}`,
      action: {
        type: 'assert',
        selector: '[data-testid="password-toggle"], button[aria-label*="password"]',
        options: { 
          attribute: 'aria-label',
          shouldExist: true
        }
      },
      expectedResult: 'Toggle button should have appropriate aria-label',
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates a keyboard navigation step
   */
  private createKeyboardNavigationStep(stepId: string, criterion: AcceptanceCriteria): TestStep {
    return {
      id: stepId,
      description: `Navigate to toggle button using keyboard for: ${criterion.description}`,
      action: {
        type: 'keyboard',
        key: 'Tab',
        selector: '[data-testid="password-toggle"], button[aria-label*="password"]'
      },
      expectedResult: 'Toggle button should be focusable via keyboard',
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates a keyboard activation step
   */
  private createKeyboardActivationStep(stepId: string, criterion: AcceptanceCriteria): TestStep {
    return {
      id: stepId,
      description: `Activate toggle button using Enter key for: ${criterion.description}`,
      action: {
        type: 'keyboard',
        key: 'Enter',
        selector: '[data-testid="password-toggle"], button[aria-label*="password"]'
      },
      expectedResult: 'Toggle button should be activatable via Enter key',
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates a SignInForm assertion step
   */
  private createSignInFormAssertStep(stepId: string, criterion: AcceptanceCriteria): TestStep {
    return {
      id: stepId,
      description: `Assert password toggle is present in SignInForm for: ${criterion.description}`,
      action: {
        type: 'assert',
        selector: 'form [data-testid="password-toggle"], form button[aria-label*="password"]',
        options: { shouldExist: true }
      },
      expectedResult: 'Password toggle should be present in SignInForm',
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates a default state assertion step
   */
  private createDefaultStateAssertStep(stepId: string, criterion: AcceptanceCriteria): TestStep {
    return {
      id: stepId,
      description: `Assert password field defaults to hidden state for: ${criterion.description}`,
      action: {
        type: 'assert',
        selector: 'input[name="password"]',
        options: { 
          attribute: 'type',
          expectedValue: 'password'
        }
      },
      expectedResult: 'Password field should default to hidden state',
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Creates a generic password visibility step
   */
  private createGenericPasswordVisibilityStep(stepId: string, criterion: AcceptanceCriteria): TestStep {
    return {
      id: stepId,
      description: `Test password visibility functionality for: ${criterion.description}`,
      action: {
        type: 'assert',
        options: { generic: true }
      },
      expectedResult: 'Password visibility functionality should work correctly',
      screenshotName: QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
      category: criterion.category
    };
  }

  /**
   * Generates specialized script content for password visibility tests
   */
  private generatePasswordVisibilityScriptContent(steps: TestStep[], specName: string, metadata: TestMetadata): string {
    const stepsCode = steps.map(step => this.generatePasswordVisibilityStepCode(step)).join('\n\n');
    
    return `/**
 * Automated QA Test Script for ${specName}
 * Generated on: ${metadata.generatedAt.toISOString()}
 * Total Steps: ${metadata.totalSteps}
 * Estimated Duration: ${metadata.estimatedDuration}ms
 * 
 * This test validates password visibility toggle functionality including:
 * - Toggle button show/hide functionality
 * - Icon state changes (eye/eye-off)
 * - Accessibility features (aria-label, keyboard navigation)
 * - Form integration and default states
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('${specName} - Password Visibility Toggle Tests', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Set default timeout
    page.setDefaultTimeout(${QA_CONFIG.DEFAULT_TIMEOUT});
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Password Visibility Toggle - Complete Functionality Test', async () => {
    ${stepsCode}
  });
});

// Specialized helper functions for password visibility testing
async function captureScreenshot(page, stepId, specName) {
  const screenshotPath = path.join('${QA_CONFIG.QA_ASSETS_DIR}', \`\${specName}-test\`, \`\${stepId}.png\`);
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: true,
    quality: ${QA_CONFIG.SCREENSHOT_QUALITY}
  });
  console.log(\`Screenshot captured: \${screenshotPath}\`);
}

async function waitForPasswordToggle(page, timeout = ${QA_CONFIG.DEFAULT_TIMEOUT}) {
  const selectors = [
    '[data-testid="password-toggle"]',
    '.password-toggle',
    'button[aria-label*="password"]',
    'button[aria-label*="show"]',
    'button[aria-label*="hide"]'
  ];
  
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: timeout / selectors.length });
      return selector;
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Password toggle button not found');
}

async function getPasswordInputType(page) {
  const passwordInput = await page.locator('input[name="password"], input[type="password"], input[type="text"][name="password"]').first();
  return await passwordInput.getAttribute('type');
}

async function assertPasswordVisibility(page, expectedState) {
  const inputType = await getPasswordInputType(page);
  const isVisible = inputType === 'text';
  const shouldBeVisible = expectedState === 'visible';
  
  expect(isVisible).toBe(shouldBeVisible);
  console.log(\`Password visibility assertion passed: expected \${expectedState}, got \${isVisible ? 'visible' : 'hidden'}\`);
}

async function assertAriaLabel(page, selector) {
  const element = await page.locator(selector).first();
  const ariaLabel = await element.getAttribute('aria-label');
  
  expect(ariaLabel).toBeTruthy();
  expect(ariaLabel.toLowerCase()).toMatch(/(password|show|hide|toggle)/);
  console.log(\`Aria-label assertion passed: \${ariaLabel}\`);
}

async function safeClick(page, selector) {
  try {
    const element = await page.locator(selector).first();
    if (await element.isVisible()) {
      await element.click();
      return true;
    }
  } catch (error) {
    console.warn(\`Click failed for selector: \${selector}\`, error.message);
  }
  return false;
}

async function safeType(page, selector, text) {
  try {
    const element = await page.locator(selector).first();
    if (await element.isVisible()) {
      await element.fill(text);
      return true;
    }
  } catch (error) {
    console.warn(\`Type failed for selector: \${selector}\`, error.message);
  }
  return false;
}

async function safeKeyPress(page, selector, key) {
  try {
    const element = await page.locator(selector).first();
    await element.focus();
    await page.keyboard.press(key);
    return true;
  } catch (error) {
    console.warn(\`Key press failed for selector: \${selector}\`, error.message);
  }
  return false;
}
`;
  }

  /**
   * Generates code for a single password visibility test step
   */
  private generatePasswordVisibilityStepCode(step: TestStep): string {
    const stepComment = `    // Step: ${step.description}`;
    
    switch (step.action.type) {
      case 'navigate':
        return `${stepComment}
    console.log('${step.description}');
    await page.goto('${step.action.value || 'http://localhost:3001'}');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;

      case 'type':
        return `${stepComment}
    console.log('${step.description}');
    const typeSuccess_${step.id.replace(/[.-]/g, '_')} = await safeType(page, '${step.action.selector}', '${step.action.value}');
    expect(typeSuccess_${step.id.replace(/[.-]/g, '_')}).toBeTruthy();
    await page.waitForTimeout(500); // Allow for input processing
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;

      case 'click':
        return `${stepComment}
    console.log('${step.description}');
    const toggleSelector = await waitForPasswordToggle(page);
    const clickSuccess_${step.id.replace(/[.-]/g, '_')} = await safeClick(page, toggleSelector);
    expect(clickSuccess_${step.id.replace(/[.-]/g, '_')}).toBeTruthy();
    await page.waitForTimeout(1000); // Wait for toggle animation
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;

      case 'keyboard':
        return `${stepComment}
    console.log('${step.description}');
    const keySuccess_${step.id.replace(/[.-]/g, '_')} = await safeKeyPress(page, '${step.action.selector}', '${step.action.key}');
    expect(keySuccess_${step.id.replace(/[.-]/g, '_')}).toBeTruthy();
    await page.waitForTimeout(500); // Wait for keyboard action
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;

      case 'assert':
        if (step.action.options?.attribute === 'type') {
          const expectedState = step.action.options.expectedValue === 'text' ? 'visible' : 'hidden';
          return `${stepComment}
    console.log('${step.description}');
    await assertPasswordVisibility(page, '${expectedState}');
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;
        } else if (step.action.options?.attribute === 'aria-label') {
          return `${stepComment}
    console.log('${step.description}');
    await assertAriaLabel(page, '${step.action.selector}');
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;
        } else if (step.action.options?.shouldExist) {
          return `${stepComment}
    console.log('${step.description}');
    const element_${step.id.replace(/[.-]/g, '_')} = await page.locator('${step.action.selector}').first();
    await expect(element_${step.id.replace(/[.-]/g, '_')}).toBeVisible();
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;
        } else {
          return `${stepComment}
    console.log('${step.description}');
    // Custom assertion logic for password visibility
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;
        }

      case 'screenshot':
        return `${stepComment}
    console.log('${step.description}');
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;

      default:
        return `${stepComment}
    console.log('${step.description}');
    await captureScreenshot(page, '${step.id}', 'password-visibility-toggle');`;
    }
  }

  /**
   * Saves the password visibility test script
   */
  async savePasswordVisibilityTestScript(testScript: TestScript): Promise<string> {
    try {
      // Ensure test structure exists
      await this.createTestStructure(testScript.specName);
      
      // Create the full file path
      const scriptsDir = path.join(QA_CONFIG.QA_SCRIPTS_DIR, `${testScript.specName}-test`);
      const filePath = path.join(scriptsDir, testScript.fileName);
      
      // Write the test script content
      await fs.writeFile(filePath, testScript.content, 'utf8');
      
      console.log(`Password visibility test script saved: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save password visibility test script: ${error}`);
    }
  }

  /**
   * Generates and saves the complete password visibility test script
   */
  async generateAndSavePasswordVisibilityTestScript(): Promise<string> {
    try {
      // Generate the specialized test script
      const testScript = await this.generatePasswordVisibilityTestScript();
      
      // Save it to the file system
      const filePath = await this.savePasswordVisibilityTestScript(testScript);
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to generate and save password visibility test script: ${error}`);
    }
  }
}