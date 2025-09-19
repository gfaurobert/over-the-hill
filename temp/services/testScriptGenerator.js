"use strict";
/**
 * TestScriptGenerator - Generates Playwright test scripts from acceptance criteria
 * Implements task 3: test script generator with Playwright templates
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestScriptGenerator = void 0;
const qaConfig_1 = require("../config/qaConfig");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class TestScriptGenerator {
    /**
     * Generates a complete test script from acceptance criteria
     */
    async generateTestScript(criteria, specName) {
        try {
            // Generate test steps from acceptance criteria
            const testSteps = await this.generateTestSteps(criteria);
            // Create test metadata
            const metadata = {
                specName,
                generatedAt: new Date(),
                version: '1.0.0',
                totalSteps: testSteps.length,
                estimatedDuration: this.estimateTestDuration(testSteps)
            };
            // Generate the test script content
            const scriptContent = this.generateScriptContent(testSteps, specName, metadata);
            // Create the test script object
            const testScript = {
                fileName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.testScript(specName),
                content: scriptContent,
                specName,
                steps: testSteps,
                metadata
            };
            return testScript;
        }
        catch (error) {
            throw new Error(`Failed to generate test script for ${specName}: ${error}`);
        }
    }
    /**
     * Creates the directory structure for test scripts
     */
    async createTestStructure(specName) {
        try {
            const scriptsDir = path.join(qaConfig_1.QA_CONFIG.QA_SCRIPTS_DIR, qaConfig_1.QA_CONFIG.NAMING_PATTERNS.scriptDir(specName));
            const assetsDir = path.join(qaConfig_1.QA_CONFIG.QA_ASSETS_DIR, qaConfig_1.QA_CONFIG.NAMING_PATTERNS.assetDir(specName));
            // Create directories if they don't exist
            await fs.mkdir(scriptsDir, { recursive: true });
            await fs.mkdir(assetsDir, { recursive: true });
            console.log(`Created test structure for ${specName}:`);
            console.log(`  Scripts: ${scriptsDir}`);
            console.log(`  Assets: ${assetsDir}`);
        }
        catch (error) {
            throw new Error(`Failed to create test structure for ${specName}: ${error}`);
        }
    }
    /**
     * Classifies acceptance criteria into test categories
     */
    classifyAcceptanceCriteria(criteria) {
        const lowerCriteria = criteria.toLowerCase();
        // Navigation patterns
        if (lowerCriteria.includes('navigate') ||
            lowerCriteria.includes('redirect') ||
            lowerCriteria.includes('page') ||
            lowerCriteria.includes('route')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.NAVIGATION;
        }
        // Form validation patterns
        if (lowerCriteria.includes('validate') ||
            lowerCriteria.includes('required') ||
            lowerCriteria.includes('input') ||
            lowerCriteria.includes('form')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.FORM_VALIDATION;
        }
        // Accessibility patterns
        if (lowerCriteria.includes('accessible') ||
            lowerCriteria.includes('aria') ||
            lowerCriteria.includes('screen reader') ||
            lowerCriteria.includes('keyboard')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY;
        }
        // Data persistence patterns
        if (lowerCriteria.includes('save') ||
            lowerCriteria.includes('store') ||
            lowerCriteria.includes('persist') ||
            lowerCriteria.includes('database')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.DATA_PERSISTENCE;
        }
        // Error handling patterns
        if (lowerCriteria.includes('error') ||
            lowerCriteria.includes('fail') ||
            lowerCriteria.includes('invalid') ||
            lowerCriteria.includes('exception')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.ERROR_HANDLING;
        }
        // UI interaction patterns (default)
        return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION;
    }
    /**
     * Generates test steps from acceptance criteria
     */
    async generateTestSteps(criteria) {
        const testSteps = [];
        for (const criterion of criteria) {
            if (criterion.testable) {
                const steps = await this.generateStepsForCriterion(criterion);
                testSteps.push(...steps);
            }
        }
        return testSteps;
    }
    /**
     * Generates test steps for a single acceptance criterion
     */
    async generateStepsForCriterion(criterion) {
        const steps = [];
        const baseStepId = criterion.id;
        // Add navigation step if needed
        if (this.needsNavigation(criterion)) {
            steps.push(this.createNavigationStep(`${baseStepId}-nav`, criterion));
        }
        // Generate main test steps based on category
        switch (criterion.category) {
            case qaConfig_1.QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION:
                steps.push(...this.generateUIInteractionSteps(baseStepId, criterion));
                break;
            case qaConfig_1.QA_CONFIG.TEST_CATEGORIES.FORM_VALIDATION:
                steps.push(...this.generateFormValidationSteps(baseStepId, criterion));
                break;
            case qaConfig_1.QA_CONFIG.TEST_CATEGORIES.NAVIGATION:
                steps.push(...this.generateNavigationSteps(baseStepId, criterion));
                break;
            case qaConfig_1.QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY:
                steps.push(...this.generateAccessibilitySteps(baseStepId, criterion));
                break;
            case qaConfig_1.QA_CONFIG.TEST_CATEGORIES.DATA_PERSISTENCE:
                steps.push(...this.generateDataPersistenceSteps(baseStepId, criterion));
                break;
            case qaConfig_1.QA_CONFIG.TEST_CATEGORIES.ERROR_HANDLING:
                steps.push(...this.generateErrorHandlingSteps(baseStepId, criterion));
                break;
            default:
                steps.push(this.generateGenericTestStep(baseStepId, criterion));
        }
        // Add screenshot step
        steps.push(this.createScreenshotStep(`${baseStepId}-screenshot`, criterion));
        return steps;
    }
    /**
     * Generates UI interaction test steps
     */
    generateUIInteractionSteps(baseStepId, criterion) {
        const steps = [];
        const description = criterion.description.toLowerCase();
        if (description.includes('click') || description.includes('button')) {
            steps.push({
                id: `${baseStepId}-click`,
                description: `Click element for: ${criterion.description}`,
                action: {
                    type: 'click',
                    selector: this.extractSelector(criterion.description),
                    timeout: qaConfig_1.QA_CONFIG.DEFAULT_TIMEOUT
                },
                expectedResult: 'Element should be clicked successfully',
                screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-click`),
                category: criterion.category
            });
        }
        if (description.includes('type') || description.includes('input')) {
            steps.push({
                id: `${baseStepId}-type`,
                description: `Type text for: ${criterion.description}`,
                action: {
                    type: 'type',
                    selector: this.extractSelector(criterion.description),
                    value: this.extractTestValue(criterion.description),
                    timeout: qaConfig_1.QA_CONFIG.DEFAULT_TIMEOUT
                },
                expectedResult: 'Text should be entered successfully',
                screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-type`),
                category: criterion.category
            });
        }
        if (description.includes('toggle') || description.includes('switch')) {
            steps.push({
                id: `${baseStepId}-toggle`,
                description: `Toggle element for: ${criterion.description}`,
                action: {
                    type: 'click',
                    selector: this.extractToggleSelector(criterion.description),
                    timeout: qaConfig_1.QA_CONFIG.DEFAULT_TIMEOUT
                },
                expectedResult: 'Element should toggle state successfully',
                screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-toggle`),
                category: criterion.category
            });
        }
        return steps;
    }
    /**
     * Generates form validation test steps
     */
    generateFormValidationSteps(baseStepId, criterion) {
        const steps = [];
        steps.push({
            id: `${baseStepId}-validate`,
            description: `Validate form for: ${criterion.description}`,
            action: {
                type: 'assert',
                selector: 'form',
                options: { validation: true }
            },
            expectedResult: 'Form validation should work as expected',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-validate`),
            category: criterion.category
        });
        return steps;
    }
    /**
     * Generates navigation test steps
     */
    generateNavigationSteps(baseStepId, criterion) {
        const steps = [];
        steps.push({
            id: `${baseStepId}-navigate`,
            description: `Navigate for: ${criterion.description}`,
            action: {
                type: 'navigate',
                value: this.extractNavigationUrl(criterion.description)
            },
            expectedResult: 'Navigation should complete successfully',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-navigate`),
            category: criterion.category
        });
        return steps;
    }
    /**
     * Generates accessibility test steps
     */
    generateAccessibilitySteps(baseStepId, criterion) {
        const steps = [];
        steps.push({
            id: `${baseStepId}-a11y`,
            description: `Check accessibility for: ${criterion.description}`,
            action: {
                type: 'assert',
                options: { accessibility: true }
            },
            expectedResult: 'Accessibility requirements should be met',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-a11y`),
            category: criterion.category
        });
        return steps;
    }
    /**
     * Generates data persistence test steps
     */
    generateDataPersistenceSteps(baseStepId, criterion) {
        const steps = [];
        steps.push({
            id: `${baseStepId}-persist`,
            description: `Test data persistence for: ${criterion.description}`,
            action: {
                type: 'assert',
                options: { dataPersistence: true }
            },
            expectedResult: 'Data should be persisted correctly',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-persist`),
            category: criterion.category
        });
        return steps;
    }
    /**
     * Generates error handling test steps
     */
    generateErrorHandlingSteps(baseStepId, criterion) {
        const steps = [];
        steps.push({
            id: `${baseStepId}-error`,
            description: `Test error handling for: ${criterion.description}`,
            action: {
                type: 'assert',
                options: { errorHandling: true }
            },
            expectedResult: 'Error should be handled gracefully',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-error`),
            category: criterion.category
        });
        return steps;
    }
    /**
     * Generates a generic test step
     */
    generateGenericTestStep(baseStepId, criterion) {
        return {
            id: `${baseStepId}-generic`,
            description: `Test: ${criterion.description}`,
            action: {
                type: 'assert',
                options: { generic: true }
            },
            expectedResult: 'Test should pass',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, `${baseStepId}-generic`),
            category: criterion.category
        };
    }
    /**
     * Creates a navigation step
     */
    createNavigationStep(stepId, criterion) {
        return {
            id: stepId,
            description: `Navigate to page for testing: ${criterion.description}`,
            action: {
                type: 'navigate',
                value: 'http://localhost:3001' // Default to local development
            },
            expectedResult: 'Page should load successfully',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
            category: qaConfig_1.QA_CONFIG.TEST_CATEGORIES.NAVIGATION
        };
    }
    /**
     * Creates a screenshot step
     */
    createScreenshotStep(stepId, criterion) {
        return {
            id: stepId,
            description: `Capture screenshot after: ${criterion.description}`,
            action: {
                type: 'screenshot'
            },
            expectedResult: 'Screenshot should be captured',
            screenshotName: qaConfig_1.QA_CONFIG.NAMING_PATTERNS.screenshot(criterion.requirementId, stepId),
            category: criterion.category
        };
    }
    /**
     * Determines if navigation is needed for a criterion
     */
    needsNavigation(criterion) {
        const description = criterion.description.toLowerCase();
        return !description.includes('navigate') && !description.includes('page');
    }
    /**
     * Extracts CSS selector from criterion description
     */
    extractSelector(description) {
        const lowerDesc = description.toLowerCase();
        // Common UI element patterns
        if (lowerDesc.includes('password') && lowerDesc.includes('toggle')) {
            return '[data-testid="password-toggle"], .password-toggle, button[aria-label*="password"]';
        }
        if (lowerDesc.includes('button')) {
            return 'button, [role="button"]';
        }
        if (lowerDesc.includes('input')) {
            return 'input, textarea';
        }
        if (lowerDesc.includes('form')) {
            return 'form';
        }
        // Default selector
        return '[data-testid], [aria-label]';
    }
    /**
     * Extracts toggle-specific selector from criterion description
     */
    extractToggleSelector(description) {
        const lowerDesc = description.toLowerCase();
        if (lowerDesc.includes('password') && lowerDesc.includes('toggle')) {
            return '[data-testid="password-toggle"], .password-toggle, button[aria-label*="show"], button[aria-label*="hide"]';
        }
        return 'button, [role="button"], [role="switch"]';
    }
    /**
     * Extracts test value from criterion description
     */
    extractTestValue(description) {
        if (description.toLowerCase().includes('password')) {
            return 'TestPassword123!';
        }
        if (description.toLowerCase().includes('email')) {
            return 'test@example.com';
        }
        return 'test value';
    }
    /**
     * Extracts navigation URL from criterion description
     */
    extractNavigationUrl(description) {
        // Default to localhost for development
        return 'http://localhost:3001';
    }
    /**
     * Estimates test duration based on steps
     */
    estimateTestDuration(steps) {
        // Estimate 2 seconds per step on average
        return steps.length * 2000;
    }
    /**
     * Generates the complete test script content
     */
    generateScriptContent(steps, specName, metadata) {
        return this.getPlaywrightTemplate(steps, specName, metadata);
    }
    /**
     * Playwright test script template
     */
    getPlaywrightTemplate(steps, specName, metadata) {
        const stepsCode = steps.map(step => this.generateStepCode(step)).join('\n\n');
        return `/**
 * Automated QA Test Script for ${specName}
 * Generated on: ${metadata.generatedAt.toISOString()}
 * Total Steps: ${metadata.totalSteps}
 * Estimated Duration: ${metadata.estimatedDuration}ms
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('${specName} - Automated QA Tests', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Set default timeout
    page.setDefaultTimeout(${qaConfig_1.QA_CONFIG.DEFAULT_TIMEOUT});
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('${specName} - Complete Test Flow', async () => {
    ${stepsCode}
  });
});

// Helper functions
async function captureScreenshot(page, stepId, specName) {
  const screenshotPath = path.join('${qaConfig_1.QA_CONFIG.QA_ASSETS_DIR}', \`\${specName}-test\`, \`\${stepId}.png\`);
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: true,
    quality: ${qaConfig_1.QA_CONFIG.SCREENSHOT_QUALITY}
  });
  console.log(\`Screenshot captured: \${screenshotPath}\`);
}

async function waitForElement(page, selector, timeout = ${qaConfig_1.QA_CONFIG.DEFAULT_TIMEOUT}) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.warn(\`Element not found: \${selector}\`);
    return false;
  }
}

async function safeClick(page, selector) {
  const element = await page.locator(selector).first();
  if (await element.isVisible()) {
    await element.click();
    return true;
  }
  return false;
}

async function safeType(page, selector, text) {
  const element = await page.locator(selector).first();
  if (await element.isVisible()) {
    await element.fill(text);
    return true;
  }
  return false;
}
`;
    }
    /**
     * Generates code for a single test step
     */
    generateStepCode(step) {
        const stepComment = `    // Step: ${step.description}`;
        switch (step.action.type) {
            case 'navigate':
                return `${stepComment}
    console.log('${step.description}');
    await page.goto('${step.action.value || 'http://localhost:3001'}');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '${step.id}', '${step.screenshotName.split('-')[0]}');`;
            case 'click':
                return `${stepComment}
    console.log('${step.description}');
    const clickSuccess = await safeClick(page, '${step.action.selector}');
    expect(clickSuccess).toBeTruthy();
    await page.waitForTimeout(1000); // Wait for UI updates
    await captureScreenshot(page, '${step.id}', '${step.screenshotName.split('-')[0]}');`;
            case 'type':
                return `${stepComment}
    console.log('${step.description}');
    const typeSuccess = await safeType(page, '${step.action.selector}', '${step.action.value}');
    expect(typeSuccess).toBeTruthy();
    await captureScreenshot(page, '${step.id}', '${step.screenshotName.split('-')[0]}');`;
            case 'wait':
                return `${stepComment}
    console.log('${step.description}');
    await page.waitForTimeout(${step.action.timeout || 2000});
    await captureScreenshot(page, '${step.id}', '${step.screenshotName.split('-')[0]}');`;
            case 'assert':
                return `${stepComment}
    console.log('${step.description}');
    // Custom assertion logic would go here
    await captureScreenshot(page, '${step.id}', '${step.screenshotName.split('-')[0]}');`;
            case 'screenshot':
                return `${stepComment}
    console.log('${step.description}');
    await captureScreenshot(page, '${step.id}', '${step.screenshotName.split('-')[0]}');`;
            default:
                return `${stepComment}
    console.log('${step.description}');
    await captureScreenshot(page, '${step.id}', '${step.screenshotName.split('-')[0]}');`;
        }
    }
    /**
     * Saves the generated test script to the file system
     */
    async saveTestScript(testScript) {
        try {
            // Ensure test structure exists
            await this.createTestStructure(testScript.specName);
            // Create the full file path
            const scriptsDir = path.join(qaConfig_1.QA_CONFIG.QA_SCRIPTS_DIR, qaConfig_1.QA_CONFIG.NAMING_PATTERNS.scriptDir(testScript.specName));
            const filePath = path.join(scriptsDir, testScript.fileName);
            // Write the test script content
            await fs.writeFile(filePath, testScript.content, 'utf8');
            console.log(`Test script saved: ${filePath}`);
            return filePath;
        }
        catch (error) {
            throw new Error(`Failed to save test script for ${testScript.specName}: ${error}`);
        }
    }
    /**
     * Generates and saves a complete test script from acceptance criteria
     */
    async generateAndSaveTestScript(criteria, specName) {
        try {
            // Generate the test script
            const testScript = await this.generateTestScript(criteria, specName);
            // Save it to the file system
            const filePath = await this.saveTestScript(testScript);
            return filePath;
        }
        catch (error) {
            throw new Error(`Failed to generate and save test script for ${specName}: ${error}`);
        }
    }
}
exports.TestScriptGenerator = TestScriptGenerator;
