// Utility functions: cell address conversion, range helpers, formatting

import { CellAddress, CellRange } from '@/types';

export function colIndexToLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

export function letterToColIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}

export function parseA1(addr: string): CellAddress {
  const match = addr.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell address: ${addr}`);
  return {
    col: letterToColIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10) - 1,
  };
}

export function cellAddressToA1(addr: CellAddress): string {
  return `${colIndexToLetter(addr.col)}${addr.row + 1}`;
}

export function rangeToAddresses(range: CellRange): CellAddress[] {
  const addresses: CellAddress[] = [];
  const minRow = Math.min(range.start.row, range.end.row);
  const maxRow = Math.max(range.start.row, range.end.row);
  const minCol = Math.min(range.start.col, range.end.col);
  const maxCol = Math.max(range.start.col, range.end.col);
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      addresses.push({ row: r, col: c });
    }
  }
  return addresses;
}

export function normalizeRange(range: CellRange): CellRange {
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      col: Math.min(range.start.col, range.end.col),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      col: Math.max(range.start.col, range.end.col),
    },
  };
}

export function isAddressInRange(addr: CellAddress, range: CellRange): boolean {
  const norm = normalizeRange(range);
  return (
    addr.row >= norm.start.row &&
    addr.row <= norm.end.row &&
    addr.col >= norm.start.col &&
    addr.col <= norm.end.col
  );
}

export function parseRangeA1(rangeStr: string): CellRange {
  const parts = rangeStr.split(':');
  if (parts.length === 1) {
    const addr = parseA1(parts[0]);
    return { start: addr, end: addr };
  }
  return { start: parseA1(parts[0]), end: parseA1(parts[1]) };
}

export function formatCellValue(value: unknown, numberFormat?: string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === 'number') {
    if (numberFormat) {
      return applyNumberFormat(value, numberFormat);
    }
    return String(value);
  }
  return String(value);
}

function applyNumberFormat(value: number, format: string): string {
  if (format === '0.00' || format === '#,##0.00') {
    return value.toFixed(2);
  }
  if (format === '0%' || format === '0.00%') {
    return (value * 100).toFixed(format === '0%' ? 0 : 2) + '%';
  }
  if (format.includes('$') || format.includes('¥') || format.includes('€')) {
    const symbol = format.match(/[$¥€]/)?.[0] || '$';
    return `${symbol}${value.toFixed(2)}`;
  }
  if (format.includes('d') || format.includes('m') || format.includes('y')) {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toLocaleDateString();
  }
  return String(value);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, value) => {
    if (value instanceof Set) return { __type: 'Set', values: Array.from(value) };
    return value;
  }), (_key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Set') {
      return new Set(value.values);
    }
    return value;
  });
}
