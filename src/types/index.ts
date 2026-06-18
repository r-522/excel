// Central type definitions for the Excel app

export interface CellAddress {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellAddress;
  end: CellAddress;
}

export type CellValue = string | number | boolean | null | Date;

export interface CellFormat {
  fontBold?: boolean;
  fontItalic?: boolean;
  fontUnderline?: boolean;
  fontStrikethrough?: boolean;
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  hAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  numberFormat?: string;
}

export interface MergeRange {
  start: CellAddress;
  end: CellAddress;
}

export interface CellData {
  value: CellValue;
  formula?: string;
  displayValue: string;
  format?: CellFormat;
  isMergeStart?: boolean;
  isHidden?: boolean;
  colSpan?: number;
  rowSpan?: number;
}

export interface ColumnFilter {
  type: 'text' | 'number' | 'blank' | 'nonblank';
  operator?: 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'equals' | 'gt' | 'lt' | 'between';
  value?: string | number;
  value2?: number;
}

export interface FilterState {
  [colIndex: number]: ColumnFilter;
}

export interface SortState {
  colIndex: number;
  direction: 'asc' | 'desc';
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie';
  dataRange: CellRange;
  title: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  sheetIndex: number;
}

export interface SheetData {
  name: string;
  cells: CellData[][];
  colWidths: number[];
  rowHeights: number[];
  merges: MergeRange[];
  filters: FilterState;
  sort?: SortState;
  frozenRows: number;
  frozenCols: number;
  hiddenRows: number[];
}

export interface WorkbookState {
  sheets: SheetData[];
  activeSheetIndex: number;
  fileName: string;
  isDirty: boolean;
  charts: ChartConfig[];
}

export interface ClipboardData {
  cells: CellData[][];
  type: 'copy' | 'cut';
  sourceRange: CellRange;
  sourceSheetIndex: number;
}

export interface SelectionState {
  anchor: CellAddress;
  focus: CellAddress;
  ranges: CellRange[];
  editingCell: CellAddress | null;
  clipboardData: ClipboardData | null;
}

export type WorkbookAction =
  | { type: 'LOAD_WORKBOOK'; payload: WorkbookState }
  | { type: 'SET_ACTIVE_SHEET'; payload: number }
  | { type: 'UPDATE_CELL'; payload: { sheetIndex: number; row: number; col: number; data: Partial<CellData> } }
  | { type: 'UPDATE_CELLS_FORMAT'; payload: { sheetIndex: number; range: CellRange; format: Partial<CellFormat> } }
  | { type: 'INSERT_ROW'; payload: { sheetIndex: number; rowIndex: number } }
  | { type: 'DELETE_ROW'; payload: { sheetIndex: number; rowIndex: number } }
  | { type: 'INSERT_COL'; payload: { sheetIndex: number; colIndex: number } }
  | { type: 'DELETE_COL'; payload: { sheetIndex: number; colIndex: number } }
  | { type: 'ADD_SHEET'; payload?: { name?: string } }
  | { type: 'DELETE_SHEET'; payload: number }
  | { type: 'RENAME_SHEET'; payload: { index: number; name: string } }
  | { type: 'REORDER_SHEET'; payload: { from: number; to: number } }
  | { type: 'DUPLICATE_SHEET'; payload: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_FILTER'; payload: { sheetIndex: number; colIndex: number; filter: ColumnFilter } }
  | { type: 'CLEAR_FILTER'; payload: { sheetIndex: number; colIndex: number } }
  | { type: 'CLEAR_ALL_FILTERS'; payload: number }
  | { type: 'SET_SORT'; payload: { sheetIndex: number; colIndex: number; direction: 'asc' | 'desc' } }
  | { type: 'ADD_CHART'; payload: Omit<ChartConfig, 'id'> }
  | { type: 'UPDATE_CHART'; payload: { id: string; config: Partial<ChartConfig> } }
  | { type: 'REMOVE_CHART'; payload: string }
  | { type: 'PASTE_CELLS'; payload: { sheetIndex: number; targetCell: CellAddress; clipboardData: ClipboardData } }
  | { type: 'CLEAR_CELLS'; payload: { sheetIndex: number; range: CellRange } };

export type SelectionAction =
  | { type: 'SET_SELECTION'; payload: { anchor: CellAddress; focus: CellAddress } }
  | { type: 'EXTEND_SELECTION'; payload: CellAddress }
  | { type: 'ADD_RANGE'; payload: CellRange }
  | { type: 'START_EDIT'; payload: CellAddress }
  | { type: 'STOP_EDIT' }
  | { type: 'SET_CLIPBOARD'; payload: ClipboardData | null };

export interface HistorySnapshot {
  workbookState: WorkbookState;
  description: string;
  timestamp: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
