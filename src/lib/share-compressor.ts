'use client';
// URL sharing: workbook → binary → LZ-String compress → base64url
// Uses compressToEncodedURIComponent (URL-safe), NOT compressToBase64

import LZString from 'lz-string';
import { WorkbookState } from '@/types';
import { workbookToBuffer } from './excel-engine';

export type ShareTier = 'url' | 'blob' | 'too-large';

const URL_PARAM_MAX = 1500;
const BLOB_MAX = 100_000;

export function compressWorkbook(state: WorkbookState): { compressed: string; tier: ShareTier } {
  const buffer = workbookToBuffer(state, 'xlsx');
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
  const compressed = LZString.compressToEncodedURIComponent(binary);

  if (compressed.length <= URL_PARAM_MAX) return { compressed, tier: 'url' };
  if (compressed.length <= BLOB_MAX) return { compressed, tier: 'blob' };
  return { compressed, tier: 'too-large' };
}

export function decompressWorkbook(compressed: string): ArrayBuffer {
  const binary = LZString.decompressFromEncodedURIComponent(compressed);
  if (!binary) throw new Error('Failed to decompress data');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
