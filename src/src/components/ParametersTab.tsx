import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Stack,
  Container,
  Alert,
  TextField,
  Button,
  MenuItem,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete'; // Import DeleteIcon
import { useAppContext } from './contexts';
import { API_URL } from '../../config';
import { OrbitParametersProps, BodyDetails, Filter } from './types';

// ============================================================================
// TAB PANEL COMPONENT
// ============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`orbit-tabpanel-${index}`} aria-labelledby={`orbit-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
};

// ============================================================================
// PARAMETER DISPLAY COMPONENT
// ============================================================================

interface ParameterDisplayProps {
  label: string;
  value: number | null | undefined;
  unit?: string;
}

const ParameterDisplay: React.FC<ParameterDisplayProps> = ({ label, value, unit = '' }) => {
  let formattedValue;
  if (value !== null && value !== undefined) {
    value = Number(value);
    formattedValue = Math.abs(value) < 1e-3 ? value.toExponential(4) : value.toFixed(4);
  } else {
    formattedValue = 'N/A';
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body1">{label}:</Typography>
      <Typography variant="body1" color="text.secondary">
        {formattedValue} {unit}
      </Typography>
    </Box>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ParametersTab: React.FC<OrbitParametersProps> = ({ data, onFilterChange, columns }) => {
  const { body } = useAppContext();
  const [bodyDetails, setBodyDetails] = useState<BodyDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState<Filter[]>([]);

  useEffect(() => {
    if (!data?.body) return;

    const fetchBodyDetails = async () => {
      setError(null);
      try {
        const response = await axios.get<{ body: BodyDetails[] }>(`${API_URL}/bodies/${data.body}`);
        setBodyDetails(response.data.body[0]);
      } catch (err) {
        setError('Failed to fetch body details');
        console.error(err);
      }
    };

    fetchBodyDetails();
  }, [data]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const addFilter = useCallback(() => {
    setFilters([...filters, { id: `filter-${filters.length + 1}`, column: '', type: 'categorical' }]);
  }, [filters]);

  const updateFilter = useCallback((index: number, field: keyof Filter, value: any) => {
    const updatedFilters = [...filters];
    (updatedFilters[index] as Filter)[field] = value;

    if (field === 'column') {
    const type = columns?.find(col => col.c_name === updatedFilters[index].column)?.type || 'categorical';
    updatedFilters[index].type = type;
    }
    setFilters(updatedFilters);
  }, [filters, columns]);

  const removeFilter = useCallback((index: number) => {
    const updatedFilters = filters.filter((_, i) => i !== index);
    setFilters(updatedFilters);
  }, [filters]);

  const applyFilters = useCallback(() => {
    // Logic to apply filters
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const displayBody = bodyDetails || body;

  return (
    <Box sx={{ width: '100%', height: 300, mt: 4, border: 1, borderColor: '#ccc', borderRadius: 5, p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="orbit parameters tabs" centered>
          <Tab label="Body Parameters" />
          <Tab label="Filters" />
        </Tabs>
      </Box>

      {/* Body Parameters Tab */}
      <TabPanel value={tabValue} index={0}>
        <Container maxWidth="md" sx={{ padding: 0, height: 250, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Stack spacing={0} sx={{ width: '100%', height: '100%', justifyContent: 'center' }}>
            <ParameterDisplay label="Mass Ratio" value={displayBody?.mu} />
            <ParameterDisplay label="Longitude Unit (km)" value={displayBody?.distance_km} />
            <ParameterDisplay label="Period (days)" value={displayBody?.period_days} />
          </Stack>
        </Container>
      </TabPanel>

      {/* Filters Tab */}
      <TabPanel value={tabValue} index={1}>
        <Container maxWidth="md" sx={{ padding: 0, height: 250, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Stack spacing={2} sx={{ width: '100%', mt: 2 }}>
            <Button variant="outlined" onClick={addFilter}>
              Add Filter
            </Button>
            <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 0 }}>
              {filters.map((filter, index) => (
              <Stack spacing={2} sx={{ mb: 1 }} key={index}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} style={{marginTop: 10}}>
                <TextField
                  select
                  label="Column"
                  value={filter.column}
                  onChange={(e) => updateFilter(index, 'column', e.target.value)}
                  sx={{ minWidth: 100, flex: 1 }}
                >
                  {columns?.map((col) => (
                    (col.c_name !== 'body' && col.c_name !== 'family') && (
                  <MenuItem key={col.c_name} value={col.c_name}>
                    {col.c_name}
                  </MenuItem>)
                  ))}
                </TextField>
                {filter.type === 'categorical' ? (
                  <TextField
                    select
                    label="Select Value"
                    value={filter.value ?? ''}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    sx={{ minWidth: 20, flex: 1 }}
                  >
                    {Array.from(new Set(data?.orbits?.map((orbit: any) => orbit[filter.column]))).map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <>
                  <TextField
                    label="Min"
                    type="number"
                    value={filter.min ?? ''}
                    placeholder={data?.orbits ? Math.min(...data.orbits.map((orbit: any) => parseFloat(orbit[filter.column]))).toString() : ''}
                    onChange={(e) => updateFilter(index, 'min', e.target.value ? parseFloat(e.target.value) : undefined)}
                    sx={{ minWidth: 100, flex: 1 }}
                  />
                  <TextField
                    label="Max"
                    type="number"
                    placeholder={data?.orbits ? Math.max(...data.orbits.map((orbit: any) => parseFloat(orbit[filter.column]))).toString() : ''}
                    value={filter.max ?? ''}
                    onChange={(e) => updateFilter(index, 'max', e.target.value ? parseFloat(e.target.value) : undefined)}
                    sx={{ minWidth: 100, flex: 1 }}
                  />
                  </>
                )}
                <IconButton onClick={() => removeFilter(index)} sx={{ flex: 0.5 }}>
                  <DeleteIcon />
                </IconButton>
                </Stack>
              </Stack>
              ))}
            </Box>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" onClick={applyFilters}>
                Apply Filters
              </Button>
            </Stack>
          </Stack>
        </Container>
      </TabPanel>
    </Box>
  );
};

export default ParametersTab;
