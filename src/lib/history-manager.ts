// Undo/redo history using full workbook state snapshots
// Snapshots only the active sheet to reduce memory usage

import { WorkbookState, SheetData } from '@/types';
import { deepClone } from './utils';

const MAX_HISTORY = 50;

interface HistoryStack {
  undoStack: SheetSnapshot[];
  redoStack: SheetSnapshot[];
}

interface SheetSnapshot {
  sheetIndex: number;
  sheetData: SheetData;
  description: string;
}

const historyStacks = new Map<string, HistoryStack>();

function getStack(id: string): HistoryStack {
  if (!historyStacks.has(id)) {
    historyStacks.set(id, { undoStack: [], redoStack: [] });
  }
  return historyStacks.get(id)!;
}

export function pushHistory(
  id: string,
  sheetIndex: number,
  sheetData: SheetData,
  description: string
): void {
  const stack = getStack(id);
  stack.undoStack.push({
    sheetIndex,
    sheetData: deepClone(sheetData),
    description,
  });
  if (stack.undoStack.length > MAX_HISTORY) {
    stack.undoStack.shift();
  }
  stack.redoStack = [];
}

export function undoHistory(
  id: string,
  state: WorkbookState
): WorkbookState | null {
  const stack = getStack(id);
  if (stack.undoStack.length === 0) return null;

  const snapshot = stack.undoStack.pop()!;
  const currentSheet = deepClone(state.sheets[snapshot.sheetIndex]);
  stack.redoStack.push({
    sheetIndex: snapshot.sheetIndex,
    sheetData: currentSheet,
    description: snapshot.description,
  });

  const newSheets = [...state.sheets];
  newSheets[snapshot.sheetIndex] = snapshot.sheetData;
  return { ...state, sheets: newSheets };
}

export function redoHistory(
  id: string,
  state: WorkbookState
): WorkbookState | null {
  const stack = getStack(id);
  if (stack.redoStack.length === 0) return null;

  const snapshot = stack.redoStack.pop()!;
  const currentSheet = deepClone(state.sheets[snapshot.sheetIndex]);
  stack.undoStack.push({
    sheetIndex: snapshot.sheetIndex,
    sheetData: currentSheet,
    description: snapshot.description,
  });

  const newSheets = [...state.sheets];
  newSheets[snapshot.sheetIndex] = snapshot.sheetData;
  return { ...state, sheets: newSheets };
}

export function canUndo(id: string): boolean {
  return (historyStacks.get(id)?.undoStack.length ?? 0) > 0;
}

export function canRedo(id: string): boolean {
  return (historyStacks.get(id)?.redoStack.length ?? 0) > 0;
}

export function clearHistory(id: string): void {
  historyStacks.delete(id);
}
