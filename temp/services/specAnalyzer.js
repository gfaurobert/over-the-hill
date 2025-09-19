"use strict";
/**
 * SpecAnalyzer - Analyzes spec files and parses requirements
 * Implements task 2: spec analyzer and requirements parser
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecAnalyzer = void 0;
const qaConfig_1 = require("../config/qaConfig");
const specFileUtils_1 = require("../utils/specFileUtils");
class SpecAnalyzer {
    /**
     * Scans .kiro/specs directory for completed specs
     */
    async scanSpecs() {
        try {
            const allSpecs = await (0, specFileUtils_1.scanSpecs)();
            const completedSpecs = [];
            // Filter for completed specs only
            for (const specName of allSpecs) {
                const metadata = await this.getSpecMetadata(specName);
                if (qaConfig_1.QA_CONFIG.SUPPORTED_SPEC_STATUS.includes(metadata.status)) {
                    completedSpecs.push(specName);
                }
            }
            return completedSpecs;
        }
        catch (error) {
            throw new Error(`Failed to scan specs: ${error}`);
        }
    }
    /**
     * Reads spec files for a given spec name
     */
    async readSpecFiles(specName) {
        return (0, specFileUtils_1.readSpecFiles)(specName);
    }
    /**
     * Gets metadata for a specific spec
     */
    async getSpecMetadata(specName) {
        return (0, specFileUtils_1.getSpecMetadata)(specName);
    }
    /**
     * Parses requirements.md file to extract acceptance criteria
     */
    async parseRequirements(requirements) {
        try {
            const parsedRequirements = [];
            // Split requirements into sections by "### Requirement" headers
            const requirementSections = this.extractRequirementSections(requirements);
            for (let i = 0; i < requirementSections.length; i++) {
                const section = requirementSections[i];
                const requirementId = `${i + 1}`;
                // Extract user story
                const userStory = this.extractUserStory(section);
                // Extract acceptance criteria
                const acceptanceCriteria = this.extractAcceptanceCriteria(section, requirementId, userStory);
                if (acceptanceCriteria.length > 0) {
                    parsedRequirements.push({
                        id: requirementId,
                        userStory,
                        acceptanceCriteria
                    });
                }
            }
            return parsedRequirements;
        }
        catch (error) {
            throw new Error(`Failed to parse requirements: ${error}`);
        }
    }
    /**
     * Extracts requirement sections from the requirements markdown
     */
    extractRequirementSections(requirements) {
        // Split by "### Requirement" headers
        const sections = requirements.split(/### Requirement \d+/);
        // Remove the first section (introduction) and filter empty sections
        return sections.slice(1).filter(section => section.trim().length > 0);
    }
    /**
     * Extracts user story from a requirement section
     */
    extractUserStory(section) {
        const userStoryMatch = section.match(/\*\*User Story:\*\*\s*(.+?)(?=\n|$)/);
        return userStoryMatch ? userStoryMatch[1].trim() : '';
    }
    /**
     * Extracts and parses acceptance criteria from a requirement section
     */
    extractAcceptanceCriteria(section, requirementId, userStory) {
        const criteria = [];
        // Find the acceptance criteria section
        const criteriaMatch = section.match(/#### Acceptance Criteria\s*([\s\S]*?)(?=###|$)/);
        if (!criteriaMatch)
            return criteria;
        const criteriaText = criteriaMatch[1];
        // Extract numbered criteria (1., 2., etc.)
        const numberedCriteria = criteriaText.match(/\d+\.\s+(.+?)(?=\d+\.|$)/gs);
        if (numberedCriteria) {
            numberedCriteria.forEach((criterion, index) => {
                const cleanCriterion = criterion.replace(/^\d+\.\s+/, '').trim();
                const criteriaId = `${requirementId}.${index + 1}`;
                // Parse EARS format and classify
                const earsMatch = this.parseEARSFormat(cleanCriterion);
                const isTestable = this.isTestable(cleanCriterion, earsMatch);
                const category = this.classifyAcceptanceCriteria(cleanCriterion);
                criteria.push({
                    id: criteriaId,
                    description: cleanCriterion,
                    testable: isTestable,
                    category,
                    steps: [], // Will be populated by test generator
                    requirementId,
                    userStory
                });
            });
        }
        return criteria;
    }
    /**
     * Parses EARS format requirements (WHEN/THEN/SHALL patterns)
     */
    parseEARSFormat(criterion) {
        const patterns = qaConfig_1.QA_CONFIG.EARS_PATTERNS;
        // Try WHEN/THEN pattern
        const whenMatch = patterns.WHEN_THEN.exec(criterion);
        if (whenMatch) {
            return {
                pattern: 'WHEN_THEN',
                condition: whenMatch[1].trim(),
                system: whenMatch[2].trim(),
                response: whenMatch[3].trim(),
                fullMatch: whenMatch[0]
            };
        }
        // Try IF/THEN pattern
        const ifMatch = patterns.IF_THEN.exec(criterion);
        if (ifMatch) {
            return {
                pattern: 'IF_THEN',
                condition: ifMatch[1].trim(),
                system: ifMatch[2].trim(),
                response: ifMatch[3].trim(),
                fullMatch: ifMatch[0]
            };
        }
        // Try WHILE/THEN pattern
        const whileMatch = patterns.WHILE_THEN.exec(criterion);
        if (whileMatch) {
            return {
                pattern: 'WHILE_THEN',
                condition: whileMatch[1].trim(),
                system: whileMatch[2].trim(),
                response: whileMatch[3].trim(),
                fullMatch: whileMatch[0]
            };
        }
        return null;
    }
    /**
     * Determines if an acceptance criterion is testable
     */
    isTestable(criterion, earsMatch) {
        // EARS format criteria are generally testable
        if (earsMatch)
            return true;
        // Check for testable keywords
        const testableKeywords = [
            'click', 'type', 'navigate', 'display', 'show', 'hide',
            'validate', 'submit', 'load', 'save', 'delete', 'update',
            'visible', 'enabled', 'disabled', 'selected', 'checked'
        ];
        const lowerCriterion = criterion.toLowerCase();
        return testableKeywords.some(keyword => lowerCriterion.includes(keyword));
    }
    /**
     * Classifies acceptance criteria into test categories
     */
    classifyAcceptanceCriteria(criterion) {
        const lowerCriterion = criterion.toLowerCase();
        // Navigation patterns (check first as they're more specific)
        if (lowerCriterion.includes('navigate') ||
            lowerCriterion.includes('redirect') ||
            lowerCriterion.includes('page') ||
            lowerCriterion.includes('route')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.NAVIGATION;
        }
        // Form validation patterns
        if (lowerCriterion.includes('validate') ||
            lowerCriterion.includes('required') ||
            lowerCriterion.includes('input') ||
            lowerCriterion.includes('form')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.FORM_VALIDATION;
        }
        // Accessibility patterns
        if (lowerCriterion.includes('accessible') ||
            lowerCriterion.includes('aria') ||
            lowerCriterion.includes('screen reader') ||
            lowerCriterion.includes('keyboard')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.ACCESSIBILITY;
        }
        // Data persistence patterns
        if (lowerCriterion.includes('save') ||
            lowerCriterion.includes('store') ||
            lowerCriterion.includes('persist') ||
            lowerCriterion.includes('database')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.DATA_PERSISTENCE;
        }
        // Error handling patterns
        if (lowerCriterion.includes('error') ||
            lowerCriterion.includes('fail') ||
            lowerCriterion.includes('invalid') ||
            lowerCriterion.includes('exception')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.ERROR_HANDLING;
        }
        // UI interaction patterns (check last as they're more general)
        if (lowerCriterion.includes('click') ||
            lowerCriterion.includes('button') ||
            lowerCriterion.includes('toggle') ||
            lowerCriterion.includes('select')) {
            return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION;
        }
        // Default to UI interaction
        return qaConfig_1.QA_CONFIG.TEST_CATEGORIES.UI_INTERACTION;
    }
}
exports.SpecAnalyzer = SpecAnalyzer;
