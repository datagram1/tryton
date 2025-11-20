/**
 * DomainParser - Parse search expressions into Tryton domain format
 *
 * Based on Sao.common.DomainParser from the jQuery SAO client
 *
 * Usage:
 *   const parser = new DomainParser(fields, context);
 *   const domain = parser.parse('name = "John" & age > 30');
 *   // Returns: [['name', '=', 'John'], ['age', '>', 30]]
 *
 * Supports:
 * - Comparison operators: =, !=, <, >, <=, >=
 * - Boolean operators: & (AND), | (OR)
 * - Advanced operators: in, not in, like, ilike
 * - Date ranges: "date: 2024-01-01..2024-12-31"
 * - Field auto-completion
 */

/**
 * Lexer class for tokenizing search input
 * Based on Sao.common.udlex
 */
class Lexer {
  constructor(input) {
    this.stream = input.split('');
    this.position = 0;
    this.eof = null;
    this.commenters = '';
    this.nowordchars = [':', '>', '<', '=', '!', '"', ';', '(', ')'];
    this.whitespace = ' \t\r\n';
    this.whitespace_split = false;
    this.quotes = '"';
    this.escape = '\\';
    this.escapedquotes = '"';
    this.state = ' ';
    this.pushback = [];
    this.token = '';
  }

  read(length = 1) {
    if (this.position >= this.stream.length) {
      return null;
    }
    const value = this.stream.slice(this.position, this.position + length).join('');
    this.position += length;
    return value;
  }

  getToken() {
    if (this.pushback.length > 0) {
      return this.pushback.shift();
    }
    return this.readToken();
  }

  readToken() {
    let quoted = false;
    let escapedstate = ' ';

    while (true) {
      const nextchar = this.read(1);

      if (this.state === null) {
        this.token = '';  // past end of file
        break;
      } else if (this.state === ' ') {
        if (!nextchar) {
          this.state = null;  // end of file
          break;
        } else if (this.whitespace.includes(nextchar)) {
          if (this.token || quoted) {
            break;  // emit current token
          } else {
            continue;
          }
        } else if (this.commenters.includes(nextchar)) {
          // Skip comments
        } else if (this.escape.includes(nextchar)) {
          escapedstate = 'a';
          this.state = nextchar;
        } else if (!this.nowordchars.includes(nextchar)) {
          this.token = nextchar;
          this.state = 'a';
        } else if (this.quotes.includes(nextchar)) {
          this.state = nextchar;
        } else if (this.whitespace_split) {
          this.token = nextchar;
          this.state = 'a';
        } else {
          this.token = nextchar;
          if (this.token || quoted) {
            break;  // emit current token
          } else {
            continue;
          }
        }
      } else if (this.quotes.includes(this.state)) {
        quoted = true;
        if (!nextchar) {  // end of file
          throw 'no closing quotation';
        }
        if (nextchar === this.state) {
          this.state = 'a';
        } else if (this.escape.includes(nextchar) &&
            this.escapedquotes.includes(this.state)) {
          escapedstate = this.state;
          this.state = nextchar;
        } else {
          this.token = this.token + nextchar;
        }
      } else if (this.escape.includes(this.state)) {
        if (!nextchar) {  // end of file
          throw 'no escaped character';
        }
        if (this.quotes.includes(escapedstate) &&
            (nextchar !== this.state) &&
            (nextchar !== escapedstate)) {
          this.token = this.token + this.state;
        }
        this.token = this.token + nextchar;
        this.state = escapedstate;
      } else if (this.state === 'a') {
        if (!nextchar) {
          this.state = null;  // end of file
          break;
        } else if (this.whitespace.includes(nextchar)) {
          this.state = ' ';
          if (this.token || quoted) {
            break;  // emit current token
          } else {
            continue;
          }
        } else if (this.commenters.includes(nextchar)) {
          // Skip comments
        } else if (this.quotes.includes(nextchar)) {
          this.state = nextchar;
        } else if (this.escape.includes(nextchar)) {
          escapedstate = 'a';
          this.state = nextchar;
        } else if (!this.nowordchars.includes(nextchar) ||
            this.quotes.includes(nextchar) ||
            this.whitespace_split) {
          this.token = this.token + nextchar;
        } else {
          this.pushback.unshift(nextchar);
          this.state = ' ';
          if (this.token) {
            break;  // emit current token
          } else {
            continue;
          }
        }
      }
    }

    const result = this.token;
    this.token = '';
    if (!quoted && result === '') {
      return null;
    }
    return result;
  }

