import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  styled,
} from '@mui/material';

interface TableData {
  iteration: number;
  x: number;
  vy: number;
  vz: number;
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
  return value.toFixed(precision);
};

const CorrectorTable: React.FC<OrbitTableProps> = ({ 
  data, 
  isCanonical, 
  conversionFactors 
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
    <StyledTableContainer component={Paper}>
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
                {formatValue(convertValue(row.deltaX, 'length'))}
              </StyledTableCell>
              <StyledTableCell>
                {formatValue(convertValue(row.deltaVy, 'velocity'))}
              </StyledTableCell>
              <StyledTableCell>
                {formatValue(convertValue(row.deltaVz, 'velocity'))}
              </StyledTableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </StyledTableContainer>
  );
};

// Example usage with parent component
const CorrectorDataDisplay: React.FC = () => {
  // Sample data
  const sampleData: TableData[] = [
    {
      iteration: 1,
      x: 1.234567,
      vy: 2.345678,
      vz: 3.456789,
      deltaX: 0.000123,
      deltaVy: 0.000234,
      deltaVz: 0.000345,
    },
    // Add more rows as needed
  ];

  // Example conversion factors
  const conversionFactors = {
    length: 384400, // Example: 1 L.U = 384400 km (Earth-Moon system)
    time: 375190,   // Example: 1 T.U = 375190 seconds
  };

  return (
    <CorrectorTable
      data={sampleData}
      isCanonical={true}
      conversionFactors={conversionFactors}
    />
  );
};

export default CorrectorDataDisplay;
