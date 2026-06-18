'use client';
// Column filter and sort dropdown

import React, { useState } from 'react';
import { ChevronDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { useWorkbook } from '@/hooks/useWorkbook';
import { ColumnFilter } from '@/types';

interface FilterDropdownProps {
  colIndex: number;
  colLabel: string;
}

export function FilterDropdown({ colIndex, colLabel }: FilterDropdownProps) {
  const { activeSheet, activeSheetIndex, dispatch } = useWorkbook();
  const [open, setOpen] = useState(false);
  const [textFilter, setTextFilter] = useState('');
  const [filterType, setFilterType] = useState<ColumnFilter['operator']>('contains');

  const hasFilter = Boolean(activeSheet?.filters[colIndex]);

  const applySort = (direction: 'asc' | 'desc') => {
    dispatch({ type: 'SET_SORT', payload: { sheetIndex: activeSheetIndex, colIndex, direction } });
    setOpen(false);
  };

  const applyTextFilter = () => {
    if (!textFilter) { clearFilter(); return; }
    const filter: ColumnFilter = { type: 'text', operator: filterType, value: textFilter };
    dispatch({ type: 'SET_FILTER', payload: { sheetIndex: activeSheetIndex, colIndex, filter } });
    setOpen(false);
  };

  const applyBlankFilter = (blank: boolean) => {
    const filter: ColumnFilter = { type: blank ? 'blank' : 'nonblank' };
    dispatch({ type: 'SET_FILTER', payload: { sheetIndex: activeSheetIndex, colIndex, filter } });
    setOpen(false);
  };

  const clearFilter = () => {
    dispatch({ type: 'CLEAR_FILTER', payload: { sheetIndex: activeSheetIndex, colIndex } });
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        className={`flex h-4 w-4 items-center justify-center rounded hover:bg-gray-300 ${hasFilter ? 'text-blue-600' : 'text-gray-500'}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title="Filter"
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 w-48 rounded border border-gray-200 bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b border-gray-100">{colLabel}</div>

            <button className="flex w-full items-center gap-2 px-3 py-1 text-xs hover:bg-gray-50" onClick={() => applySort('asc')}>
              <ArrowUp className="h-3 w-3" /> Sort A→Z
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-1 text-xs hover:bg-gray-50" onClick={() => applySort('desc')}>
              <ArrowDown className="h-3 w-3" /> Sort Z→A
            </button>

            <div className="my-1 border-t border-gray-100" />

            <div className="px-2 py-1">
              <div className="mb-1 text-[10px] text-gray-400">Text filter</div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ColumnFilter['operator'])}
                className="mb-1 w-full rounded border border-gray-200 text-xs px-1 py-0.5"
              >
                <option value="contains">Contains</option>
                <option value="notContains">Does not contain</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
                <option value="equals">Equals</option>
              </select>
              <input
                type="text"
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                placeholder="Filter value..."
                className="w-full rounded border border-gray-200 px-2 py-0.5 text-xs outline-none focus:border-blue-400"
              />
              <Button variant="toolbar" size="xs" className="mt-1 w-full" onClick={applyTextFilter}>
                Apply
              </Button>
            </div>

            <div className="my-1 border-t border-gray-100" />

            <button className="flex w-full px-3 py-1 text-xs hover:bg-gray-50" onClick={() => applyBlankFilter(true)}>
              Show blanks only
            </button>
            <button className="flex w-full px-3 py-1 text-xs hover:bg-gray-50" onClick={() => applyBlankFilter(false)}>
              Show non-blanks only
            </button>

            {hasFilter && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button className="flex w-full items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-50" onClick={clearFilter}>
                  <X className="h-3 w-3" /> Clear filter
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
