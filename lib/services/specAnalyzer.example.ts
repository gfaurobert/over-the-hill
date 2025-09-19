/**
 * Example usage of SpecAnalyzer
 * This demonstrates how to use the SpecAnalyzer to parse requirements
 */

import { SpecAnalyzer } from './specAnalyzer';

export async function exampleSpecAnalyzerUsage() {
  const analyzer = new SpecAnalyzer();
  
  try {
    // 1. Scan for completed specs
    console.log('Scanning for completed specs...');
    const completedSpecs = await analyzer.scanSpecs();
    console.log(`Found ${completedSpecs.length} completed specs:`, completedSpecs);
    
    // 2. Get metadata for a specific spec
    const specName = 'automated-spec-qa-system';
    console.log(`\nGetting metadata for ${specName}...`);
    const metadata = await analyzer.getSpecMetadata(specName);
    console.log('Spec metadata:', {
      name: metadata.name,
      status: metadata.status,
      hasRequirements: metadata.hasRequirements,
      hasDesign: metadata.hasDesign,
      hasTasks: metadata.hasTasks
    });
    
    // 3. Read and parse requirements
    console.log('\nReading spec files...');
    const specFiles = await analyzer.readSpecFiles(specName);
    
    console.log('Parsing requirements...');
    const requirements = await analyzer.parseRequirements(specFiles.requirements);
    
    console.log(`\nParsed ${requirements.length} requirements:`);
    requirements.forEach(req => {
      console.log(`\nRequirement ${req.id}:`);
      console.log(`User Story: ${req.userStory}`);
      console.log(`Acceptance Criteria: ${req.acceptanceCriteria.length} items`);
      
      req.acceptanceCriteria.forEach(criteria => {
        console.log(`  - ${criteria.id}: ${criteria.description.substring(0, 60)}...`);
        console.log(`    Testable: ${criteria.testable}, Category: ${criteria.category}`);
      });
    });
    
    // 4. Summary statistics
    const allCriteria = requirements.flatMap(req => req.acceptanceCriteria);
    const testable = allCriteria.filter(c => c.testable);
    const categories = allCriteria.reduce((acc, criteria) => {
      acc[criteria.category] = (acc[criteria.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n--- Summary ---');
    console.log(`Total Acceptance Criteria: ${allCriteria.length}`);
    console.log(`Testable: ${testable.length}`);
    console.log(`Non-testable: ${allCriteria.length - testable.length}`);
    console.log('Categories:', categories);
    
    return {
      requirements,
      metadata,
      summary: {
        totalCriteria: allCriteria.length,
        testableCriteria: testable.length,
        categories
      }
    };
    
  } catch (error) {
    console.error('Error in SpecAnalyzer example:', error);
    throw error;
  }
}

// Export for use in other modules
export default exampleSpecAnalyzerUsage;