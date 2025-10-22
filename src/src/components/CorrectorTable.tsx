import React, { useContext, useEffect, useState } from 'react';
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
import { API_URL } from '../../config';
import BodyContext from './contexts';
import { CorrectorTableData, CorrectorTableProps } from './types';

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

const StyledTableCell = styled(TableCell)(({ }) => ({
  fontSize: '0.875rem',
}));


const formatValue = (value: number, precision: number = 6): string => {
  if (value === 0) {
    return '0';
  }
  if (Math.abs(value) < 1 / (10 ** precision)) {
    return value.toExponential(precision);
  }
  return value.toFixed(precision);
};

const formatExponential = (value: number, precision: number = 3): string => {
  if (value === 0) {
    return '0';
  }
  const formattedValue = value.toExponential(precision);
  return formattedValue;
}
const CorrectorTable: React.FC<CorrectorTableProps> = ({
  data,
  status
}) => {

  const [units_switch, setUnitsSwitch] = useState(true);
  const [current_unit, setCurrentUnit] = useState('canonical');

  const body = useContext<any>(BodyContext);
  const body_distance = body?.distance;
  const body_mass = body?.mass;
  const mu = body?.mu;
  const unit_mass = body_mass / mu;
  const G = 6.67430e-11;
  const unit_period = Math.sqrt(body_distance ** 3 / (G * unit_mass));


  const getUnitLabel = (type: 'length' | 'velocity' | 'time') => {
    if (!units_switch) {
      // Physical units
      if (type === 'length') return '[km]';
      if (type === 'velocity') return '[km/s]';
      if (type === 'time') return '[days]';
    }
    // Canonical units

    if (type === 'length') return '[L.U]';
    if (type === 'velocity') return '[L.U/T.U]';
    if (type === 'time') return '[T.U]';

    return '';
  };


  const convertValue = (value: number, type: 'length' | 'velocity' | 'time') => {
    if (!units_switch) {
      // Physical units
      if (type === 'length') return value * body_distance;
      if (type === 'velocity') return value * (body_distance / unit_period);
      if (type === 'time') return value * (unit_period / 86400);
      setCurrentUnit('physical');
    } else {
      if (current_unit !== 'canonical') {
      // Canonical units
      if (type === 'length') return value / body_distance;
      if (type === 'velocity') return value / (body_distance / unit_period);
      if (type === 'time') return value / (unit_period / 86400);
      setCurrentUnit('canonical');
      }
      else {
        return value;
      }
    }
    return value;
  };

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          fontSize: '1.25rem',
          fontWeight: 'bold',
          padding: 0,
          textAlign: 'center',
          width: "100%",
          height: 300,
          alignItems: "center",
          justifyContent: "center",
          border: 1,
          borderColor: '#ccc',
          borderRadius: 5
        }}
      >
        No data available to correct, plot an orbit and click Close Orbit to correct
      </Box>
    )
  }

  return (
    <Box sx={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',

    }}>
      <Typography sx={{
        fontSize: 20, fontWeight: "bold", backgroundColor: "#1976d2",
        width: "100%", color: "white", textAlign: "center", borderBottomColor: "white", borderBottomWidth: 1
      }}>Correction Process</Typography>
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
        <Box sx={{ margin: 2, fontSize: '1rem', fontWeight: 'bold' }}>
          {status}
        </Box>

        <button
          onClick={() => {
            if (data.length > 0) {
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
            }
          }}
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



// Example usage with parent component
const CorrectorDataDisplay: React.FC<CorrectorTableProps> = ({
  correctordata,
  setPlotData,
  setPlotDataIc,
}) => {
  // Sample data
  const [tabledata, setTableData] = useState<CorrectorTableData[]>([]);
  const body = useContext<any>(BodyContext);
  const [status_correction, setStatus] = useState('');

  useEffect(() => {
    if (!correctordata) return;

    let isCancelled = false; // safety flag in case component unmounts
    setStatus('Correcting orbit...');
    setTableData([correctordata]);

    const correctedPlotData = async (lastData: CorrectorTableData) => {
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
          centered: false,
          method: 'DOP853',
          N: 1000,
          atol: 1e-12,
          rtol: 1e-12,
        });
        return orbitResponse.data.data;
      } catch (error) {
        console.error('Error propagating orbit:', error);
        setStatus('Failed to propagate orbit');
      }
    };

    const correctionLoop = async (prevData: CorrectorTableData[]) => {
      if (isCancelled) return;
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
          centered: false,
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

        // Update table state incrementally
        setTableData(newData);

        // Convergence condition
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
            centered: false,
          });
          return;
        }

        // Continue iteration
        await correctionLoop(newData);
      } catch (error) {
        console.error('Error during correction:', error);
        setStatus('Error during correction');
      }
    };

    correctionLoop([correctordata]);

    return () => {
      isCancelled = true;
    };
  }, [correctordata]);

  return (
    <CorrectorTable
      data={tabledata}
      correctordata={undefined}
      setPlotData={setPlotData}
      setPlotDataIc={setPlotDataIc}
      status={status_correction} />
  );
};

export default CorrectorDataDisplay;
