'use client';
// Convenience hook wrapping WorkbookContext with derived state

import { useCallback } from 'react';
import { useWorkbookContext } from '@/context/WorkbookContext';
import { WorkbookAction, CellData, CellFormat, CellRange } from '@/types';

export function useWorkbook() {
  const { state, dispatch } = useWorkbookContext();
  const activeSheet = state.sheets[state.activeSheetIndex];

  const dispatchAction = useCallback(
    (action: WorkbookAction) => dispatch(action),
    [dispatch]
  );

  const updateCell = useCallback(
    (row: number, col: number, data: Partial<CellData>) =>
      dispatch({ type: 'UPDATE_CELL', payload: { sheetIndex: state.activeSheetIndex, row, col, data } }),
    [dispatch, state.activeSheetIndex]
  );

  const updateFormat = useCallback(
    (range: CellRange, format: Partial<CellFormat>) =>
      dispatch({ type: 'UPDATE_CELLS_FORMAT', payload: { sheetIndex: state.activeSheetIndex, range, format } }),
    [dispatch, state.activeSheetIndex]
  );

  const insertRow = useCallback(
    (rowIndex: number) =>
      dispatch({ type: 'INSERT_ROW', payload: { sheetIndex: state.activeSheetIndex, rowIndex } }),
    [dispatch, state.activeSheetIndex]
  );

  const deleteRow = useCallback(
    (rowIndex: number) =>
      dispatch({ type: 'DELETE_ROW', payload: { sheetIndex: state.activeSheetIndex, rowIndex } }),
    [dispatch, state.activeSheetIndex]
  );

  const insertCol = useCallback(
    (colIndex: number) =>
      dispatch({ type: 'INSERT_COL', payload: { sheetIndex: state.activeSheetIndex, colIndex } }),
    [dispatch, state.activeSheetIndex]
  );

  const deleteCol = useCallback(
    (colIndex: number) =>
      dispatch({ type: 'DELETE_COL', payload: { sheetIndex: state.activeSheetIndex, colIndex } }),
    [dispatch, state.activeSheetIndex]
  );

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

  return {
    state,
    dispatch: dispatchAction,
    activeSheet,
    activeSheetIndex: state.activeSheetIndex,
    fileName: state.fileName,
    isDirty: state.isDirty,
    charts: state.charts,
    updateCell,
    updateFormat,
    insertRow,
    deleteRow,
    insertCol,
    deleteCol,
    undo,
    redo,
  };
}
