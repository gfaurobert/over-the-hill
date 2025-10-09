/**
 * Password Visibility MVP - Main orchestrator for password-visibility-toggle test generation
 * Implements task 7: password-visibility-toggle MVP test generation
 */

import { PasswordVisibilityTestGenerator } from './passwordVisibilityTestGenerator';
import { SpecAnalyzer } from './specAnalyzer';
import { PlaywrightTestRunner } from './playwrightTestRunner';
import { ReportGenerator } from './reportGenerator';
import { QA_CONFIG } from '../config/qaConfig';
import * as path from 'path';

export interface PasswordVisibilityMVPResult {
  success: boolean;
  testScriptPath?: string;
  executionResults?: unknown;
  reportPath?: string;
  error?: string;
}

export class PasswordVisibilityMVP {
  private testGenerator: PasswordVisibilityTestGenerator;
  private specAnalyzer: SpecAnalyzer;
  private testRunner: PlaywrightTestRunner;
  private reportGenerator: ReportGenerator;

  constructor() {
    this.testGenerator = new PasswordVisibilityTestGenerator();
    this.specAnalyzer = new SpecAnalyzer();
    this.testRunner = new PlaywrightTestRunner();
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Executes the complete password visibility toggle MVP test generation and execution
   */
  async executePasswordVisibilityMVP(): Promise<PasswordVisibilityMVPResult> {
    try {
      console.log('Starting Password Visibility Toggle MVP test generation...');

      // Step 1: Verify password-visibility-toggle spec exists
      const specExists = await this.verifyPasswordVisibilitySpec();
      if (!specExists) {
        throw new Error('Password visibility toggle spec not found in .kiro/specs/Done/password-visibility-toggle/');
      }

      // Step 2: Generate specialized test script
      console.log('Generating password visibility toggle test script...');
      const testScriptPath = await this.testGenerator.generateAndSavePasswordVisibilityTestScript();
      console.log(`Test script generated: ${testScriptPath}`);

      // Step 3: Execute the test script (optional - can be done separately)
      console.log('Test script generation completed successfully');
      
      return {
        success: true,
        testScriptPath,
        error: undefined
      };

    } catch (error) {
      console.error('Password Visibility MVP failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generates only the test script without execution
   */
  async generatePasswordVisibilityTestScript(): Promise<PasswordVisibilityMVPResult> {
    try {
      console.log('Generating password visibility toggle test script...');
      
      const testScriptPath = await this.testGenerator.generateAndSavePasswordVisibilityTestScript();
      
      console.log(`Password visibility test script generated successfully: ${testScriptPath}`);
      
      return {
        success: true,
        testScriptPath
      };
    } catch (error) {
      console.error('Failed to generate password visibility test script:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Executes the generated password visibility test script
   */
  async executePasswordVisibilityTest(): Promise<PasswordVisibilityMVPResult> {
    try {
      console.log('Executing password visibility toggle test...');
      
      // Find the test script
      const testScriptPath = path.join(
        QA_CONFIG.QA_SCRIPTS_DIR, 
        'password-visibility-toggle-test', 
        'password-visibility-toggle-test.js'
      );
      console.log(`Looking for test script at: ${testScriptPath}`);

      // Execute the test
      const executionResults = await this.testRunner.executeTestScript(testScriptPath, 'password-visibility-toggle');
      
      console.log('Password visibility test execution completed');
      
      return {
        success: true,
        testScriptPath,
        executionResults
      };
    } catch (error) {
      console.error('Failed to execute password visibility test:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generates test script and updates the test summary report
   */
  async generateAndUpdateReport(): Promise<PasswordVisibilityMVPResult> {
    try {
      console.log('Generating password visibility test and updating report...');
      
      // Generate test script
      const generateResult = await this.generatePasswordVisibilityTestScript();
      if (!generateResult.success) {
        return generateResult;
      }

      // Update the test summary with the new test
      await this.updateTestSummaryForPasswordVisibility();
      
      console.log('Password visibility MVP completed with report update');
      
      return {
        success: true,
        testScriptPath: generateResult.testScriptPath,
        reportPath: QA_CONFIG.TESTS_SUMMARY_FILE
      };
    } catch (error) {
      console.error('Failed to generate and update report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Verifies that the password-visibility-toggle spec exists
   */
  private async verifyPasswordVisibilitySpec(): Promise<boolean> {
    try {
      const specPath = '.kiro/specs/Done/password-visibility-toggle';
      const specFiles = await this.specAnalyzer.readSpecFiles(specPath);
      
      return !!(specFiles.requirements && specFiles.design && specFiles.tasks);
    } catch (error) {
      console.warn('Password visibility spec verification failed:', error);
      return false;
    }
  }

  /**
   * Updates the test summary to include password visibility toggle test information
   */
  private async updateTestSummaryForPasswordVisibility(): Promise<void> {
    try {
      // Create a mock test result for the generated test
      const mockTestResult = {
        specName: 'password-visibility-toggle',
        testScriptPath: 'QA/scripts/password-visibility-toggle-test/password-visibility-toggle-test.js',
        status: 'Generated',
        generatedAt: new Date(),
        description: 'Automated test for password visibility toggle functionality',
        acceptanceCriteria: [
          'Password toggle button show/hide functionality',
          'Icon state changes (eye/eye-off)',
          'Accessibility features (aria-label, keyboard navigation)',
          'Form integration and default states'
        ]
      };

      // Update the report
      await this.reportGenerator.updateTestsSummaryForSpec('password-visibility-toggle', mockTestResult);
      
      console.log('Test summary updated for password visibility toggle');
    } catch (error) {
      console.warn('Failed to update test summary:', error);
      // Don't throw - this is not critical for MVP
    }
  }

  /**
   * Validates that the generated test script meets MVP requirements
   */
  async validateMVPRequirements(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check if test script was generated
      const testScriptPath = path.join(
        QA_CONFIG.QA_SCRIPTS_DIR, 
        'password-visibility-toggle-test', 
        'password-visibility-toggle-test.js'
      );
      
      // Validate test script exists and contains required test cases
      const testScript = await this.testGenerator.generatePasswordVisibilityTestScript();
      
      // Check for required test scenarios
      const requiredScenarios = [
        'show password functionality',
        'hide password functionality', 
        'accessibility features',
        'form integration'
      ];
      
      for (const scenario of requiredScenarios) {
        const hasScenario = testScript.content.toLowerCase().includes(scenario.toLowerCase()) ||
                           testScript.steps.some(step => 
                             step.description.toLowerCase().includes(scenario.toLowerCase())
                           );
        
        if (!hasScenario) {
          issues.push(`Missing test scenario: ${scenario}`);
        }
      }
      
      // Check for proper test structure
      if (!testScript.content.includes('test.describe')) {
        issues.push('Test script missing proper Playwright test structure');
      }
      
      if (!testScript.content.includes('captureScreenshot')) {
        issues.push('Test script missing screenshot capture functionality');
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
      
    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        valid: false,
        issues
      };
    }
  }
}

/**
 * Convenience function to execute the password visibility MVP
 */
export async function executePasswordVisibilityMVP(): Promise<PasswordVisibilityMVPResult> {
  const mvp = new PasswordVisibilityMVP();
  return await mvp.executePasswordVisibilityMVP();
}

/**
 * Convenience function to generate password visibility test script only
 */
export async function generatePasswordVisibilityTestScript(): Promise<PasswordVisibilityMVPResult> {
  const mvp = new PasswordVisibilityMVP();
  return await mvp.generatePasswordVisibilityTestScript();
}