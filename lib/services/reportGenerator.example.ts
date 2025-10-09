/**
 * Example usage of ReportGenerator
 * 
 * This example demonstrates how to use the ReportGenerator to create
 * spec-based test reports and update Tests-Summary.md
 */

import ReportGenerator from './reportGenerator';
import { TestResult, StepResult } from '../types/qaTypes';

async function exampleReportGeneration() {
  console.log('🚀 ReportGenerator Example');
  console.log('==========================\n');

  const reportGenerator = new ReportGenerator();

  // Example 1: Create mock test results for password visibility toggle spec
  console.log('📝 Creating mock test results for password-visibility-toggle spec...');
  
  const passwordToggleSteps: StepResult[] = [
    {
      stepId: 'step-1',
      description: 'Navigate to login page',
      status: 'Passed',
      screenshot: 'step1-navigate.png',
      executionTime: 1200,
      timestamp: new Date('2024-01-15T10:00:00Z')
    },
    {
      stepId: 'step-2', 
      description: 'Enter password in password field',
      status: 'Passed',
      screenshot: 'step2-enter-password.png',
      executionTime: 800,
      timestamp: new Date('2024-01-15T10:00:01Z')
    },
    {
      stepId: 'step-3',
      description: 'Click password visibility toggle button',
      status: 'Passed',
      screenshot: 'step3-click-toggle.png',
      executionTime: 500,
      timestamp: new Date('2024-01-15T10:00:02Z')
    },
    {
      stepId: 'step-4',
      description: 'Verify password is visible as plain text',
      status: 'Passed',
      screenshot: 'step4-verify-visible.png',
      executionTime: 300,
      timestamp: new Date('2024-01-15T10:00:03Z')
    },
    {
      stepId: 'step-5',
      description: 'Click toggle again to hide password',
      status: 'Passed',
      screenshot: 'step5-hide-password.png',
      executionTime: 400,
      timestamp: new Date('2024-01-15T10:00:04Z')
    }
  ];

  const passwordToggleResult: TestResult = {
    specName: 'password-visibility-toggle',
    testScript: 'password-visibility-toggle-test.js',
    steps: passwordToggleSteps,
    overallStatus: 'Passed',
    executionTime: 3200,
    screenshots: passwordToggleSteps.map(step => step.screenshot!),
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T10:00:03Z')
  };

  // Example 2: Create mock test results for user authentication spec
  console.log('📝 Creating mock test results for user-authentication spec...');
  
  const authSteps: StepResult[] = [
    {
      stepId: 'auth-1',
      description: 'Navigate to login page',
      status: 'Passed',
      screenshot: 'auth1-navigate.png',
      executionTime: 1000,
      timestamp: new Date('2024-01-15T10:05:00Z')
    },
    {
      stepId: 'auth-2',
      description: 'Enter valid email address',
      status: 'Passed',
      screenshot: 'auth2-enter-email.png',
      executionTime: 600,
      timestamp: new Date('2024-01-15T10:05:01Z')
    },
    {
      stepId: 'auth-3',
      description: 'Enter valid password',
      status: 'Passed',
      screenshot: 'auth3-enter-password.png',
      executionTime: 500,
      timestamp: new Date('2024-01-15T10:05:02Z')
    },
    {
      stepId: 'auth-4',
      description: 'Click sign in button',
      status: 'Failed',
      errorMessage: 'Sign in button not responding to click events',
      screenshot: 'auth4-click-signin.png',
      executionTime: 2000,
      timestamp: new Date('2024-01-15T10:05:04Z')
    }
  ];

  const authResult: TestResult = {
    specName: 'user-authentication',
    testScript: 'user-authentication-test.js',
    steps: authSteps,
    overallStatus: 'Failed',
    executionTime: 4100,
    screenshots: authSteps.map(step => step.screenshot!),
    startTime: new Date('2024-01-15T10:05:00Z'),
    endTime: new Date('2024-01-15T10:05:04Z')
  };

  // Example 3: Organize results by specs
  console.log('📊 Organizing test results by specifications...');
  
  const allResults = [passwordToggleResult, authResult];
  const specSections = reportGenerator.organizeBySpecs(allResults);
  
  console.log(`Found ${specSections.length} specifications:`);
  specSections.forEach(section => {
    console.log(`  - ${section.specName}: ${section.overallStatus} (${section.testResults.length} tests)`);
  });

  // Example 4: Generate individual spec section
  console.log('\n📄 Generating spec section for password-visibility-toggle...');
  
  const specSection = reportGenerator.generateSpecSection(passwordToggleResult);
  console.log('Generated section preview:');
  console.log(specSection.substring(0, 300) + '...\n');

  // Example 5: Generate complete markdown report
  console.log('📋 Generating complete markdown report...');
  
  const reportData = {
    generatedAt: new Date(),
    summary: {
      totalSpecs: 2,
      totalTests: 2,
      passedTests: 1,
      failedTests: 1,
      skippedTests: 0,
      executionTime: 7300,
      screenshotsCaptured: 9
    },
    specSections,
    errors: []
  };

  const markdownReport = reportGenerator.generateMarkdownReport(reportData);
  console.log('Report structure:');
  const lines = markdownReport.split('\n');
  const headers = lines.filter(line => line.startsWith('#'));
  headers.forEach(header => console.log(`  ${header}`));

  // Example 6: Update Tests-Summary.md (commented out to avoid file system changes)
  console.log('\n💾 Updating Tests-Summary.md...');
  console.log('(Skipped in example - would write to QA/Tests-Summary.md)');
  
  /*
  try {
    await reportGenerator.updateTestsSummary(allResults);
    console.log('✅ Tests-Summary.md updated successfully!');
  } catch (error) {
    console.error('❌ Failed to update Tests-Summary.md:', error);
  }
  */

  // Example 7: Demonstrate spec-based vs category-based organization
  console.log('\n🔄 Spec-based vs Category-based Organization:');
  console.log('OLD (Category-based):');
  console.log('  - Authentication Tests');
  console.log('    - Magic Link Test');
  console.log('    - Login Test');
  console.log('  - UI Tests');
  console.log('    - Password Toggle Test');
  console.log('');
  console.log('NEW (Spec-based):');
  console.log('  - Password Visibility Toggle Spec');
  console.log('    - All tests for this specification');
  console.log('  - User Authentication Spec');
  console.log('    - All tests for this specification');

  console.log('\n✨ ReportGenerator example completed!');
  console.log('The new format provides better traceability from specs to tests.');
}

