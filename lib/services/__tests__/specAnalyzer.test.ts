/**
 * Tests for SpecAnalyzer class
 */

import { SpecAnalyzer } from '../specAnalyzer';
import { QA_CONFIG } from '../../config/qaConfig';

describe('SpecAnalyzer', () => {
  let analyzer: SpecAnalyzer;

  beforeEach(() => {
    analyzer = new SpecAnalyzer();
  });

  describe('parseRequirements', () => {
    it('should parse basic requirements with EARS format', async () => {
      const requirementsContent = `
# Requirements Document

## Introduction
Test requirements document

## Requirements

### Requirement 1

**User Story:** As a user, I want to toggle password visibility so that I can verify my input.

#### Acceptance Criteria

1. WHEN I click the toggle button THEN the system SHALL show the password text
2. WHEN the password is visible THEN the system SHALL display an eye-slash icon
3. IF the field is empty THEN the system SHALL disable the toggle button

### Requirement 2

**User Story:** As a user, I want form validation so that I can submit valid data.

#### Acceptance Criteria

1. WHEN I submit invalid data THEN the system SHALL display error messages
2. WHEN all fields are valid THEN the system SHALL enable the submit button
`;

      const result = await analyzer.parseRequirements(requirementsContent);

      expect(result).toHaveLength(2);
      
      // Check first requirement
      expect(result[0].id).toBe('1');
      expect(result[0].userStory).toBe('As a user, I want to toggle password visibility so that I can verify my input.');
      expect(result[0].acceptanceCriteria).toHaveLength(3);
      
      // Check acceptance criteria parsing
      const firstCriteria = result[0].acceptanceCriteria[0];
      expect(firstCriteria.id).toBe('1.1');
      expect(firstCriteria.description).toBe('WHEN I click the toggle button THEN the system SHALL show the password text');
      expect(firstCriteria.testable).toBe(true);
      expect(firstCriteria.category).toBe(QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION);
      
      // Check second requirement
      expect(result[1].id).toBe('2');
      expect(result[1].acceptanceCriteria).toHaveLength(2);
    });

    it('should classify acceptance criteria correctly', async () => {
      const requirementsContent = `
### Requirement 1

**User Story:** As a user, I want various interactions.

#### Acceptance Criteria

1. WHEN I click the button THEN the system SHALL navigate to the next page
2. WHEN I validate the form THEN the system SHALL check required fields
3. WHEN I access the feature THEN the system SHALL provide keyboard navigation
4. WHEN I save data THEN the system SHALL persist to database
5. WHEN an error occurs THEN the system SHALL display error message
`;

      const result = await analyzer.parseRequirements(requirementsContent);
      const criteria = result[0].acceptanceCriteria;

      expect(criteria[0].category).toBe(QA_CONFIG.TEST_CATEGORIES.NAVIGATION);
      expect(criteria[1].category).toBe(QA_CONFIG.TEST_CATEGORIES.FORM_VALIDATION);
      expect(criteria[2].category).toBe(QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY);
      expect(criteria[3].category).toBe(QA_CONFIG.TEST_CATEGORIES.DATA_PERSISTENCE);
      expect(criteria[4].category).toBe(QA_CONFIG.TEST_CATEGORIES.ERROR_HANDLING);
    });

    it('should handle malformed requirements gracefully', async () => {
      const malformedContent = `
# Requirements Document

### Requirement 1

**User Story:** Missing acceptance criteria section

### Requirement 2

#### Acceptance Criteria

1. Criterion without user story

### Requirement 3

**User Story:** As a user, I want something.

#### Acceptance Criteria

No numbered criteria here, just text.
`;

      const result = await analyzer.parseRequirements(malformedContent);
      
      // Should handle gracefully and extract what it can
      expect(result).toHaveLength(1); // Only requirement 2 has numbered criteria
      expect(result[0].id).toBe('2');
      expect(result[0].userStory).toBe(''); // No user story for requirement 2
    });

    it('should identify testable vs non-testable criteria', async () => {
      const requirementsContent = `
### Requirement 1

**User Story:** As a user, I want mixed criteria.

#### Acceptance Criteria

1. WHEN I click the button THEN the system SHALL display a message
2. The system should be performant and scalable
3. WHEN I type in the input THEN the system SHALL validate the data
4. The application must comply with security standards
`;

      const result = await analyzer.parseRequirements(requirementsContent);
      const criteria = result[0].acceptanceCriteria;

      expect(criteria[0].testable).toBe(true); // EARS format with UI interaction
      expect(criteria[1].testable).toBe(false); // Performance requirement
      expect(criteria[2].testable).toBe(true); // EARS format with form interaction
      expect(criteria[3].testable).toBe(false); // Security compliance
    });
  });

  describe('EARS format parsing', () => {
    it('should parse WHEN/THEN/SHALL patterns correctly', async () => {
      const requirementsContent = `
### Requirement 1

**User Story:** As a user, I want EARS format testing.

#### Acceptance Criteria

1. WHEN I click the toggle THEN the system SHALL show the password
2. IF the field is empty THEN the system SHALL disable the button
3. WHILE typing THEN the system SHALL validate in real-time
`;

      const result = await analyzer.parseRequirements(requirementsContent);
      const criteria = result[0].acceptanceCriteria;

      // All should be testable due to EARS format
      expect(criteria.every(c => c.testable)).toBe(true);
      
      // Check descriptions are preserved
      expect(criteria[0].description).toContain('WHEN I click the toggle');
      expect(criteria[1].description).toContain('IF the field is empty');
      expect(criteria[2].description).toContain('WHILE typing');
    });
  });
});