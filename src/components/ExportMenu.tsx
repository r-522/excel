'use client';
// Export workbook in multiple formats

import React, { useState, useRef } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useWorkbook } from '@/hooks/useWorkbook';
import { workbookToBuffer, sheetToCSV } from '@/lib/excel-engine';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getTimestamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

interface ExportMenuProps {
  onMessage: (msg: string, type: 'success' | 'error') => void;
}

export function ExportMenu({ onMessage }: ExportMenuProps) {
  const { state } = useWorkbook();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const baseName = state.fileName.replace(/\.[^.]+$/, '') || 'workbook';
  const timestamp = getTimestamp();

  const handleExport = async (format: 'xlsx' | 'xls' | 'csv' | 'pdf') => {
    setOpen(false);
    try {
      if (format === 'xlsx' || format === 'xls') {
        const buffer = workbookToBuffer(state, format);
        const mime = format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.ms-excel';
        downloadBlob(new Blob([buffer], { type: mime }), `${baseName}_${timestamp}.${format}`);
        onMessage(`Downloaded as ${format}`, 'success');
      } else if (format === 'csv') {
        const sheet = state.sheets[state.activeSheetIndex];
        const csv = sheetToCSV(sheet);
        downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${baseName}_${timestamp}.csv`);
        onMessage('Downloaded as CSV', 'success');
      } else if (format === 'pdf') {
        document.body.classList.add('printing');
        window.print();
        document.body.classList.remove('printing');
      }
    } catch (e) {
      onMessage(`Export failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="toolbar"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1"
      >
        <Download className="h-3.5 w-3.5" />
        Download
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded border border-gray-200 bg-white py-1 shadow-lg">
            {(['xlsx', 'xls', 'csv', 'pdf'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="block w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100"
              >
                {fmt === 'pdf' ? 'PDF (Print)' : `.${fmt}`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
