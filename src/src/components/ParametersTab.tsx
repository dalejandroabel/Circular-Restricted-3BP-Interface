import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Grid,
} from '@mui/material';
import { useAppContext } from './contexts';
import { API_URL } from '../../config';
import { OrbitParametersProps, BodyDetails, OrbitLimits } from './types';

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
  const formattedValue =
    value !== null && value !== undefined
      ? Math.abs(value) < 1e-3
        ? value.toExponential(4)
        : value.toFixed(4)
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

// ============================================================================
// UTILITY FUNCTION
// ============================================================================

const calculateTimeUnit = (bodyDetails: BodyDetails): number => {
  const body_mass = bodyDetails.mass;
  const body_distance = bodyDetails.distance;
  const unit_mass = body_mass / bodyDetails.mu;
  const G = 6.6743e-11;
  const unit_period = Math.sqrt(body_distance ** 3 / (G * unit_mass));
  return unit_period / 86400;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ParametersTab: React.FC<OrbitParametersProps> = ({ data, onParameterChange }) => {
  // ============================================================================
  // CONTEXT
  // ============================================================================
  const { body } = useAppContext();

  // ============================================================================
  // STATE
  // ============================================================================
  const [bodyDetails, setBodyDetails] = useState<BodyDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [editableParameters, setEditableParameters] = useState<OrbitLimits>({
    minPeriod: null,
    maxPeriod: null,
    minStabilityIndex: null,
    maxStabilityIndex: null,
    minJacobiConstant: null,
    maxJacobiConstant: null,
  });

  // ============================================================================
  // EFFECT - Fetch Body Details
  // ============================================================================
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

  // ============================================================================
  // PROCESSED DATA
  // ============================================================================
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

    const periods = data.orbits.map((orbit) => orbit.period);
    const stabilityIndices = data.orbits.map((orbit) => orbit.stability_index);
    const jacobiConstants = data.orbits.map((orbit) => orbit.jc);

    return {
      minPeriod: Math.min(...periods),
      maxPeriod: Math.max(...periods),
      minStabilityIndex: Math.min(...stabilityIndices),
      maxStabilityIndex: Math.max(...stabilityIndices),
      minJacobiConstant: Math.min(...jacobiConstants),
      maxJacobiConstant: Math.max(...jacobiConstants),
    };
  }, [data?.orbits]);


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

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const handleParameterChange = useCallback(
    (field: keyof OrbitLimits, value: string) => {
      const numValue = value === '' ? null : parseFloat(value);
      const updatedParameters = {
        ...editableParameters,
        [field]: numValue,
      };

      setEditableParameters(updatedParameters);
      onParameterChange?.({ [field]: numValue });
    },
    [editableParameters, onParameterChange]
  );

  // ============================================================================
  // RENDER - Error State
  // ============================================================================
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Use body from context if bodyDetails not loaded yet
  const displayBody = bodyDetails || body;

  // ============================================================================
  // RENDER - Main
  // ============================================================================
  return (
    <Box sx={{ width: '100%', height: 300, mt: 4, border: 1, borderColor: '#ccc', borderRadius: 5, p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="orbit parameters tabs" centered>
          <Tab label="Body Parameters" />
          <Tab label="Orbit Limits" />
        </Tabs>
      </Box>

      {/* Body Parameters Tab */}
      <TabPanel value={tabValue} index={0}>
        <Container maxWidth="md" sx={{ padding: 0, height: 250, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Stack spacing={0} sx={{ width: '100%', height: '100%', justifyContent: 'center' }}>
            <ParameterDisplay label="Mass Ratio" value={displayBody?.mu} />
            <ParameterDisplay label="Longitude Unit (km)" value={displayBody?.distance} />
            <ParameterDisplay label="Period (days)" value={displayBody?.period} />
            <ParameterDisplay label="Time Unit (days)" value={displayBody ? calculateTimeUnit(displayBody) : null} />
          </Stack>
        </Container>
      </TabPanel>

      {/* Orbit Limits Tab */}
      <TabPanel value={tabValue} index={1}>
        <Container maxWidth="md" sx={{ padding: 0, height: 250, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Stack spacing={2} sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Min Period"
                  type="number"
                  value={editableParameters.minPeriod ?? ''}
                  onChange={(e) => handleParameterChange('minPeriod', e.target.value)}
                  InputProps={{
                    inputProps: { step: '0.000001' },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Period"
                  type="number"
                  value={editableParameters.maxPeriod ?? ''}
                  onChange={(e) => handleParameterChange('maxPeriod', e.target.value)}
                  InputProps={{
                    inputProps: { step: '0.000001' },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Min Stability Index"
                  type="number"
                  value={editableParameters.minStabilityIndex ?? ''}
                  onChange={(e) => handleParameterChange('minStabilityIndex', e.target.value)}
                  InputProps={{
                    inputProps: { step: '0.000001' },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Stability Index"
                  type="number"
                  value={editableParameters.maxStabilityIndex ?? ''}
                  onChange={(e) => handleParameterChange('maxStabilityIndex', e.target.value)}
                  InputProps={{
                    inputProps: { step: '0.000001' },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Min Jacobi Constant"
                  type="number"
                  value={editableParameters.minJacobiConstant ?? ''}
                  onChange={(e) => handleParameterChange('minJacobiConstant', e.target.value)}
                  InputProps={{
                    inputProps: { step: '0.000001' },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Jacobi Constant"
                  type="number"
                  value={editableParameters.maxJacobiConstant ?? ''}
                  onChange={(e) => handleParameterChange('maxJacobiConstant', e.target.value)}
                  InputProps={{
                    inputProps: { step: '0.000001' },
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

export default ParametersTab;