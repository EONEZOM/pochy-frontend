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
