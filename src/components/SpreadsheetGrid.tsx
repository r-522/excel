'use client';
// Main spreadsheet grid: HTML table with sticky headers, merge cells, selection overlay

import React, { useRef, useCallback, memo, useEffect } from 'react';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useSelection } from '@/hooks/useSelection';
import { CellData, CellAddress } from '@/types';
import { colIndexToLetter, formatCellValue } from '@/lib/utils';
import { formatToCSS } from '@/lib/format-applier';
import { evaluateFormula } from '@/lib/formula-parser';

const DEFAULT_ROW_HEIGHT = 20;
const HEADER_COL_WIDTH = 40;

interface CellProps {
  cell: CellData;
  row: number;
  col: number;
  isSelected: boolean;
  isEditing: boolean;
  width: number;
  height: number;
  displayValue: string;
  onMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  onDoubleClick: (row: number, col: number) => void;
  onEditCommit: (row: number, col: number, value: string) => void;
  onEditCancel: () => void;
}

const GridCell = memo(function GridCell({
  cell,
  row,
  col,
  isSelected,
  isEditing,
  width,
  height,
  displayValue,
  onMouseDown,
  onDoubleClick,
  onEditCommit,
  onEditCancel,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValue = cell?.formula ?? (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '');

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const style: React.CSSProperties = {
    width,
    minWidth: width,
    maxWidth: width,
    height,
    ...formatToCSS(cell?.format),
    padding: '0 3px',
    boxSizing: 'border-box',
    position: 'relative',
  };

  if (cell?.isHidden) return null;

  return (
    <td
      colSpan={cell?.colSpan}
      rowSpan={cell?.rowSpan}
      style={style}
      className={`border-b border-r border-gray-200 text-[11px] overflow-hidden ${
        isSelected ? 'bg-blue-50' : ''
      }`}
      role="gridcell"
      aria-selected={isSelected}
      onMouseDown={(e) => onMouseDown(row, col, e)}
      onDoubleClick={() => onDoubleClick(row, col)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          defaultValue={initialValue}
          className="absolute inset-0 w-full h-full border-2 border-blue-500 bg-white px-1 text-[11px] outline-none z-10"
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onEditCommit(row, col, (e.target as HTMLInputElement).value); }
            if (e.key === 'Escape') { e.preventDefault(); onEditCancel(); }
            if (e.key === 'Tab') { e.preventDefault(); onEditCommit(row, col, (e.target as HTMLInputElement).value); }
          }}
          onBlur={(e) => onEditCommit(row, col, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="block truncate leading-[18px]">{displayValue}</span>
      )}
    </td>
  );
}, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.isEditing === next.isEditing &&
    prev.displayValue === next.displayValue &&
    prev.cell === next.cell &&
    prev.width === next.width &&
    prev.height === next.height
  );
});

interface RowProps {
  rowIndex: number;
  cells: CellData[];
  height: number;
  colWidths: number[];
  isInSelection: (row: number, col: number) => boolean;
  editingCell: CellAddress | null;
  getCellDisplay: (cell: CellData, row: number, col: number) => string;
  onMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  onDoubleClick: (row: number, col: number) => void;
  onEditCommit: (row: number, col: number, value: string) => void;
  onEditCancel: () => void;
}

const GridRow = memo(function GridRow({
  rowIndex,
  cells,
  height,
  colWidths,
  isInSelection,
  editingCell,
  getCellDisplay: getDisplay,
  onMouseDown,
  onDoubleClick,
  onEditCommit,
  onEditCancel,
}: RowProps) {
  return (
    <tr style={{ height }} role="row">
      <td
        className="sticky left-0 z-10 border-b border-r border-gray-300 bg-gray-50 text-center text-[10px] text-gray-500 select-none"
        style={{ width: HEADER_COL_WIDTH, minWidth: HEADER_COL_WIDTH }}
      >
        {rowIndex + 1}
      </td>
      {cells.map((cell, ci) => (
        <GridCell
          key={ci}
          cell={cell}
          row={rowIndex}
          col={ci}
          isSelected={isInSelection(rowIndex, ci)}
          isEditing={editingCell?.row === rowIndex && editingCell?.col === ci}
          width={colWidths[ci] ?? 80}
          height={height}
          displayValue={getDisplay(cell, rowIndex, ci)}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          onEditCommit={onEditCommit}
          onEditCancel={onEditCancel}
        />
      ))}
    </tr>
  );
}, (prev, next) => {
  if (prev.height !== next.height) return false;
  if (prev.editingCell?.row === prev.rowIndex || next.editingCell?.row === next.rowIndex) return false;
  for (let ci = 0; ci < prev.cells.length; ci++) {
    if (prev.isInSelection(prev.rowIndex, ci) !== next.isInSelection(next.rowIndex, ci)) return false;
    if (prev.getCellDisplay(prev.cells[ci], prev.rowIndex, ci) !== next.getCellDisplay(next.cells[ci], next.rowIndex, ci)) return false;
  }
  return true;
});

interface SpreadsheetGridProps {
  charts?: React.ReactNode;
}