  next() {
    const token = this.getToken();
    if (token === this.eof) {
      return null;
    }
    return token;
  }
}

/**
 * Main DomainParser class
 */
export class DomainParser {
  static OPERATORS = ['!=', '<=', '>=', '=', '!', '<', '>'];

  constructor(fields, context = {}) {
    this.fields = {};
    this.strings = {};
    this.context = context;
    this.updateFields(fields);
  }

  /**
   * Update the parser with new field definitions
   * @param {Object} fields - Field definitions
   * @param {string} prefix - Field name prefix for nested fields
   * @param {string} stringPrefix - String prefix for nested field labels
   */
  updateFields(fields, prefix = '', stringPrefix = '') {
    for (const name in fields) {
      const field = fields[name];
      if ((field.searchable || field.searchable === undefined) && name !== 'rec_name') {
        const fieldCopy = { ...field };
        const fullname = prefix ? `${prefix}.${name}` : name;
        const string = stringPrefix ? `${stringPrefix}.${field.string}` : field.string;
        fieldCopy.string = string;
        fieldCopy.name = fullname;
        this.fields[fullname] = fieldCopy;
        this.strings[field.string.toLowerCase()] = fieldCopy;

        const relationFields = field.relation_fields;
        if (relationFields) {
          this.updateFields(relationFields, fullname, string);
        }
      }
    }
  }

  /**
   * Parse search text into domain format
   * @param {string} input - Search expression
   * @returns {Array} Domain array
   */
  parse(input) {
    try {
      const lex = new Lexer(input);
      const tokens = [];
      let token;
      do {
        token = lex.next();
        if (token !== null) {
          tokens.push(token);
        }
      } while (token !== null);

      let result = tokens;
      result = this.groupOperator(result);
      result = this.parenthesize(result);
      result = this.group(result);
      result = this.operatorize(result, 'or');
      result = this.operatorize(result, 'and');
      result = this.parseClause(result);
      return this.simplify(result);
    } catch (e) {
      if (e === 'no closing quotation') {
        return this.parse(input + '"');
      }
      throw e;
    }
  }

  /**
   * Convert domain array back to search string
   * @param {Array} domain - Domain array
   * @returns {string} Search expression
   */
  string(domain) {
    const stringClause = (clause) => {
      if (!clause || clause.length === 0) {
        return '';
      }
      if (typeof clause[0] !== 'string' || ['AND', 'OR'].includes(clause[0])) {
        return '(' + this.string(clause) + ')';
      }

      let name = clause[0];
      let operator = clause[1];
      let value = clause[2];

      if (name.endsWith('.rec_name')) {
        name = name.slice(0, -9);
      }

      if (!(name in this.fields)) {
        if (this.isFullText(value)) {
          value = value.slice(1, -1);
        }
        return this.quote(value);
      }

      const field = this.fields[name];
      let target = null;
      if (clause.length > 3) {
        target = clause[3];
      }

      if (operator.includes('ilike')) {
        if (this.isFullText(value)) {
          value = value.slice(1, -1);
        } else if (!this.isLike(value)) {
          if (operator === 'ilike') {
            operator = '=';
          } else {
            operator = '!';
          }
          value = this.unescape(value);
        }
      }

      const defOperator = this.defaultOperator(field);
      if (defOperator === operator.trim()) {
        operator = '';
        if (DomainParser.OPERATORS.includes(value)) {
          // Value could be interpreted as operator, force default
          operator = '"" ';
        }
      } else if (operator.includes(defOperator) &&
          (operator.includes('not') || operator.includes('!'))) {
        operator = operator.replace(defOperator, '').replace('not', '!').trim();
      }

      if (operator.endsWith('in')) {
        if (Array.isArray(value) && value.length === 1) {
          operator = operator === 'not in' ? '!=' : '=';
        } else {
          operator = operator === 'not in' ? '!' : '';
        }
      }

      const formattedValue = this.formatValue(field, value, target);
      let quotedValue = formattedValue;
      if (DomainParser.OPERATORS.includes(operator) &&
          ['char', 'text', 'selection'].includes(field.type) &&
          value === '') {
        quotedValue = '""';
      }

      return `${this.quote(field.string)}: ${operator}${quotedValue}`;
    };

    if (!domain || domain.length === 0) {
      return '';
    }

    let nary = ' ';
    let domainCopy = domain;
    if (domain[0] === 'AND' || domain[0] === 'OR') {
      if (domain[0] === 'OR') {
        nary = ' | ';
      }
      domainCopy = domain.slice(1);
    }

    return domainCopy.map(stringClause).join(nary);
  }

