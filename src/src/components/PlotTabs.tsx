import React, { useState } from 'react';
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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
const axisVariables = ['Variable 1', 'Variable 2', 'Variable 3', 'Variable 4'];

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box>{children}</Box>}
  </div>
);

const PlotTabs: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');

  // Sample plot data
  const plotData = {
    x: [1, 2, 3, 4],
    y: [10, 15, 13, 17],
    type: 'scatter',
    mode: 'lines+markers',
  };

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

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Parametric map" />
          <Tab label="Initial Conditions Map" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <StyledBox>
          <Plot
            data={[plotData]}
            layout={{
              width: 800,
              height: 400,
              margin: { t: 10, b: 40, l: 40, r: 10 },
              showlegend: false,
            }}
            config={{ responsive: true }}
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
            data={[plotData]}
            layout={{
              width: 800,
              height: 400,
              margin: { t: 10, b: 40, l: 40, r: 10 },
              showlegend: false,
            }}
            config={{ responsive: true }}
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