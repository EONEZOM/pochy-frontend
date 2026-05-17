export const readShouldShowScanEntryTip = (storageKey: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(storageKey) !== '1';
  } catch {
    return true;
  }
};

export const scheduleScanEntryTipOpen = (
  storageKey: string,
  onOpen: () => void,
): (() => void) => {
  const timerId = window.setTimeout(() => {
    if (readShouldShowScanEntryTip(storageKey)) {
      onOpen();
    }
  }, 0);
  return () => {
    window.clearTimeout(timerId);
  };
};
