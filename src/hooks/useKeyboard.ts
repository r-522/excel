'use client';
// Global keyboard handler — single listener on document
// Routes all keyboard shortcuts to workbook/selection actions

import { useEffect, useCallback, useRef } from 'react';
import { useWorkbookContext } from '@/context/WorkbookContext';
import { useSelectionContext } from '@/context/SelectionContext';
import { CellAddress, ClipboardData } from '@/types';
import { normalizeRange } from '@/lib/utils';

interface UseKeyboardOptions {
  onOpenSearch?: () => void;
  onOpenReplace?: () => void;
  onSave?: () => void;
}

export function useKeyboard(options: UseKeyboardOptions = {}) {
  const { state: wb, dispatch: wbDispatch } = useWorkbookContext();
  const { state: sel, dispatch: selDispatch } = useSelectionContext();

  const activeSheet = wb.sheets[wb.activeSheetIndex];
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const moveSelection = useCallback(
    (dRow: number, dCol: number, extend = false) => {
      if (!activeSheet) return;
      const base = extend ? sel.focus : sel.anchor;
      const maxRow = activeSheet.cells.length - 1;
      const maxCol = (activeSheet.cells[0]?.length ?? 1) - 1;
      const newRow = Math.max(0, Math.min(maxRow, base.row + dRow));
      const newCol = Math.max(0, Math.min(maxCol, base.col + dCol));
      const newAddr: CellAddress = { row: newRow, col: newCol };
      if (extend) {
        selDispatch({ type: 'EXTEND_SELECTION', payload: newAddr });
      } else {
        selDispatch({ type: 'SET_SELECTION', payload: { anchor: newAddr, focus: newAddr } });
      }
    },
    [activeSheet, sel.anchor, sel.focus, selDispatch]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing = sel.editingCell !== null;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isEditing && isInInput) {
        if (e.key === 'Escape') {
          e.preventDefault();
          selDispatch({ type: 'STOP_EDIT' });
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          selDispatch({ type: 'STOP_EDIT' });
          moveSelection(1, 0);
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          selDispatch({ type: 'STOP_EDIT' });
          moveSelection(0, e.shiftKey ? -1 : 1);
        }
        return;
      }

      if (isInInput) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            wbDispatch({ type: 'UNDO' });
            return;
          case 'y':
            e.preventDefault();
            wbDispatch({ type: 'REDO' });
            return;
          case 'c': {
            e.preventDefault();
            if (!activeSheet) return;
            const range = normalizeRange({ start: sel.anchor, end: sel.focus });
            const cells = [];
            for (let r = range.start.row; r <= range.end.row; r++) {
              const row = [];
              for (let c = range.start.col; c <= range.end.col; c++) {
                row.push({ ...activeSheet.cells[r]?.[c] ?? { value: null, displayValue: '' } });
              }
              cells.push(row);
            }
            const clipboard: ClipboardData = {
              cells,
              type: 'copy',
              sourceRange: range,
              sourceSheetIndex: wb.activeSheetIndex,
            };
            selDispatch({ type: 'SET_CLIPBOARD', payload: clipboard });
            return;
          }
          case 'x': {
            e.preventDefault();
            if (!activeSheet) return;
            const range = normalizeRange({ start: sel.anchor, end: sel.focus });
            const cells = [];
            for (let r = range.start.row; r <= range.end.row; r++) {
              const row = [];
              for (let c = range.start.col; c <= range.end.col; c++) {
                row.push({ ...activeSheet.cells[r]?.[c] ?? { value: null, displayValue: '' } });
              }
              cells.push(row);
            }
            const clipboard: ClipboardData = {
              cells,
              type: 'cut',
              sourceRange: range,
              sourceSheetIndex: wb.activeSheetIndex,
            };
            selDispatch({ type: 'SET_CLIPBOARD', payload: clipboard });
            wbDispatch({ type: 'CLEAR_CELLS', payload: { sheetIndex: wb.activeSheetIndex, range } });
            return;
          }
          case 'v':
            e.preventDefault();
            if (sel.clipboardData) {
              wbDispatch({
                type: 'PASTE_CELLS',
                payload: {
                  sheetIndex: wb.activeSheetIndex,
                  targetCell: sel.anchor,
                  clipboardData: sel.clipboardData,
                },
              });
            }
            return;
          case 'f':
            e.preventDefault();
            optionsRef.current.onOpenSearch?.();
            return;
          case 'h':
            e.preventDefault();
            optionsRef.current.onOpenReplace?.();
            return;
          case 's':
            e.preventDefault();
            optionsRef.current.onSave?.();
            return;
          case 'b':
            e.preventDefault();
            wbDispatch({
              type: 'UPDATE_CELLS_FORMAT',
              payload: {
                sheetIndex: wb.activeSheetIndex,
                range: normalizeRange({ start: sel.anchor, end: sel.focus }),
                format: { fontBold: !(activeSheet?.cells[sel.anchor.row]?.[sel.anchor.col]?.format?.fontBold) },
              },
            });
            return;
          case 'i':
            e.preventDefault();
            wbDispatch({
              type: 'UPDATE_CELLS_FORMAT',
              payload: {
                sheetIndex: wb.activeSheetIndex,
                range: normalizeRange({ start: sel.anchor, end: sel.focus }),
                format: { fontItalic: !(activeSheet?.cells[sel.anchor.row]?.[sel.anchor.col]?.format?.fontItalic) },
              },
            });
            return;
          case 'u':
            e.preventDefault();
            wbDispatch({
              type: 'UPDATE_CELLS_FORMAT',
              payload: {
                sheetIndex: wb.activeSheetIndex,
                range: normalizeRange({ start: sel.anchor, end: sel.focus }),
                format: { fontUnderline: !(activeSheet?.cells[sel.anchor.row]?.[sel.anchor.col]?.format?.fontUnderline) },
              },
            });
            return;
          case 'home':
            e.preventDefault();
            selDispatch({ type: 'SET_SELECTION', payload: { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } } });
            return;
          case 'end':
            e.preventDefault();
            if (!activeSheet) return;
            const lastRow = activeSheet.cells.length - 1;
            const lastCol = (activeSheet.cells[0]?.length ?? 1) - 1;
            selDispatch({ type: 'SET_SELECTION', payload: { anchor: { row: lastRow, col: lastCol }, focus: { row: lastRow, col: lastCol } } });
            return;
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); moveSelection(-1, 0, e.shiftKey); break;
        case 'ArrowDown': e.preventDefault(); moveSelection(1, 0, e.shiftKey); break;
        case 'ArrowLeft': e.preventDefault(); moveSelection(0, -1, e.shiftKey); break;
        case 'ArrowRight': e.preventDefault(); moveSelection(0, 1, e.shiftKey); break;
        case 'Tab': e.preventDefault(); moveSelection(0, e.shiftKey ? -1 : 1); break;
        case 'Enter': e.preventDefault(); moveSelection(e.shiftKey ? -1 : 1, 0); break;
        case 'F2':
          e.preventDefault();
          selDispatch({ type: 'START_EDIT', payload: sel.anchor });
          break;
        case 'Delete':
        case 'Backspace':
          if (!isEditing) {
            e.preventDefault();
            wbDispatch({
              type: 'CLEAR_CELLS',
              payload: {
                sheetIndex: wb.activeSheetIndex,
                range: normalizeRange({ start: sel.anchor, end: sel.focus }),
              },
            });
          }
          break;
        default:
          if (!isEditing && e.key.length === 1 && !ctrl) {
            selDispatch({ type: 'START_EDIT', payload: sel.anchor });
          }
      }
    },
    [activeSheet, sel, selDispatch, wbDispatch, wb.activeSheetIndex, moveSelection]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
