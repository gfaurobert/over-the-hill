/**
 * Integration tests for SpecAnalyzer with real spec files
 */

import { SpecAnalyzer } from '../specAnalyzer';
import { readFile } from 'fs/promises';
import { scanSpecs } from '../../utils/specFileUtils';
import path from 'path';

describe('SpecAnalyzer Integration Tests', () => {
  let analyzer: SpecAnalyzer;

  beforeEach(() => {
    analyzer = new SpecAnalyzer();
  });

  describe('with automated-spec-qa-system requirements', () => {
    it('should parse the actual requirements file correctly', async () => {
      // Read the actual requirements file
      const requirementsPath = path.join('.kiro/specs/automated-spec-qa-system/requirements.md');
      const requirementsContent = await readFile(requirementsPath, 'utf-8');

      const result = await analyzer.parseRequirements(requirementsContent);

      // Should have 5 requirements based on the actual file
      expect(result).toHaveLength(5);

      // Check first requirement
      expect(result[0].id).toBe('1');
      expect(result[0].userStory).toContain('trigger an automated QA process');
      expect(result[0].acceptanceCriteria.length).toBeGreaterThan(0);

      // Check that EARS format criteria are identified as testable
      const testableCriteria = result.flatMap(req => req.acceptanceCriteria)
        .filter(criteria => criteria.testable);
      
      expect(testableCriteria.length).toBeGreaterThan(0);

      // Check that criteria are properly categorized
      const categories = result.flatMap(req => req.acceptanceCriteria)
        .map(criteria => criteria.category);
      
      expect(categories).toContain('ui-interaction');
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should scan specs directory and find specs', async () => {
      // Test the underlying scan function first
      const allSpecs = await scanSpecs();
      expect(allSpecs).toContain('automated-spec-qa-system');
      
      // Test the analyzer's filtered scan (only completed specs)
      const completedSpecs = await analyzer.scanSpecs();
      expect(Array.isArray(completedSpecs)).toBe(true);
      // automated-spec-qa-system won't be included since it's in-progress
    });

    it('should read spec files for automated-spec-qa-system', async () => {
      const specFiles = await analyzer.readSpecFiles('automated-spec-qa-system');
      
      expect(specFiles.requirements).toContain('Requirements Document');
      expect(specFiles.design).toContain('Design Document');
      expect(specFiles.tasks).toContain('Implementation Plan');
    });

    it('should get metadata for automated-spec-qa-system', async () => {
      const metadata = await analyzer.getSpecMetadata('automated-spec-qa-system');
      
      expect(metadata.name).toBe('automated-spec-qa-system');
      expect(metadata.hasRequirements).toBe(true);
      expect(metadata.hasDesign).toBe(true);
      expect(metadata.hasTasks).toBe(true);
      expect(metadata.status).toBe('in-progress'); // Since task 1 is completed but others are not
    });
  });
});