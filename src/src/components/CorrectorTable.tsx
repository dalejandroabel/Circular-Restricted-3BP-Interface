import React, { useContext, useEffect, useState } from 'react';
import {
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

interface TableData {
  iteration: number;
  x: number;
  vy: number;
  vz: number;
  period: number;
  deltaX: number;
  deltaVy: number;
  deltaVz: number;
}

interface OrbitTableProps {
  data: TableData[];
  isCanonical: boolean;
  conversionFactors: {
    length: number; // Factor to convert from L.U to km
    time: number;   // Factor to convert from T.U to seconds
  };
  correctordata: any;
  setPlotData: (data: any) => void,
  setPlotDataIc: (data: any) => void
}

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 400,
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
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
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
const CorrectorTable: React.FC<OrbitTableProps> = ({
  data,
  isCanonical,
  conversionFactors,
  correctordata,
}) => {
  const getUnitLabel = (type: 'length' | 'velocity') => {
    if (isCanonical) {
      return type === 'length' ? '[L.U]' : '[L.U/T.U]';
    }
    return type === 'length' ? '[km]' : '[km/s]';
  };

  
  const convertValue = (
    value: number,
    type: 'length' | 'velocity'
  ): number => {
    if (isCanonical) return value;

    if (type === 'length') {
      return value * conversionFactors.length;
    }
    return value * (conversionFactors.length / conversionFactors.time);
  };

  return (
    <StyledTableContainer>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <StyledTableCell>Iteration</StyledTableCell>
            <StyledTableCell>x {getUnitLabel('length')}</StyledTableCell>
            <StyledTableCell>vy {getUnitLabel('velocity')}</StyledTableCell>
            <StyledTableCell>vz {getUnitLabel('velocity')}</StyledTableCell>
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
  );
};



// Example usage with parent component
const CorrectorDataDisplay: React.FC<OrbitTableProps> = ({
  data,
  isCanonical,
  conversionFactors,
  correctordata,
  setPlotData,
  setPlotDataIc,
}) => {
  // Sample data
  const [tabledata, setTableData] = useState<TableData[]>([]);
  const body = useContext(BodyContext);

  useEffect(() => {
    if (!correctordata) return;
  
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
          method: 'RK45',
          N: 1000,
          atol: 1e-12,
          rtol: 1e-12,
        });
        const orbitData = orbitResponse.data.data;
        setPlotData([JSON.parse(orbitData),]);
        setPlotDataIc({
          x: lastData.x,
          y: 0,
          z: 0,
          vx: 0,
          vy: lastData.vy,
          vz: lastData.vz,
          period: lastData.period,
          mu: mu
        });
      } catch (error) {
        console.error('Error handling parameter click:', error);
      }
    }
    const updateTableData = async (prevData: TableData[]) => {
      const lastData = prevData[prevData.length - 1];
      if (
        prevData.length > 9 ||
        (lastData.deltaVy === 0 &&
          lastData.deltaVz === 0 &&
          lastData.deltaX === 0 &&
          lastData.iteration > 0)
      ) {
        console.log("Stopping condition met");
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
        correctedPlotData();
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (
          newCorrectorData.deltax === 0 &&
            newCorrectorData.deltavy === 0 &&
            newCorrectorData.deltavz === 0 

        ){
          console.log("Stopping condition met");
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
    length: 384400, // Example: 1 L.U = 384400 km (Earth-Moon system)
    time: 375190,   // Example: 1 T.U = 375190 seconds
  };

  const effectiveConversionFactors = conversionFactors || defaultConversionFactors;

  return (
    <CorrectorTable
      data={tabledata}
      isCanonical={isCanonical}
      conversionFactors={effectiveConversionFactors}
      correctordata={undefined}
      setPlotData={setPlotData} 
      setPlotDataIc={setPlotDataIc}/>
  );
};

export default CorrectorDataDisplay;
