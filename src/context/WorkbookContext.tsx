'use client';
// Workbook state management: sheets, cells, undo/redo, charts

import React, { createContext, useContext, useReducer } from 'react';
import {
  WorkbookState,
  WorkbookAction,
  SheetData,
  CellData,
  ChartConfig,
} from '@/types';
import { normalizeRange, rangeToAddresses, generateId, deepClone } from '@/lib/utils';
import {
  pushHistory,
  undoHistory,
  redoHistory,
} from '@/lib/history-manager';

const WORKBOOK_HISTORY_ID = 'main';

function createEmptySheet(name: string): SheetData {
  const cells: CellData[][] = Array.from({ length: 100 }, () =>
    Array.from({ length: 26 }, () => ({ value: null, displayValue: '' }))
  );
  return {
    name,
    cells,
    colWidths: Array(26).fill(80),
    rowHeights: Array(100).fill(20),
    merges: [],
    filters: {},
    frozenRows: 0,
    frozenCols: 0,
    hiddenRows: [],
  };
}

const initialState: WorkbookState = {
  sheets: [],
  activeSheetIndex: 0,
  fileName: '',
  isDirty: false,
  charts: [],
};

function ensureSize(sheet: SheetData, row: number, col: number): SheetData {
  let cells = sheet.cells;
  let colWidths = sheet.colWidths;
  let rowHeights = sheet.rowHeights;
  let changed = false;

  if (row >= cells.length) {
    const newRows = row - cells.length + 1;
    const numCols = cells[0]?.length ?? Math.max(col + 1, 26);
    cells = [
      ...cells,
      ...Array.from({ length: newRows }, () =>
        Array.from({ length: numCols }, () => ({ value: null, displayValue: '' }))
      ),
    ];
    rowHeights = [...rowHeights, ...Array(newRows).fill(20)];
    changed = true;
  }

  if (col >= (cells[0]?.length ?? 0)) {
    const newCols = col - (cells[0]?.length ?? 0) + 1;
    cells = cells.map((r) => [
      ...r,
      ...Array.from({ length: newCols }, () => ({ value: null, displayValue: '' })),
    ]);
    colWidths = [...colWidths, ...Array(newCols).fill(80)];
    changed = true;
  }

  if (!changed) return sheet;
  return { ...sheet, cells, colWidths, rowHeights };
}

function shiftMerges(sheet: SheetData, insertedRow: number | null, insertedCol: number | null, count = 1): SheetData {
  if (!insertedRow && !insertedCol) return sheet;
  return {
    ...sheet,
    merges: sheet.merges
      .map((m) => {
        let sr = m.start.row, er = m.end.row;
        let sc = m.start.col, ec = m.end.col;
        if (insertedRow !== null) {
          if (sr >= insertedRow) { sr += count; er += count; }
          else if (er >= insertedRow) { er += count; }
        }
        if (insertedCol !== null) {
          if (sc >= insertedCol) { sc += count; ec += count; }
          else if (ec >= insertedCol) { ec += count; }
        }
        return { start: { row: sr, col: sc }, end: { row: er, col: ec } };
      })
      .filter((m) => m.start.row <= m.end.row && m.start.col <= m.end.col),
  };
}

