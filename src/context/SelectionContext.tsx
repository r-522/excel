'use client';
// Selection state — kept separate from WorkbookContext to avoid re-rendering
// the entire workbook on every cursor movement

import React, { createContext, useContext, useReducer } from 'react';
import {
  SelectionState,
  SelectionAction,
  CellAddress,
} from '@/types';
import { normalizeRange } from '@/lib/utils';

const defaultSelection: CellAddress = { row: 0, col: 0 };

const initialState: SelectionState = {
  anchor: defaultSelection,
  focus: defaultSelection,
  ranges: [{ start: defaultSelection, end: defaultSelection }],
  editingCell: null,
  clipboardData: null,
};

function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'SET_SELECTION': {
      const { anchor, focus } = action.payload;
      return {
        ...state,
        anchor,
        focus,
        ranges: [normalizeRange({ start: anchor, end: focus })],
        editingCell: null,
      };
    }
    case 'EXTEND_SELECTION': {
      return {
        ...state,
        focus: action.payload,
        ranges: [normalizeRange({ start: state.anchor, end: action.payload })],
      };
    }
    case 'ADD_RANGE': {
      return {
        ...state,
        ranges: [...state.ranges, normalizeRange(action.payload)],
        anchor: action.payload.start,
        focus: action.payload.end,
      };
    }
    case 'START_EDIT':
      return { ...state, editingCell: action.payload };
    case 'STOP_EDIT':
      return { ...state, editingCell: null };
    case 'SET_CLIPBOARD':
      return { ...state, clipboardData: action.payload };
    default:
      return state;
  }
}

interface SelectionContextValue {
  state: SelectionState;
  dispatch: React.Dispatch<SelectionAction>;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, initialState);
  return (
    <SelectionContext.Provider value={{ state, dispatch }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelectionContext(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelectionContext must be inside SelectionProvider');
  return ctx;
}
