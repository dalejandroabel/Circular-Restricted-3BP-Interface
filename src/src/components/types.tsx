// ============================================================================
// BODY & SYSTEM TYPES
// ============================================================================

export interface BodyDetails {
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
  
  export interface SystemOption {
    id: string;
    name: string;
  }
  
  // ============================================================================
  // ORBIT DATA TYPES
  // ============================================================================
  
  export interface OrbitData {
    id: string;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    period: number;
    jc: number;
    stability_index: number;
    source: number;
    id_family?: string;
    resonance?: string;
    libration?: string;
    batch?: string;
  }

  export interface ColumnData {
    c_name: string;
    description: string;
    type: string;
  }
  
  export interface OrbitDataResponse {
    orbits: OrbitData[];
    body: string;
  }
  
  export interface InitialConditionsData {
    x: number[];
    y: number[];
    z: number[];
    vx: number[];
    vy: number[];
    vz: number[];
    period: number[];
    family: number[];
    stability_index: number[];
    jacobi_constant: number[];
    source: number[] | string[];
  }
  
  // ============================================================================
  // CORRECTOR TYPES
  // ============================================================================
  
  export interface CorrectorTableData {
    iteration: number;
    x: number;
    vy: number;
    vz: number;
    period: number;
    deltaX: number;
    deltaVy: number;
    deltaVz: number;
  }
  
  export interface CorrectorTableProps {
    data: CorrectorTableData[] | null;
    correctordata: any;
    setPlotData: (data: any) => void;
    setPlotDataIc: (data: any) => void;
    status?: string;
  }
  
  // ============================================================================
  // PROPAGATION TYPES
  // ============================================================================
  
  export interface FunctionParams {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    period: number;
    mu: number;
  }
  
  export interface PropagationConfig {
    method: string;
    atol: number;
    rtol: number;
    N: number;
  }
  
  // ============================================================================
  // COMPONENT PROPS TYPES
  // ============================================================================
  
  export interface OrbitDisplayProps {
    plotData: any;
    onUnitsChange?: (isCanonical: boolean) => void;
    icData: any;
    setCorrectorData: (data: any) => void;
  }
  
  export interface AdvancedTableProps {
    data: OrbitDataResponse | null;
    onSelectionChange?: (selectedRows: OrbitData[]) => void;
    handlePlotData?: (plotData: any) => void;
    handleIcData?: (icData: any) => void;
    columns?: ColumnData[] | null;
    filters?: Filter[];
  }
  
  export interface OrbitParametersProps {
    data: OrbitDataResponse | null | undefined;
    onFilterChange?: (filters: Filter[]) => void;
    columns?: ColumnData[] | null;
  }
  export interface Filter {
  id: string;
  column: string;
  type: string;
  value?: string;
  min?: number | null;
  max?: number | null;
  [key: string]: any; 
}
  
  export interface OrbitLimits {
    filters? : Filter[];
  }
  
  export interface PlotTabsProps {
    initialConditions: InitialConditionsData | null;
    database: string;
    tableData: OrbitDataResponse | null;
    setPlotData: (data: any) => void;
    setPlotDataIc: (data: any) => void;
    columns?: ColumnData[] | null;
  }
  
  export interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  
  export interface SystemFormProps {
    onDataLoaded: (data: any) => void;
    onIcDataLoaded: (data: any) => void;
    handlePlotData: (data: any) => void;
    handleBody: (data: BodyDetails) => void;
    handleLoading: (loading: boolean) => void;
    loading?: boolean;
    setColumns: (data: any) => void;
  }
  
  // ============================================================================
  // API RESPONSE TYPES
  // ============================================================================
  
  export interface ApiResponse {
    primaries?: { id_body: string; secondary: string }[];
    secondaries?: { id_body: string; secondary: string }[];
    families?: { id_family: string; name: string }[];
    family?: Array<{
      libration?: string;
      batch?: number;
      branch?: string;
    }>;
    resonances?: { p: string; q: string }[];
    orbits?: OrbitData[];
    initialconditions?: {
      x: string;
      y: string;
      z: string;
      vx: string;
      vy: string;
      vz: string;
      period: string;
      id_family: string;
      stability_index: string;
      jc: string;
      source: string;
    }[];
    databases?: string[];
    columns?: {
      c_name: string;
      description: string;

    }
  }
  
  // ============================================================================
  // UTILITY TYPES
  // ============================================================================
  
  export interface RowSelectionState {
    [key: string]: boolean;
  }
  
  export type UnitType = 'length' | 'velocity' | 'time';