export function SpreadsheetGrid({ charts }: SpreadsheetGridProps) {
  const { activeSheet, updateCell } = useWorkbook();
  const { anchor, focus, editingCell, isInSelection, selectCell, extendSelection, startEdit, stopEdit } = useSelection();
  const containerRef = useRef<HTMLDivElement>(null);

  const getCellValue = useCallback(
    (addr: CellAddress) => {
      const cell = activeSheet?.cells[addr.row]?.[addr.col];
      if (!cell) return null;
      if (cell.formula) {
        return evaluateFormula(cell.formula, getCellValue, `${addr.row},${addr.col}`);
      }
      return cell.value;
    },
    [activeSheet]
  );

  const getDisplay = useCallback(
    (cell: CellData, row: number, col: number) => {
      if (!cell) return '';
      if (cell.formula) {
        try {
          const result = evaluateFormula(cell.formula, getCellValue, `${row},${col}`);
          return result !== null && result !== undefined ? String(result) : '';
        } catch {
          return '#ERROR!';
        }
      }
      return cell.displayValue || formatCellValue(cell.value);
    },
    [getCellValue]
  );

  const handleMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        extendSelection({ row, col });
      } else {
        selectCell({ row, col });
      }
    },
    [selectCell, extendSelection]
  );

  const handleDoubleClick = useCallback(
    (row: number, col: number) => {
      startEdit({ row, col });
    },
    [startEdit]
  );

  const handleEditCommit = useCallback(
    (row: number, col: number, value: string) => {
      const isFormula = value.startsWith('=');
      updateCell(row, col, {
        formula: isFormula ? value : undefined,
        value: isFormula ? null : (value === '' ? null : isNaN(Number(value)) ? value : Number(value)),
        displayValue: value,
      });
      stopEdit();
    },
    [updateCell, stopEdit]
  );

  const handleEditCancel = useCallback(() => stopEdit(), [stopEdit]);

  if (!activeSheet) return null;

  const numCols = activeSheet.cells[0]?.length ?? 26;
  const _numRows = activeSheet.cells.length;
  const hiddenSet = new Set(activeSheet.hiddenRows);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto"
      tabIndex={0}
      style={{ outline: 'none' }}
      role="grid"
      aria-label="Spreadsheet"
    >
      <table
        className="border-collapse border-spacing-0 table-fixed"
        style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
      >
        <colgroup>
          <col style={{ width: HEADER_COL_WIDTH }} />
          {Array.from({ length: numCols }, (_, ci) => (
            <col key={ci} style={{ width: activeSheet.colWidths[ci] ?? 80 }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20">
          <tr style={{ height: DEFAULT_ROW_HEIGHT }} role="row">
            <th className="sticky left-0 z-30 border-b border-r border-gray-300 bg-gray-100" style={{ width: HEADER_COL_WIDTH }} />
            {Array.from({ length: numCols }, (_, ci) => (
              <th
                key={ci}
                className="border-b border-r border-gray-300 bg-gray-100 text-center text-[10px] font-medium text-gray-600 select-none"
                style={{ width: activeSheet.colWidths[ci] ?? 80 }}
                role="columnheader"
              >
                {colIndexToLetter(ci)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeSheet.cells.map((row, ri) => {
            if (hiddenSet.has(ri)) return null;
            return (
              <GridRow
                key={ri}
                rowIndex={ri}
                cells={row}
                height={activeSheet.rowHeights[ri] ?? DEFAULT_ROW_HEIGHT}
                colWidths={activeSheet.colWidths}
                isInSelection={isInSelection}
                editingCell={editingCell}
                getCellDisplay={getDisplay}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onEditCommit={handleEditCommit}
                onEditCancel={handleEditCancel}
              />
            );
          })}
        </tbody>
      </table>

      {/* Selection border overlay */}
      <SelectionOverlay
        anchor={anchor}
        focus={focus}
        sheet={activeSheet}
        _containerRef={containerRef}
      />

      {charts}
    </div>
  );
}

function SelectionOverlay({
  anchor,
  focus,
  sheet,
  _containerRef,
}: {
  anchor: CellAddress;
  focus: CellAddress;
  sheet: import('@/types').SheetData;
  _containerRef: React.RefObject<HTMLDivElement>;
}) {
  const minRow = Math.min(anchor.row, focus.row);
  const maxRow = Math.max(anchor.row, focus.row);
  const minCol = Math.min(anchor.col, focus.col);
  const maxCol = Math.max(anchor.col, focus.col);

  const top = DEFAULT_ROW_HEIGHT + sheet.rowHeights.slice(0, minRow).reduce((a, b) => a + b, 0);
  const height = sheet.rowHeights.slice(minRow, maxRow + 1).reduce((a, b) => a + b, 0);
  const left = HEADER_COL_WIDTH + sheet.colWidths.slice(0, minCol).reduce((a, b) => a + b, 0);
  const width = sheet.colWidths.slice(minCol, maxCol + 1).reduce((a, b) => a + b, 0);

  return (
    <div
      className="pointer-events-none absolute border-2 border-blue-500"
      style={{ top, left, width, height, zIndex: 5 }}
    />
  );
}