  /**
   * Get completion suggestions for partial input
   * @param {string} input - Partial search expression
   * @returns {Array<string>} Completion suggestions
   */
  completion(input) {
    const results = [];
    const domain = this.parse(input);

    let closing = 0;
    for (let i = input.length - 1; i > 0; i--) {
      if (input[i] === ')' || input[i] === ' ') {
        break;
      }
      if (input[i] === ')') {
        closing += 1;
      }
    }

    const [ending, deepEnding] = this.endingClause(domain);
    const deep = deepEnding - closing;
    let stringDomain = this.string(domain);

    if (deep > 0) {
      stringDomain = stringDomain.substring(0, stringDomain.length - deep);
    }
    if (stringDomain !== input) {
      results.push(stringDomain);
    }

    const pslice = (string, depth) => {
      if (depth > 0) {
        return string.substring(0, string.length - depth);
      }
      return string;
    };

    if (ending !== null && closing === 0) {
      const completes = this.complete(ending);
      for (const complete of completes) {
        const completeString = this.string(
          this.replaceEndingClause(domain, complete));
        results.push(pslice(completeString, deep));
      }
    }

    if (input.length > 0) {
      if (input.substr(input.length - 1, 1) !== ' ') {
        return results;
      }
      if (input.length >= 2 && input.substr(input.length - 2, 1) === ':') {
        return results;
      }
    }

    // Add field completions
    for (const key in this.strings) {
      const field = this.strings[key];
      let operator = this.defaultOperator(field);
      let value = '';
      if (operator === 'ilike' || operator === 'not ilike') {
        value = this.likify(value);
      }
      const newDomain = this.appendEndingClause(domain, [field.name, operator, value], deep);
      const newDomainString = this.string(newDomain);
      results.push(pslice(newDomainString, deep));
    }

    return results;
  }

  // Helper methods

  groupOperator(tokens) {
    if (tokens.length === 0) return [];
    let cur = tokens[0];
    const result = [];

    for (const nex of tokens.slice(1)) {
      if (nex === '=' && cur && DomainParser.OPERATORS.includes(cur + nex)) {
        result.push(cur + nex);
        cur = null;
      } else {
        if (cur !== null) {
          result.push(cur);
        }
        cur = nex;
      }
    }
    if (cur !== null) {
      result.push(cur);
    }
    return result;
  }

  parenthesize(tokens) {
    const result = [];
    let current = result;
    const parent = [];

    for (const token of tokens) {
      if (current === undefined) {
        continue;
      }
      if (token === '(') {
        parent.push(current);
        current = [];
        parent[parent.length - 1].push(current);
        current = parent[parent.length - 1][parent[parent.length - 1].length - 1];
      } else if (token === ')') {
        current = parent.pop();
      } else {
        current.push(token);
      }
    }
    return result;
  }

