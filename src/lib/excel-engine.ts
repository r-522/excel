'use client';
// SheetJS wrapper — the ONLY file that imports xlsx directly

import * as XLSX from 'xlsx';
import {
  WorkbookState,
  SheetData,
  CellData,
  CellFormat,
  MergeRange,
} from '@/types';
import { formatCellValue } from './utils';

const DEFAULT_COL_WIDTH = 80;
const DEFAULT_ROW_HEIGHT = 20;
const CHAR_WIDTH_PX = 7;
const PT_TO_PX = 1.333;

function xlsxStyleToCellFormat(style: any): CellFormat | undefined {
  if (!style) return undefined;
  const fmt: CellFormat = {};
  if (style.font?.bold) fmt.fontBold = true;
  if (style.font?.italic) fmt.fontItalic = true;
  if (style.font?.underline) fmt.fontUnderline = true;
  if (style.font?.strike) fmt.fontStrikethrough = true;
  if (style.font?.sz) fmt.fontSize = style.font.sz;
  if (style.font?.color?.rgb) fmt.fontColor = `#${style.font.color.rgb.slice(-6)}`;
  if (style.fill?.fgColor?.rgb) fmt.bgColor = `#${style.fill.fgColor.rgb.slice(-6)}`;
  if (style.alignment?.horizontal) {
    const h = style.alignment.horizontal;
    if (h === 'center') fmt.hAlign = 'center';
    else if (h === 'right') fmt.hAlign = 'right';
    else fmt.hAlign = 'left';
  }
  if (style.alignment?.vertical) {
    const v = style.alignment.vertical;
    if (v === 'top') fmt.vAlign = 'top';
    else if (v === 'bottom') fmt.vAlign = 'bottom';
    else fmt.vAlign = 'middle';
  }
  if (style.alignment?.wrapText) fmt.wrapText = true;
  if (style.numFmt) fmt.numberFormat = style.numFmt as string;
  return Object.keys(fmt).length > 0 ? fmt : undefined;
}

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): SheetData {
  const ref = ws['!ref'];
  if (!ref) {
    return {
      name: sheetName,
      cells: [],
      colWidths: [],
      rowHeights: [],
      merges: [],
      filters: {},
      frozenRows: 0,
      frozenCols: 0,
      hiddenRows: [],
    };
  }

  const range = XLSX.utils.decode_range(ref);
  const numRows = range.e.r + 1;
  const numCols = range.e.c + 1;

  const cells: CellData[][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => ({
      value: null,
      displayValue: '',
    }))
  );

  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellAddr] as XLSX.CellObject | undefined;
      if (!cell) continue;

      const formula = cell.f ? `=${cell.f}` : undefined;
      const value = cell.v ?? null;
      const format = xlsxStyleToCellFormat(cell.s as any);
      const numFmt = cell.z as string | undefined;

      cells[r][c] = {
        value: value as import('@/types').CellValue,
        formula,
        displayValue: cell.w ?? formatCellValue(value, numFmt),
        format,
      };
    }
  }

  const merges: MergeRange[] = (ws['!merges'] || []).map((m: XLSX.Range) => ({
    start: { row: m.s.r, col: m.s.c },
    end: { row: m.e.r, col: m.e.c },
  }));

  for (const merge of merges) {
    const sr = merge.start.row;
    const sc = merge.start.col;
    const er = merge.end.row;
    const ec = merge.end.col;

    if (sr < numRows && sc < numCols) {
      cells[sr][sc].isMergeStart = true;
      cells[sr][sc].colSpan = ec - sc + 1;
      cells[sr][sc].rowSpan = er - sr + 1;
    }

    for (let r = sr; r <= er && r < numRows; r++) {
      for (let c = sc; c <= ec && c < numCols; c++) {
        if (r === sr && c === sc) continue;
        cells[r][c].isHidden = true;
      }
    }
  }

  const colDefs = ws['!cols'] as XLSX.ColInfo[] | undefined;
  const colWidths: number[] = Array.from({ length: numCols }, (_, i) => {
    const col = colDefs?.[i];
    if (col?.wpx) return col.wpx;
    if (col?.wch) return Math.round(col.wch * CHAR_WIDTH_PX + 5);
    if (col?.width) return Math.round(col.width * CHAR_WIDTH_PX + 5);
    return DEFAULT_COL_WIDTH;
  });

  const rowDefs = ws['!rows'] as XLSX.RowInfo[] | undefined;
  const rowHeights: number[] = Array.from({ length: numRows }, (_, i) => {
    const row = rowDefs?.[i];
    if (row?.hpx) return row.hpx;
    if (row?.hpt) return Math.round(row.hpt * PT_TO_PX);
    return DEFAULT_ROW_HEIGHT;
  });

  const freeze = ws['!freeze'] as { xSplit?: number; ySplit?: number } | undefined;

  return {
    name: sheetName,
    cells,
    colWidths,
    rowHeights,
    merges,
    filters: {},
    frozenRows: freeze?.ySplit ?? 0,
    frozenCols: freeze?.xSplit ?? 0,
    hiddenRows: [],
  };
}

