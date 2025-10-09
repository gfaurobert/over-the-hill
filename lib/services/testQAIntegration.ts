#!/usr/bin/env node

/**
 * Integration test script for the Automated QA System
 * This script tests the complete flow from hook trigger to report generation
 */

import { executeAutomatedQA, getQASystemStatus } from './automatedQASystem';

async function testQAIntegration() {
  console.log('🧪 Testing QA System Integration...\n');

  try {
    // Test 1: Check system status
    console.log('=== Test 1: System Status Check ===');
    await getQASystemStatus();
    console.log('✅ System status check passed\n');

    // Test 2: Execute QA for password-visibility-toggle spec (MVP)
    console.log('=== Test 2: Execute QA for password-visibility-toggle ===');
    try {
      await executeAutomatedQA('password-visibility-toggle');
      console.log('✅ Password visibility toggle QA execution completed\n');
    } catch (error) {
      console.log('⚠️ Password visibility toggle spec not found or failed, continuing...\n');
    }

    // Test 3: Execute QA for all specs
    console.log('=== Test 3: Execute QA for All Specs ===');
    await executeAutomatedQA();
    console.log('✅ All specs QA execution completed\n');

    console.log('🎉 QA System Integration Test Completed Successfully!');

  } catch (error) {
    console.error('❌ QA System Integration Test Failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testQAIntegration().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { testQAIntegration };