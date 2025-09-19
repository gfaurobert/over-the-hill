/**
 * Core TypeScript interfaces for the automated QA system
 */

import { TestCategory } from '../config/qaConfig';

// Agent Hook Interfaces
export interface QAAgentHook {
  name: string;
  description: string;
  trigger: 'manual';
  execute: (specName?: string) => Promise<QAResult>;
}

export interface QAConfig {
  baseUrl: string;
  screenshotPath: string;
  testTimeout: number;
  browserOptions: PlaywrightBrowserOptions;
  maxRetries: number;
  headless: boolean;
}

export interface PlaywrightBrowserOptions {
  headless: boolean;
  viewport: { width: number; height: number };
  ignoreHTTPSErrors: boolean;
  slowMo: number;
}

// Spec Analysis Interfaces
export interface SpecFiles {
  requirements: string;
  design: string;
  tasks: string;
}

export interface SpecMetadata {
  name: string;
  path: string;
  status: 'completed' | 'in-progress' | 'not-started';
  lastModified: Date;
  hasRequirements: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  testable: boolean;
  category: TestCategory;
  steps: TestStep[];
  requirementId: string;
  userStory: string;
}

export interface ParsedRequirement {
  id: string;
  userStory: string;
  acceptanceCriteria: AcceptanceCriteria[];
}

// Test Generation Interfaces
export interface TestScript {
  fileName: string;
  content: string;
  specName: string;
  steps: TestStep[];
  metadata: TestMetadata;
}

export interface TestStep {
  id: string;
  description: string;
  action: PlaywrightAction;
  expectedResult: string;
  screenshotName: string;
  category: TestCategory;
  timeout?: number;
}

export interface TestMetadata {
  specName: string;
  generatedAt: Date;
  version: string;
  totalSteps: number;
  estimatedDuration: number;
}

export interface PlaywrightAction {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'assert' | 'screenshot';
  selector?: string;
  value?: string;
  timeout?: number;
  options?: Record<string, any>;
}

// Test Execution Interfaces
export interface TestResult {
  specName: string;
  testScript: string;
  steps: StepResult[];
  overallStatus: 'Passed' | 'Failed' | 'Skipped';
  executionTime: number;
  screenshots: string[];
  startTime: Date;
  endTime: Date;
  errorSummary?: string;
}

export interface StepResult {
  stepId: string;
  description: string;
  status: 'Passed' | 'Failed' | 'Skipped';
  screenshot?: string;
  errorMessage?: string;
  executionTime: number;
  timestamp: Date;
}

export interface QAResult {
  success: boolean;
  specName: string;
  testResults: TestResult[];
  summary: QASummary;
  errors: QAError[];
}

export interface QASummary {
  totalSpecs: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  executionTime: number;
  screenshotsCaptured: number;
}

export interface QAError {
  type: 'spec-analysis' | 'test-generation' | 'test-execution' | 'report-generation';
  message: string;
  specName?: string;
  stepId?: string;
  timestamp: Date;
  stack?: string;
}

// Report Generation Interfaces
export interface SpecSection {
  specName: string;
  description: string;
  testResults: TestResult[];
  overallStatus: 'Passed' | 'Failed' | 'Mixed';
  lastExecuted: Date;
  screenshotCount: number;
  executionTime: number;
}

export interface ReportData {
  generatedAt: Date;
  summary: QASummary;
  specSections: SpecSection[];
  errors: QAError[];
}

// Component Interfaces
export interface SpecAnalyzer {
  scanSpecs(): Promise<string[]>;
  readSpecFiles(specName: string): Promise<SpecFiles>;
  parseRequirements(requirements: string): Promise<ParsedRequirement[]>;
  getSpecMetadata(specName: string): Promise<SpecMetadata>;
}

export interface TestScriptGenerator {
  generateTestScript(criteria: AcceptanceCriteria[], specName: string): Promise<TestScript>;
  createTestStructure(specName: string): Promise<void>;
  classifyAcceptanceCriteria(criteria: string): TestCategory;
}

export interface PlaywrightTestRunner {
  executeTest(script: TestScript, specName: string): Promise<TestResult>;
  captureScreenshot(stepId: string, specName: string): Promise<string>;
  validateResult(step: TestStep): Promise<boolean>;
  setupBrowser(): Promise<void>;
  teardownBrowser(): Promise<void>;
}

export interface ReportGenerator {
  updateTestsSummary(results: TestResult[]): Promise<void>;
  generateSpecSection(result: TestResult): string;
  organizeBySpecs(results: TestResult[]): SpecSection[];
  generateMarkdownReport(data: ReportData): string;
}

// Utility Types
export type RequirementPattern = 'WHEN_THEN' | 'IF_THEN' | 'WHILE_THEN';

export interface EARSMatch {
  pattern: RequirementPattern;
  condition: string;
  system: string;
  response: string;
  fullMatch: string;
}