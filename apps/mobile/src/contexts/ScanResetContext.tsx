import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ScanResetContextType {
  resetScan: () => void;
  resetTrigger: number;
}

const ScanResetContext = createContext<ScanResetContextType | undefined>(undefined);

export const ScanResetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [resetTrigger, setResetTrigger] = useState(0);

  const resetScan = useCallback(() => {
    setResetTrigger(prev => prev + 1);
  }, []);

  const value = useMemo(() => ({ resetScan, resetTrigger }), [resetScan, resetTrigger]);

  return (
    <ScanResetContext.Provider value={value}>
      {children}
    </ScanResetContext.Provider>
  );
};

export const useScanReset = () => {
  const context = useContext(ScanResetContext);
  if (context === undefined) {
    throw new Error('useScanReset must be used within a ScanResetProvider');
  }
  return context;
};