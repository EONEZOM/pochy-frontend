export const POUCH_ITEMS_SHEET_SNAP_COLLAPSED = 0.4;
export const POUCH_ITEMS_SHEET_SNAP_EXPANDED = 0.6;
export const POUCH_ITEMS_SHEET_TOGGLE_RESERVE = '3rem';
export const POUCH_ITEMS_SHEET_BOTTOM_OFFSET = '40px';

export const getPouchSheetHeightCSSValue = (isExpanded: boolean): string => {
  const snap = isExpanded
    ? POUCH_ITEMS_SHEET_SNAP_EXPANDED
    : POUCH_ITEMS_SHEET_SNAP_COLLAPSED;
  return `calc(var(--app-height) * ${snap})`;
};

export const DECORATE_GRID_COLUMNS = 3;
export const DECORATE_GRID_CELL_PX = 130;
export const DECORATE_WAPPEN_GRID_CELL_PX = 130;
export const DECORATE_WAPPEN_IMAGE_SCALE = 1;
export const DECORATE_GRID_GAP_PX = 20;
export const DECORATE_VISIBLE_ROWS_COLLAPSED = 3;

export const getDecorateGridClassName = (): string =>
  'mx-auto grid w-fit max-w-full grid-cols-3 gap-4 justify-items-center';

export const getDecorateWappenGridClassName = (): string =>
  'mx-auto grid w-full max-w-full grid-cols-3 gap-x-4 gap-y-4';

export const getDecorateScrollMaxHeightCollapsed = (
  cellPx: number = DECORATE_GRID_CELL_PX,
): string => {
  const rows = DECORATE_VISIBLE_ROWS_COLLAPSED;
  const cellTotal = rows * cellPx;
  const gapTotal = (rows - 1) * DECORATE_GRID_GAP_PX;
  return `${cellTotal + gapTotal}px`;
};
