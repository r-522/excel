// Formula parser: tokenizer + recursive descent evaluator
// Supports: SUM, AVERAGE, COUNT, MAX, MIN, IF, VLOOKUP with A1:B5 range notation

import { CellAddress, CellValue } from '@/types';
import { parseA1, parseRangeA1, rangeToAddresses } from './utils';

type TokenType =
  | 'NUMBER' | 'STRING' | 'BOOL' | 'CELL' | 'RANGE' | 'FUNC'
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'CARET'
  | 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE'
  | 'LPAREN' | 'RPAREN' | 'COMMA' | 'AMPERSAND' | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean;
}

type GetCellValue = (addr: CellAddress) => CellValue;

class Tokenizer {
  private pos = 0;
  constructor(private input: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (/\s/.test(ch)) { this.pos++; continue; }
      if (ch === '"') { tokens.push(this.readString()); continue; }
      if (/\d/.test(ch) || (ch === '-' && tokens.length === 0)) { tokens.push(this.readNumber()); continue; }
      if (/[A-Za-z]/.test(ch)) { tokens.push(this.readIdentifier()); continue; }
      switch (ch) {
        case '+': tokens.push({ type: 'PLUS', value: '+' }); break;
        case '-': tokens.push({ type: 'MINUS', value: '-' }); break;
        case '*': tokens.push({ type: 'STAR', value: '*' }); break;
        case '/': tokens.push({ type: 'SLASH', value: '/' }); break;
        case '^': tokens.push({ type: 'CARET', value: '^' }); break;
        case '(': tokens.push({ type: 'LPAREN', value: '(' }); break;
        case ')': tokens.push({ type: 'RPAREN', value: ')' }); break;
        case ',': tokens.push({ type: 'COMMA', value: ',' }); break;
        case '&': tokens.push({ type: 'AMPERSAND', value: '&' }); break;
        case '=': tokens.push({ type: 'EQ', value: '=' }); break;
        case '<':
          if (this.input[this.pos + 1] === '=') { tokens.push({ type: 'LTE', value: '<=' }); this.pos++; }
          else if (this.input[this.pos + 1] === '>') { tokens.push({ type: 'NEQ', value: '<>' }); this.pos++; }
          else tokens.push({ type: 'LT', value: '<' });
          break;
        case '>':
          if (this.input[this.pos + 1] === '=') { tokens.push({ type: 'GTE', value: '>=' }); this.pos++; }
          else tokens.push({ type: 'GT', value: '>' });
          break;
      }
      this.pos++;
    }
    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  private readString(): Token {
    this.pos++; // skip opening "
    let str = '';
    while (this.pos < this.input.length && this.input[this.pos] !== '"') {
      if (this.input[this.pos] === '\\') this.pos++;
      str += this.input[this.pos++];
    }
    this.pos++; // skip closing "
    return { type: 'STRING', value: str };
  }

  private readNumber(): Token {
    let num = '';
    if (this.input[this.pos] === '-') num += this.input[this.pos++];
    while (this.pos < this.input.length && /[\d.]/.test(this.input[this.pos])) {
      num += this.input[this.pos++];
    }
    return { type: 'NUMBER', value: parseFloat(num) };
  }