export async function parseFile(file: File, password?: string): Promise<WorkbookState> {
  const buffer = await file.arrayBuffer();
  const options: XLSX.ParsingOptions = {
    type: 'array',
    cellStyles: true,
    cellFormula: true,
    cellDates: true,
    cellNF: true,
    ...(password ? { password } : {}),
  };

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(new Uint8Array(buffer), options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypt')) {
      throw new Error('PASSWORD_REQUIRED');
    }
    throw e;
  }

  const sheets: SheetData[] = wb.SheetNames.map((name) =>
    parseSheet(wb.Sheets[name], name)
  );

  return {
    sheets,
    activeSheetIndex: 0,
    fileName: file.name,
    isDirty: false,
    charts: [],
  };
}

function cellFormatToXlsxStyle(fmt?: CellFormat): any {
  if (!fmt) return undefined;
  const style: any = {};

  if (fmt.fontBold || fmt.fontItalic || fmt.fontUnderline || fmt.fontStrikethrough || fmt.fontSize || fmt.fontColor) {
    style.font = {};
    if (fmt.fontBold) style.font.bold = true;
    if (fmt.fontItalic) style.font.italic = true;
    if (fmt.fontUnderline) style.font.underline = true;
    if (fmt.fontStrikethrough) style.font.strike = true;
    if (fmt.fontSize) style.font.sz = fmt.fontSize;
    if (fmt.fontColor) style.font.color = { rgb: fmt.fontColor.replace('#', 'FF') };
  }

  if (fmt.bgColor) {
    style.fill = { fgColor: { rgb: fmt.bgColor.replace('#', 'FF') } };
  }

  if (fmt.hAlign || fmt.vAlign || fmt.wrapText) {
    style.alignment = {};
    if (fmt.hAlign) style.alignment.horizontal = fmt.hAlign;
    if (fmt.vAlign) style.alignment.vertical = fmt.vAlign === 'middle' ? 'center' : fmt.vAlign;
    if (fmt.wrapText) style.alignment.wrapText = true;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

export function workbookToBuffer(state: WorkbookState, bookType: XLSX.BookType = 'xlsx'): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  for (const sheet of state.sheets) {
    const maxRow = sheet.cells.length;
    const maxCol = sheet.cells[0]?.length ?? 0;

    const ws: XLSX.WorkSheet = {};
    let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;

    for (let r = 0; r < maxRow; r++) {
      for (let c = 0; c < maxCol; c++) {
        const cell = sheet.cells[r]?.[c];
        if (!cell || cell.isHidden) continue;

        const addr = XLSX.utils.encode_cell({ r, c });
        const xlCell: XLSX.CellObject = {
          v: cell.value ?? undefined,
          t: getCellType(cell.value),
        };

        if (cell.formula) {
          xlCell.f = cell.formula.startsWith('=') ? cell.formula.slice(1) : cell.formula;
        }

        const style = cellFormatToXlsxStyle(cell.format);
        if (style) xlCell.s = style;

        ws[addr] = xlCell;
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
    }

    if (maxR >= 0) {
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
    }

    if (sheet.merges.length > 0) {
      ws['!merges'] = sheet.merges.map((m) => ({
        s: { r: m.start.row, c: m.start.col },
        e: { r: m.end.row, c: m.end.col },
      }));
    }

    if (sheet.colWidths.length > 0) {
      ws['!cols'] = sheet.colWidths.map((w) => ({ wpx: w }));
    }

    if (sheet.rowHeights.length > 0) {
      ws['!rows'] = sheet.rowHeights.map((h) => ({ hpx: h }));
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  return XLSX.write(wb, { type: 'array', bookType }) as ArrayBuffer;
}

function getCellType(value: unknown): XLSX.ExcelDataType {
  if (value === null || value === undefined) return 'z';
  if (typeof value === 'boolean') return 'b';
  if (typeof value === 'number') return 'n';
  if (value instanceof Date) return 'd';
  return 's';
}

export function sheetToCSV(sheet: SheetData): string {
  return sheet.cells.map((row) =>
    row.map((cell) => {
      const val = cell.displayValue || '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  ).join('\n');
}
