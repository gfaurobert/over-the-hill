#!/usr/bin/env node

/**
 * CLI script to test the Automated QA System
 * Usage: node scripts/test-qa-system.js [spec-name]
 */

const path = require('path');

// Add the lib directory to the module path
const libPath = path.join(__dirname, '..', 'lib');
require('module').globalPaths.push(libPath);

async function runQATest() {
  try {
    // Import the QA system (using dynamic import for ES modules)
    const { executeAutomatedQA, getQASystemStatus } = await import('../lib/services/automatedQASystem.js');
    
    const specName = process.argv[2];
    
    if (specName === '--status') {
      console.log('📊 Getting QA System Status...\n');
      await getQASystemStatus();
      return;
    }
    
    if (specName) {
      console.log(`🎯 Running QA for spec: ${specName}\n`);
      await executeAutomatedQA(specName);
    } else {
      console.log('🚀 Running QA for all completed specs...\n');
      await executeAutomatedQA();
    }
    
    console.log('\n✅ QA execution completed successfully!');
    
  } catch (error) {
    console.error('\n❌ QA execution failed:', error.message);
    console.error('\nUsage:');
    console.error('  node scripts/test-qa-system.js                    # Run QA for all specs');
    console.error('  node scripts/test-qa-system.js <spec-name>        # Run QA for specific spec');
    console.error('  node scripts/test-qa-system.js --status           # Check system status');
    process.exit(1);
  }
}

runQATest();