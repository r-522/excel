// Converts CellFormat to React CSS properties

import type React from 'react';
import { CellFormat } from '@/types';

export function formatToCSS(format?: CellFormat): React.CSSProperties {
  if (!format) return {};
  const style: React.CSSProperties = {};

  if (format.fontBold) style.fontWeight = 'bold';
  if (format.fontItalic) style.fontStyle = 'italic';

  const decorations: string[] = [];
  if (format.fontUnderline) decorations.push('underline');
  if (format.fontStrikethrough) decorations.push('line-through');
  if (decorations.length > 0) style.textDecoration = decorations.join(' ');

  if (format.fontSize) style.fontSize = `${format.fontSize}pt`;
  if (format.fontColor) style.color = format.fontColor;
  if (format.bgColor) style.backgroundColor = format.bgColor;

  if (format.hAlign) style.textAlign = format.hAlign;
  if (format.vAlign) {
    style.verticalAlign = format.vAlign === 'middle' ? 'middle' : format.vAlign;
  }
  if (format.wrapText) {
    style.whiteSpace = 'normal';
    style.wordBreak = 'break-word';
  } else {
    style.whiteSpace = 'nowrap';
    style.overflow = 'hidden';
    style.textOverflow = 'ellipsis';
  }

  return style;
}

export function mergeFormats(base?: CellFormat, override?: Partial<CellFormat>): CellFormat {
  return { ...base, ...override };
}