// Example of integrating with existing QA framework
async function integrationExample() {
  console.log('\n🔗 Integration with Existing QA Framework');
  console.log('==========================================\n');

  console.log('Directory structure maintained:');
  console.log('QA/');
  console.log('├── Tests-Summary.md          # Updated with spec-based organization');
  console.log('├── assets/');
  console.log('│   ├── password-visibility-toggle/  # Spec-based asset folders');
  console.log('│   │   ├── step1-navigate.png');
  console.log('│   │   └── step2-toggle.png');
  console.log('│   └── user-authentication/');
  console.log('│       └── auth1-navigate.png');
  console.log('└── scripts/');
  console.log('    ├── password-visibility-toggle/  # Spec-based script folders');
  console.log('    │   └── password-visibility-toggle-test.js');
  console.log('    └── user-authentication/');
  console.log('        └── user-authentication-test.js');

  console.log('\nKey integration points:');
  console.log('✅ Maintains existing QA/ directory structure');
  console.log('✅ Uses same screenshot naming conventions');
  console.log('✅ Compatible with existing test scripts');
  console.log('✅ Preserves markdown table format for steps');
  console.log('✅ Links to original spec files in .kiro/specs/');
}

// Run examples if this file is executed directly
if (require.main === module) {
  exampleReportGeneration()
    .then(() => integrationExample())
    .catch(console.error);
}

export { exampleReportGeneration, integrationExample };