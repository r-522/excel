'use client';
// Excel-style sheet tabs with drag-reorder, rename, right-click menu

import React, { useState, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkbook } from '@/hooks/useWorkbook';

export function SheetTabs() {
  const { state, dispatch } = useWorkbook();
  const { sheets, activeSheetIndex } = state;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleAddSheet = () => dispatch({ type: 'ADD_SHEET' });

  const handleTabClick = (i: number) => {
    if (editingIndex !== null) return;
    dispatch({ type: 'SET_ACTIVE_SHEET', payload: i });
  };

  const handleDoubleClick = (i: number) => {
    setEditingIndex(i);
    setEditName(sheets[i].name);
  };

  const handleRenameBlur = () => {
    if (editingIndex !== null && editName.trim()) {
      dispatch({ type: 'RENAME_SHEET', payload: { index: editingIndex, name: editName.trim() } });
    }
    setEditingIndex(null);
  };

  const handleContextMenu = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index: i });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDragStart = (i: number) => setDragFrom(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOver(i);
  };
  const handleDrop = (i: number) => {
    if (dragFrom !== null && dragFrom !== i) {
      dispatch({ type: 'REORDER_SHEET', payload: { from: dragFrom, to: i } });
    }
    setDragFrom(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragFrom(null); setDragOver(null); };

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 100, behavior: 'smooth' });

  return (
    <>
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        >
          <div
            className="absolute z-50 rounded border border-gray-200 bg-white py-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: 'Insert Sheet', action: () => dispatch({ type: 'ADD_SHEET' }) },
              { label: 'Delete Sheet', action: () => { if (sheets.length > 1) dispatch({ type: 'DELETE_SHEET', payload: contextMenu.index }); } },
              { label: 'Rename', action: () => { handleDoubleClick(contextMenu.index); } },
              { label: 'Duplicate', action: () => dispatch({ type: 'DUPLICATE_SHEET', payload: contextMenu.index }) },
            ].map(({ label, action }) => (
              <button
                key={label}
                className="block w-full px-4 py-1 text-left text-xs hover:bg-gray-100"
                onClick={() => { action(); closeContextMenu(); }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex h-8 items-end border-t border-gray-300 bg-gray-100 print:hidden">
        <button onClick={scrollLeft} className="flex h-7 w-6 items-center justify-center hover:bg-gray-200">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <div ref={scrollRef} className="flex flex-1 overflow-x-auto overflow-y-hidden scrollbar-none">
          {sheets.map((sheet, i) => (
            <div
              key={sheet.name}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              onClick={() => handleTabClick(i)}
              onDoubleClick={() => handleDoubleClick(i)}
              onContextMenu={(e) => handleContextMenu(e, i)}
              className={`relative flex h-7 min-w-[80px] max-w-[160px] cursor-pointer select-none items-center border-r border-gray-300 px-3 text-xs transition-colors ${
                i === activeSheetIndex
                  ? 'bg-white font-medium text-gray-800 border-t-2 border-t-green-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${dragOver === i ? 'border-l-2 border-l-blue-500' : ''}`}
            >
              {editingIndex === i ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRenameBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameBlur();
                    if (e.key === 'Escape') setEditingIndex(null);
                  }}
                  className="w-full bg-transparent outline-none text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{sheet.name}</span>
              )}
            </div>
          ))}
        </div>
        <button onClick={scrollRight} className="flex h-7 w-6 items-center justify-center hover:bg-gray-200">
          <ChevronRight className="h-3 w-3" />
        </button>
        <button
          onClick={handleAddSheet}
          className="flex h-7 w-7 items-center justify-center hover:bg-gray-200"
          title="Add sheet"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </>
  );
}
