'use client';
// Search & Replace dialog

import React, { useState, useCallback, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useSelection } from '@/hooks/useSelection';
import { CellAddress } from '@/types';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'search' | 'replace';
}

export function SearchDialog({ open, onClose, initialMode = 'search' }: SearchDialogProps) {
  const { activeSheet, updateCell } = useWorkbook();
  const { selectCell } = useSelection();

  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeCell, setWholeCell] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [matches, setMatches] = useState<CellAddress[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const findMatches = useCallback(() => {
    if (!activeSheet || !query) { setMatches([]); return; }
    const found: CellAddress[] = [];
    activeSheet.cells.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const val = cell.displayValue ?? String(cell.value ?? '');
        const haystack = caseSensitive ? val : val.toLowerCase();
        const needle = caseSensitive ? query : query.toLowerCase();
        if (wholeCell ? haystack === needle : haystack.includes(needle)) {
          found.push({ row: ri, col: ci });
        }
      });
    });
    setMatches(found);
    setMatchIndex(0);
    if (found.length > 0) selectCell(found[0]);
  }, [activeSheet, query, caseSensitive, wholeCell, selectCell]);

  useEffect(() => { findMatches(); }, [findMatches]);

  const findNext = () => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    selectCell(matches[next]);
  };

  const findPrev = () => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    selectCell(matches[prev]);
  };

  const replaceOne = () => {
    if (matches.length === 0 || !activeSheet) return;
    const addr = matches[matchIndex];
    const cell = activeSheet.cells[addr.row]?.[addr.col];
    if (!cell) return;
    const newVal = (cell.displayValue ?? '').replace(
      new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi'),
      replacement
    );
    updateCell(addr.row, addr.col, { value: newVal, displayValue: newVal, formula: undefined });
    findMatches();
  };

  const replaceAll = () => {
    if (!activeSheet) return;
    matches.forEach((addr) => {
      const cell = activeSheet.cells[addr.row]?.[addr.col];
      if (!cell) return;
      const newVal = (cell.displayValue ?? '').replace(
        new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi'),
        replacement
      );
      updateCell(addr.row, addr.col, { value: newVal, displayValue: newVal, formula: undefined });
    });
    setMatches([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className="w-80 rounded border border-gray-300 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          <div className="flex gap-2">
            <button
              className={`text-xs font-medium ${mode === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setMode('search')}
            >Find</button>
            <button
              className={`text-xs font-medium ${mode === 'replace' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setMode('replace')}
            >Replace</button>
          </div>
          <button onClick={onClose} className="hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find..."
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
            <Button variant="toolbar" size="icon" onClick={findPrev} disabled={matches.length === 0}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="toolbar" size="icon" onClick={findNext} disabled={matches.length === 0}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          {mode === 'replace' && (
            <input
              type="text"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Replace with..."
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
          )}

          <div className="flex gap-3 text-xs text-gray-500">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="h-3 w-3" />
              Match case
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={wholeCell} onChange={(e) => setWholeCell(e.target.checked)} className="h-3 w-3" />
              Whole cell
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {matches.length > 0 ? `${matchIndex + 1} of ${matches.length} matches` : query ? 'No matches' : ''}
            </span>
            {mode === 'replace' && (
              <div className="flex gap-1">
                <Button variant="toolbar" size="xs" onClick={replaceOne} disabled={matches.length === 0}>Replace</Button>
                <Button variant="toolbar" size="xs" onClick={replaceAll} disabled={matches.length === 0}>All</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
