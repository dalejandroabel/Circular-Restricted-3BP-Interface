import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Stack,
  Container,
  CircularProgress,
  Alert,
  TextField,
  Grid,
} from '@mui/material';
import { API_URL } from "../../config";
import {OrbitParametersProps, BodyDetails } from './types';

const ParametersTab: React.FC<OrbitParametersProps> = ({
  data,
  onParameterChange,
  isLoading
}) => {
  // State for body details and editable parameters
  const [bodyDetails, setBodyDetails] = useState<BodyDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Editable parameters state
  const [editableParameters, setEditableParameters] = useState<{
    minPeriod: number | null;
    maxPeriod: number | null;
    minStabilityIndex: number | null;
    maxStabilityIndex: number | null;
    minJacobiConstant: number | null;
    maxJacobiConstant: number | null;
  }>({
    minPeriod: null,
    maxPeriod: null,
    minStabilityIndex: null,
    maxStabilityIndex: null,
    minJacobiConstant: null,
    maxJacobiConstant: null,
  });

  // Fetch body details
  useEffect(() => {
    const fetchBodyDetails = async () => {
      if (!data?.body) return;

      setError(null);

      try {
        const response = await axios.get<BodyDetails>(`${API_URL}/bodies/${data.body}`);
        setBodyDetails(response.data.body[0]);
      } catch (err) {
        setError('Failed to fetch body details');
        console.error(err);
      } finally {
      }
    };

    fetchBodyDetails();
  }, [data]);

  // Memoized data processing
  const processedData = useMemo(() => {
    if (!data?.orbits || data.orbits.length === 0) {
      return {
        minPeriod: null,
        maxPeriod: null,
        minStabilityIndex: null,
        maxStabilityIndex: null,
        minJacobiConstant: null,
        maxJacobiConstant: null,
      };
    }

    const periods = data.orbits.map(orbit => orbit.period);
    const stabilityIndices = data.orbits.map(orbit => orbit.stability_index);
    const jacobiConstants = data.orbits.map(orbit => orbit.jc);

    return {
      minPeriod: Math.min(...periods),
      maxPeriod: Math.max(...periods),
      minStabilityIndex: Math.min(...stabilityIndices),
      maxStabilityIndex: Math.max(...stabilityIndices),
      minJacobiConstant: Math.min(...jacobiConstants),
      maxJacobiConstant: Math.max(...jacobiConstants),
    };
  }, [data?.orbits]);

  // Update editable parameters when processed data changes
  useEffect(() => {
    setEditableParameters({
      minPeriod: processedData.minPeriod,
      maxPeriod: processedData.maxPeriod,
      minStabilityIndex: processedData.minStabilityIndex,
      maxStabilityIndex: processedData.maxStabilityIndex,
      minJacobiConstant: processedData.minJacobiConstant,
      maxJacobiConstant: processedData.maxJacobiConstant,
    });
  }, [processedData]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle parameter changes
  const handleParameterChange = (field: keyof typeof editableParameters, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const updatedParameters = {
      ...editableParameters,
      [field]: numValue,
    };

    setEditableParameters(updatedParameters);

    onParameterChange?.({
      [field]: numValue,
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="orbit parameters tabs" centered>
          <Tab label="Body Parameters" />
          <Tab label="Orbit Limits" />
        </Tabs>
      </Box>

      {/* First Tab - Body Parameters */}
      <TabPanel value={tabValue} index={0}>
        <Container maxWidth="md" sx={{ padding: 2, height: 250, width: "100%", display: 'flex', justifyContent: 'center'}}>
          <Stack spacing={2} sx={{ width: '100%' }}>
            <Stack spacing={2} margin={4} sx={{ width: '100%', height: '100%', justifyContent: 'center'}}>
              <ParameterDisplay
                label="Mass Ratio"
                value={bodyDetails?.mu}
              />
              <ParameterDisplay
                label="Longitude Unit"
                value={bodyDetails?.distance}
              />
              <ParameterDisplay
                label="Period"
                value={bodyDetails?.period}
                unit="days"
              />
            </Stack>
          </Stack>
        </Container>
      </TabPanel>

      {/* Second Tab - Editable Orbit Limits */}
      <TabPanel value={tabValue} index={1}>
        <Container maxWidth="md" sx={{ padding: 2, height: 250, width: "100%", display: 'flex', justifyContent: 'center'}}>
          <Stack spacing={2} sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Period"
                  type="number"
                  value={editableParameters.minPeriod ?? ''}
                  onChange={(e) => handleParameterChange('minPeriod', e.target.value)}
                  InputProps={{
                    inputProps: { step: "0.000001" }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maximum Period"
                  type="number"
                  value={editableParameters.maxPeriod ?? ''}
                  onChange={(e) => handleParameterChange('maxPeriod', e.target.value)}
                  InputProps={{
                    inputProps: { step: "0.000001" }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Stability Index"
                  type="number"
                  value={editableParameters.minStabilityIndex ?? ''}
                  onChange={(e) => handleParameterChange('minStabilityIndex', e.target.value)}
                  InputProps={{
                    inputProps: { step: "0.000001" }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maximum Stability Index"
                  type="number"
                  value={editableParameters.maxStabilityIndex ?? ''}
                  onChange={(e) => handleParameterChange('maxStabilityIndex', e.target.value)}
                  InputProps={{
                    inputProps: { step: "0.000001" }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Jacobi Constant"
                  type="number"
                  value={editableParameters.minJacobiConstant ?? ''}
                  onChange={(e) => handleParameterChange('minJacobiConstant', e.target.value)}
                  InputProps={{
                    inputProps: { step: "0.000001" }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maximum Jacobi Constant"
                  type="number"
                  value={editableParameters.maxJacobiConstant ?? ''}
                  onChange={(e) => handleParameterChange('maxJacobiConstant', e.target.value)}
                  InputProps={{
                    inputProps: { step: "0.000001" }
                  }}
                />
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </TabPanel>
    </Box>
  );
};

// Parameter Display Component
const ParameterDisplay: React.FC<{
  label: string;
  value: number | null | undefined;
  unit?: string;
}> = ({ label, value, unit = '' }) => {
  const formattedValue = value !== null && value !== undefined
    ? value.toFixed(6)
    : 'N/A';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body1">{label}:</Typography>
      <Typography variant="body1" color="text.secondary">
        {formattedValue} {unit}
      </Typography>
    </Box>
  );
};

// Tab Panel Component
function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`orbit-tabpanel-${index}`}
      aria-labelledby={`orbit-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default ParametersTab;