/**
 * Password Visibility MVP Example Usage
 * Demonstrates how to use the password-visibility-toggle MVP test generation
 */

import { 
  PasswordVisibilityMVP, 
  executePasswordVisibilityMVP, 
  generatePasswordVisibilityTestScript 
} from './passwordVisibilityMVP';

/**
 * Example 1: Generate password visibility test script only
 */
async function exampleGenerateTestScript() {
  console.log('=== Example 1: Generate Test Script ===');
  
  try {
    const result = await generatePasswordVisibilityTestScript();
    
    if (result.success) {
      console.log('✅ Test script generated successfully!');
      console.log(`📄 Test script path: ${result.testScriptPath}`);
    } else {
      console.error('❌ Failed to generate test script:', result.error);
    }
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

/**
 * Example 2: Execute complete MVP workflow
 */
async function exampleExecuteCompleteMVP() {
  console.log('\n=== Example 2: Execute Complete MVP ===');
  
  try {
    const result = await executePasswordVisibilityMVP();
    
    if (result.success) {
      console.log('✅ Password Visibility MVP completed successfully!');
      console.log(`📄 Test script: ${result.testScriptPath}`);
      
      if (result.executionResults) {
        console.log(`🧪 Test execution results available`);
      }
      
      if (result.reportPath) {
        console.log(`📊 Report updated: ${result.reportPath}`);
      }
    } else {
      console.error('❌ MVP failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

/**
 * Example 3: Use PasswordVisibilityMVP class directly for more control
 */
async function exampleAdvancedUsage() {
  console.log('\n=== Example 3: Advanced Usage ===');
  
  try {
    const mvp = new PasswordVisibilityMVP();
    
    // Step 1: Generate test script
    console.log('Step 1: Generating test script...');
    const generateResult = await mvp.generatePasswordVisibilityTestScript();
    
    if (!generateResult.success) {
      throw new Error(`Test generation failed: ${generateResult.error}`);
    }
    
    console.log('✅ Test script generated');
    
    // Step 2: Validate MVP requirements
    console.log('Step 2: Validating MVP requirements...');
    const validation = await mvp.validateMVPRequirements();
    
    if (validation.valid) {
      console.log('✅ MVP requirements validation passed');
    } else {
      console.warn('⚠️ MVP validation issues found:');
      validation.issues.forEach(issue => console.warn(`  - ${issue}`));
    }
    
    // Step 3: Generate and update report
    console.log('Step 3: Updating test summary report...');
    const reportResult = await mvp.generateAndUpdateReport();
    
    if (reportResult.success) {
      console.log('✅ Test summary report updated');
      console.log(`📊 Report path: ${reportResult.reportPath}`);
    } else {
      console.warn('⚠️ Report update failed:', reportResult.error);
    }
    
    console.log('\n🎉 Advanced MVP workflow completed!');
    
  } catch (error) {
    console.error('❌ Advanced example failed:', error);
  }
}

/**
 * Example 4: Execute test script after generation
 */
async function exampleExecuteGeneratedTest() {
  console.log('\n=== Example 4: Execute Generated Test ===');
  
  try {
    const mvp = new PasswordVisibilityMVP();
    
    // First generate the test script
    const generateResult = await mvp.generatePasswordVisibilityTestScript();
    
    if (!generateResult.success) {
      throw new Error(`Test generation failed: ${generateResult.error}`);
    }
    
    console.log('✅ Test script generated, now executing...');
    
    // Then execute it
    const executeResult = await mvp.executePasswordVisibilityTest();
    
    if (executeResult.success) {
      console.log('✅ Test execution completed!');
      console.log('📊 Execution results:', executeResult.executionResults);
    } else {
      console.error('❌ Test execution failed:', executeResult.error);
    }
    
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Password Visibility MVP Examples\n');
  
  await exampleGenerateTestScript();
  await exampleExecuteCompleteMVP();
  await exampleAdvancedUsage();
  await exampleExecuteGeneratedTest();
  
  console.log('\n✨ All examples completed!');
}

// Export examples for use
export {
  exampleGenerateTestScript,
  exampleExecuteCompleteMVP,
  exampleAdvancedUsage,
  exampleExecuteGeneratedTest,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}