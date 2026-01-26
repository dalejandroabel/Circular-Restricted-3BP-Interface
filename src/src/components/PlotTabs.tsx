import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Tooltip,
} from '@mui/material';
import Plot from 'react-plotly.js';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import axios from 'axios';
import { useAppContext } from './contexts';
import { COLORS, API_URL } from '../../config';
import { PlotTabsProps, TabPanelProps, ApiResponse } from './types';
// ============================================================================
// CONSTANTS
// ============================================================================



// ============================================================================
// TAB PANEL COMPONENT
// ============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box>{children}</Box>}
  </div>
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getToolTipIc = () => (
  <Tooltip
    title={
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span>Click on a point to plot the orbit</span>
        <span>Click on a label to hide it, double-click to isolate it</span>
      </Box>
    }
    arrow
  >
    <HelpOutlineIcon fontSize="large" sx={{
      borderRadius: 2,
      p: 1,
      '& .MuiSvgIcon-root': { fontSize: 10 },
      boxShadow: 0,
      mr: 0,
      color: '#888',
    }} />
  </Tooltip>
);

const getToolTipParametric = () => (
  <Tooltip
    title={
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span>Click on a point to plot the orbit</span>
      </Box>
    }
    arrow
  >
    <HelpOutlineIcon fontSize="large" sx={{
      borderRadius: 2,
      p: 1,
      '& .MuiSvgIcon-root': { fontSize: 10 },
      boxShadow: 0,
      mr: 0,
      color: '#888',
    }} />
  </Tooltip>
);


const getPlanarData = (

  initialConditions: any,
  uniqueFamilies: any[],
  colors: string[],
  names: string[]
) => {
  const customdata = initialConditions.vz.map((vz: number, idx: number) => [
    vz,
    initialConditions.period[idx],
  ]);

  return uniqueFamilies.map((family: any, idx: number) => {
    const indices = initialConditions.family.map((f: any) => f === family);
    return {
      x: initialConditions.x.filter((_: any, idx: number) => indices[idx]),
      y: initialConditions.vy.filter((_: any, idx: number) => indices[idx]),
      customdata: customdata.filter((_: any, idx: number) => indices[idx]),
      type: 'scattergl',
      mode: 'markers',
      marker: {
        color: colors[idx],
        size: 2,
      },
      hovertemplate: 'x: %{x}<br>vy: %{y}<br>vz: %{customdata[0]}<br>Period: %{customdata[1]}',
      name: names[idx],
    };
  });
};

const getPlanarLayout = () => ({
  height: 400,
  font: { size: 10 },
  margin: { t: 40, b: 40, l: 40, r: 40 },
  showlegend: true,
  xaxis: {
    title: { text: 'X' },
    zeroline: false,
  },
  yaxis: {
    title: { text: 'VY' },
    zeroline: false,
  },
  updatemenus: [
    {
      type: 'buttons',
      x: 0.6,
      y: 1.2,
      direction: 'left',
      buttons: [
        {
          args: [{ showlegend: false }],
          label: 'Hide Legend',
          method: 'relayout',
        },
        {
          args: [{ showlegend: true }],
          label: 'Show Legend',
          method: 'relayout',
        },
      ],
    },
  ],
});

const get3DData = (
  initialConditions: any,
  uniqueFamilies: any[],
  colors: string[],
  names: string[]
) => {
  return uniqueFamilies.map((family: any, idx: number) => {
    const indices = initialConditions.family.map((f: any) => f === family);
    return {
      x: initialConditions.x.filter((_: any, idx: number) => indices[idx]),
      y: initialConditions.vy.filter((_: any, idx: number) => indices[idx]),
      z: initialConditions.vz.filter((_: any, idx: number) => indices[idx]),
      customdata: initialConditions.period.filter((_: any, idx: number) => indices[idx]),
      type: 'scatter3d',
      mode: 'markers',
      marker: {
        color: colors[idx],
        size: 2,
      },
      hovertemplate: 'x: %{x}<br>vy: %{y}<br>Period: %{customdata}',
      name: names[idx],
    };
  });
};