  group(tokens) {
    const result = [];

    const _group = (parts) => {
      const result = [];
      const pushResult = (part) => {
        const clause = [part];
        clause.clause = true;
        result.push(clause);
      };

      const colonIndex = parts.indexOf(':');
      if (colonIndex === -1) {
        parts.forEach(pushResult);
        return result;
      }

      for (let j = 0; j < colonIndex; j++) {
        const name = parts.slice(j, colonIndex).join(' ');
        if (name.toLowerCase() in this.strings) {
          if (parts.slice(0, j).length > 0) {
            parts.slice(0, j).forEach(pushResult);
          } else {
            pushResult(null);
          }

          let nameArray = [name];
          const operators = [''].concat(DomainParser.OPERATORS);
          let i = colonIndex;

          if ((i + 1) < parts.length &&
              operators.includes(parts[i + 1])) {
            nameArray = nameArray.concat([parts[i + 1]]);
            i += 1;
          } else {
            nameArray = nameArray.concat([null]);
          }

          const lvalue = [];
          while ((i + 2) < parts.length) {
            if (parts[i + 2] === ';') {
              lvalue.push(parts[i + 1]);
              i += 2;
            } else {
              break;
            }
          }

          const subGroup = (name, lvalue) => (part) => {
            if (name.length > 0) {
              let clause;
              if (lvalue.length > 0) {
                if (part[0] !== null) {
                  lvalue.push(part[0]);
                }
                clause = name.concat([lvalue]);
                clause.clause = true;
                result.push(clause);
              } else {
                clause = name.concat(part);
                clause.clause = true;
                result.push(clause);
              }
              name.splice(0, name.length);
            } else {
              result.push(part);
            }
          };

          _group(parts.slice(i + 1)).forEach(subGroup(nameArray, lvalue));

          if (nameArray.length > 0) {
            let clause;
            if (lvalue.length > 0) {
              clause = nameArray.concat([lvalue]);
              clause.clause = true;
              result.push(clause);
            } else {
              clause = nameArray.concat([null]);
              clause.clause = true;
              result.push(clause);
            }
          }
          break;
        }
      }
      return result;
    };

    let parts = [];
    for (const token of tokens) {
      if (this.isGenerator(token)) {
        for (const group of _group(parts)) {
          if (!this.compare(group, [null])) {
            result.push(group);
          }
        }
        parts = [];
        result.push(this.group(token));
      } else {
        parts.push(token);
      }
    }
    for (const group of _group(parts)) {
      if (!this.compare(group, [null])) {
        result.push(group);
      }
    }
    return result;
  }

  isGenerator(value) {
    return Array.isArray(value) && value.clause === undefined;
  }

  operatorize(tokens, operator = 'or') {
    const result = [];
    tokens = [...tokens];
    const notation = { 'or': '|', 'and': '&' }[operator];

    const test = (value) => {
      if (Array.isArray(value)) {
        return this.compare(value, [notation]);
      } else {
        return value === notation;
      }
    };

    let cur = tokens.shift();
    while (test(cur)) {
      cur = tokens.shift();
    }
    if (cur === undefined) {
      return result;
    }
    if (this.isGenerator(cur)) {
      cur = this.operatorize(cur, operator);
    }

    let nex = null;
    while (tokens.length > 0) {
      nex = tokens.shift();
      if (this.isGenerator(nex) && !test(nex)) {
        nex = this.operatorize(nex, operator);
      }
      if (test(nex)) {
        nex = tokens.shift();
        while (test(nex)) {
          nex = tokens.shift();
        }
        if (this.isGenerator(nex)) {
          nex = this.operatorize(nex, operator);
        }
        if (nex !== undefined) {
          cur = [operator.toUpperCase(), cur, nex];
        } else {
          if (!test(cur)) {
            result.push([operator.toUpperCase(), cur]);
            cur = null;
          }
        }
        nex = null;
      } else {
        if (!test(cur)) {
          result.push(cur);
        }
        cur = nex;
      }
    }

    if (tokens.length === 0) {
      if (nex !== null && !test(nex)) {
        result.push(nex);
      } else if (cur !== null && !test(cur)) {
        result.push(cur);
      }
    }
    return result;
  }

