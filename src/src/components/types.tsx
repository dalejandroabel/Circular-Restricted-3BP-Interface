interface OrbitDisplayProps {
    plotData: any;
    onUnitsChange?: (isCanonical: boolean) => void;
    icData: any;
    setCorrectorData: (data: any) => void;
}

interface CorrectorTableData {
    iteration: number;
    x: number;
    vy: number;
    vz: number;
    period: number;
    deltaX: number;
    deltaVy: number;
    deltaVz: number;
}

interface CorrectorTableProps {
    data: CorrectorTableData[] | null;
    correctordata: any;
    setPlotData: (data: any) => void,
    setPlotDataIc: (data: any) => void,
    status?: string;
}



// Interfaces
interface OrbitData {
    orbits: any;
    body: any;
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
}

interface AdvancedTableProps {
    data: {
        orbits: OrbitData[];
        body: string;
    } | null;

    onSelectionChange?: (selectedRows: OrbitData[]) => void;
    handlePlotData?: (plotData: any) => void;
    handleIcData?: (icData: any) => void;
}

interface RowSelectionState {
    [key: string]: boolean;
}

interface FunctionParams {
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

// Interfaces
interface OrbitDataParameters {
    orbits: {
        id: string;
        x0: number;
        y0: number;
        z0: number;
        vx0: number;
        vy0: number;
        vz0: number;
        period: number;
        stability_index: number;
        jc: number;
    }[];
    body: number;
}

interface BodyDetails {
    mu: number;
    distance: number;
    period: number;
    body: any;
    mass: number;
}

interface OrbitParametersProps {
    data: OrbitDataParameters | null | undefined;
    onParameterChange?: (parameters: {
        minPeriod?: number;
        maxPeriod?: number;
        minStabilityIndex?: number;
        maxStabilityIndex?: number;
        minJacobiConstant?: number;
        maxJacobiConstant?: number;
    }) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

interface PlotTabsProps {
    initialConditions: any;
    database: string;
    tableData: any;
    setPlotData: any;
    setPlotDataIc: any;
}


interface SystemOption {
    id: string;
    name: string;
}

interface ApiResponse {
    primaries?: { id_body: string; secondary: string; }[];
    secondaries?: { id_body: string; secondary: string; }[];
    families?: { id_family: string; family: string; }[];
    family?: Array<{
        libration?: string;
        batch?: number;
    }>;
    resonances?: { p: string; q: string; }[];
    orbits?: any;
    initialconditions?: {
        x0: string,
        y0: string,
        z0: string,
        vx0: string,
        vy0: string,
        vz0: string,
        period: string,
        id_family: string,
        stability_index: string,
        jacobi_constant: string,
        source: string,
    }[];

}

interface SystemFormProps {
    onDataLoaded: (data: any) => void;
    onIcDataLoaded: (data: any) => void;
    handlePlotData: (data: any) => void;
    handleBody: (data: any) => void;
    handleLoading: (loading: boolean) => void;
    loading?: boolean;
}



export type {
    OrbitDisplayProps, CorrectorTableData, CorrectorTableProps,
    OrbitData, AdvancedTableProps, RowSelectionState, FunctionParams,
    OrbitDataParameters, BodyDetails, OrbitParametersProps,
    TabPanelProps, PlotTabsProps,
    SystemOption, ApiResponse, SystemFormProps
};