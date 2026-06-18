'use client';
// Exposes canUndo / canRedo for toolbar button state

import { canUndo, canRedo } from '@/lib/history-manager';
import { useWorkbookContext } from '@/context/WorkbookContext';

const HISTORY_ID = 'main';

export function useHistory() {
  const { state } = useWorkbookContext();
  void state; // trigger re-render when workbook changes
  return {
    canUndo: canUndo(HISTORY_ID),
    canRedo: canRedo(HISTORY_ID),
  };
}