  clausify(e) {
    e.clause = true;
    return e;
  }

  parseClause(tokens) {
    const result = [];

    tokens.forEach(clause => {
      if (this.isGenerator(clause)) {
        result.push(this.parseClause(clause));
      } else if (clause === 'OR' || clause === 'AND') {
        result.push(clause);
      } else if (clause.length === 1 && !Array.isArray(clause[0])) {
        result.push(this.clausify(['rec_name', 'ilike', this.likify(clause[0])]));
      } else if (clause.length === 3 && clause[0].toLowerCase() in this.strings) {
        let operator = clause[1];
        let value = clause[2];
        const field = this.strings[clause[0].toLowerCase()];
        let fieldName = field.name;

        let target = null;
        if (field.type === 'reference') {
          const [splitTarget, splitValue] = this.splitTargetValue(field, value);
          target = splitTarget;
          value = splitValue;
          if (target) {
            fieldName += '.rec_name';
          }
        } else if (field.type === 'multiselection') {
          if (value !== null && !Array.isArray(value)) {
            value = [value];
          }
        }

        if (!operator) {
          operator = this.defaultOperator(field);
        }
        if (Array.isArray(value) && field.type !== 'multiselection') {
          if (operator === '!') {
            operator = 'not in';
          } else {
            operator = 'in';
          }
        }
        if (operator === '!') {
          operator = this.negateOperator(this.defaultOperator(field));
        }
        if (value === null && operator.endsWith('in')) {
          operator = operator.startsWith('not') ? '!=' : '=';
        }

        // Handle range queries for numeric and date fields
        if (['integer', 'float', 'numeric', 'datetime', 'timestamp', 'date', 'time'].includes(field.type)) {
          if (typeof value === 'string' && value.includes('..')) {
            const values = value.split('..', 2);
            const lvalue = this.convertValue(field, values[0], this.context);
            const rvalue = this.convertValue(field, values[1], this.context);
            result.push([
              this.clausify([fieldName, '>=', lvalue]),
              this.clausify([fieldName, '<=', rvalue])
            ]);
            return;
          }
        }

        if (['many2one', 'one2many', 'many2many', 'one2one'].includes(field.type)) {
          fieldName += '.rec_name';
        }

        if (Array.isArray(value)) {
          value = value.map(v => this.convertValue(field, v, this.context));
        } else {
          value = this.convertValue(field, value, this.context);
        }

        if (operator.includes('like')) {
          value = this.likify(value);
        }

        if (target) {
          result.push(this.clausify([fieldName, operator, value, target]));
        } else {
          result.push(this.clausify([fieldName, operator, value]));
        }
      }
    });

    return result;
  }

  simplify(domain) {
    if (!Array.isArray(domain)) {
      return domain;
    }
    if (domain.length === 0) {
      return [];
    }
    if (domain.length === 1 && !domain.clause) {
      return this.simplify(domain[0]);
    }
    return domain.map(item => this.simplify(item));
  }

  likify(value, escape = '\\') {
    if (!value) {
      return '%';
    }
    const escaped = value
      .replace(escape + '%', '')
      .replace(escape + '_', '');
    if (escaped.includes('%') || escaped.includes('_')) {
      return value;
    } else {
      return '%' + value + '%';
    }
  }

  isFullText(value, escape = '\\') {
    let escaped = value;
    if (escaped.charAt(0) === '%' && escaped.charAt(escaped.length - 1) === '%') {
      escaped = escaped.slice(1, -1);
    }
    escaped = escaped
      .replace(escape + '%', '')
      .replace(escape + '_', '');
    if (escaped.includes('%') || escaped.includes('_')) {
      return false;
    }
    return value.startsWith('%') && value.endsWith('%');
  }