const get3DLayout = () => ({
  scene: {
    xaxis: { title: { text: 'X' }, showspikes: false, mirror: false, showline: false },
    yaxis: { title: { text: 'VY' }, showspikes: false, mirror: false, showline: false },
    zaxis: { title: { text: 'VZ' }, showspikes: false, mirror: false, showline: false },
    aspectmode: 'cube',
    aspectratio: { x: 1, y: 1, z: 1 },
    camera: {
      eye: {
        x: 1.3,
        y: 1.3,
        z: 1.3,
      },
    },
  },
  margin: { t: 40, b: 40, l: 40, r: 40 },
  showlegend: true,
  updatemenus: [
    {
      type: 'buttons',
      x: 0.6,
      y: 1.2,
      direction: 'left',
      buttons: [
        {
          args: [{ showlegend: false }],
          label: 'Hide Legend',
          method: 'relayout',
        },
        {
          args: [{ showlegend: true }],
          label: 'Show Legend',
          method: 'relayout',
        },
      ],
    },
  ],
});

const modifyData = (data: any, columns: any[]) => {
  if (!data || !data.orbits || data.orbits.length === 0) {
    console.log('No data or empty orbits');
    return {};
  }
  let modifiedData: any = {};
  columns.forEach((column) => {
    if (column.type === 'numerical') {
      modifiedData[column.c_name] = data.orbits.map((ic: any) => Number(ic[column.c_name]));
    } else if (column.type === 'categorical') {
      modifiedData[column.c_name] = data.orbits.map((ic: any) => String(ic[column.c_name]));
    }
  });

  return modifiedData;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PlotTabs: React.FC<PlotTabsProps> = ({
  initialConditions,
  tableData,
  setPlotData,
  setPlotDataIc,
  columns
}) => {
  // ============================================================================
  // CONTEXT
  // ============================================================================
  const { body } = useAppContext();

  // ============================================================================
  // STATE
  // ============================================================================
  const [tabValue, setTabValue] = useState(0);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | number>('');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [plotIcData, setPlotIcData] = useState([{ x: [], y: [] }]);
  const [plotIcLayout, setPlotIcLayout] = useState<any>({
    margin: { t: 40, b: 40, l: 40, r: 40 },
    showlegend: true,
  });
  const [plotParametricData, setPlotParametricData] = useState([{ x: [], y: [] }]);
  const [plotParametricLayout, setPlotParametricLayout] = useState<any>({
    margin: { t: 40, b: 40, l: 40, r: 40 },
    showlegend: true,
  });

  // ============================================================================
  // EFFECT - Initial Conditions Plot
  // ============================================================================
  useEffect(() => {
    if (!initialConditions || !body) return;

    const fetchPlotData = async () => {
      try {
        if (!selectedDatabase)   {
          const uniqueDatabases = Array.from(new Set<string | number>(initialConditions.source));
          setSelectedDatabase(uniqueDatabases[0]);
        }
        const response = await axios.get(`${API_URL}/allfamilies/${selectedDatabase}`);
        const allFamilies = response.data.families;


        const indices = (initialConditions.source
          .map((source: any, idx: number) => (source === selectedDatabase ? idx : null))
          .filter((idx: any) => idx !== null)) as number[];

        const modifiedIC = {
          x: indices.map((idx: number) => initialConditions.x[idx]),
          y: indices.map((idx: number) => initialConditions.y[idx]),
          z: indices.map((idx: number) => initialConditions.z[idx]),
          vx: indices.map((idx: number) => initialConditions.vx[idx]),
          vy: indices.map((idx: number) => initialConditions.vy[idx]),
          vz: indices.map((idx: number) => initialConditions.vz[idx]),
          period: indices.map((idx: number) => initialConditions.period[idx]),
          source: indices.map((idx: number) => initialConditions.source[idx]),
          family: indices.map((idx: number) => initialConditions.family[idx]),
          stability_index: indices.map((idx: number) => initialConditions.stability_index[idx]),
          jacobi_constant: indices.map((idx: number) => initialConditions.jacobi_constant[idx]),
        };

        const uniqueFamilies = Array.from(new Set(modifiedIC.family));
        const colors = uniqueFamilies.map((_family, index) => COLORS[index]);
        const names = uniqueFamilies.map((family) =>
          allFamilies.find((f: any) => f.id_family == family)?.name
        );
        if (['pax'].includes(String(selectedDatabase))) {
          const plotData = getPlanarData(modifiedIC, uniqueFamilies, colors, names);
          setPlotIcData(plotData);
          const layout = getPlanarLayout();
          setPlotIcLayout(layout);
        } else {
          const plotData = get3DData(modifiedIC, uniqueFamilies, colors, names);
          setPlotIcData(plotData);
          const layout = get3DLayout();
          setPlotIcLayout(layout);
        }
      } catch (error) {
        console.error('Error fetching plot data:', error);
      }
    };

    fetchPlotData();
  }, [initialConditions, selectedDatabase, body]);

  // ============================================================================
  // EFFECT - Parametric Plot
  // ============================================================================
  useEffect(() => {

    if (!xAxis || !yAxis || !tableData) return;

    let dataModified = modifyData(tableData, columns || []);


    const getParametricData = (xAxis: string, yAxis: string) => {
      const xData = dataModified[xAxis];
      const yData = dataModified[yAxis];

      const remainingColumns = Object.keys(dataModified).filter(
        (col) => col !== xAxis && col !== yAxis && col !== 'family' && col !== 'source' && col !== 'body');
      const customData = dataModified[remainingColumns[0]].map((_: any, idx: number) => [
        dataModified[remainingColumns[0]][idx],
        dataModified[remainingColumns[1]][idx],
      ]);

      return [
        {
          x: xData,
          y: yData,
          type: 'scattergl',
          mode: 'markers',
          marker: {
            size: 2,
            color: 'rgb(25,25,25)',
          },
          customdata: customData,
          hovertemplate: `x: %{x}<br>y: %{y}<br>${remainingColumns[0]}: %{customdata[0]}<br>${remainingColumns[1]}: %{customdata[1]}`,
        },
      ];
    };

    const getParametricLayout = (xAxis: string, yAxis: string) => ({
      height: 400,
      font: { size: 10 },
      margin: { t: 40, b: 40, l: 40, r: 40 },
      showlegend: false,
      xaxis: { title: {text: xAxis}, zeroline: false },
      yaxis: { title: {text: yAxis}, zeroline: false },
    });

    const plotData = getParametricData(xAxis, yAxis);
    setPlotParametricData(plotData);
    const layout = getParametricLayout(xAxis, yAxis);
    setPlotParametricLayout(layout);
  }, [xAxis, yAxis, tableData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/databases/`);
      setDatabases(response.data.databases || []);
      return databases;
    } catch (error) {
      console.error('Error fetching databases:', error);
      return [];
    }
  }
  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const handleDatabaseChange = useCallback((event: SelectChangeEvent) => {
    setSelectedDatabase(event.target.value);
  }, []);

  const handleXAxisChange = useCallback((event: SelectChangeEvent) => {
    setXAxis(event.target.value);
  }, []);

  const handleYAxisChange = useCallback((event: SelectChangeEvent) => {
    setYAxis(event.target.value);
  }, []);

  const handlePlotClick = useCallback(
    async (clickedData: any) => {
      if (!clickedData || !body) {
        console.error('No data point clicked');
        return;
      }

      const clickedPoint = clickedData.points[0];
      const clickedX = clickedPoint.x;
      const clickedVY = clickedPoint.y;
      const clickedVz = clickedPoint.z || 0;
      const clickedPeriod =
        typeof clickedPoint.customdata === 'object'
          ? clickedPoint.customdata[1]
          : clickedPoint.customdata;

      const orbitParams = {
        x: clickedX,
        vy: clickedVY,
        vz: clickedVz,
        period: clickedPeriod,
      };

      try {
        const mu = body.mu;

        const orbitResponse = await axios.post<any>(`${API_URL}/orbits/propagate/`, {
          x: orbitParams.x,
          y: 0,
          z: 0,
          vx: 0,
          vy: orbitParams.vy,
          vz: orbitParams.vz,
          period: orbitParams.period,
          mu: mu,
          method: 'RK45',
          N: 1000,
          atol: 1e-12,
          rtol: 1e-12,
        });

        const orbitData = orbitResponse.data.data;
        setPlotData([JSON.parse(orbitData)]);
        setPlotDataIc({
          x: orbitParams.x,
          y: 0,
          z: 0,
          vx: 0,
          vy: orbitParams.vy,
          vz: orbitParams.vz,
          period: orbitParams.period,
          mu: mu,
        });
      } catch (error) {
        console.error('Error handling plot click:', error);
      }
    },
    [body, selectedDatabase, setPlotData, setPlotDataIc]
  );

  const handleParameterClick = useCallback(
    async (clickedData: any) => {
      if (!clickedData || !body || !tableData) {
        console.error('No data point clicked');
        return;
      }

      const clickedPoint = clickedData.points[0];
      const clickedX = clickedPoint.x;
      const clickedY = clickedPoint.y;

      const xColumn = xAxis;;
      const yColumn = yAxis;

      const filteredOrbit = tableData.orbits.find(
        (orbit: any) => orbit[xColumn] == clickedX && orbit[yColumn] == clickedY
      );

      if (!filteredOrbit) {
        console.error('No matching orbit found');
        return;
      }

      try {
        const mu = body.mu;
        const orbitResponse = await axios.post<any>(`${API_URL}/orbits/propagate/`, {
          x: filteredOrbit.x,
          y: filteredOrbit.y,
          z: filteredOrbit.z,
          vx: filteredOrbit.vx,
          vy: filteredOrbit.vy,
          vz: filteredOrbit.vz,
          period: filteredOrbit.period,
          mu: mu,
          method: 'DOP853',
          N: 1000,
          atol: 1e-12,
          rtol: 1e-12,
        });

        const orbitData = orbitResponse.data.data;
        setPlotData([JSON.parse(orbitData)]);
        setPlotDataIc({
          x: filteredOrbit.x,
          y: filteredOrbit.y,
          z: filteredOrbit.z,
          vx: filteredOrbit.vx,
          vy: filteredOrbit.vy,
          vz: filteredOrbit.vz,
          period: filteredOrbit.period,
          mu: mu,
        });
      } catch (error) {
        console.error('Error handling parameter click:', error);
      }
    },
    [body, tableData, xAxis, yAxis, setPlotData, setPlotDataIc]
  );

  const handleDownload = useCallback(() => {
    if (!initialConditions) return;

    const blob = new Blob([JSON.stringify(initialConditions, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'initial_conditions.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [initialConditions]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Box
      sx={{
        width: '100%',
        border: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        paddingTop: 2,
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', marginLeft: 2, marginRight: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered    >
          <Tab label="Initial Conditions Map" />
          <Tab label="Parametric map" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            paddingTop: 4,
          }}
        >
          <Plot
            data={plotIcData}
            layout={plotIcLayout}
            config={{}}
            style={{ width: '90%', height: '80%' }}
            onClick={(data_) => {
              handlePlotClick(data_);
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              paddingTop: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {getToolTipIc()}
            </Box>
            <FormControl sx={{ display: 'flex', alignItems: 'center', width: '50%' }}>
              <Select
                value={selectedDatabase?.toString() || ''}
                onChange={handleDatabaseChange}
                displayEmpty
                sx={{ backgroundColor: '#f5f5f5', width: '100%' }}
              >
                <MenuItem value="" disabled>
                  Select Database
                </MenuItem>
                {databases.map((db, index) => (
                  <MenuItem key={index} value={db}>
                    {db}
                  </MenuItem>
                ))}

              </Select>
            </FormControl>
            <IconButton onClick={handleDownload} sx={{ marginLeft: 0 }}>
              <DownloadIcon sx={{ width: 32, height: 32 }} />
            </IconButton>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            paddingTop: 4,
          }}
        >
          <Plot
            data={plotParametricData}
            layout={plotParametricLayout}
            config={{ responsive: true }}
            style={{ width: '90%', height: '80%' }}
            onClick={(data_) => {
              handleParameterClick(data_);
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', paddingTop: 4, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {getToolTipParametric()}
            </Box>
            <FormControl sx={{ minWidth: 200, paddingRight: 2 }}>
              <Select
                value={xAxis}
                onChange={handleXAxisChange}
                displayEmpty
                sx={{ backgroundColor: '#f5f5f5' }}
              >
                <MenuItem value="" disabled>
                  X-axis variable
                </MenuItem>
                {columns?.map((variable) => {
                  if (variable.c_name === "body" || variable.c_name === "family") {
                  return null;
                  }
                  return (
                  <MenuItem key={variable.c_name} value={variable.c_name}>
                    {variable.c_name}
                  </MenuItem>
                  );
                })
                }
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200, paddingLeft: 2 }}>
              <Select
                value={yAxis}
                onChange={handleYAxisChange}
                displayEmpty
                sx={{ backgroundColor: '#f5f5f5' }}
              >
                <MenuItem value="" disabled>
                  Y-axis variable
                </MenuItem>
                {columns?.map((variable) => {
                  if (variable.c_name === "body" || variable.c_name === "family") {
                  return null;
                  }
                  return (
                  <MenuItem key={variable.c_name} value={variable.c_name}>
                    {variable.c_name}
                  </MenuItem>
                  );
                })
                }
              </Select>
            </FormControl>
          </Box>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default PlotTabs;