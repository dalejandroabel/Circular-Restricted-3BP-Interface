import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  styled,
} from '@mui/material';
import axios from 'axios';
import { useAppContext } from './contexts';
import { API_URL } from '../../config';
import { CorrectorTableData, CorrectorTableProps, UnitType } from './types';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 200,
  '& .MuiTableCell-head': {
    backgroundColor: '#1976d2',
    color: 'white',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    padding: theme.spacing(1.5),
    border: '1px solid #ccc',
  },
  '& .MuiTableCell-body': {
    padding: theme.spacing(1.5),
  },
  width: '100%',
}));

const StyledTableCell = styled(TableCell)(() => ({
  fontSize: '0.875rem',
}));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatValue = (value: number, precision: number = 6): string => {
  if (value === 0) return '0';
  if (Math.abs(value) < 1 / 10 ** precision) {
    return value.toExponential(precision);
  }
  return value.toFixed(precision);
};

const formatExponential = (value: number, precision: number = 3): string => {
  if (value === 0) return '0';
  return value.toExponential(precision);
};

// ============================================================================
// CORRECTOR TABLE COMPONENT
// ============================================================================

interface CorrectorTableDisplayProps {
  data: CorrectorTableData[] | null;
  status: string;
}

const CorrectorTable: React.FC<CorrectorTableDisplayProps> = ({ data, status }) => {
  // ============================================================================
  // CONTEXT & STATE
  // ============================================================================
  const { body } = useAppContext();
  const [units_switch, setUnitsSwitch] = useState(true);
  const [current_unit, setCurrentUnit] = useState('canonical');

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================
  const { body_distance, unit_period } = useMemo(() => {
    if (!body) return { body_distance: 0, unit_period: 0 };

    const body_distance = body.distance_km ;
    const body_mass = body.mass_kg;
    const mu = body.mu;
    const unit_mass = body_mass / mu;
    const G = 6.6743e-11;
    const unit_period = Math.sqrt((body_distance *1e3) ** 3 / (G * unit_mass));

    return { body_distance, unit_period };
  }, [body]);

  // ============================================================================
  // UNIT CONVERSION FUNCTIONS
  // ============================================================================
  const getUnitLabel = useCallback(
    (type: UnitType) => {
      if (!units_switch) {
        if (type === 'length') return '[km]';
        if (type === 'velocity') return '[km/s]';
        if (type === 'time') return '[days]';
      }
      if (type === 'length') return '[L.U]';
      if (type === 'velocity') return '[L.U/T.U]';
      if (type === 'time') return '[T.U]';
      return '';
    },
    [units_switch]
  );

  const convertValue = useCallback(
    (value: number, type: UnitType) => {
      if (!units_switch) {
        if (type === 'length') return value * body_distance;
        if (type === 'velocity') return value * (body_distance / unit_period);
        if (type === 'time') return value * (unit_period / 86400);
        if (current_unit !== 'physical') {
          setCurrentUnit('physical');
        }
      } else {
        if (current_unit !== 'canonical') {
          if (type === 'length') return value / body_distance;
          if (type === 'velocity') return value / (body_distance / unit_period);
          if (type === 'time') return value / (unit_period / 86400);
          setCurrentUnit('canonical');
        }
      }
      return value;
    },
    [units_switch, body_distance, unit_period, current_unit]
  );

  // ============================================================================
  // DOWNLOAD HANDLER
  // ============================================================================
  const handleDownload = useCallback(() => {
    if (!data || data.length === 0) return;

    const finalConditions = data[data.length - 1];
    const blob = new Blob([JSON.stringify(finalConditions, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'final_conditions.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // ============================================================================
  // RENDER - Empty State
  // ============================================================================
  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          fontSize: '1.25rem',
          fontWeight: 'bold',
          padding: 0,
          textAlign: 'center',
          width: '100%',
          height: 300,
          alignItems: 'center',
          justifyContent: 'center',
          border: 1,
          borderColor: '#ccc',
          borderRadius: 5,
        }}
      >
        No data available to correct, plot an orbit and click Close Orbit to correct
      </Box>
    );
  }

  // ============================================================================
  // RENDER - Main
  // ============================================================================
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: 1,
        borderColor: '#ccc',
        borderRadius: 2
      }}
    >
      <Typography
        sx={{
          fontSize: 20,
          fontWeight: 'bold',
          backgroundColor: '#1976d2',
          width: '100%',
          color: 'white',
          textAlign: 'center',
          borderBottomColor: 'white',
          borderBottomWidth: 1,
          borderRadius: 1
        }}
      >
        Correction Process
      </Typography>

      <StyledTableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <StyledTableCell>Iteration</StyledTableCell>
              <StyledTableCell>x {getUnitLabel('length')}</StyledTableCell>
              <StyledTableCell>vy {getUnitLabel('velocity')}</StyledTableCell>
              <StyledTableCell>vz {getUnitLabel('velocity')}</StyledTableCell>
              <StyledTableCell>Period {getUnitLabel('time')}</StyledTableCell>
              <StyledTableCell>δx {getUnitLabel('length')}</StyledTableCell>
              <StyledTableCell>δvy {getUnitLabel('velocity')}</StyledTableCell>
              <StyledTableCell>δvz {getUnitLabel('velocity')}</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.iteration}>
                <StyledTableCell>{row.iteration}</StyledTableCell>
                <StyledTableCell>
                  {formatValue(convertValue(row.x, 'length'))}
                </StyledTableCell>
                <StyledTableCell>
                  {formatValue(convertValue(row.vy, 'velocity'))}
                </StyledTableCell>
                <StyledTableCell>
                  {formatValue(convertValue(row.vz, 'velocity'))}
                </StyledTableCell>
                <StyledTableCell>
                  {formatValue(convertValue(row.period, 'time'))}
                </StyledTableCell>
                <StyledTableCell>
                  {formatExponential(convertValue(row.deltaX, 'length'))}
                </StyledTableCell>
                <StyledTableCell>
                  {formatExponential(convertValue(row.deltaVy, 'velocity'))}
                </StyledTableCell>
                <StyledTableCell>
                  {formatExponential(convertValue(row.deltaVz, 'velocity'))}
                </StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>

      <Box display="flex" justifyContent="center" marginTop={2}>
        <Box sx={{ margin: 2, fontSize: '1rem', fontWeight: 'bold' }}>{status}</Box>

        <button
          onClick={handleDownload}
          style={{
            backgroundColor: '#1976d2',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Download Final Conditions
        </button>

        <Box>
          <Box sx={{ alignItems: 'center', marginLeft: 4, justifyContent: 'center' }}>
            <Box sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
              {units_switch ? 'Canonical' : 'Physical'}
            </Box>
            <Switch
              checked={units_switch}
              onChange={() => setUnitsSwitch(!units_switch)}
              color="primary"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};


const CorrectorDataDisplay: React.FC<CorrectorTableProps> = ({
  correctordata,
  setPlotData,
  setPlotDataIc,
}) => {


  const { body } = useAppContext();
  const [tabledata, setTableData] = useState<CorrectorTableData[]>([]);
  const [status_correction, setStatus] = useState('');

  const lastProcessedICKey = useRef<string | null>(null);


  const correctedPlotData = useCallback(
    async (lastData: CorrectorTableData) => {
      if (!body) return null;

      try {
        const mu = body.mu;
        const orbitResponse = await axios.post(`${API_URL}/orbits/propagate/`, {
          x: lastData.x,
          y: 0,
          z: 0,
          vx: 0,
          vy: lastData.vy,
          vz: lastData.vz,
          period: lastData.period,
          mu,
          method: 'DOP853',
          N: 1000,
          atol: 1e-12,
          rtol: 1e-12,
        });
        return orbitResponse.data.data;
      } catch (error) {
        console.error('Error propagating orbit:', error);
        setStatus('Failed to propagate orbit');
        return null;
      }
    },
    [body]
  );


  const correctionLoop = useCallback(
    async (prevData: CorrectorTableData[], isCancelled: { current: boolean }) => {
      if (isCancelled.current || !body) return;

      const lastData = prevData[prevData.length - 1];

      if (lastData.iteration > 10) {
        setStatus('Corrector did not converge (max iterations reached)');
        return;
      }

      try {
        const response = await axios.post(`${API_URL}/orbits/correct/`, {
          x: lastData.x,
          y: 0,
          z: 0,
          vx: 0,
          vy: lastData.vy,
          vz: lastData.vz,
          mu: body.mu,
          period: lastData.period,
        });

        const newCorrectorData = JSON.parse(response.data.data);
        const newData = [
          ...prevData,
          {
            iteration: lastData.iteration + 1,
            x: newCorrectorData.x,
            vy: newCorrectorData.vy,
            vz: newCorrectorData.vz,
            period: newCorrectorData.period,
            deltaX: newCorrectorData.deltax,
            deltaVy: newCorrectorData.deltavy,
            deltaVz: newCorrectorData.deltavz,
          },
        ];

        setTableData(newData);

        const converged =
          newCorrectorData.deltax === 0 &&
          newCorrectorData.deltavy === 0 &&
          newCorrectorData.deltavz === 0 &&
          lastData.iteration > 0;

        if (converged) {
          const orbitData = await correctedPlotData(newData[newData.length - 1]);
          if (!orbitData) return;

          const final_last_data = newData[newData.length - 1];

          setStatus('Corrector converged successfully!');
          setPlotData([JSON.parse(orbitData)]);
          setPlotDataIc({
            x: final_last_data.x,
            y: 0,
            z: 0,
            vx: 0,
            vy: final_last_data.vy,
            vz: final_last_data.vz,
            period: final_last_data.period,
            mu: body.mu,
          });
          return;
        }

        await correctionLoop(newData, isCancelled);
      } catch (error) {
        console.error('Error during correction:', error);
        setStatus('Error during correction');
      }
    },
    [body, correctedPlotData, setPlotData, setPlotDataIc]
  );


  useEffect(() => {
    if (!correctordata || !body || correctordata.iteration !== 0) return;

    const currentICKey = `${correctordata.x.toFixed(12)}|${correctordata.vy.toFixed(12)}|${correctordata.vz.toFixed(12)}|${correctordata.period.toFixed(12)}`;

    if (lastProcessedICKey.current === currentICKey) {
      return;
    }
    lastProcessedICKey.current = currentICKey;
    const isCancelled = { current: false };
    setStatus('Correcting orbit...');
    setTableData([correctordata]);

    correctionLoop([correctordata], isCancelled);

    return () => {
      isCancelled.current = true;
    };
  }, [correctordata, correctionLoop, body]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return <CorrectorTable data={tabledata} status={status_correction} />;
};

export default CorrectorDataDisplay;