  isLike(value, escape = '\\') {
    const escaped = value
      .replace(escape + '%', '')
      .replace(escape + '_', '');
    return escaped.includes('%') || escaped.includes('_');
  }

  unescape(value, escape = '\\') {
    return value
      .replace(escape + '%', '%')
      .replace(escape + '_', '_');
  }

  quote(value, empty = false) {
    if (typeof value !== 'string') {
      return value;
    }
    if (empty && value === '') {
      return '""';
    }
    if (value.includes('\\')) {
      value = value.replace(/\\/g, '\\\\');
    }
    if (value.includes('"')) {
      value = value.replace(/"/g, '\\"');
    }
    const tests = [':', ' ', '(', ')'].concat(DomainParser.OPERATORS);
    for (const test of tests) {
      if (value.includes(test)) {
        return '"' + value + '"';
      }
    }
    return value;
  }

  defaultOperator(field) {
    if (['char', 'text', 'many2one', 'many2many', 'one2many', 'reference', 'one2one'].includes(field.type)) {
      return 'ilike';
    } else if (field.type === 'multiselection') {
      return 'in';
    } else {
      return '=';
    }
  }

  negateOperator(operator) {
    switch (operator) {
      case 'ilike':
        return 'not ilike';
      case '=':
        return '!=';
      case 'in':
        return 'not in';
      default:
        return operator;
    }
  }

  splitTargetValue(field, value) {
    let target = null;
    if (typeof value === 'string' && field.selection) {
      for (const selection of field.selection) {
        const key = selection[0];
        const text = selection[1];
        if (value.toLowerCase().startsWith(text.toLowerCase() + ',')) {
          target = key;
          value = value.slice(text.length + 1);
          break;
        }
      }
    }
    return [target, value];
  }

  convertValue(field, value, context = {}) {
    // For now, return value as-is
    // In a full implementation, this would convert strings to appropriate types
    // based on field type (dates, numbers, etc.)
    if (value === '') {
      if (['many2one', 'one2one'].includes(field.type)) {
        return null;
      }
    }
    return value;
  }

  formatValue(field, value, target = null, context = {}) {
    // For now, return value as-is
    // In a full implementation, this would format values for display
    if (Array.isArray(value)) {
      return value.map(v => this.quote(String(v))).join(';');
    }
    return this.quote(String(value));
  }

  endingClause(domain, depth = 0) {
    if (domain.length === 0) {
      return [null, depth];
    }
    const lastElement = domain[domain.length - 1];
    if (this.isSubdomain(lastElement)) {
      return this.endingClause(lastElement, depth + 1);
    }
    return [lastElement, depth];
  }

  isSubdomain(element) {
    return Array.isArray(element) && !element.clause;
  }

  replaceEndingClause(domain, clause) {
    const results = [];
    let i;
    for (i = 0; i < domain.length - 1; i++) {
      results.push(domain[i]);
    }
    if (this.isSubdomain(domain[i])) {
      results.push(this.replaceEndingClause(domain[i], clause));
    } else {
      results.push(clause);
    }
    return results;
  }

  appendEndingClause(domain, clause, depth) {
    if (domain.length === 0) {
      return [clause];
    }
    const results = domain.slice(0, -1);
    const lastElement = domain[domain.length - 1];
    if (this.isSubdomain(lastElement)) {
      results.push(this.appendEndingClause(lastElement, clause, depth - 1));
    } else {
      results.push(lastElement);
      if (depth === 0) {
        results.push(clause);
      }
    }
    return results;
  }

  complete(clause) {
    // Stub for auto-completion
    // In a full implementation, this would provide field value completions
    return [];
  }

  compare(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
      return arr1 === arr2;
    }
    if (arr1.length !== arr2.length) {
      return false;
    }
    for (let i = 0; i < arr1.length; i++) {
      if (Array.isArray(arr1[i]) && Array.isArray(arr2[i])) {
        if (!this.compare(arr1[i], arr2[i])) {
          return false;
        }
      } else if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    return true;
  }
}

export default DomainParser;
