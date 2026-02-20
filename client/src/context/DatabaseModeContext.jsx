import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DB_TARGETS,
  getDbTarget,
  setDbTarget as persistDbTarget,
} from '../services/api';

const DatabaseModeContext = createContext(null);

export function DatabaseModeProvider({ children }) {
  const [dbMode, setDbModeState] = useState(() => getDbTarget());

  const setDbMode = useCallback((nextMode) => {
    const normalizedMode = persistDbTarget(nextMode);
    setDbModeState(normalizedMode);
    return normalizedMode;
  }, []);

  const value = useMemo(() => ({
    dbMode,
    setDbMode,
    dbTargets: DB_TARGETS,
    isTestMode: dbMode === DB_TARGETS.TEST,
    isProductionMode: dbMode === DB_TARGETS.PRODUCTION,
  }), [dbMode, setDbMode]);

  return (
    <DatabaseModeContext.Provider value={value}>
      {children}
    </DatabaseModeContext.Provider>
  );
}

export function useDatabaseMode() {
  const context = useContext(DatabaseModeContext);
  if (!context) {
    throw new Error('useDatabaseMode must be used within DatabaseModeProvider');
  }
  return context;
}
