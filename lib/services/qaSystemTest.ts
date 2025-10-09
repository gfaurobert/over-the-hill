/**
 * Simple test to validate QA system integration
 */

import { QA_CONFIG } from '../config/qaConfig';

export async function testQASystemBasics(): Promise<void> {
  console.log('🧪 Testing QA System Basics...');
  
  try {
    // Test 1: Configuration access
    console.log('📋 Testing configuration...');
    console.log(`  Specs directory: ${QA_CONFIG.SPECS_DIR}`);
    console.log(`  QA scripts directory: ${QA_CONFIG.QA_SCRIPTS_DIR}`);
    console.log(`  Tests summary file: ${QA_CONFIG.TESTS_SUMMARY_FILE}`);
    
    // Test 2: Directory structure
    console.log('📁 Testing directory structure...');
    const fs = await import('fs/promises');
    
    try {
      await fs.access(QA_CONFIG.SPECS_DIR);
      console.log(`  ✅ Specs directory exists: ${QA_CONFIG.SPECS_DIR}`);
    } catch {
      console.log(`  ❌ Specs directory missing: ${QA_CONFIG.SPECS_DIR}`);
    }
    
    try {
      await fs.access(QA_CONFIG.QA_SCRIPTS_DIR);
      console.log(`  ✅ QA scripts directory exists: ${QA_CONFIG.QA_SCRIPTS_DIR}`);
    } catch {
      console.log(`  ❌ QA scripts directory missing: ${QA_CONFIG.QA_SCRIPTS_DIR}`);
    }
    
    // Test 3: Agent hook file
    console.log('🪝 Testing agent hook...');
    try {
      const hookPath = '.kiro/hooks/automated-qa-system.kiro.hook';
      await fs.access(hookPath);
      const hookContent = await fs.readFile(hookPath, 'utf-8');
      const hookConfig = JSON.parse(hookContent);
      console.log(`  ✅ Agent hook exists: ${hookConfig.name}`);
      console.log(`  📝 Description: ${hookConfig.description}`);
      console.log(`  🎯 Enabled: ${hookConfig.enabled}`);
    } catch (error) {
      console.log(`  ❌ Agent hook issue:`, error);
    }
    
    console.log('\n🎉 QA System basic tests completed!');
    
  } catch (error) {
    console.error('❌ QA System basic test failed:', error);
    throw error;
  }
}

// Export for use in other files
export default testQASystemBasics;