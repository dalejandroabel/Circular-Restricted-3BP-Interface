import React, { useState, useMemo, useCallback, useContext } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TablePagination,
  Typography,
  styled,
  Button,
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../../config';
import BodyContext from './contexts';

// Interfaces
interface OrbitData {
  id: string;
  x0: number;
  y0: number;
  z0: number;
  vx0: number;
  vy0: number;
  vz0: number;
  period: number;
  jc: number;
  stability_index: number;
  source: number;
}

interface AdvancedTableProps {
  data: {
    orbits: OrbitData[];
    body: string;
  }

  isCanonical: boolean;
  onSelectionChange?: (selectedRows: OrbitData[]) => void;
  handlePlotData?: (plotData: any) => void;
  handleIcData?: (icData: any) => void;
}

interface RowSelectionState {
  [key: string]: boolean;
}

interface FunctionParams {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  period: number;
  mu: number;
  centered: boolean;
}

interface BodyDetails {
  body: {
  mu: number;
  distance: number;
  period: number;
  }[];
  }

// Styled Components
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 600,
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

// Utility Functions
const formatValue = (value: number): string => {
  return value.toFixed(8);
};
const formatInt = (value: number): string => {
  return value.toFixed(0);
}

// Main Table Component
const AdvancedTable: React.FC<AdvancedTableProps> = React.memo(({
  data,
  isCanonical,
  onSelectionChange,
  handlePlotData,
  handleIcData,
}) => {
  // Ensure data is always an array
  const safeData = useMemo(() => data.orbits || [], [data]);
  

  // State Hooks
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [isLoadingOrbits, setIsLoadingOrbits] = useState(false);
  const body = useContext(BodyContext);
  

  // Memoized Selected Rows Calculation
  const getSelectedRows = useCallback(
    (selection: Record<string, boolean>) =>
      safeData.filter((row, index) => selection[index]),
    [safeData]
  );

  // Selection Change Handler
  const handleSelectionChange = useCallback(
    (updatedRowSelection: Record<string, boolean>) => {
      setRowSelection(updatedRowSelection);
      const selectedRows = getSelectedRows(updatedRowSelection);
      onSelectionChange?.(selectedRows);
    },
    [getSelectedRows, onSelectionChange]
  );

  // Column Definition
  const columnHelper = createColumnHelper<OrbitData>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      columnHelper.accessor('x0', {
        header: `x ${isCanonical ? '[L.U]' : '[km]'}`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('y0', {
        header: `y ${isCanonical ? '[L.U]' : '[km]'}`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('z0', {
        header: `z ${isCanonical ? '[L.U]' : '[km]'}`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('vx0', {
        header: `vx ${isCanonical ? '[L.U/T.U]' : '[km/s]'}`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('vy0', {
        header: `vy ${isCanonical ? '[L.U/T.U]' : '[km/s]'}`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('vz0', {
        header: `vz ${isCanonical ? '[L.U/T.U]' : '[km/s]'}`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('period', {
        header: `Period ${isCanonical ? '[T.U]' : '[s]'}`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('stability_index', {
        header: 'Stability Index',
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('jc', {
        header: `Jacobi Constant`,
        cell: (info) => formatValue(info.getValue()),
      }),
      columnHelper.accessor('source', {
        header: `database`,
        cell: (info) => formatInt(info.getValue()),
      })
    ],
    [isCanonical]
  );

  // Table Instance
  const table = useReactTable({
    data: safeData,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: handleSelectionChange,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Render loading or empty state
  if (!safeData.length) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          No orbit data available
        </Typography>
      </Box>
    );
  }

  const loadAllOrbits = async (paramsList: FunctionParams[]) => {
    const orbitParamsArray = paramsList.map((params) => {
      const orbitParams = {
        x: params.x,
        vy: params.vy,
        vz: params.vz,
        period: params.period,
      };
      return orbitParams;
    });

    handleIcData?.(orbitParamsArray);
    try {
      if (!paramsList || paramsList.length === 0) {
        throw new Error('No parameters provided for orbit processing');
      }

      const results = await Promise.all(
        paramsList.map(async (params) => {
          try {
            return await loadOrbit(params);
          } catch (error) {
            console.error(`Error processing params: ${JSON.stringify(params)}`, error);
            // Return null or a specific error object instead of throwing
            return {
              error: true,
              params,
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );
      // Filter out or handle error results as needed
      return results.filter(result => !result.error);
    } catch (error) {
      console.error('Error processing multiple orbits:', error);
      throw error;
    }
  };


  const loadOrbit = async (params: FunctionParams) => {
    try {
      const { x, y, z, vx, vy, vz, period, mu, centered } = params;
      const response = await axios.post<any>(`${ API_URL }/orbits/propagate/`, {
        x: x,
        y: y,
        z: z,
        vx: vx,
        vy: vy,
        vz: vz,
        period: period,
        mu: mu,
        method: 'RK45',
        centered: centered,
        N: 1000,
        atol: 1e-12,
        rtol: 1e-12
      });

      if (!response.data) {
        throw new Error('No data returned from orbit processing');
      }
      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.response?.data);
      } else {
        console.error('Unexpected error processing orbit:', error);
      }
      throw error;
    }
  };


  const plotOrbits = async () => {
    setIsLoadingOrbits(true);
    try {
    const selectedRows = getSelectedRows(rowSelection);
    const mu = body.mu;
  
    const paramsList: FunctionParams[] = selectedRows.map(row => ({
      x: row.x0,
      y: row.y0,
      z: row.z0,
      vx: row.vx0,
      vy: row.vy0,
      vz: row.vz0,
      period: row.period,
      mu: mu,
      centered: row.source == 2
    }));
    
    try {
      const results = await loadAllOrbits(paramsList);
      const plotData = results.map((result, index) => {
        if (result.error) {
          console.error(`Error processing orbit ${index}:`, result.message);
          return null;
        }
        return JSON.parse(result.data);
      }
      );
      handlePlotData?.(plotData);
      
      
    } catch (error) {
      console.error('Error loading orbits:', error);
    }
  } catch (error) {
    console.error('Unexpected error in plotOrbits:', error);
  }
  finally {
    setIsLoadingOrbits(false);
  }
};

const downloadConditions = () => {
  const selectedRows = getSelectedRows(rowSelection);

  if (selectedRows.length === 0) {
    console.warn('No rows selected');
    return;
  }
  const csvContent = [
    "id,x0,y0,z0,vx0,vy0,vz0,period,jc,stability_index",
    ...selectedRows.map(row => 
      `${row.id},${row.x0},${row.y0},${row.z0},${row.vx0},${row.vy0},${row.vz0},${row.period},${row.jc},${row.stability_index}`
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  
  const filename = `initial_conditions.csv`;
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, padding: 1 }}>
          <Button variant="contained" color="primary" sx={{ margin: 2 }} onClick={plotOrbits} disabled = {isLoadingOrbits}>
            Plot orbits
          </Button>
          <Button variant="contained" color="primary" sx={{ margin: 2 }} onClick = {downloadConditions}>
            Download initial conditions
          </Button>
        </Box>
      </Box>
      <Box sx={{ width: '100%' }}>
        <StyledTableContainer>
          <Table stickyHeader size="small">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      sx={{
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        '&::after': {
                          content: 'none',
                          marginLeft: '4px',
                          display: 'inline-block',
                        },
                        ...(header.column.getIsSorted() && {
                          '&::after': {
                            content: `"${header.column.getIsSorted() === 'desc' ? ' ▼' : ' ▲'
                              }"`,
                          },
                        }),
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    backgroundColor: row.getIsSelected()
                      ? 'action.selected'
                      : 'inherit',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={safeData.length}
          rowsPerPage={pagination.pageSize}
          page={Math.min(pagination.pageIndex, Math.ceil(safeData.length / pagination.pageSize) - 1)}
          onPageChange={(_, newPage) => {
            table.setPageIndex(newPage);
          }}
          onRowsPerPageChange={(event) => {
            const newPageSize = parseInt(event.target.value, 10);
            table.setPageSize(newPageSize);
          }}
        />
      </Box>
    </Box>
  );
});

// Wrapper Component
const OrbitDataDisplay: React.FC<AdvancedTableProps> = ({
  data,
  isCanonical,
  onSelectionChange,
  handlePlotData,
  handleIcData
}) => {

  // Default empty selection handler if not provided
  const handleSelectionChange = useCallback(
    (selectedRows: OrbitData[]) => {
      onSelectionChange?.(selectedRows);
    },
    [onSelectionChange]
  );
  return (
    <AdvancedTable
      data={data || []}
      isCanonical={isCanonical}
      onSelectionChange={handleSelectionChange}
      handlePlotData={handlePlotData}
      handleIcData={handleIcData}
    />
  );
};

export default OrbitDataDisplay;