function workbookReducer(state: WorkbookState, action: WorkbookAction): WorkbookState {
  switch (action.type) {
    case 'LOAD_WORKBOOK':
      return { ...action.payload, isDirty: false };

    case 'SET_ACTIVE_SHEET':
      return { ...state, activeSheetIndex: action.payload };

    case 'UPDATE_CELL': {
      const { sheetIndex, row, col, data } = action.payload;
      const sheet = ensureSize(state.sheets[sheetIndex], row, col);
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Edit cell');
      const newCells = sheet.cells.map((r, ri) =>
        ri === row ? r.map((c, ci) => (ci === col ? { ...c, ...data } : c)) : r
      );
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...sheet, cells: newCells } : s
      );
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'UPDATE_CELLS_FORMAT': {
      const { sheetIndex, range, format } = action.payload;
      const norm = normalizeRange(range);
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Format cells');
      const newCells = sheet.cells.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri < norm.start.row || ri > norm.end.row) return cell;
          if (ci < norm.start.col || ci > norm.end.col) return cell;
          return { ...cell, format: { ...cell.format, ...format } };
        })
      );
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: newCells } : s
      );
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'INSERT_ROW': {
      const { sheetIndex, rowIndex } = action.payload;
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Insert row');
      const numCols = sheet.cells[0]?.length ?? 26;
      const emptyRow: CellData[] = Array.from({ length: numCols }, () => ({ value: null, displayValue: '' }));
      const newCells = [
        ...sheet.cells.slice(0, rowIndex),
        emptyRow,
        ...sheet.cells.slice(rowIndex),
      ];
      const newHeights = [...sheet.rowHeights.slice(0, rowIndex), 20, ...sheet.rowHeights.slice(rowIndex)];
      const shifted = shiftMerges({ ...sheet, cells: newCells, rowHeights: newHeights }, rowIndex, null);
      const newSheets = state.sheets.map((s, i) => (i === sheetIndex ? shifted : s));
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'DELETE_ROW': {
      const { sheetIndex, rowIndex } = action.payload;
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Delete row');
      const newCells = sheet.cells.filter((_, ri) => ri !== rowIndex);
      const newHeights = sheet.rowHeights.filter((_, ri) => ri !== rowIndex);
      const newMerges = sheet.merges
        .filter((m) => m.start.row !== rowIndex)
        .map((m) => ({
          start: { row: m.start.row > rowIndex ? m.start.row - 1 : m.start.row, col: m.start.col },
          end: { row: m.end.row > rowIndex ? m.end.row - 1 : m.end.row, col: m.end.col },
        }));
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: newCells, rowHeights: newHeights, merges: newMerges } : s
      );
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'INSERT_COL': {
      const { sheetIndex, colIndex } = action.payload;
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Insert column');
      const newCells = sheet.cells.map((row) => [
        ...row.slice(0, colIndex),
        { value: null as null, displayValue: '' },
        ...row.slice(colIndex),
      ]);
      const newWidths = [...sheet.colWidths.slice(0, colIndex), 80, ...sheet.colWidths.slice(colIndex)];
      const shifted = shiftMerges({ ...sheet, cells: newCells, colWidths: newWidths }, null, colIndex);
      const newSheets = state.sheets.map((s, i) => (i === sheetIndex ? shifted : s));
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'DELETE_COL': {
      const { sheetIndex, colIndex } = action.payload;
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Delete column');
      const newCells = sheet.cells.map((row) => row.filter((_, ci) => ci !== colIndex));
      const newWidths = sheet.colWidths.filter((_, ci) => ci !== colIndex);
      const newMerges = sheet.merges
        .filter((m) => m.start.col !== colIndex)
        .map((m) => ({
          start: { row: m.start.row, col: m.start.col > colIndex ? m.start.col - 1 : m.start.col },
          end: { row: m.end.row, col: m.end.col > colIndex ? m.end.col - 1 : m.end.col },
        }));
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: newCells, colWidths: newWidths, merges: newMerges } : s
      );
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'ADD_SHEET': {
      const name = action.payload?.name ?? `Sheet${state.sheets.length + 1}`;
      const newSheet = createEmptySheet(name);
      return {
        ...state,
        sheets: [...state.sheets, newSheet],
        activeSheetIndex: state.sheets.length,
        isDirty: true,
      };
    }

    case 'DELETE_SHEET': {
      if (state.sheets.length <= 1) return state;
      const newSheets = state.sheets.filter((_, i) => i !== action.payload);
      const newActive = Math.min(state.activeSheetIndex, newSheets.length - 1);
      return { ...state, sheets: newSheets, activeSheetIndex: newActive, isDirty: true };
    }

    case 'RENAME_SHEET': {
      const newSheets = state.sheets.map((s, i) =>
        i === action.payload.index ? { ...s, name: action.payload.name } : s
      );
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'REORDER_SHEET': {
      const { from, to } = action.payload;
      const sheets = [...state.sheets];
      const [moved] = sheets.splice(from, 1);
      sheets.splice(to, 0, moved);
      let newActive = state.activeSheetIndex;
      if (state.activeSheetIndex === from) newActive = to;
      else if (from < state.activeSheetIndex && to >= state.activeSheetIndex) newActive--;
      else if (from > state.activeSheetIndex && to <= state.activeSheetIndex) newActive++;
      return { ...state, sheets, activeSheetIndex: newActive, isDirty: true };
    }

    case 'DUPLICATE_SHEET': {
      const original = state.sheets[action.payload];
      const copy = deepClone(original);
      copy.name = `${original.name} (2)`;
      const newSheets = [
        ...state.sheets.slice(0, action.payload + 1),
        copy,
        ...state.sheets.slice(action.payload + 1),
      ];
      return { ...state, sheets: newSheets, activeSheetIndex: action.payload + 1, isDirty: true };
    }

    case 'UNDO': {
      const newState = undoHistory(WORKBOOK_HISTORY_ID, state);
      return newState ?? state;
    }

    case 'REDO': {
      const newState = redoHistory(WORKBOOK_HISTORY_ID, state);
      return newState ?? state;
    }

    case 'SET_FILTER': {
      const { sheetIndex, colIndex, filter } = action.payload;
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, filters: { ...s.filters, [colIndex]: filter } } : s
      );
      return { ...state, sheets: newSheets };
    }

    case 'CLEAR_FILTER': {
      const { sheetIndex, colIndex } = action.payload;
      const sheet = state.sheets[sheetIndex];
      const newFilters = { ...sheet.filters };
      delete newFilters[colIndex];
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, filters: newFilters } : s
      );
      return { ...state, sheets: newSheets };
    }

    case 'CLEAR_ALL_FILTERS': {
      const newSheets = state.sheets.map((s, i) =>
        i === action.payload ? { ...s, filters: {} } : s
      );
      return { ...state, sheets: newSheets };
    }

    case 'SET_SORT': {
      const { sheetIndex, colIndex, direction } = action.payload;
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Sort');
      const sortedCells = [...sheet.cells].sort((a, b) => {
        const va = a[colIndex]?.value ?? '';
        const vb = b[colIndex]?.value ?? '';
        const na = typeof va === 'number' ? va : NaN;
        const nb = typeof vb === 'number' ? vb : NaN;
        if (!isNaN(na) && !isNaN(nb)) return direction === 'asc' ? na - nb : nb - na;
        const sa = String(va);
        const sb = String(vb);
        return direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: sortedCells, sort: { colIndex, direction } } : s
      );
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'ADD_CHART': {
      const chart: ChartConfig = { ...action.payload, id: generateId() };
      return { ...state, charts: [...state.charts, chart] };
    }

    case 'UPDATE_CHART': {
      const newCharts = state.charts.map((c) =>
        c.id === action.payload.id ? { ...c, ...action.payload.config } : c
      );
      return { ...state, charts: newCharts };
    }

    case 'REMOVE_CHART': {
      return { ...state, charts: state.charts.filter((c) => c.id !== action.payload) };
    }

    case 'PASTE_CELLS': {
      const { sheetIndex, targetCell, clipboardData } = action.payload;
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Paste');
      let updatedSheet = sheet;

      for (let ri = 0; ri < clipboardData.cells.length; ri++) {
        for (let ci = 0; ci < clipboardData.cells[ri].length; ci++) {
          const cell = clipboardData.cells[ri][ci];
          const tr = targetCell.row + ri;
          const tc = targetCell.col + ci;
          updatedSheet = ensureSize(updatedSheet, tr, tc);
          const newCells = updatedSheet.cells.map((row, rr) =>
            rr === tr ? row.map((c, cc) => (cc === tc ? { ...cell } : c)) : row
          );
          updatedSheet = { ...updatedSheet, cells: newCells };
        }
      }

      const newSheets = state.sheets.map((s, i) => (i === sheetIndex ? updatedSheet : s));
      return { ...state, sheets: newSheets, isDirty: true };
    }

    case 'CLEAR_CELLS': {
      const { sheetIndex, range } = action.payload;
      const sheet = state.sheets[sheetIndex];
      pushHistory(WORKBOOK_HISTORY_ID, sheetIndex, sheet, 'Clear cells');
      const addrs = rangeToAddresses(normalizeRange(range));
      const cleared = new Set(addrs.map((a) => `${a.row},${a.col}`));
      const newCells = sheet.cells.map((row, ri) =>
        row.map((cell, ci) =>
          cleared.has(`${ri},${ci}`)
            ? { value: null as null, displayValue: '', format: cell.format }
            : cell
        )
      );
      const newSheets = state.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: newCells } : s
      );
      return { ...state, sheets: newSheets, isDirty: true };
    }

    default:
      return state;
  }
}

interface WorkbookContextValue {
  state: WorkbookState;
  dispatch: React.Dispatch<WorkbookAction>;
}

const WorkbookContext = createContext<WorkbookContextValue | null>(null);

export function WorkbookProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workbookReducer, initialState);
  return (
    <WorkbookContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkbookContext.Provider>
  );
}

export function useWorkbookContext(): WorkbookContextValue {
  const ctx = useContext(WorkbookContext);
  if (!ctx) throw new Error('useWorkbookContext must be inside WorkbookProvider');
  return ctx;
}
