'use client';
// Drag & drop / click-to-upload landing screen

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useWorkbookContext } from '@/context/WorkbookContext';
import { parseFile } from '@/lib/excel-engine';

interface FileDropZoneProps {
  onPasswordRequired: (file: File) => void;
  onError: (message: string) => void;
  onLoading: (loading: boolean) => void;
}

export function FileDropZone({ onPasswordRequired, onError, onLoading }: FileDropZoneProps) {
  const { dispatch } = useWorkbookContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File, password?: string) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'xlsm', 'csv'].includes(ext ?? '')) {
        onError(`Unsupported file type: .${ext}`);
        return;
      }
      onLoading(true);
      try {
        const workbook = await parseFile(file, password);
        dispatch({ type: 'LOAD_WORKBOOK', payload: workbook });
      } catch (e) {
        if (e instanceof Error && e.message === 'PASSWORD_REQUIRED') {
          onPasswordRequired(file);
        } else {
          onError(e instanceof Error ? e.message : 'Failed to read file');
        }
      } finally {
        onLoading(false);
      }
    },
    [dispatch, onError, onLoading, onPasswordRequired]
  );

  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDragOver = (e: DragEvent) => { prevent(e); setDragging(true); };
    const handleDragLeave = (e: DragEvent) => { prevent(e); setDragging(false); };
    const handleDrop = (e: DragEvent) => {
      prevent(e);
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    };
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleFile]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div
        className={`flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed p-16 transition-colors cursor-pointer ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-100'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <FileSpreadsheet className="h-10 w-10 text-green-700" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Drop your Excel file here</p>
          <p className="mt-1 text-sm text-gray-500">or click to browse</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Upload className="h-3 w-3" />
          <span>Supports .xlsx, .xls, .xlsm, .csv</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