  private readIdentifier(): Token {
    let ident = '';
    while (this.pos < this.input.length && /[A-Za-z0-9_$]/.test(this.input[this.pos])) {
      ident += this.input[this.pos++];
    }
    if (this.input[this.pos] === ':') {
      this.pos++;
      let end = '';
      while (this.pos < this.input.length && /[A-Za-z0-9]/.test(this.input[this.pos])) {
        end += this.input[this.pos++];
      }
      return { type: 'RANGE', value: `${ident}:${end}` };
    }
    if (this.input[this.pos] === '(') {
      return { type: 'FUNC', value: ident.toUpperCase() };
    }
    if (/^[A-Za-z]+\d+$/.test(ident)) {
      return { type: 'CELL', value: ident.toUpperCase() };
    }
    const upper = ident.toUpperCase();
    if (upper === 'TRUE') return { type: 'BOOL', value: true };
    if (upper === 'FALSE') return { type: 'BOOL', value: false };
    return { type: 'CELL', value: ident.toUpperCase() };
  }
}

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private getCellValue: GetCellValue,
    private evaluating: Set<string>
  ) {}

  parse(): CellValue {
    const result = this.parseComparison();
    return result;
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private expect(type: TokenType): Token {
    const tok = this.consume();
    if (tok.type !== type) throw new Error(`Expected ${type} got ${tok.type}`);
    return tok;
  }

  private parseComparison(): CellValue {
    let left = this.parseConcat();
    while (['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE'].includes(this.peek().type)) {
      const op = this.consume().value as string;
      const right = this.parseConcat();
      const l = toNumber(left);
      const r = toNumber(right);
      if (op === '=') left = String(left) === String(right) || l === r;
      else if (op === '<>') left = String(left) !== String(right) && l !== r;
      else if (op === '<') left = (isNaN(l) ? String(left) < String(right) : l < r);
      else if (op === '<=') left = (isNaN(l) ? String(left) <= String(right) : l <= r);
      else if (op === '>') left = (isNaN(l) ? String(left) > String(right) : l > r);
      else if (op === '>=') left = (isNaN(l) ? String(left) >= String(right) : l >= r);
    }
    return left;
  }

  private parseConcat(): CellValue {
    let left = this.parseAddSub();
    while (this.peek().type === 'AMPERSAND') {
      this.consume();
      const right = this.parseAddSub();
      left = String(left ?? '') + String(right ?? '');
    }
    return left;
  }

  private parseAddSub(): CellValue {
    let left = this.parseMulDiv();
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      const l = toNumber(left);
      const r = toNumber(right);
      if (isNaN(l) || isNaN(r)) return '#VALUE!';
      left = op === '+' ? l + r : l - r;
    }
    return left;
  }

  private parseMulDiv(): CellValue {
    let left = this.parsePower();
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
      const op = this.consume().value;
      const right = this.parsePower();
      const l = toNumber(left);
      const r = toNumber(right);
      if (isNaN(l) || isNaN(r)) return '#VALUE!';
      if (op === '/' && r === 0) return '#DIV/0!';
      left = op === '*' ? l * r : l / r;
    }
    return left;
  }

  private parsePower(): CellValue {
    let left = this.parseUnary();
    if (this.peek().type === 'CARET') {
      this.consume();
      const right = this.parseUnary();
      return Math.pow(toNumber(left), toNumber(right));
    }
    return left;
  }

  private parseUnary(): CellValue {
    if (this.peek().type === 'MINUS') {
      this.consume();
      return -toNumber(this.parsePrimary());
    }
    if (this.peek().type === 'PLUS') {
      this.consume();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): CellValue {
    const tok = this.peek();

    if (tok.type === 'NUMBER') { this.consume(); return tok.value as number; }
    if (tok.type === 'STRING') { this.consume(); return tok.value as string; }
    if (tok.type === 'BOOL') { this.consume(); return tok.value as boolean; }

    if (tok.type === 'CELL') {
      this.consume();
      const addr = parseA1(tok.value as string);
      const key = `${addr.row},${addr.col}`;
      if (this.evaluating.has(key)) return '#CIRC!';
      return this.getCellValue(addr);
    }

    if (tok.type === 'RANGE') {
      this.consume();
      return tok.value as string;
    }

    if (tok.type === 'FUNC') {
      this.consume();
      return this.callFunction(tok.value as string);
    }

    if (tok.type === 'LPAREN') {
      this.consume();
      const val = this.parse();
      this.expect('RPAREN');
      return val;
    }

    return null;
  }

  private collectArgs(): CellValue[] {
    this.expect('LPAREN');
    const args: CellValue[] = [];
    if (this.peek().type !== 'RPAREN') {
      args.push(this.parseArg());
      while (this.peek().type === 'COMMA') {
        this.consume();
        args.push(this.parseArg());
      }
    }
    this.expect('RPAREN');
    return args;
  }

  private parseArg(): CellValue {
    if (this.peek().type === 'RANGE') {
      const tok = this.consume();
      return tok.value as string;
    }
    return this.parseComparison();
  }

  private expandRange(rangeStr: string): CellValue[] {
    try {
      const range = parseRangeA1(rangeStr as string);
      return rangeToAddresses(range).map((addr) => this.getCellValue(addr));
    } catch {
      return [];
    }
  }

  private getNumericValues(args: CellValue[]): number[] {
    const nums: number[] = [];
    for (const arg of args) {
      if (typeof arg === 'string' && /^[A-Z]+\d+:[A-Z]+\d+$/.test(arg)) {
        nums.push(...this.expandRange(arg).map(toNumber).filter((n) => !isNaN(n)));
      } else {
        const n = toNumber(arg);
        if (!isNaN(n)) nums.push(n);
      }
    }
    return nums;
  }

  private callFunction(name: string): CellValue {
    const args = this.collectArgs();

    switch (name) {
      case 'SUM': {
        const nums = this.getNumericValues(args);
        return nums.reduce((a, b) => a + b, 0);
      }
      case 'AVERAGE': {
        const nums = this.getNumericValues(args);
        if (nums.length === 0) return '#DIV/0!';
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      case 'COUNT': {
        const nums = this.getNumericValues(args);
        return nums.length;
      }
      case 'MAX': {
        const nums = this.getNumericValues(args);
        if (nums.length === 0) return 0;
        return Math.max(...nums);
      }
      case 'MIN': {
        const nums = this.getNumericValues(args);
        if (nums.length === 0) return 0;
        return Math.min(...nums);
      }
      case 'IF': {
        const condition = args[0];
        const truthy = toBool(condition);
        return truthy ? (args[1] ?? true) : (args[2] ?? false);
      }
      case 'VLOOKUP': {
        const lookupValue = args[0];
        const tableRange = args[1] as string;
        const colIndex = toNumber(args[2]) - 1;
        const exactMatch = args[3] === false || args[3] === 0;

        if (typeof tableRange !== 'string') return '#VALUE!';
        try {
          const range = parseRangeA1(tableRange);
          const { start, end } = range;
          for (let r = start.row; r <= end.row; r++) {
            const cellVal = this.getCellValue({ row: r, col: start.col });
            const match = exactMatch
              ? cellVal === lookupValue
              : String(cellVal) === String(lookupValue);
            if (match) {
              const targetCol = start.col + colIndex;
              if (targetCol > end.col) return '#REF!';
              return this.getCellValue({ row: r, col: targetCol });
            }
          }
          return '#N/A';
        } catch {
          return '#VALUE!';
        }
      }
      case 'ROUND': {
        const num = toNumber(args[0]);
        const digits = toNumber(args[1] ?? 0);
        return Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits);
      }
      case 'INT': return Math.floor(toNumber(args[0]));
      case 'ABS': return Math.abs(toNumber(args[0]));
      case 'SQRT': {
        const n = toNumber(args[0]);
        if (n < 0) return '#NUM!';
        return Math.sqrt(n);
      }
      case 'LEN': return String(args[0] ?? '').length;
      case 'LEFT': return String(args[0] ?? '').slice(0, toNumber(args[1] ?? 1));
      case 'RIGHT': {
        const s = String(args[0] ?? '');
        return s.slice(s.length - toNumber(args[1] ?? 1));
      }
      case 'MID': return String(args[0] ?? '').slice(toNumber(args[1]) - 1, toNumber(args[1]) - 1 + toNumber(args[2]));
      case 'UPPER': return String(args[0] ?? '').toUpperCase();
      case 'LOWER': return String(args[0] ?? '').toLowerCase();
      case 'TRIM': return String(args[0] ?? '').trim();
      case 'CONCATENATE':
      case 'CONCAT': return args.map((a) => String(a ?? '')).join('');
      case 'NOW': return new Date();
      case 'TODAY': {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      }
      default: return `#NAME?`;
    }
  }
}

function toNumber(val: CellValue): number {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (val instanceof Date) return val.getTime();
  const n = Number(val);
  return n;
}

function toBool(val: CellValue): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

export function evaluateFormula(
  formula: string,
  getCellValue: GetCellValue,
  currentCellKey?: string
): CellValue {
  if (!formula.startsWith('=')) return formula;
  const expression = formula.slice(1);
  const evaluating = new Set<string>(currentCellKey ? [currentCellKey] : []);

  try {
    const tokens = new Tokenizer(expression).tokenize();
    const parser = new Parser(tokens, getCellValue, evaluating);
    const result = parser.parse();
    return result;
  } catch {
    return '#ERROR!';
  }
}
