'use client';
// On mount, reads ?data= or ?id= URL params and restores the workbook

import { useEffect } from 'react';
import { useWorkbookContext } from '@/context/WorkbookContext';
import { decompressWorkbook } from '@/lib/share-compressor';
import { parseFile } from '@/lib/excel-engine';

export function useShare() {
  const { dispatch } = useWorkbookContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    const id = params.get('id');

    if (data) {
      (async () => {
        try {
          const buffer = decompressWorkbook(data);
          const file = new File([buffer], 'shared.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const workbook = await parseFile(file);
          dispatch({ type: 'LOAD_WORKBOOK', payload: workbook });
        } catch {
          console.error('Failed to restore shared workbook from URL');
        }
      })();
    } else if (id) {
      (async () => {
        try {
          const res = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
          if (!res.ok) throw new Error('Not found');
          const compressed = await res.text();
          const buffer = decompressWorkbook(compressed);
          const file = new File([buffer], 'shared.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const workbook = await parseFile(file);
          dispatch({ type: 'LOAD_WORKBOOK', payload: workbook });
        } catch {
          console.error('Failed to restore shared workbook from server');
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
