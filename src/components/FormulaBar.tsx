'use client';
// Formula bar: shows cell address + editable formula/value for active cell

import React, { useState, useEffect, useRef } from 'react';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useSelection } from '@/hooks/useSelection';
import { cellAddressToA1 } from '@/lib/utils';

export function FormulaBar() {
  const { activeSheet, updateCell } = useWorkbook();
  const { anchor, editingCell, startEdit, stopEdit } = useSelection();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const cell = activeSheet?.cells[anchor.row]?.[anchor.col];
  const cellAddress = cellAddressToA1(anchor);

  useEffect(() => {
    const val = cell?.formula ?? (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '');
    setInputValue(val);
  }, [cell]);

  useEffect(() => {
    if (editingCell?.row === anchor.row && editingCell?.col === anchor.col) {
      inputRef.current?.focus();
    }
  }, [editingCell, anchor]);

  const handleCommit = () => {
    if (!activeSheet) return;
    const isFormula = inputValue.startsWith('=');
    updateCell(anchor.row, anchor.col, {
      formula: isFormula ? inputValue : undefined,
      value: isFormula ? null : (isNaN(Number(inputValue)) || inputValue === '' ? inputValue || null : Number(inputValue)),
      displayValue: inputValue,
    });
    stopEdit();
  };

  return (
    <div className="flex h-8 items-center border-b border-gray-300 bg-white print:hidden">
      <div className="flex h-full w-24 items-center justify-center border-r border-gray-300 bg-gray-50 px-2 text-xs font-medium text-gray-600 select-none">
        {cellAddress}
      </div>
      <div className="flex h-full w-8 items-center justify-center border-r border-gray-300 text-gray-500 select-none text-xs font-serif">
        fx
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        className="h-full flex-1 bg-white px-2 text-xs outline-none font-mono"
        onChange={(e) => {
          setInputValue(e.target.value);
          if (editingCell === null) startEdit(anchor);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleCommit(); }
          if (e.key === 'Escape') { e.preventDefault(); stopEdit(); }
        }}
        onFocus={() => startEdit(anchor)}
        onBlur={handleCommit}
        placeholder="Enter value or formula (=SUM(A1:A5))"
      />
    </div>
  );
}
