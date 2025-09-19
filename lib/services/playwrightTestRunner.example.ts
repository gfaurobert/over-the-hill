/**
 * Example usage of PlaywrightTestRunner
 * This file demonstrates how to use the test runner with various scenarios
 */

import { PlaywrightTestRunner } from './playwrightTestRunner';
import { TestScript, TestStep } from '../types/qaTypes';

/**
 * Example: Basic test script execution
 */
export async function runBasicTest() {
  const testRunner = new PlaywrightTestRunner({
    baseUrl: 'http://localhost:3001',
    testTimeout: 10000,
    maxRetries: 2,
    headless: false
  });

  const basicTestScript: TestScript = {
    fileName: 'basic-navigation-test.js',
    content: 'Generated test script for basic navigation',
    specName: 'basic-navigation',
    steps: [
      {
        id: 'navigate-home',
        description: 'Navigate to home page',
        action: {
          type: 'navigate',
          value: 'http://localhost:3001'
        },
        expectedResult: 'Home page loads successfully',
        screenshotName: 'home-page.png',
        category: 'navigation'
      },
      {
        id: 'verify-title',
        description: 'Verify page title is present',
        action: {
          type: 'assert',
          selector: 'h1'
        },
        expectedResult: 'Page title is visible',
        screenshotName: 'page-title.png',
        category: 'ui-interaction'
      }
    ],
    metadata: {
      specName: 'basic-navigation',
      generatedAt: new Date(),
      version: '1.0.0',
      totalSteps: 2,
      estimatedDuration: 5000
    }
  };

  try {
    console.log('Starting basic test execution...');
    const result = await testRunner.executeTest(basicTestScript, 'basic-navigation');
    
    console.log('Test Results:');
    console.log(`- Overall Status: ${result.overallStatus}`);
    console.log(`- Execution Time: ${result.executionTime}ms`);
    console.log(`- Screenshots Captured: ${result.screenshots.length}`);
    console.log(`- Steps Executed: ${result.steps.length}`);
    
    result.steps.forEach((step, index) => {
      console.log(`  Step ${index + 1}: ${step.description} - ${step.status}`);
      if (step.errorMessage) {
        console.log(`    Error: ${step.errorMessage}`);
      }
    });

    return result;
  } catch (error) {
    console.error('Test execution failed:', error);
    throw error;
  } finally {
    await testRunner.teardownBrowser();
  }
}

/**
 * Example: Password visibility toggle test (MVP scenario)
 */
export async function runPasswordVisibilityTest() {
  const testRunner = new PlaywrightTestRunner({
    baseUrl: 'http://localhost:3001',
    testTimeout: 15000,
    maxRetries: 1
  });

  const passwordTestScript: TestScript = {
    fileName: 'password-visibility-test.js',
    content: 'Generated test script for password visibility toggle',
    specName: 'password-visibility-toggle',
    steps: [
      {
        id: 'navigate-login',
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
        id: 'toggle-visibility',
        description: 'Click password visibility toggle',
        action: {
          type: 'click',
          selector: '[data-testid="password-toggle"]'
        },
        expectedResult: 'Password visibility toggles',
        screenshotName: 'password-toggled.png',
        category: 'ui-interaction'
      },
      {
        id: 'verify-visible',
        description: 'Verify password is now visible',
        action: {
          type: 'assert',
          selector: 'input[type="text"]'
        },
        expectedResult: 'Password field type is now text',
        screenshotName: 'password-visible.png',
        category: 'form-validation'
      }
    ],
    metadata: {
      specName: 'password-visibility-toggle',
      generatedAt: new Date(),
      version: '1.0.0',
      totalSteps: 4,
      estimatedDuration: 10000
    }
  };

  try {
    console.log('Starting password visibility test...');
    const result = await testRunner.executeTest(passwordTestScript, 'password-visibility-toggle');
    
    console.log('Password Visibility Test Results:');
    console.log(`- Overall Status: ${result.overallStatus}`);
    console.log(`- Total Steps: ${result.steps.length}`);
    console.log(`- Passed Steps: ${result.steps.filter(s => s.status === 'Passed').length}`);
    console.log(`- Failed Steps: ${result.steps.filter(s => s.status === 'Failed').length}`);
    console.log(`- Screenshots: ${result.screenshots.length}`);

    return result;
  } catch (error) {
    console.error('Password visibility test failed:', error);
    throw error;
  } finally {
    await testRunner.teardownBrowser();
  }
}

