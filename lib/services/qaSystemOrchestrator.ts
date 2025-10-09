import { SpecAnalyzer } from './specAnalyzer';
import { TestScriptGenerator } from './testScriptGenerator';
import { PlaywrightTestRunner } from './playwrightTestRunner';
import { ScreenshotManager } from './screenshotManager';
import { ReportGenerator } from './reportGenerator';
import { MCPPlaywrightIntegration } from './mcpPlaywrightIntegration';
import { QA_CONFIG } from '../config/qaConfig';
import { QAResult, SpecMetadata, TestResult, QASummary, QAError } from '../types/qaTypes';

/**
 * Main orchestrator for the automated QA system
 * Coordinates all components to execute the complete QA flow
 */
export class QASystemOrchestrator {
  private specAnalyzer: SpecAnalyzer;
  private testGenerator: TestScriptGenerator;
  private testRunner: PlaywrightTestRunner;
  private screenshotManager: ScreenshotManager;
  private reportGenerator: ReportGenerator;
  private mcpService: MCPPlaywrightIntegration;

  constructor() {
    this.mcpService = new MCPPlaywrightIntegration();
    this.specAnalyzer = new SpecAnalyzer();
    this.testGenerator = new TestScriptGenerator();
    this.testRunner = new PlaywrightTestRunner(this.mcpService);
    this.screenshotManager = new ScreenshotManager(this.mcpService);
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Execute the complete QA process for a specific spec or all completed specs
   */
  async executeQAProcess(specName?: string): Promise<QAResult> {
    console.log('🚀 Starting Automated QA System...');
    
    const errors: QAError[] = [];
    
    try {
      // Step 1: Scan for specs
      console.log('📁 Scanning for specifications...');
      const availableSpecs = await this.specAnalyzer.scanSpecs();
      
      if (availableSpecs.length === 0) {
        throw new Error('No completed specifications found in .kiro/specs directory');
      }

      // Step 2: Select target spec(s)
      const targetSpecs = specName 
        ? [specName].filter(name => availableSpecs.includes(name))
        : availableSpecs;

      if (targetSpecs.length === 0) {
        throw new Error(`Specification '${specName}' not found or not completed`);
      }

      console.log(`🎯 Processing ${targetSpecs.length} specification(s): ${targetSpecs.join(', ')}`);

      const allResults: TestResult[] = [];

      // Step 3: Process each spec
      for (const specName of targetSpecs) {
        console.log(`\n📋 Processing spec: ${specName}`);
        
        try {
          const result = await this.processSpec(specName);
          allResults.push(result);
          console.log(`✅ Completed ${specName}: ${result.overallStatus}`);
        } catch (error) {
          console.error(`❌ Failed to process ${specName}:`, error);
          
          const qaError: QAError = {
            type: 'test-execution',
            message: error instanceof Error ? error.message : 'Unknown error',
            specName: specName,
            timestamp: new Date(),
            stack: error instanceof Error ? error.stack : undefined
          };
          errors.push(qaError);
          
          // Continue with other specs even if one fails
          allResults.push({
            specName: specName,
            testScript: '',
            steps: [],
            overallStatus: 'Failed',
            executionTime: 0,
            screenshots: [],
            startTime: new Date(),
            endTime: new Date(),
            errorSummary: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Step 4: Generate final report
      console.log('\n📊 Generating QA report...');
      await this.reportGenerator.updateTestsSummary(allResults);

      const passedCount = allResults.filter(r => r.overallStatus === 'Passed').length;
      const failedCount = allResults.filter(r => r.overallStatus === 'Failed').length;
      const skippedCount = allResults.filter(r => r.overallStatus === 'Skipped').length;

      console.log(`\n🎉 QA Process Complete!`);
      console.log(`✅ Passed: ${passedCount}`);
      console.log(`❌ Failed: ${failedCount}`);
      console.log(`⏭️ Skipped: ${skippedCount}`);

      const summary: QASummary = {
        totalSpecs: allResults.length,
        totalTests: allResults.reduce((sum, r) => sum + r.steps.length, 0),
        passedTests: allResults.reduce((sum, r) => sum + r.steps.filter(s => s.status === 'Passed').length, 0),
        failedTests: allResults.reduce((sum, r) => sum + r.steps.filter(s => s.status === 'Failed').length, 0),
        skippedTests: allResults.reduce((sum, r) => sum + r.steps.filter(s => s.status === 'Skipped').length, 0),
        executionTime: allResults.reduce((sum, r) => sum + r.executionTime, 0),
        screenshotsCaptured: allResults.reduce((sum, r) => sum + r.screenshots.length, 0)
      };

      return {
        success: failedCount === 0,
        specName: specName || 'all',
        testResults: allResults,
        summary,
        errors
      };

    } catch (error) {
      console.error('💥 QA System execution failed:', error);
      throw error;
    }
  }

  /**
   * Process a single specification through the complete QA pipeline
   */
  private async processSpec(specName: string): Promise<TestResult> {
    console.log(`  📖 Reading spec files for ${specName}...`);
    
    // Read spec files
    const specFiles = await this.specAnalyzer.readSpecFiles(specName);
    
    // Parse requirements and extract acceptance criteria
    console.log(`  🔍 Analyzing requirements...`);
    const parsedRequirements = await this.specAnalyzer.parseRequirements(specFiles.requirements);
    
    // Extract all acceptance criteria from parsed requirements
    const allAcceptanceCriteria = parsedRequirements.flatMap(req => req.acceptanceCriteria);
    
    if (allAcceptanceCriteria.length === 0) {
      throw new Error(`No testable acceptance criteria found in ${specName} requirements`);
    }

    console.log(`  📝 Found ${allAcceptanceCriteria.length} testable criteria`);

    // Generate test scripts
    console.log(`  🛠️ Generating test scripts...`);
    const testScript = await this.testGenerator.generateTestScript(allAcceptanceCriteria, specName);
    
    // Create directory structure
    await this.testGenerator.createTestStructure(specName);

    // Execute tests
    console.log(`  🎭 Executing Playwright tests...`);
    const testResult = await this.testRunner.executeTest(testScript, specName);

    return testResult;
  }

  /**
   * Get progress information about available specs
   */
  async getSpecsStatus(): Promise<string[]> {
    return await this.specAnalyzer.scanSpecs();
  }

  /**
   * Validate system configuration and dependencies
   */
  async validateSystem(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if Playwright MCP is available
      // This would be done through the MCP integration
      console.log('🔧 Validating system configuration...');
      
      // Check directory structure
      const fs = await import('fs/promises');
      
      try {
        await fs.access(QA_CONFIG.SPECS_DIR);
      } catch {
        issues.push(`Specs directory not found: ${QA_CONFIG.SPECS_DIR}`);
      }

      try {
        await fs.access(QA_CONFIG.QA_SCRIPTS_DIR);
      } catch {
        issues.push(`QA scripts directory not found: ${QA_CONFIG.QA_SCRIPTS_DIR}`);
      }

      try {
        await fs.access(QA_CONFIG.QA_ASSETS_DIR);
      } catch {
        issues.push(`QA assets directory not found: ${QA_CONFIG.QA_ASSETS_DIR}`);
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`System validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, issues };
    }
  }
}