// Simple validation tests - run with: node -r ts-node/register lib/validation.test.ts
import { 
  validateDot, 
  validateCollection, 
  validateUserId, 
  validateReleaseLineConfig,
  sanitizeString, 
  sanitizeNumber, 
  sanitizeHexColor,
  ValidationError 
} from './validation';

// Test helper
const runTest = (name: string, testFn: () => void) => {
  try {
    testFn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

console.log('🧪 Running Validation Tests\n');

// Test sanitizeString
runTest('sanitizeString - valid input', () => {
  const result = sanitizeString('  Hello World  ', 50);
  if (result !== 'Hello World') throw new Error(`Expected 'Hello World', got '${result}'`);
});

runTest('sanitizeString - removes control characters', () => {
  const result = sanitizeString('Hello\x00\x01World', 50);
  if (result !== 'HelloWorld') throw new Error(`Expected 'HelloWorld', got '${result}'`);
});

runTest('sanitizeString - throws on too long input', () => {
  try {
    sanitizeString('a'.repeat(300), 100);
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

// Test sanitizeNumber
runTest('sanitizeNumber - valid number', () => {
  const result = sanitizeNumber(5.5, 0, 10);
  if (result !== 5.5) throw new Error(`Expected 5.5, got ${result}`);
});

runTest('sanitizeNumber - throws on invalid number', () => {
  try {
    sanitizeNumber(NaN);
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

// Test validateDot
runTest('validateDot - valid dot', () => {
  const validDot = {
    id: 'test-dot-1',
    label: 'Test Dot',
    x: 50, // Percentage (0-100)
    y: 75, // SVG coordinate (-10 to 150)
    color: '#ff0000',
    size: 3,
    archived: false
  };
  
  const result = validateDot(validDot);
  if (result.id !== 'test-dot-1') throw new Error('ID validation failed');
  if (result.label !== 'Test Dot') throw new Error('Label validation failed');
  if (result.x !== 50) throw new Error('X coordinate validation failed');
  if (result.y !== 75) throw new Error('Y coordinate validation failed');
});

runTest('validateDot - throws on invalid data', () => {
  try {
    validateDot({
      id: '',
      label: 'Test',
      x: 150, // Invalid: outside 0-100 range
      y: 50,
      color: '#ff0000',
      size: 3,
      archived: false
    });
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

runTest('validateDot - valid coordinate boundaries', () => {
  // Test minimum values
  const minDot = {
    id: 'min-dot',
    label: 'Min Dot',
    x: 0,    // Min X
    y: -10,  // Min Y
    color: '#ff0000',
    size: 1,
    archived: false
  };
  
  const minResult = validateDot(minDot);
  if (minResult.x !== 0) throw new Error('Min X validation failed');
  if (minResult.y !== -10) throw new Error('Min Y validation failed');
  
  // Test maximum values
  const maxDot = {
    id: 'max-dot',
    label: 'Max Dot',
    x: 100,  // Max X
    y: 150,  // Max Y
    color: '#ff0000',
    size: 5,
    archived: false
  };
  
  const maxResult = validateDot(maxDot);
  if (maxResult.x !== 100) throw new Error('Max X validation failed');
  if (maxResult.y !== 150) throw new Error('Max Y validation failed');
});

// Test validateUserId
runTest('validateUserId - valid UUID', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const result = validateUserId(validUuid);
  if (result !== validUuid) throw new Error('UUID validation failed');
});

runTest('validateUserId - throws on invalid UUID', () => {
  try {
    validateUserId('not-a-uuid');
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

// Test sanitizeHexColor
runTest('sanitizeHexColor - valid hex color', () => {
  const result = sanitizeHexColor('#ff00ff');
  if (result !== '#ff00ff') throw new Error(`Expected '#ff00ff', got '${result}'`);
});

runTest('sanitizeHexColor - throws on invalid hex color', () => {
  try {
    sanitizeHexColor('#gg00ff'); // Invalid hex characters
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

runTest('sanitizeHexColor - throws on short hex color', () => {
  try {
    sanitizeHexColor('#f0f'); // Too short
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

// Test validateReleaseLineConfig
runTest('validateReleaseLineConfig - valid config', () => {
  const validConfig = {
    enabled: true,
    color: '#ff00ff',
    text: 'Q4 2024'
  };
  
  const result = validateReleaseLineConfig(validConfig);
  if (result.enabled !== true) throw new Error('Enabled validation failed');
  if (result.color !== '#ff00ff') throw new Error('Color validation failed');
  if (result.text !== 'Q4 2024') throw new Error('Text validation failed');
});

runTest('validateReleaseLineConfig - defaults for missing values', () => {
  const partialConfig = {
    enabled: true
  };
  
  const result = validateReleaseLineConfig(partialConfig);
  if (result.enabled !== true) throw new Error('Enabled validation failed');
  if (result.color !== '#ff00ff') throw new Error('Default color should be #ff00ff');
  if (result.text !== '') throw new Error('Default text should be empty string');
});

runTest('validateReleaseLineConfig - throws on text too long', () => {
  try {
    validateReleaseLineConfig({
      enabled: true,
      color: '#ff00ff',
      text: 'a'.repeat(51) // Too long
    });
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

runTest('validateReleaseLineConfig - throws on invalid color', () => {
  try {
    validateReleaseLineConfig({
      enabled: true,
      color: 'invalid-color',
      text: 'Test'
    });
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
});

// Test validateCollection with releaseLineConfig
runTest('validateCollection - with valid releaseLineConfig', () => {
  const validCollection = {
    id: 'test-collection',
    name: 'Test Collection',
    status: 'active' as const,
    releaseLineConfig: {
      enabled: true,
      color: '#ff00ff',
      text: 'Release Date'
    }
  };
  
  const result = validateCollection(validCollection);
  if (!result.releaseLineConfig) throw new Error('Release line config should be present');
  if (result.releaseLineConfig.enabled !== true) throw new Error('Release line enabled validation failed');
  if (result.releaseLineConfig.color !== '#ff00ff') throw new Error('Release line color validation failed');
  if (result.releaseLineConfig.text !== 'Release Date') throw new Error('Release line text validation failed');
});

runTest('validateCollection - without releaseLineConfig', () => {
  const validCollection = {
    id: 'test-collection',
    name: 'Test Collection',
    status: 'active' as const
  };
  
  const result = validateCollection(validCollection);
  if (result.releaseLineConfig !== undefined) throw new Error('Release line config should be undefined');
});

console.log('\n🎉 Validation tests completed!');
console.log('\n📋 Key Security Features Implemented:');
console.log('• Input sanitization removes control characters and null bytes');
console.log('• Length limits prevent buffer overflow attacks');
console.log('• Type validation ensures data integrity');
console.log('• Range validation for coordinates and sizes');
console.log('• UUID format validation for user IDs');
console.log('• Color format validation prevents injection');
console.log('• Hex color validation for release line colors');
console.log('• Release line text length validation (max 50 characters)');
console.log('• Comprehensive error handling with detailed messages');