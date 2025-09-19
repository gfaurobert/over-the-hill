/**
 * Example usage of TestScriptGenerator
 * Demonstrates how to generate test scripts from acceptance criteria
 */

import { TestScriptGenerator } from './testScriptGenerator';
import { SpecAnalyzer } from './specAnalyzer';
import { AcceptanceCriteria } from '../types/qaTypes';
import { QA_CONFIG } from '../config/qaConfig';

async function demonstrateTestScriptGeneration() {
  console.log('🚀 TestScriptGenerator Demo\n');
  
  const generator = new TestScriptGenerator();
  const analyzer = new SpecAnalyzer();
  
  // Example acceptance criteria for password visibility toggle
  const mockCriteria: AcceptanceCriteria[] = [
    {
      id: '1.1',
      description: 'WHEN user clicks the password toggle button THEN the system SHALL show the password text',
      testable: true,
      category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
      steps: [],
      requirementId: '1',
      userStory: 'As a user, I want to toggle password visibility so that I can verify my password input'
    },
    {
      id: '1.2',
      description: 'WHEN user clicks the toggle button again THEN the system SHALL hide the password text',
      testable: true,
      category: QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION,
      steps: [],
      requirementId: '1',
      userStory: 'As a user, I want to toggle password visibility so that I can verify my password input'
    },
    {
      id: '2.1',
      description: 'WHEN screen reader accesses toggle button THEN the system SHALL provide appropriate aria-label',
      testable: true,
      category: QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY,
      steps: [],
      requirementId: '2',
      userStory: 'As a user, I want accessible password toggle functionality so that I can use screen readers effectively'
    }
  ];
  
  try {
    console.log('📋 Input Acceptance Criteria:');
    mockCriteria.forEach(criteria => {
      console.log(`  ${criteria.id}: ${criteria.description}`);
      console.log(`    Category: ${criteria.category}`);
      console.log(`    Testable: ${criteria.testable}\n`);
    });
    
    // Generate test script
    console.log('⚙️  Generating test script...\n');
    const testScript = await generator.generateTestScript(mockCriteria, 'password-visibility-toggle');
    
    console.log('✅ Test Script Generated Successfully!');
    console.log(`📄 File Name: ${testScript.fileName}`);
    console.log(`🎯 Spec Name: ${testScript.specName}`);
    console.log(`📊 Total Steps: ${testScript.metadata.totalSteps}`);
    console.log(`⏱️  Estimated Duration: ${testScript.metadata.estimatedDuration}ms\n`);
    
    console.log('🔍 Generated Test Steps:');
    testScript.steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.description}`);
      console.log(`     Action: ${step.action.type}`);
      if (step.action.selector) {
        console.log(`     Selector: ${step.action.selector}`);
      }
      console.log(`     Category: ${step.category}\n`);
    });
    
    console.log('📝 Generated Playwright Test Code Preview:');
    console.log('─'.repeat(80));
    // Show first 20 lines of the generated code
    const codeLines = testScript.content.split('\n');
    codeLines.slice(0, 20).forEach((line, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
    });
    console.log('   ... (truncated)');
    console.log('─'.repeat(80));
    
    // Demonstrate classification
    console.log('\n🏷️  Classification Examples:');
    const testCases = [
      'WHEN user clicks button THEN system SHALL respond',
      'WHEN user submits form THEN system SHALL validate input',
      'WHEN user navigates to page THEN system SHALL load content',
      'WHEN screen reader accesses element THEN system SHALL provide aria-label',
      'WHEN data is saved THEN system SHALL persist to database',
      'WHEN error occurs THEN system SHALL display error message'
    ];
    
    testCases.forEach(testCase => {
      const category = generator.classifyAcceptanceCriteria(testCase);
      console.log(`  "${testCase}"`);
      console.log(`    → ${category}\n`);
    });
    
    console.log('🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during demo:', error);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateTestScriptGeneration();
}

export { demonstrateTestScriptGeneration };