/**
 * Integration tests for TestScriptGenerator
 * Tests the complete flow with real spec data
 */

import { TestScriptGenerator } from '../testScriptGenerator';
import { SpecAnalyzer } from '../specAnalyzer';
import { QA_CONFIG } from '../../config/qaConfig';

describe('TestScriptGenerator Integration', () => {
  let generator: TestScriptGenerator;
  let analyzer: SpecAnalyzer;
  
  beforeEach(() => {
    generator = new TestScriptGenerator();
    analyzer = new SpecAnalyzer();
  });

  describe('Password Visibility Toggle Spec Integration', () => {
    it('should generate test script for password visibility toggle requirements', async () => {
      // Mock requirements for password visibility toggle
      const mockRequirements = `
# Requirements Document

## Introduction
This feature adds a toggle button to password input fields that allows users to show/hide password text.

## Requirements

### Requirement 1

**User Story:** As a user, I want to toggle password visibility so that I can verify my password input.

#### Acceptance Criteria

1. WHEN user clicks the password toggle button THEN the system SHALL show the password text
2. WHEN user clicks the toggle button again THEN the system SHALL hide the password text
3. WHEN password is visible THEN the toggle button SHALL display a "hide" icon
4. WHEN password is hidden THEN the toggle button SHALL display a "show" icon
5. WHEN user interacts with toggle THEN the system SHALL maintain focus on the password field

### Requirement 2

**User Story:** As a user, I want accessible password toggle functionality so that I can use screen readers effectively.

#### Acceptance Criteria

1. WHEN screen reader accesses toggle button THEN the system SHALL provide appropriate aria-label
2. WHEN password visibility changes THEN the system SHALL announce the state change
3. WHEN user navigates with keyboard THEN the toggle button SHALL be focusable
      `;

      // Parse the requirements
      const parsedRequirements = await analyzer.parseRequirements(mockRequirements);
      
      // Extract all acceptance criteria
      const allCriteria = parsedRequirements.flatMap(req => req.acceptanceCriteria);
      
      // Generate test script
      const testScript = await generator.generateTestScript(allCriteria, 'password-visibility-toggle');
      
      // Verify the test script was generated correctly
      expect(testScript.fileName).toBe('password-visibility-toggle-test.js');
      expect(testScript.specName).toBe('password-visibility-toggle');
      expect(testScript.content).toContain('password-visibility-toggle - Automated QA Tests');
      expect(testScript.content).toContain('test.describe');
      expect(testScript.content).toContain('captureScreenshot');
      
      // Verify steps were generated for testable criteria
      expect(testScript.steps.length).toBeGreaterThan(0);
      
      // Check for UI interaction steps (password toggle)
      const toggleSteps = testScript.steps.filter(step => 
        step.description.toLowerCase().includes('toggle') ||
        step.action.selector?.includes('password-toggle')
      );
      expect(toggleSteps.length).toBeGreaterThan(0);
      
      // Check that accessibility criteria were properly classified
      const accessibilityCriteria = allCriteria.filter(c => 
        c.category === QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY
      );
      expect(accessibilityCriteria.length).toBeGreaterThan(0);
      
      // Check for screenshot steps
      const screenshotSteps = testScript.steps.filter(step => 
        step.action.type === 'screenshot'
      );
      expect(screenshotSteps.length).toBeGreaterThan(0);
      
      // Verify metadata
      expect(testScript.metadata.specName).toBe('password-visibility-toggle');
      expect(testScript.metadata.totalSteps).toBe(testScript.steps.length);
      expect(testScript.metadata.estimatedDuration).toBeGreaterThan(0);
      
      console.log(`Generated ${testScript.steps.length} test steps for password-visibility-toggle spec`);
      console.log(`Estimated duration: ${testScript.metadata.estimatedDuration}ms`);
    });

    it('should classify password toggle criteria correctly', () => {
      const uiCriteria = 'WHEN user clicks the password toggle button THEN the system SHALL show the password text';
      const accessibilityCriteria = 'WHEN screen reader accesses toggle button THEN the system SHALL provide appropriate aria-label';
      
      expect(generator.classifyAcceptanceCriteria(uiCriteria)).toBe(QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION);
      expect(generator.classifyAcceptanceCriteria(accessibilityCriteria)).toBe(QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY);
    });

    it('should generate appropriate selectors for password toggle elements', async () => {
      const toggleCriteria = [{
        id: '1.1',
        description: 'WHEN user clicks the password toggle button THEN the system SHALL show the password text',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        steps: [],
        requirementId: '1',
        userStory: 'As a user, I want to toggle password visibility'
      }];

      const testScript = await generator.generateTestScript(toggleCriteria, 'selector-test');
      
      const toggleStep = testScript.steps.find(step => 
        step.action.type === 'click' && step.description.toLowerCase().includes('toggle')
      );
      
      expect(toggleStep).toBeDefined();
      expect(toggleStep?.action.selector).toContain('password-toggle');
    });

    it('should generate Playwright test code with proper structure', async () => {
      const criteria = [{
        id: '1.1',
        description: 'WHEN user clicks password toggle THEN system SHALL show password',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        steps: [],
        requirementId: '1',
        userStory: 'Toggle password visibility'
      }];

      const testScript = await generator.generateTestScript(criteria, 'playwright-structure-test');
      
      // Check for Playwright test structure
      expect(testScript.content).toContain("const { test, expect } = require('@playwright/test');");
      expect(testScript.content).toContain('test.describe');
      expect(testScript.content).toContain('test.beforeEach');
      expect(testScript.content).toContain('test.afterEach');
      expect(testScript.content).toContain('async ({ browser })');
      expect(testScript.content).toContain('await page.setViewportSize');
      expect(testScript.content).toContain('page.setDefaultTimeout');
      
      // Check for helper functions
      expect(testScript.content).toContain('async function captureScreenshot');
      expect(testScript.content).toContain('async function waitForElement');
      expect(testScript.content).toContain('async function safeClick');
      expect(testScript.content).toContain('async function safeType');
      
      // Check for test steps in the generated code
      expect(testScript.content).toContain('// Step:');
      expect(testScript.content).toContain('console.log');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty acceptance criteria gracefully', async () => {
      const testScript = await generator.generateTestScript([], 'empty-criteria-test');
      
      expect(testScript.steps).toHaveLength(0);
      expect(testScript.content).toContain('empty-criteria-test - Automated QA Tests');
      expect(testScript.metadata.totalSteps).toBe(0);
      expect(testScript.metadata.estimatedDuration).toBe(0);
    });

    it('should handle malformed criteria descriptions', async () => {
      const malformedCriteria = [{
        id: '1.1',
        description: '', // Empty description
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        steps: [],
        requirementId: '1',
        userStory: 'Test story'
      }];

      const testScript = await generator.generateTestScript(malformedCriteria, 'malformed-test');
      
      // Should still generate a test script, even with empty descriptions
      expect(testScript.fileName).toBe('malformed-test-test.js');
      expect(testScript.content).toContain('malformed-test - Automated QA Tests');
    });
  });
});