'use client';
// Ribbon toolbar: File, Format, Insert, Data, Share groups

import React, { useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  WrapText, Plus, Trash2, BarChart2, Undo2, Redo2,
  Search, FileUp, Printer, Save,
} from 'lucide-react';
import { Button } from './ui/button';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useSelection } from '@/hooks/useSelection';
import { useHistory } from '@/hooks/useHistory';
import { normalizeRange } from '@/lib/utils';
import type { CellFormat } from '@/types';

interface ToolbarProps {
  onOpenSearch: () => void;
  onOpenNewFile: () => void;
  onSave: () => void;
  onPrint: () => void;
  onInsertChart: () => void;
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

export function Toolbar({ onOpenSearch, onOpenNewFile, onSave, onPrint, onInsertChart }: ToolbarProps) {
  const { activeSheet, updateFormat, insertRow, deleteRow, insertCol, deleteCol, undo, redo } = useWorkbook();
  const { anchor, focus, getSelectedRange } = useSelection();
  const { canUndo, canRedo } = useHistory();

  const activeCell = activeSheet?.cells[anchor.row]?.[anchor.col];
  const fmt = activeCell?.format ?? {};

  const applyFormat = (format: Partial<CellFormat>) => {
    const range = normalizeRange({ start: anchor, end: focus });
    updateFormat(range, format);
  };

  const toggleFormat = (key: keyof CellFormat) => {
    applyFormat({ [key]: !fmt[key] });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-300 bg-gray-50 px-2 py-1 print:hidden select-none">
      {/* File group */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <Button variant="toolbar" size="icon" title="New / Open file" onClick={onOpenNewFile}>
          <FileUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="toolbar" size="icon" title="Save (Ctrl+S)" onClick={onSave}>
          <Save className="h-3.5 w-3.5" />
        </Button>
        <Button variant="toolbar" size="icon" title="Print" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <Button variant="toolbar" size="icon" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="toolbar" size="icon" title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Font size */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <select
          value={fmt.fontSize ?? 11}
          onChange={(e) => applyFormat({ fontSize: Number(e.target.value) })}
          className="h-6 rounded border border-gray-300 bg-white px-1 text-xs"
          title="Font size"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Text formatting */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <Button variant={fmt.fontBold ? 'toolbar-active' : 'toolbar'} size="icon" title="Bold (Ctrl+B)" onClick={() => toggleFormat('fontBold')}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button variant={fmt.fontItalic ? 'toolbar-active' : 'toolbar'} size="icon" title="Italic (Ctrl+I)" onClick={() => toggleFormat('fontItalic')}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button variant={fmt.fontUnderline ? 'toolbar-active' : 'toolbar'} size="icon" title="Underline (Ctrl+U)" onClick={() => toggleFormat('fontUnderline')}>
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button variant={fmt.fontStrikethrough ? 'toolbar-active' : 'toolbar'} size="icon" title="Strikethrough" onClick={() => toggleFormat('fontStrikethrough')}>
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <label className="flex h-6 w-8 cursor-pointer items-center justify-center rounded hover:bg-gray-200" title="Font color">
          <span className="text-[10px] font-bold" style={{ color: fmt.fontColor ?? '#000000' }}>A</span>
          <input
            type="color"
            value={fmt.fontColor ?? '#000000'}
            onChange={(e) => applyFormat({ fontColor: e.target.value })}
            className="sr-only"
          />
        </label>
        <label className="flex h-6 w-8 cursor-pointer items-center justify-center rounded hover:bg-gray-200" title="Background color">
          <span
            className="h-4 w-4 rounded border border-gray-400"
            style={{ backgroundColor: fmt.bgColor ?? '#ffffff' }}
          />
          <input
            type="color"
            value={fmt.bgColor ?? '#ffffff'}
            onChange={(e) => applyFormat({ bgColor: e.target.value })}
            className="sr-only"
          />
        </label>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <Button variant={fmt.hAlign === 'left' ? 'toolbar-active' : 'toolbar'} size="icon" title="Align left" onClick={() => applyFormat({ hAlign: 'left' })}>
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant={fmt.hAlign === 'center' ? 'toolbar-active' : 'toolbar'} size="icon" title="Align center" onClick={() => applyFormat({ hAlign: 'center' })}>
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button variant={fmt.hAlign === 'right' ? 'toolbar-active' : 'toolbar'} size="icon" title="Align right" onClick={() => applyFormat({ hAlign: 'right' })}>
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant={fmt.wrapText ? 'toolbar-active' : 'toolbar'} size="icon" title="Wrap text" onClick={() => toggleFormat('wrapText')}>
          <WrapText className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Row/Col operations */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <Button variant="toolbar" size="xs" title="Insert row" onClick={() => insertRow(anchor.row)}>
          <Plus className="h-3 w-3 mr-0.5" />Row
        </Button>
        <Button variant="toolbar" size="xs" title="Delete row" onClick={() => deleteRow(anchor.row)}>
          <Trash2 className="h-3 w-3 mr-0.5" />Row
        </Button>
        <Button variant="toolbar" size="xs" title="Insert column" onClick={() => insertCol(anchor.col)}>
          <Plus className="h-3 w-3 mr-0.5" />Col
        </Button>
        <Button variant="toolbar" size="xs" title="Delete column" onClick={() => deleteCol(anchor.col)}>
          <Trash2 className="h-3 w-3 mr-0.5" />Col
        </Button>
      </div>

      {/* Insert/tools */}
      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
        <Button variant="toolbar" size="icon" title="Insert chart" onClick={onInsertChart}>
          <BarChart2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="toolbar" size="icon" title="Search (Ctrl+F)" onClick={onOpenSearch}>
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
