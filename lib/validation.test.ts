// Simple validation tests - run with: node -r ts-node/register lib/validation.test.ts
import { 
  validateDot, 
  validateCollection, 
  validateUserId, 
  sanitizeString, 
  sanitizeNumber, 
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
    x: 0.5,
    y: 0.3,
    color: '#ff0000',
    size: 3,
    archived: false
  };
  
  const result = validateDot(validDot);
  if (result.id !== 'test-dot-1') throw new Error('ID validation failed');
  if (result.label !== 'Test Dot') throw new Error('Label validation failed');
});

runTest('validateDot - throws on invalid data', () => {
  try {
    validateDot({
      id: '',
      label: 'Test',
      x: 2, // Invalid: outside -1 to 1 range
      y: 0.5,
      color: '#ff0000',
      size: 3,
      archived: false
    });
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (!(error instanceof ValidationError)) throw new Error('Expected ValidationError');
  }
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

console.log('\n🎉 Validation tests completed!');
console.log('\n📋 Key Security Features Implemented:');
console.log('• Input sanitization removes control characters and null bytes');
console.log('• Length limits prevent buffer overflow attacks');
console.log('• Type validation ensures data integrity');
console.log('• Range validation for coordinates and sizes');
console.log('• UUID format validation for user IDs');
console.log('• Color format validation prevents injection');
console.log('• Comprehensive error handling with detailed messages');