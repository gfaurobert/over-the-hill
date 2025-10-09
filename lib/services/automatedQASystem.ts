import { QASystemOrchestrator } from './qaSystemOrchestrator';

/**
 * Main entry point for the Automated QA System
 * This function is called by the Kiro agent hook
 */
export async function executeAutomatedQA(specName?: string): Promise<void> {
  console.log('🤖 Automated QA System triggered by agent hook');
  
  const orchestrator = new QASystemOrchestrator();
  
  try {
    // Validate system before execution
    console.log('🔍 Validating system configuration...');
    const validation = await orchestrator.validateSystem();
    
    if (!validation.valid) {
      console.error('❌ System validation failed:');
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error('System validation failed. Please check configuration.');
    }
    
    console.log('✅ System validation passed');
    
    // Execute the QA process
    const result = await orchestrator.executeQAProcess(specName);
    
    // Report results
    if (result.success) {
      console.log(`\n🎉 QA Process completed successfully!`);
      console.log(`📊 Results: ${result.passedSpecs}/${result.processedSpecs} specs passed`);
      console.log(`📄 Report updated: ${result.reportPath}`);
    } else {
      console.log(`\n⚠️ QA Process completed with failures`);
      console.log(`📊 Results: ${result.passedSpecs}/${result.processedSpecs} specs passed`);
      console.log(`📄 Report updated: ${result.reportPath}`);
      
      // List failed specs
      const failedSpecs = result.results.filter(r => r.overallStatus === 'Failed');
      if (failedSpecs.length > 0) {
        console.log(`\n❌ Failed specs:`);
        failedSpecs.forEach(spec => {
          console.log(`  - ${spec.specName}: ${spec.errorMessage || 'Test execution failed'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('\n💥 Automated QA System failed:', error);
    throw error;
  }
}

/**
 * Execute QA for a specific spec (convenience function)
 */
export async function executeQAForSpec(specName: string): Promise<void> {
  return executeAutomatedQA(specName);
}

/**
 * Execute QA for all completed specs (convenience function)
 */
export async function executeQAForAllSpecs(): Promise<void> {
  return executeAutomatedQA();
}

/**
 * Get status of available specs without executing tests
 */
export async function getQASystemStatus(): Promise<void> {
  console.log('📋 Checking QA System status...');
  
  const orchestrator = new QASystemOrchestrator();
  
  try {
    const specs = await orchestrator.getSpecsStatus();
    
    console.log(`\n📊 Found ${specs.length} completed specifications:`);
    specs.forEach(spec => {
      console.log(`  ✅ ${spec}`);
    });
    
    if (specs.length === 0) {
      console.log('  ℹ️ No completed specifications found in .kiro/specs directory');
      console.log('  💡 Complete a spec by finishing all tasks in its tasks.md file');
    }
    
  } catch (error) {
    console.error('❌ Failed to get QA system status:', error);
    throw error;
  }
}

// Export the main function as default for easy importing
export default executeAutomatedQA;