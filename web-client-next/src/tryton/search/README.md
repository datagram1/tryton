# Tryton Domain Parser

A comprehensive domain parser for the Tryton web client that converts search expressions into Tryton domain format.

## Overview

The `DomainParser` class parses user-friendly search expressions and converts them to Tryton's domain array format, which is used for filtering records in the database.

## Installation

```javascript
import { DomainParser } from './tryton/search/DomainParser.js';
```

## Basic Usage

```javascript
// Define your fields
const fields = {
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
  company: {
    type: 'many2one',
    string: 'Company',
    searchable: true
  }
};

// Create parser instance
const parser = new DomainParser(fields);

// Parse search expressions
const domain = parser.parse('name: John');
// Result: [['name', 'ilike', '%John%']]

const domain2 = parser.parse('age: > 30');
// Result: [['age', '>', '30']]

const domain3 = parser.parse('name: John & age: > 30');
// Result: ['AND', ['name', 'ilike', '%John%'], ['age', '>', '30']]
```

## Search Syntax

### Basic Field Search

Use the colon (`:`) to specify a field and value:

```
name: John
email: john@example.com
```

### Comparison Operators

Support for all standard comparison operators:

- `=` - Equality
- `!=` - Inequality
- `<` - Less than
- `>` - Greater than
- `<=` - Less than or equal
- `>=` - Greater than or equal

Examples:
```
age: = 25
age: > 30
salary: >= 50000
```

### Boolean Operators

Combine multiple conditions with AND (`&`) or OR (`|`):

```
name: John & age: > 30
email: john@example.com | email: jane@example.com
```

### NOT Operator

Use `!` to negate a condition:

```
name: ! John              // name not like John
age: != 30               // age not equal to 30
```

### Range Queries

For numeric and date fields, use `..` for range queries:

```
age: 20..40              // age >= 20 AND age <= 40
birth_date: 2000-01-01..2020-12-31
```

### Parentheses

Group expressions with parentheses:

```
(name: John | name: Jane) & age: > 30
```

### Simple Text Search

Search without specifying a field searches the `rec_name` field:

```
John                     // searches for "John" in rec_name
```

## API Reference

### Constructor

```javascript
new DomainParser(fields, context = {})
```

- `fields`: Object containing field definitions
- `context`: Optional context object (for date formats, etc.)

### Methods

#### `parse(input)`

Parse a search expression into domain format.

```javascript
const domain = parser.parse('name: John & age: > 30');
```

#### `string(domain)`

Convert a domain array back to search string.

```javascript
const searchString = parser.string([['name', 'ilike', '%John%']]);
// Returns: "name: John"
```

#### `completion(input)`

Get auto-completion suggestions for partial input.

```javascript
const suggestions = parser.completion('na');
// Returns array of completion suggestions
```

#### `updateFields(fields, prefix, stringPrefix)`

Update the parser with new field definitions.

```javascript
parser.updateFields(additionalFields);
```

## Field Types

The parser handles different field types appropriately:

- **char, text**: Uses `ilike` (case-insensitive like) by default
- **integer, float, numeric**: Uses `=` by default, supports range queries
- **date, datetime, time**: Uses `=` by default, supports range queries
- **boolean**: Uses `=` by default
- **many2one, one2many, many2many, one2one**: Uses `ilike` on `.rec_name` field
- **selection**: Uses `=` by default with value matching
- **multiselection**: Uses `in` operator by default
- **reference**: Supports model selection with comma syntax

## Advanced Examples

### Multiple Conditions

```javascript
parser.parse('name: John & age: > 30 & active: True');
// ['AND', ['AND', ['name', 'ilike', '%John%'], ['age', '>', '30']], ['active', '=', true]]
```

### Complex OR/AND Logic

```javascript
parser.parse('(name: John | name: Jane) & (age: > 25 & age: < 40)');
```

### Many2One Field Search

```javascript
parser.parse('company: Acme Corp');
// [['company.rec_name', 'ilike', '%Acme Corp%']]
```

### Date Range

```javascript
parser.parse('birth_date: 1990-01-01..2000-12-31');
// [[['birth_date', '>=', '1990-01-01'], ['birth_date', '<=', '2000-12-31']]]
```

## Implementation Notes

- The parser is based on the Sao.common.DomainParser from the jQuery SAO client
- It includes a complete lexer for tokenizing search expressions
- Supports quoted strings for values with special characters
- Handles operator precedence correctly
- Provides bi-directional conversion (search string ↔ domain)

## Testing

Run the test suite:

```bash
node src/tryton/search/DomainParser.test.js
```

## References

- Original implementation: `/home/user/tryton/sao/src/common.js` (Sao.common.DomainParser)
- Tryton domain documentation: https://docs.tryton.org/
