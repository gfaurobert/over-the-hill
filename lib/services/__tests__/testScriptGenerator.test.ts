/**
 * Tests for TestScriptGenerator
 */

import { TestScriptGenerator } from '../testScriptGenerator';
import { AcceptanceCriteria, TestCategory } from '../../types/qaTypes';
import { QA_CONFIG } from '../../config/qaConfig';

describe('TestScriptGenerator', () => {
  let generator: TestScriptGenerator;
  
  beforeEach(() => {
    generator = new TestScriptGenerator();
    jest.clearAllMocks();
  });

  describe('classifyAcceptanceCriteria', () => {
    it('should classify navigation criteria correctly', () => {
      const criteria = 'WHEN user navigates to login page THEN system SHALL display login form';
      const result = generator.classifyAcceptanceCriteria(criteria);
      expect(result).toBe(QA_CONFIG.TEST_CATEGORIES.NAVIGATION);
    });

    it('should classify form validation criteria correctly', () => {
      const criteria = 'WHEN user submits invalid form THEN system SHALL validate input fields';
      const result = generator.classifyAcceptanceCriteria(criteria);
      expect(result).toBe(QA_CONFIG.TEST_CATEGORIES.FORM_VALIDATION);
    });

    it('should classify UI interaction criteria correctly', () => {
      const criteria = 'WHEN user clicks toggle button THEN system SHALL change visibility';
      const result = generator.classifyAcceptanceCriteria(criteria);
      expect(result).toBe(QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION);
    });

    it('should classify accessibility criteria correctly', () => {
      const criteria = 'WHEN screen reader accesses element THEN system SHALL provide aria labels';
      const result = generator.classifyAcceptanceCriteria(criteria);
      expect(result).toBe(QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY);
    });

    it('should default to UI interaction for unclear criteria', () => {
      const criteria = 'Some unclear requirement';
      const result = generator.classifyAcceptanceCriteria(criteria);
      expect(result).toBe(QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION);
    });
  });

  // Note: createTestStructure tests would require fs mocking which is complex in this environment
  // The functionality is tested through integration tests

  describe('generateTestScript', () => {
    const mockCriteria: AcceptanceCriteria[] = [
      {
        id: '1.1',
        description: 'WHEN user clicks password toggle THEN system SHALL show/hide password',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        steps: [],
        requirementId: '1',
        userStory: 'As a user, I want to toggle password visibility'
      },
      {
        id: '1.2',
        description: 'WHEN user navigates to login page THEN system SHALL display form',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.NAVIGATION,
        steps: [],
        requirementId: '1',
        userStory: 'As a user, I want to access login page'
      }
    ];

    it('should generate a complete test script', async () => {
      const result = await generator.generateTestScript(mockCriteria, 'password-toggle');
      
      expect(result.fileName).toBe('password-toggle-test.js');
      expect(result.specName).toBe('password-toggle');
      expect(result.content).toContain('password-toggle - Automated QA Tests');
      expect(result.content).toContain('test.describe');
      expect(result.content).toContain('test.beforeEach');
      expect(result.content).toContain('captureScreenshot');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.metadata.specName).toBe('password-toggle');
      expect(result.metadata.totalSteps).toBe(result.steps.length);
    });

    it('should generate appropriate steps for UI interaction criteria', async () => {
      const uiCriteria: AcceptanceCriteria[] = [{
        id: '1.1',
        description: 'WHEN user clicks password toggle button THEN system SHALL toggle visibility',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
        steps: [],
        requirementId: '1',
        userStory: 'As a user, I want to toggle password visibility'
      }];

      const result = await generator.generateTestScript(uiCriteria, 'ui-test');
      
      const toggleStep = result.steps.find(step => step.id.includes('toggle'));
      expect(toggleStep).toBeDefined();
      expect(toggleStep?.action.type).toBe('click');
      expect(toggleStep?.action.selector).toContain('password-toggle');
    });

    it('should generate appropriate steps for form validation criteria', async () => {
      const formCriteria: AcceptanceCriteria[] = [{
        id: '2.1',
        description: 'WHEN user submits form THEN system SHALL validate required fields',
        testable: true,
        category: QA_CONFIG.TEST_CATEGORIES.FORM_VALIDATION,
        steps: [],
        requirementId: '2',
        userStory: 'As a user, I want form validation'
      }];

      const result = await generator.generateTestScript(formCriteria, 'form-test');
      
      const validateStep = result.steps.find(step => step.id.includes('validate'));
      expect(validateStep).toBeDefined();
      expect(validateStep?.action.type).toBe('assert');
      expect(validateStep?.action.options?.validation).toBe(true);
    });

    it('should include navigation steps when needed', async () => {
      const result = await generator.generateTestScript(mockCriteria, 'nav-test');
      
      const navSteps = result.steps.filter(step => step.action.type === 'navigate');
      expect(navSteps.length).toBeGreaterThan(0);
    });

    it('should include screenshot steps', async () => {
      const result = await generator.generateTestScript(mockCriteria, 'screenshot-test');
      
      const screenshotSteps = result.steps.filter(step => step.action.type === 'screenshot');
      expect(screenshotSteps.length).toBeGreaterThan(0);
    });

    it('should handle empty criteria array', async () => {
      const result = await generator.generateTestScript([], 'empty-test');
      
      expect(result.steps).toHaveLength(0);
      expect(result.content).toContain('empty-test - Automated QA Tests');
      expect(result.metadata.totalSteps).toBe(0);
    });

    it('should filter out non-testable criteria', async () => {
      const mixedCriteria: AcceptanceCriteria[] = [
        {
          id: '1.1',
          description: 'Testable criterion with click action',
          testable: true,
          category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
          steps: [],
          requirementId: '1',
          userStory: 'Test story'
        },
        {
          id: '1.2',
          description: 'Non-testable business rule',
          testable: false,
          category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
          steps: [],
          requirementId: '1',
          userStory: 'Test story'
        }
      ];

      const result = await generator.generateTestScript(mixedCriteria, 'mixed-test');
      
      // Should only generate steps for testable criteria
      const testableSteps = result.steps.filter(step => 
        step.description.includes('Testable criterion')
      );
      expect(testableSteps.length).toBeGreaterThan(0);
      
      const nonTestableSteps = result.steps.filter(step => 
        step.description.includes('Non-testable')
      );
      expect(nonTestableSteps.length).toBe(0);
    });
  });

  // Note: saveTestScript and generateAndSaveTestScript tests would require fs mocking
  // The functionality is tested through integration tests
});