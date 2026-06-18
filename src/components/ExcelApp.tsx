'use client';
// Top-level application orchestrator

import React, { useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { FileDropZone } from './FileDropZone';
import { Toolbar } from './Toolbar';
import { FormulaBar } from './FormulaBar';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { SheetTabs } from './SheetTabs';
import { SearchDialog } from './SearchDialog';
import { ExportMenu } from './ExportMenu';
import { ShareButton } from './ShareButton';
import { Toaster, useToast } from './ui/toast';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useShare } from '@/hooks/useShare';
import { workbookToBuffer, parseFile } from '@/lib/excel-engine';
import type { WorkbookState } from '@/types';

const ChartPanel = dynamic(() => import('./ChartPanel'), { ssr: false });

interface PasswordDialogProps {
  file: File;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

function PasswordDialog({ file, onSubmit, onCancel }: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-72 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Password Protected File</h3>
        <p className="mb-3 text-xs text-gray-500">{file.name} requires a password.</p>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(password); if (e.key === 'Escape') onCancel(); }}
          placeholder="Enter password..."
          className="mb-3 w-full rounded border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-400"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSubmit(password)} className="rounded bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-800">Open</button>
        </div>
      </div>
    </div>
  );
}

function downloadWorkbook(state: WorkbookState, format: 'xlsx') {
  try {
    const buffer = workbookToBuffer(state, format);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.fileName || `workbook.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // handled by caller
  }
}

export function ExcelApp() {
  const { state, dispatch } = useWorkbook();
  const { toasts, addToast, removeToast } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'search' | 'replace'>('search');
  const [passwordFile, setPasswordFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useShare();
  useKeyboard({
    onOpenSearch: () => { setSearchMode('search'); setSearchOpen(true); },
    onOpenReplace: () => { setSearchMode('replace'); setSearchOpen(true); },
    onSave: () => {
      downloadWorkbook(state, 'xlsx');
      addToast('Saved!', 'success');
    },
  });

  const hasWorkbook = state.sheets.length > 0;

  const handlePasswordSubmit = useCallback(async (password: string) => {
    if (!passwordFile) return;
    setLoading(true);
    try {
      const workbook = await parseFile(passwordFile, password);
      dispatch({ type: 'LOAD_WORKBOOK', payload: workbook });
      setPasswordFile(null);
    } catch {
      addToast('Incorrect password or unsupported encryption', 'error');
    } finally {
      setLoading(false);
    }
  }, [passwordFile, dispatch, addToast]);

  const charts = state.charts.filter((c) => c.sheetIndex === state.activeSheetIndex);

  const emptyWorkbook = { sheets: [], activeSheetIndex: 0, fileName: '', isDirty: false, charts: [] };

  return (
    <div className="flex h-screen flex-col bg-white overflow-hidden">
      {!hasWorkbook ? (
        <FileDropZone
          onPasswordRequired={(file) => setPasswordFile(file)}
          onError={(msg) => addToast(msg, 'error')}
          onLoading={setLoading}
        />
      ) : (
        <>
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-3 py-1 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-green-700">ExcelApp</span>
              <span className="text-xs text-gray-500">{state.fileName || 'Untitled'}{state.isDirty ? ' *' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <ExportMenu onMessage={addToast} />
              <ShareButton onMessage={addToast} />
              <button
                onClick={() => dispatch({ type: 'LOAD_WORKBOOK', payload: emptyWorkbook })}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>

          <Toolbar
            onOpenSearch={() => { setSearchMode('search'); setSearchOpen(true); }}
            onOpenNewFile={() => dispatch({ type: 'LOAD_WORKBOOK', payload: emptyWorkbook })}
            onSave={() => downloadWorkbook(state, 'xlsx')}
            onPrint={() => window.print()}
            onInsertChart={() => {
              dispatch({
                type: 'ADD_CHART',
                payload: {
                  type: 'bar',
                  dataRange: { start: { row: 0, col: 0 }, end: { row: 5, col: 2 } },
                  title: 'Chart',
                  position: { x: 200, y: 100 },
                  size: { w: 400, h: 250 },
                  sheetIndex: state.activeSheetIndex,
                },
              });
            }}
          />

          <FormulaBar />

          <div className="flex flex-1 overflow-hidden">
            <SpreadsheetGrid
              charts={charts.map((chart) => (
                <Suspense key={chart.id} fallback={null}>
                  <ChartPanel chart={chart} />
                </Suspense>
              ))}
            />
          </div>

          <SheetTabs />
        </>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-lg bg-white px-6 py-4 shadow-xl text-sm">Loading file...</div>
        </div>
      )}

      {passwordFile && (
        <PasswordDialog
          file={passwordFile}
          onSubmit={handlePasswordSubmit}
          onCancel={() => setPasswordFile(null)}
        />
      )}

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialMode={searchMode}
      />

      <Toaster toasts={toasts.map(t => ({ ...t, onClose: removeToast }))} onClose={removeToast} />
    </div>
  );
}
