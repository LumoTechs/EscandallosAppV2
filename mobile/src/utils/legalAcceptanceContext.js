import { createContext, useContext } from 'react';

export const LegalAcceptanceContext = createContext({
  legalAccepted: false,
  setLegalAccepted: () => {},
});

export const useLegalAcceptanceCtx = () => useContext(LegalAcceptanceContext);
