// ============================================================================
// BODY & SYSTEM TYPES
// ============================================================================

export interface BodyDetails {
    id_body: string;
    secondary: string;
    primary_id: string;
    mu: number;
    radius: number;
    primary_radius: number;
    distance: number;
    period: number;
    sourcedb: number;
    mass: number;
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
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
    period: number;
    jc: number;
    stability_index: number;
    source: number;
    id_family?: string;
    resonance?: string;
    libration?: string;
    batch?: string;
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
    source: number[];
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
    centered: boolean;
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
  }
  
  export interface OrbitParametersProps {
    data: OrbitDataResponse | null | undefined;
    onParameterChange?: (parameters: Partial<OrbitLimits>) => void;
  }
  
  export interface OrbitLimits {
    minPeriod: number | null;
    maxPeriod: number | null;
    minStabilityIndex: number | null;
    maxStabilityIndex: number | null;
    minJacobiConstant: number | null;
    maxJacobiConstant: number | null;
  }
  
  export interface PlotTabsProps {
    initialConditions: InitialConditionsData | null;
    database: string;
    tableData: OrbitDataResponse | null;
    setPlotData: (data: any) => void;
    setPlotDataIc: (data: any) => void;
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
  }
  
  // ============================================================================
  // API RESPONSE TYPES
  // ============================================================================
  
  export interface ApiResponse {
    primaries?: { id_body: string; secondary: string }[];
    secondaries?: { id_body: string; secondary: string }[];
    families?: { id_family: string; family: string }[];
    family?: Array<{
      libration?: string;
      batch?: number;
    }>;
    resonances?: { p: string; q: string }[];
    orbits?: OrbitData[];
    initialconditions?: {
      x0: string;
      y0: string;
      z0: string;
      vx0: string;
      vy0: string;
      vz0: string;
      period: string;
      id_family: string;
      stability_index: string;
      jacobi_constant: string;
      source: string;
    }[];
  }
  
  // ============================================================================
  // UTILITY TYPES
  // ============================================================================
  
  export interface RowSelectionState {
    [key: string]: boolean;
  }
  
  export type UnitType = 'length' | 'velocity' | 'time';