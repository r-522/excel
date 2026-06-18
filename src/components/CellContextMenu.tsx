'use client';
// Right-click context menu for grid cells

import React from 'react';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useSelection } from '@/hooks/useSelection';
import { normalizeRange } from '@/lib/utils';

interface ContextMenuProps {
  x: number;
  y: number;
  row: number;
  col: number;
  onClose: () => void;
}

export function CellContextMenu({ x, y, row, col, onClose }: ContextMenuProps) {
  const { activeSheet, activeSheetIndex, insertRow, deleteRow, insertCol, deleteCol, dispatch } = useWorkbook();
  const { anchor, focus, setClipboard, clipboardData } = useSelection();

  const items = [
    { label: 'Insert Row Above', action: () => insertRow(row) },
    { label: 'Insert Row Below', action: () => insertRow(row + 1) },
    { label: 'Insert Column Left', action: () => insertCol(col) },
    { label: 'Insert Column Right', action: () => insertCol(col + 1) },
    null,
    { label: 'Delete Row', action: () => deleteRow(row) },
    { label: 'Delete Column', action: () => deleteCol(col) },
    null,
    {
      label: 'Copy', action: () => {
        if (!activeSheet) return;
        const range = normalizeRange({ start: anchor, end: focus });
        const cells = [];
        for (let r = range.start.row; r <= range.end.row; r++) {
          const rowData = [];
          for (let c = range.start.col; c <= range.end.col; c++) {
            rowData.push({ ...activeSheet.cells[r]?.[c] ?? { value: null, displayValue: '' } });
          }
          cells.push(rowData);
        }
        setClipboard({ cells, type: 'copy', sourceRange: range, sourceSheetIndex: activeSheetIndex });
      }
    },
    {
      label: 'Cut', action: () => {
        if (!activeSheet) return;
        const range = normalizeRange({ start: anchor, end: focus });
        const cells = [];
        for (let r = range.start.row; r <= range.end.row; r++) {
          const rowData = [];
          for (let c = range.start.col; c <= range.end.col; c++) {
            rowData.push({ ...activeSheet.cells[r]?.[c] ?? { value: null, displayValue: '' } });
          }
          cells.push(rowData);
        }
        setClipboard({ cells, type: 'cut', sourceRange: range, sourceSheetIndex: activeSheetIndex });
        dispatch({ type: 'CLEAR_CELLS', payload: { sheetIndex: activeSheetIndex, range } });
      }
    },
    {
      label: 'Paste', action: () => {
        if (!clipboardData) return;
        dispatch({ type: 'PASTE_CELLS', payload: { sheetIndex: activeSheetIndex, targetCell: { row, col }, clipboardData } });
      },
      disabled: !clipboardData,
    },
    null,
    {
      label: 'Clear Contents', action: () => {
        const range = normalizeRange({ start: anchor, end: focus });
        dispatch({ type: 'CLEAR_CELLS', payload: { sheetIndex: activeSheetIndex, range } });
      }
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute z-50 min-w-[160px] rounded border border-gray-200 bg-white py-1 shadow-lg"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) =>
          item === null ? (
            <div key={i} className="my-1 border-t border-gray-100" />
          ) : (
            <button
              key={item.label}
              disabled={'disabled' in item && item.disabled}
              className="block w-full px-4 py-1 text-left text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => { item.action(); onClose(); }}
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}
