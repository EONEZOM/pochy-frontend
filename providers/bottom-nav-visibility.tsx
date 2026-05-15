'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type BottomNavVisibilityContextValue = {
  isHomeEmptyViewActive: boolean;
  setHomeEmptyViewActive: (next: boolean) => void;
};

const BottomNavVisibilityContext =
  createContext<BottomNavVisibilityContextValue | null>(null);

type BottomNavVisibilityProviderProps = {
  children: ReactNode;
};

export const BottomNavVisibilityProvider = ({
  children,
}: BottomNavVisibilityProviderProps) => {
  const [isHomeEmptyViewActive, setIsHomeEmptyViewActive] = useState(false);

  const setHomeEmptyViewActive = useCallback((next: boolean) => {
    setIsHomeEmptyViewActive(next);
  }, []);

  const value = useMemo(
    () => ({
      isHomeEmptyViewActive,
      setHomeEmptyViewActive,
    }),
    [isHomeEmptyViewActive, setHomeEmptyViewActive],
  );

  return (
    <BottomNavVisibilityContext.Provider value={value}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
};

export const useBottomNavVisibility = () => {
  const context = useContext(BottomNavVisibilityContext);

  if (!context) {
    throw new Error(
      'useBottomNavVisibility must be used within BottomNavVisibilityProvider',
    );
  }

  return context;
};
