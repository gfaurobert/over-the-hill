/**
 * Report Generator for Automated QA System
 * 
 * Generates spec-based test reports and updates Tests-Summary.md with organized results.
 * Replaces category-based organization with spec-based sections for better traceability.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { 
  ReportGenerator as IReportGenerator, 
  TestResult, 
  SpecSection, 
  ReportData,
  QASummary,
  QAError 
} from '../types/qaTypes';
import { QA_CONFIG } from '../config/qaConfig';

export class ReportGenerator implements IReportGenerator {
  private readonly testsummaryPath: string;
  private readonly qaAssetsDir: string;

  constructor() {
    this.testsummaryPath = join(process.cwd(), QA_CONFIG.TESTS_SUMMARY_FILE);
    this.qaAssetsDir = join(process.cwd(), QA_CONFIG.QA_ASSETS_DIR);
  }

  /**
   * Updates Tests-Summary.md with spec-based organization
   */
  async updateTestsSummary(results: TestResult[]): Promise<void> {
    try {
      const specSections = this.organizeBySpecs(results);
      const summary = this.generateSummary(results);
      const reportData: ReportData = {
        generatedAt: new Date(),
        summary,
        specSections,
        errors: []
      };

      const markdownContent = this.generateMarkdownReport(reportData);
      
      // Ensure directory exists
      await fs.mkdir(dirname(this.testsummaryPath), { recursive: true });
      
      // Write the updated report
      await fs.writeFile(this.testsummaryPath, markdownContent, 'utf-8');
      
      console.log(`✅ Tests-Summary.md updated with ${specSections.length} spec sections`);
    } catch (error) {
      console.error('❌ Failed to update Tests-Summary.md:', error);
      throw new Error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Organizes test results by specification folders
   */
  organizeBySpecs(results: TestResult[]): SpecSection[] {
    const specMap = new Map<string, TestResult[]>();
    
    // Group results by spec name
    results.forEach(result => {
      const specName = result.specName;
      if (!specMap.has(specName)) {
        specMap.set(specName, []);
      }
      specMap.get(specName)!.push(result);
    });

    // Convert to SpecSection array
    return Array.from(specMap.entries()).map(([specName, testResults]) => {
      const overallStatus = this.determineOverallStatus(testResults);
      const lastExecuted = new Date(Math.max(...testResults.map(r => r.endTime.getTime())));
      const screenshotCount = testResults.reduce((sum, r) => sum + r.screenshots.length, 0);
      const executionTime = testResults.reduce((sum, r) => sum + r.executionTime, 0);

      return {
        specName,
        description: this.generateSpecDescription(specName, testResults),
        testResults,
        overallStatus,
        lastExecuted,
        screenshotCount,
        executionTime
      };
    }).sort((a, b) => a.specName.localeCompare(b.specName));
  }

  /**
   * Generates a markdown section for a specific spec
   */
  generateSpecSection(result: TestResult): string {
    const { specName, steps, overallStatus, executionTime, screenshots } = result;
    
    let section = `### ${this.formatSpecName(specName)}\n\n`;
    section += `#### Description\n`;
    section += `Automated test execution for the ${specName} specification. `;
    section += `This test validates all acceptance criteria defined in the spec requirements.\n\n`;
    
    section += `#### Script\n`;
    section += `- QA/scripts/${specName}/${result.testScript}\n\n`;
    
    section += `#### Steps\n\n`;
    section += `| Steps | Expected Behavior | Actual Behavior | Status |\n`;
    section += `| --- | --- | --- | --- |\n`;
    
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      const status = step.status === 'Passed' ? 'Passed' : 'Failed';
      const screenshotPath = step.screenshot ? 
        `![step${stepNumber}-${step.stepId}.png](assets/${specName}/step${stepNumber}-${step.stepId}.png)` : 
        'No screenshot';
      
      section += `| ${step.description} | ${step.description} | `;
      section += `${step.errorMessage || 'Test executed as expected'} | `;
      section += `${screenshotPath} | ${status} |\n`;
    });
    
    section += `\n`;
    return section;
  }

  /**
   * Generates the complete markdown report
   */
  generateMarkdownReport(data: ReportData): string {
    let markdown = `# Tests Summary\n\n`;
    
    // Add generation timestamp
    markdown += `*Last updated: ${data.generatedAt.toLocaleString()}*\n\n`;
    
    // Add overview table organized by specs
    markdown += `## Specification Tests Overview\n\n`;
    markdown += `| Specification | Tests | Status | Last Executed |\n`;
    markdown += `| ------------- | ----- | ------ | ------------- |\n`;
    
    data.specSections.forEach(section => {
      const testCount = section.testResults.length;
      const statusIcon = this.getStatusIcon(section.overallStatus);
      const lastExecuted = section.lastExecuted.toLocaleDateString();
      const specLink = `[${this.formatSpecName(section.specName)}](#${this.generateAnchor(section.specName)})`;
      
      markdown += `| ${specLink} | ${testCount} | ${statusIcon} | ${lastExecuted} |\n`;
    });
    
    markdown += `\n---\n\n`;
    
    // Add detailed sections for each spec
    data.specSections.forEach(section => {
      markdown += this.generateDetailedSpecSection(section);
      markdown += `\n`;
    });
    
    // Add future tests section if no specs have been tested yet
    if (data.specSections.length === 0) {
      markdown += this.generateFutureTestsSection();
    }
    
    return markdown;
  }

  /**
   * Generates a detailed section for a specification
   */
  private generateDetailedSpecSection(section: SpecSection): string {
    let content = `## ${this.formatSpecName(section.specName)}\n\n`;
    
    // Add spec metadata
    content += `**Specification:** \`.kiro/specs/${section.specName}/\`\n`;
    content += `**Status:** ${this.getStatusIcon(section.overallStatus)} ${section.overallStatus}\n`;
    content += `**Tests:** ${section.testResults.length}\n`;
    content += `**Screenshots:** ${section.screenshotCount}\n`;
    content += `**Execution Time:** ${(section.executionTime / 1000).toFixed(2)}s\n`;
    content += `**Last Executed:** ${section.lastExecuted.toLocaleString()}\n\n`;
    
    // Add description
    content += `### Description\n${section.description}\n\n`;
    
    // Add test results for each test in the spec
    section.testResults.forEach((result, index) => {
      if (section.testResults.length > 1) {
        content += `#### Test ${index + 1}: ${result.testScript}\n\n`;
      }
      
      content += `**Script:** QA/scripts/${section.specName}/${result.testScript}\n\n`;
      content += `##### Steps\n\n`;
      content += `| Step | Description | Expected | Actual | Status |\n`;
      content += `| ---- | ----------- | -------- | ------ | ------ |\n`;
      
      result.steps.forEach((step, stepIndex) => {
        const stepNum = stepIndex + 1;
        const status = step.status === 'Passed' ? '✅ Passed' : '❌ Failed';
        const screenshot = step.screenshot ? 
          `![Step ${stepNum}](assets/${section.specName}/${step.screenshot})` : 
          'No screenshot';
        
        content += `| ${stepNum} | ${step.description} | `;
        content += `${step.description} | `;
        content += `${step.errorMessage || 'Executed successfully'} ${screenshot} | `;
        content += `${status} |\n`;
      });
      
      content += `\n`;
    });
    
    return content;
  }

  /**
   * Generates summary statistics
   */
  private generateSummary(results: TestResult[]): QASummary {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.overallStatus === 'Passed').length;
    const failedTests = results.filter(r => r.overallStatus === 'Failed').length;
    const skippedTests = results.filter(r => r.overallStatus === 'Skipped').length;
    const executionTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    const screenshotsCaptured = results.reduce((sum, r) => sum + r.screenshots.length, 0);
    
    return {
      totalSpecs: new Set(results.map(r => r.specName)).size,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      executionTime,
      screenshotsCaptured
    };
  }

  /**
   * Determines overall status for a group of test results
   */
  private determineOverallStatus(results: TestResult[]): 'Passed' | 'Failed' | 'Mixed' {
    const statuses = results.map(r => r.overallStatus);
    const uniqueStatuses = new Set(statuses);
    
    if (uniqueStatuses.size === 1) {
      return statuses[0] as 'Passed' | 'Failed';
    }
    
    return 'Mixed';
  }

  /**
   * Formats spec name for display
   */
  private formatSpecName(specName: string): string {
    return specName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generates description for a spec based on its test results
   */
  private generateSpecDescription(specName: string, results: TestResult[]): string {
    const totalSteps = results.reduce((sum, r) => sum + r.steps.length, 0);
    const formattedName = this.formatSpecName(specName);
    
    return `Automated testing for ${formattedName} specification with ${totalSteps} test steps. ` +
           `Validates all acceptance criteria and user interactions defined in the spec requirements.`;
  }

  /**
   * Gets status icon for display
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'Passed': return '✅';
      case 'Failed': return '❌';
      case 'Mixed': return '⚠️';
      case 'Skipped': return '⏭️';
      default: return '❓';
    }
  }

  /**
   * Generates anchor link for markdown headers
   */
  private generateAnchor(specName: string): string {
    return specName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  /**
   * Generates future tests section for empty reports
   */
  private generateFutureTestsSection(): string {
    return `## Future Automated Tests\n\n` +
           `Specifications will appear here as they are processed by the automated QA system.\n\n` +
           `### Available Specifications\n\n` +
           `The system will automatically detect completed specifications in \`.kiro/specs/\` and generate tests for:\n\n` +
           `- User interface interactions\n` +
           `- Authentication and authorization flows\n` +
           `- Data management operations\n` +
           `- Form validation and error handling\n` +
           `- Accessibility compliance\n` +
           `- Cross-browser compatibility\n\n` +
           `*Run the automated QA agent hook to generate tests for your specifications.*\n`;
  }
}

export default ReportGenerator;