import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  styled,
} from '@mui/material';
import Plot from 'react-plotly.js';
import { COLORS, API_URL } from '../../config';
import axios from 'axios';
import BodyContext from './contexts';

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

const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  '& .MUI-FormControl': {
    minWidth: 200,
  },
}));

const DropdownContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  justifyContent: 'center',
}));

// Sample data for the dropdowns
const databases = ['Database 1', 'Database 2', 'Database 3'];
const axisVariables = ["X", "Vy", "Vz", "Period", "Stability index", "Jacobi constant"];
const columns = ["x", "vy", "vz", "period", "stability_index", "jacobi_constant"];
const columns_par = ["x0", "vy0", "vz0", "period", "stability_index", "jc"]
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box>{children}</Box>}
  </div>
);

const PlotTabs: React.FC<PlotTabsProps> = ({
  initialConditions,
  database,
  tableData,
  setPlotData,
  setPlotDataIc
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [plotIcData, setPlotIcData] = useState([{
    x: [],
    y: []
  }]);
  const [plotIcLayout, setPlotIcLayout] = useState({

    margin: { t: 10, b: 10, l: 10, r: 10 },
    showlegend: true,
  });

  const body = useContext(BodyContext);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [plotParametricData, setPlotParametricData] = useState([{ x: [], y: [] }]);
  const [plotParametricLayout, setPlotParametricLayout] = useState({});

  const getPlanarData = (initialConditions: any, uniqueFamilies: any, colors: string[], names: string[]) => {

    const customdata = initialConditions.vz.map((vz: number, idx: number) => [vz, initialConditions.period[idx]]);

    const plotData = uniqueFamilies.map((family: any, idx: number) => {

      const indices = initialConditions.family.map((f: any) => f == family);
      return {
        x: initialConditions.x.filter((_: any, idx: number) => indices[idx]),
        y: initialConditions.vy.filter((_: any, idx: number) => indices[idx]),
        customdata: customdata.filter((_: any, idx: number) => indices[idx]),
        type: 'scattergl',
        mode: 'markers',
        marker: {
          color: colors[idx],
          size: 2
        },
        hovertemplate: 'x: %{x}<br>vy: %{y}<br>vz: %{customdata[0]}<br>Period: %{customdata[1]}',
        name: names[idx]
      };
    })

    return plotData;
  };

  const getPlanarLayout = () => {

    const layout = {
      height: 400,
      font: { size: 10 },
      margin: { t: 10, b: 10, l: 10, r: 10 },
      showlegend: true,
      xaxis: {
        title: 'X',
        zeroline: false,

      },
      yaxis: {
        title: 'VY',
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
              args: [{ 'showlegend': false }],
              label: 'Hide Legend',
              method: 'relayout'
            },
            {
              args: [{ 'showlegend': true }],
              label: 'Show Legend',
              method: 'relayout'
            }
          ]
        }],
    };

    return layout;
  };
  const get3DData = (initialConditions: any, uniqueFamilies: any, colors: string[], names: string[]) => {

    const plotData = uniqueFamilies.map((family: any, idx: number) => {

      const indices = initialConditions.family.map((f: any) => f == family);
      return {
        x: initialConditions.x.filter((_: any, idx: number) => indices[idx]),
        y: initialConditions.vy.filter((_: any, idx: number) => indices[idx]),
        z: initialConditions.z.filter((_: any, idx: number) => indices[idx]),
        customdata: initialConditions.period.filter((_: any, idx: number) => indices[idx]),
        type: 'scatter3d',
        mode: 'markers',
        marker: {
          color: colors[idx],
          size: 2
        },
        hovertemplate: 'x: %{x}<br>vy: %{y}<br>Period: %{customdata}',
        name: names[idx]
      };
    })
    return plotData;

  }

  const get3DLayout = () => {

    const layout = {
      scene: {
        xaxis: { title: 'X', showspikes: false, mirror: false, showline: true },
        yaxis: { title: 'VY', showspikes: false, mirror: false, showline: true },
        zaxis: { title: 'VZ', showspikes: false, mirror: false, showline: true },
        aspectmode: 'cube',
        aspectratio: { x: 1, y: 1, z: 1 },
        camera: {
          eye: {
            x: 1.3,
            y: 1.3,
            z: 1.3
          }
        },
      },
      margin: { t: 10, b: 10, l: 10, r: 10 },
      showlegend: true,
      updatemenus: [
        {
          type: 'buttons',
          x: 0.6,
          y: 1.2,
          direction: 'left',
          buttons: [
            {
              args: [{ 'showlegend': false }],
              label: 'Hide Legend',
              method: 'relayout'
            },
            {
              args: [{ 'showlegend': true }],
              label: 'Show Legend',
              method: 'relayout'
            }
          ]
        }]

    }
    return layout;
  }

  const modifyData = (data: any) => {
    let ic_data_modified: { [key: string]: any } = {
      x: data.orbits.map((ic: any) => Number(ic.x0)),
      y: data.orbits.map((ic: any) => Number(ic.y0)),
      z: data.orbits.map((ic: any) => Number(ic.z0)),
      vx: data.orbits.map((ic: any) => Number(ic.vx0)),
      vy: data.orbits.map((ic: any) => Number(ic.vy0)),
      vz: data.orbits.map((ic: any) => Number(ic.vz0)),
      period: data.orbits.map((ic: any) => Number(ic.period)),
      family: data.orbits.map((ic: any) => Number(ic.id_family)),
      stability_index: data.orbits.map((ic: any) => Number(ic.stability_index)),
      jacobi_constant: data.orbits.map((ic: any) => Number(ic.jc)),
    }
    return ic_data_modified;
  }
  useEffect(() => {
    const fetchPlotData = async () => {
      if (!initialConditions) {
        return;
      }
      const response = await axios.get(`${API_URL}/families`);
      const allfamilies = response.data.families;

      const uniqueFamilies = Array.from(new Set(initialConditions.family));
      const colors = uniqueFamilies.map((family) => {
        const index = uniqueFamilies.indexOf(family);
        return COLORS[index];
      });
      const names = uniqueFamilies.map((family) => {
        return allfamilies.find((f: any) => f.id_family == family
        ).family;
      });

      if (database == "1") {
        const plotData = getPlanarData(initialConditions, uniqueFamilies, colors, names);
        setPlotIcData(plotData);
        const layout = getPlanarLayout();
        setPlotIcLayout(layout);
      } else {
        const plotData = get3DData(initialConditions, uniqueFamilies, colors, names);
        setPlotIcData(plotData);
        const layout = get3DLayout();
        setPlotIcLayout(layout);
      }
    };

    fetchPlotData();
  }, [initialConditions]);


  useEffect(() => {
    if (!initialConditions) {
      return;
    }
    if (!xAxis || !yAxis) {
      return;
    }
    const getParametricData = (xAxis: string, yAxis: string) => {
      const modifiedData = modifyData(tableData);
      const xData = modifiedData[columns[axisVariables.indexOf(xAxis)] as keyof typeof modifiedData];
      const yData = modifiedData[columns[axisVariables.indexOf(yAxis)]];

      const remainingColumns = columns.filter(
        (col) => col !== columns[axisVariables.indexOf(xAxis)] && col !== columns[axisVariables.indexOf(yAxis)]
      );
      const customData = xData.map((_: any, idx: string | number) => remainingColumns.slice(0, 2).map((col) => modifiedData[col][idx]));
      return [{
        x: xData,
        y: yData,
        type: 'scattergl',
        mode: 'markers',
        marker: {
          size: 2,
          color: 'rgb(25,25,25)'
        },
        customdata: customData,
        hovertemplate: `x: %{x}<br>y: %{y}<br>${remainingColumns[0]}: %{customdata[0]}<br>${remainingColumns[1]}: %{customdata[1]}`
      }];
    };

    const getParametricLayout = (xAxis: string, yAxis: string) => {
      const layout = {
        height: 400,
        font: { size: 10 },
        margin: { t: 10, b: 40, l: 10, r: 10 },
        showlegend: false,
        xaxis: { title: xAxis, zeroline: false },
        yaxis: { title: yAxis, zeroline: false },
      }
      return layout;
    };

    const plotData = getParametricData(xAxis, yAxis);
    setPlotParametricData(plotData);
    const layout = getParametricLayout(xAxis, yAxis);
    setPlotParametricLayout(layout);

  }, [xAxis, yAxis, initialConditions]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDatabaseChange = (event: SelectChangeEvent) => {
    setSelectedDatabase(event.target.value);
  };

  const handleXAxisChange = (event: SelectChangeEvent) => {
    setXAxis(event.target.value);
  };

  const handleYAxisChange = (event: SelectChangeEvent) => {
    setYAxis(event.target.value);
  };

  const handlePlotClick = async (clickedData: any) => {
    if (!clickedData) {
      console.error('No data point clicked');
      return;
    }

    const clickedPoint = clickedData.points[0];
    const clickedX = clickedPoint.x;
    const clickedVY = clickedPoint.y;
    const clickedVz = clickedPoint.customdata[0];
    const clickedPeriod = clickedPoint.customdata[1];

    const orbitParams = {
      x: clickedX,
      vy: clickedVY,
      vz: clickedVz,
      period: clickedPeriod,
    };

    try {
      const mu = body.mu;

      const orbitResponse = await axios.post<any>(`${API_URL}/orbits/propagate/`,{
        x: orbitParams.x,
        y: 0,
        z: 0,
        vx: 0,
        vy: orbitParams.vy,
        vz: orbitParams.vz,
        period: orbitParams.period,
        mu: mu,
        centered: false,
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
        mu: mu
      })

    } catch (error) {
      console.error('Error handling plot click:', error);
    }


  };

  const handleParameterClick = async (clickedData: any) => {
    if (!clickedData) {
      console.error("No data point clicked");
      return;
    }
    const clickedPoint = clickedData.points[0];
    const clickedX = clickedPoint.x;
    const clickedY = clickedPoint.y;

    const xColumn = columns_par[axisVariables.indexOf(xAxis)];
    const yColumn = columns_par[axisVariables.indexOf(yAxis)];

    const filteredOrbit = tableData.orbits.find((orbit: any) =>
      orbit[xColumn] == clickedX &&
      orbit[yColumn] == clickedY);

    if (!filteredOrbit) {
      console.error("No matching orbit found");
      return;
    }


    try {
      const mu = body.mu;
      const orbitResponse = await axios.post<any>(`${API_URL}/orbits/propagate/`, {
        x: filteredOrbit.x0,
        y: filteredOrbit.y0,
        z: filteredOrbit.z0,
        vx: filteredOrbit.vx0,
        vy: filteredOrbit.vy0,
        vz: filteredOrbit.vz0,
        period: filteredOrbit.period,
        mu: mu,
        centered: false,
        method: 'RK45',
        N: 1000,
        atol: 1e-12,
        rtol: 1e-12,
      });
      const orbitData = orbitResponse.data.data;
      setPlotData([JSON.parse(orbitData),]);
      setPlotDataIc({
        x: filteredOrbit.x0,
        y: filteredOrbit.y0,
        z: filteredOrbit.z0,
        vx: filteredOrbit.vx0,
        vy: filteredOrbit.vy0,
        vz: filteredOrbit.vz0,
        period: filteredOrbit.period,
        mu: mu
      });
    } catch (error) {
      console.error('Error handling parameter click:', error);
    }
  }
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Initial Conditions Map" />
          <Tab label="Parametric map" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <StyledBox>
          <Plot
            data={plotIcData}
            layout={plotIcLayout}
            config={{ responsive: true }}
            style={{ width: '100%', height: '100%' }}
            onClick={(data_) => {
              handlePlotClick(data_);
            }}

          />
          <DropdownContainer>
            <FormControl fullWidth>
              <Select
                value={selectedDatabase}
                onChange={handleDatabaseChange}
                displayEmpty
                sx={{ backgroundColor: '#f5f5f5' }}
              >
                <MenuItem value="" disabled>
                  Database
                </MenuItem>
                {databases.map((db) => (
                  <MenuItem key={db} value={db}>
                    {db}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DropdownContainer>
        </StyledBox>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <StyledBox>
          <Plot
            data={plotParametricData}
            layout={plotParametricLayout}
            config={{ responsive: true }}
            style={{ width: '100%', height: '100%' }}
            onClick={(data_) => {
              handleParameterClick(data_);
            }}

          />
          <DropdownContainer>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={xAxis}
                onChange={handleXAxisChange}
                displayEmpty
                sx={{ backgroundColor: '#f5f5f5' }}
              >
                <MenuItem value="" disabled>
                  X-axis variable
                </MenuItem>
                {axisVariables.map((variable) => (
                  <MenuItem key={variable} value={variable}>
                    {variable}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={yAxis}
                onChange={handleYAxisChange}
                displayEmpty
                sx={{ backgroundColor: '#f5f5f5' }}
              >
                <MenuItem value="" disabled>
                  Y-axis variable
                </MenuItem>
                {axisVariables.map((variable) => (
                  <MenuItem key={variable} value={variable}>
                    {variable}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DropdownContainer>
        </StyledBox>
      </TabPanel>
    </Box>
  );
};

export default PlotTabs;