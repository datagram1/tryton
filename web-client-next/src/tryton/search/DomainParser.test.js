/**
 * Test suite for DomainParser
 */

import { DomainParser } from './DomainParser.js';

// Sample field definitions for testing
const testFields = {
  name: {
    type: 'char',
    string: 'Name',
    searchable: true
  },
  age: {
    type: 'integer',
    string: 'Age',
    searchable: true
  },
  email: {
    type: 'char',
    string: 'Email',
    searchable: true
  },
  active: {
    type: 'boolean',
    string: 'Active',
    searchable: true
  },
  company: {
    type: 'many2one',
    string: 'Company',
    searchable: true
  },
  birth_date: {
    type: 'date',
    string: 'Birth Date',
    searchable: true
  },
  salary: {
    type: 'float',
    string: 'Salary',
    searchable: true
  }
};

// Test function runner
function runTests() {
  console.log('=== DomainParser Test Suite ===\n');

  const parser = new DomainParser(testFields);

  // Test 1: Simple field search (using colon syntax)
  console.log('Test 1: Simple field search');
  console.log('Input: name: John');
  const result1 = parser.parse('name: John');
  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('Expected: [["name.rec_name", "ilike", "%John%"]]');
  console.log('');

  // Test 2: Numeric comparison
  console.log('Test 2: Numeric comparison');
  console.log('Input: age: > 30');
  const result2 = parser.parse('age: > 30');
  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('Expected: [["age", ">", "30"]]');
  console.log('');

  // Test 3: AND operator
  console.log('Test 3: AND operator');
  console.log('Input: name: John & age: > 30');
  const result3 = parser.parse('name: John & age: > 30');
  console.log('Result:', JSON.stringify(result3, null, 2));
  console.log('Expected: ["AND", [...], [...]]');
  console.log('');

  // Test 4: OR operator
  console.log('Test 4: OR operator');
  console.log('Input: name: John | name: Jane');
  const result4 = parser.parse('name: John | name: Jane');
  console.log('Result:', JSON.stringify(result4, null, 2));
  console.log('Expected: ["OR", [...], [...]]');
  console.log('');

  // Test 5: Range query
  console.log('Test 5: Range query');
  console.log('Input: age: 20..40');
  const result5 = parser.parse('age: 20..40');
  console.log('Result:', JSON.stringify(result5, null, 2));
  console.log('Expected: [[["age", ">=", "20"], ["age", "<=", "40"]]]');
  console.log('');

  // Test 6: NOT operator
  console.log('Test 6: NOT operator');
  console.log('Input: name: ! John');
  const result6 = parser.parse('name: ! John');
  console.log('Result:', JSON.stringify(result6, null, 2));
  console.log('Expected: [["name.rec_name", "not ilike", "%John%"]]');
  console.log('');

  // Test 7: Simple text search (no field specified)
  console.log('Test 7: Simple text search');
  console.log('Input: John');
  const result7 = parser.parse('John');
  console.log('Result:', JSON.stringify(result7, null, 2));
  console.log('Expected: [["rec_name", "ilike", "%John%"]]');
  console.log('');

  // Test 8: Domain to string conversion
  console.log('Test 8: Domain to string conversion');
  const domain = [['name.rec_name', 'ilike', '%John%']];
  const result8 = parser.string(domain);
  console.log('Input domain:', JSON.stringify(domain));
  console.log('Result:', result8);
  console.log('Expected: Name: John');
  console.log('');

  // Test 9: Complex expression with parentheses
  console.log('Test 9: Complex expression with parentheses');
  console.log('Input: (name: John | name: Jane) & age: > 30');
  const result9 = parser.parse('(name: John | name: Jane) & age: > 30');
  console.log('Result:', JSON.stringify(result9, null, 2));
  console.log('Expected: ["AND", ["OR", [...], [...]], [...]]');
  console.log('');

  // Test 10: Multiple operators
  console.log('Test 10: Comparison operators');
  console.log('Input: age: >= 18');
  const result10 = parser.parse('age: >= 18');
  console.log('Result:', JSON.stringify(result10, null, 2));
  console.log('');

  // Test 11: Equality operator
  console.log('Test 11: Equality operator');
  console.log('Input: age: = 25');
  const result11 = parser.parse('age: = 25');
  console.log('Result:', JSON.stringify(result11, null, 2));
  console.log('');

  // Test 12: Inequality operator
  console.log('Test 12: Inequality operator');
  console.log('Input: age: != 30');
  const result12 = parser.parse('age: != 30');
  console.log('Result:', JSON.stringify(result12, null, 2));
  console.log('');

  console.log('=== Tests Complete ===');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests();
}

export { runTests };
