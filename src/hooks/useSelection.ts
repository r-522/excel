'use client';
// Selection convenience hook

import { useCallback } from 'react';
import { useSelectionContext } from '@/context/SelectionContext';
import { CellAddress, CellRange, ClipboardData } from '@/types';
import { isAddressInRange, normalizeRange } from '@/lib/utils';

export function useSelection() {
  const { state, dispatch } = useSelectionContext();

  const selectCell = useCallback(
    (addr: CellAddress) => dispatch({ type: 'SET_SELECTION', payload: { anchor: addr, focus: addr } }),
    [dispatch]
  );

  const extendSelection = useCallback(
    (focus: CellAddress) => dispatch({ type: 'EXTEND_SELECTION', payload: focus }),
    [dispatch]
  );

  const addRange = useCallback(
    (range: CellRange) => dispatch({ type: 'ADD_RANGE', payload: range }),
    [dispatch]
  );

  const startEdit = useCallback(
    (addr: CellAddress) => dispatch({ type: 'START_EDIT', payload: addr }),
    [dispatch]
  );

  const stopEdit = useCallback(() => dispatch({ type: 'STOP_EDIT' }), [dispatch]);

  const setClipboard = useCallback(
    (data: ClipboardData | null) => dispatch({ type: 'SET_CLIPBOARD', payload: data }),
    [dispatch]
  );

  const isInSelection = useCallback(
    (row: number, col: number): boolean => {
      return state.ranges.some((range) =>
        isAddressInRange({ row, col }, range)
      );
    },
    [state.ranges]
  );

  const getSelectedRange = useCallback((): CellRange => {
    return normalizeRange({ start: state.anchor, end: state.focus });
  }, [state.anchor, state.focus]);

  return {
    state,
    anchor: state.anchor,
    focus: state.focus,
    ranges: state.ranges,
    editingCell: state.editingCell,
    clipboardData: state.clipboardData,
    selectCell,
    extendSelection,
    addRange,
    startEdit,
    stopEdit,
    setClipboard,
    isInSelection,
    getSelectedRange,
  };
}