/**
 * Example: Error handling and recovery
 */
export async function runErrorHandlingTest() {
  const testRunner = new PlaywrightTestRunner({
    baseUrl: 'http://localhost:3001',
    testTimeout: 5000,
    maxRetries: 3 // Higher retries for demonstration
  });

  const errorTestScript: TestScript = {
    fileName: 'error-handling-test.js',
    content: 'Test script demonstrating error handling',
    specName: 'error-handling',
    steps: [
      {
        id: 'valid-navigation',
        description: 'Navigate to valid page',
        action: {
          type: 'navigate',
          value: 'http://localhost:3001'
        },
        expectedResult: 'Page loads successfully',
        screenshotName: 'valid-page.png',
        category: 'navigation'
      },
      {
        id: 'missing-element',
        description: 'Try to interact with missing element',
        action: {
          type: 'click',
          selector: '#non-existent-element'
        },
        expectedResult: 'Element should be clicked',
        screenshotName: 'missing-element.png',
        category: 'ui-interaction'
      },
      {
        id: 'recovery-step',
        description: 'Continue with valid action after failure',
        action: {
          type: 'screenshot'
        },
        expectedResult: 'Screenshot captured for recovery',
        screenshotName: 'recovery.png',
        category: 'navigation'
      }
    ],
    metadata: {
      specName: 'error-handling',
      generatedAt: new Date(),
      version: '1.0.0',
      totalSteps: 3,
      estimatedDuration: 8000
    }
  };

  try {
    console.log('Starting error handling test...');
    const result = await testRunner.executeTest(errorTestScript, 'error-handling');
    
    console.log('Error Handling Test Results:');
    console.log(`- Overall Status: ${result.overallStatus}`);
    console.log(`- Error Summary: ${result.errorSummary || 'None'}`);
    
    result.steps.forEach((step, index) => {
      console.log(`  Step ${index + 1}: ${step.description}`);
      console.log(`    Status: ${step.status}`);
      console.log(`    Execution Time: ${step.executionTime}ms`);
      if (step.errorMessage) {
        console.log(`    Error: ${step.errorMessage}`);
      }
    });

    return result;
  } catch (error) {
    console.error('Error handling test failed:', error);
    throw error;
  } finally {
    await testRunner.teardownBrowser();
  }
}

/**
 * Example: Running multiple tests in sequence
 */
export async function runTestSuite() {
  console.log('=== Running Complete Test Suite ===\n');
  
  const results = [];
  
  try {
    console.log('1. Running Basic Navigation Test...');
    const basicResult = await runBasicTest();
    results.push(basicResult);
    console.log('✓ Basic test completed\n');
    
    console.log('2. Running Password Visibility Test...');
    const passwordResult = await runPasswordVisibilityTest();
    results.push(passwordResult);
    console.log('✓ Password test completed\n');
    
    console.log('3. Running Error Handling Test...');
    const errorResult = await runErrorHandlingTest();
    results.push(errorResult);
    console.log('✓ Error handling test completed\n');
    
  } catch (error) {
    console.error('Test suite execution failed:', error);
  }
  
  // Summary
  console.log('=== Test Suite Summary ===');
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.overallStatus === 'Passed').length}`);
  console.log(`Failed: ${results.filter(r => r.overallStatus === 'Failed').length}`);
  console.log(`Total Screenshots: ${results.reduce((sum, r) => sum + r.screenshots.length, 0)}`);
  console.log(`Total Execution Time: ${results.reduce((sum, r) => sum + r.executionTime, 0)}ms`);
  
  return results;
}

// Export for use in other modules
export {
  PlaywrightTestRunner
};