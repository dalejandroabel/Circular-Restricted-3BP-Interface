import React, { useContext, useEffect, useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  },
  '& .MuiTableCell-body': {
    padding: theme.spacing(1.5),
  },
  width: '80%',
}));

const StyledTableCell = styled(TableCell)(({ }) => ({
  fontSize: '0.875rem',
}));

const formatValue = (value: number, precision: number = 6): string => {
  if (value === 0) {
    return '0';
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
  isCanonical,
  conversionFactors,
  status
}) => {
  const getUnitLabel = (type: 'length' | 'velocity' | 'time') => {
    if (isCanonical) {
      if (type === 'length') return '[L.U]';
      if (type === 'velocity') return '[L.U/T.U]';
      if (type === 'time') return '[T.U]';
    } else {
      if (type === 'length') return '[km]';
      if (type === 'velocity') return '[km/s]';
      if (type === 'time') return '[s]';
    }
    return '';
  };


  const convertValue = (
    value: number,
    type: 'length' | 'velocity' | 'time'
  ): number => {
    if (isCanonical) return value;

    if (type === 'length') {
      return value * conversionFactors.length;
    }
    if (type === 'velocity') {
      return value * conversionFactors.length / conversionFactors.time;
    }
    if (type === 'time') {
      return value * conversionFactors.time;
    }
    return value * (conversionFactors.length / conversionFactors.time);
  };
  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        No data available to correct, plot an orbit and click Close Orbit to correct
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
      </Box>
    </Box>
  );
};



// Example usage with parent component
const CorrectorDataDisplay: React.FC<CorrectorTableProps> = ({

  isCanonical,
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

    setStatus('Correcting orbit...');

    const correctedPlotData = async () => {

      try {
        const mu = body.mu;
        const lastData = tabledata[tabledata.length - 1];
        
        const orbitResponse = await axios.post<any>(`${API_URL}/orbits/propagate/`, {
          x: lastData.x,
          y: 0,
          z: 0,
          vx: 0,
          vy: lastData.vy,
          vz: lastData.vz,
          period: lastData.period,
          mu: mu,
          centered: false,
          method: 'DOP853',
          N: 1000,
          atol: 1e-12,
          rtol: 1e-12,
        });
        const orbitData = orbitResponse.data.data;
        setPlotData([JSON.parse(orbitData)]);
        setPlotDataIc({
          x: lastData.x,
          y: 0,
          z: 0,
          vx: 0,
          vy: lastData.vy,
          vz: lastData.vz,
          period: lastData.period,
          mu: mu,
          centered: false,
        });
      } catch (error) {
        console.error('Error handling parameter click:', error);
      }
    }
    const updateTableData = async (prevData: CorrectorTableData[]) => {
      const lastData = prevData[prevData.length - 1];
      if (lastData.iteration > 10) {
        console.log("Max iterations reached");
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
        const newData = [...prevData, {
          iteration: lastData.iteration + 1,
          x: newCorrectorData.x,
          vy: newCorrectorData.vy,
          vz: newCorrectorData.vz,
          period: newCorrectorData.period,
          deltaX: newCorrectorData.deltax,
          deltaVy: newCorrectorData.deltavy,
          deltaVz: newCorrectorData.deltavz,
        }];
        if (
          newCorrectorData.deltax == 0 &&
          newCorrectorData.deltavy == 0 &&
          newCorrectorData.deltavz == 0 &&
          lastData.iteration > 0

        ) {
          await correctedPlotData();
          setStatus('Corrector converged');
          return;
        }
        setTableData(newData);
        await updateTableData(newData);
      } catch (error) {
        console.error("Error fetching corrector data", error);
      }

    };

    // Start with the initial data
    setTableData([correctordata]);
    updateTableData([correctordata]);

  }, [correctordata]);



  // Example conversion factors
  const defaultConversionFactors = {
    length: 1,
    time: 1,
  };
  var effectiveConversionFactors;
  if (!body){
    effectiveConversionFactors = defaultConversionFactors;
  }
  else {
    effectiveConversionFactors = {
      length: body.distance/1000,
      time: body.period*3600*24,
    };
  }

  return (
    <CorrectorTable
      data={tabledata}
      isCanonical={isCanonical}
      conversionFactors={effectiveConversionFactors}
      correctordata={undefined}
      setPlotData={setPlotData}
      setPlotDataIc={setPlotDataIc} 
      status= {status_correction}/>
  );
};

export default CorrectorDataDisplay;
