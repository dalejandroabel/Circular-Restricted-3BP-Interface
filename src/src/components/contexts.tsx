import { createContext, useContext } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface BodyData {
  id_body: string;
  secondary: string;
  primary_id: string;
  mu: number;
  radius_ul: number;
  distance_km: number;
  period_days: number;
  source: number;
  mass_kg: number;
}

export interface AppContextValue {
  body: BodyData | null;
  plotData: any;
  icData: any;
  plotDataIc: any;
  correctorData: any;
  tableData: any;
  isLoading: boolean;
  setBody: (body: BodyData | null) => void;
  setPlotData: (data: any) => void;
  setICData: (data: any) => void;
  setPlotDataIc: (data: any) => void;
  setCorrectorData: (data: any) => void;
  setTableData: (data: any) => void;
  setIsLoading: (loading: boolean) => void;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AppContext = createContext<AppContextValue | null>(null);

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};

export default AppContext;