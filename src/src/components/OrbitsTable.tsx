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
  Popover,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import axios from 'axios';
import SettingsIcon from '@mui/icons-material/Settings';
import { API_URL } from '../../config';
import BodyContext from './contexts';
import { FunctionParams, AdvancedTableProps, OrbitData, RowSelectionState } from './types';
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


const formatValue = (value: number, precission: number): string => {
  if (value === 0.) return "0";
  return value.toFixed(precission);
}

// Main Table Component
const AdvancedTable: React.FC<AdvancedTableProps> = React.memo(({
  data,
  onSelectionChange,
  handlePlotData,
  handleIcData,
}) => {
  // Ensure data is always an array
  const safeData = useMemo(() => data?.orbits || [], [data]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [isLoadingOrbits, setIsLoadingOrbits] = useState(false);
  const body = useContext<any>(BodyContext);
  const [method, setMethod] = useState('DOP853');
  const [atol, setAtol] = useState(1e-12);
  const [rtol, setRtol] = useState(1e-12);
  const [Norbits, setNorbits] = useState(1000);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);


  // Memoized Selected Rows Calculation
  const getSelectedRows = useCallback(
    (selection: Record<string, boolean>) =>
      safeData.filter((_row, index) => selection[index]),
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
  const precission_coords = 8;

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
        header: `x [L.U]`,
        cell: (info) => formatValue(info.getValue(), precission_coords),
      }),
      columnHelper.accessor('y0', {
        header: `y [L.U]`,
        cell: (info) => formatValue(info.getValue(), precission_coords),
      }),
      columnHelper.accessor('z0', {
        header: `z [L.U]`,
        cell: (info) => formatValue(info.getValue(), precission_coords),
      }),
      columnHelper.accessor('vx0', {
        header: `vx [L.U/T.U]`,
        cell: (info) => formatValue(info.getValue(), precission_coords),
      }),
      columnHelper.accessor('vy0', {
        header: `vy [L.U/T.U]`,
        cell: (info) => formatValue(info.getValue(), precission_coords),
      }),
      columnHelper.accessor('vz0', {
        header: `vz [L.U/T.U]`,
        cell: (info) => formatValue(info.getValue(), precission_coords),
      }),
      columnHelper.accessor('period', {
        header: `Period [T.U]`,
        cell: (info) => formatValue(info.getValue(), 4),
      }),
      columnHelper.accessor('stability_index', {
        header: 'Stability Index',
        cell: (info) => formatValue(info.getValue(),2),
      }),
      columnHelper.accessor('jc', {
        header: `Jacobi Constant`,
        cell: (info) => formatValue(info.getValue(),5),
      }),
      columnHelper.accessor('source', {
        header: `database`,
        cell: (info) => info.getValue().toFixed(0),
      })
    ],
    []
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
    onRowSelectionChange: (updaterOrValue) => {
      const updatedRowSelection =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(rowSelection)
          : updaterOrValue;
      handleSelectionChange(updatedRowSelection);
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Render loading or empty state
  if (!safeData.length) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', py: 4, display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ width: '100%' }} variant="h6" color="textSecondary">
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
        centered: params.centered,
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
      const response = await axios.post<any>(`${API_URL}/orbits/propagate/`, {
        x: x,
        y: y,
        z: z,
        vx: vx,
        vy: vy,
        vz: vz,
        period: period,
        mu: mu,
        method: method,
        centered: centered,
        N: Norbits,
        atol: atol,
        rtol: rtol,
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
      const mu = body?.mu;

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

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, padding: 1, width: '90%' }}>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
          >
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Method"
                value={method} // Replace `Norbits` with the appropriate state variable if needed
                onChange={(e) => setMethod(e.target.value)} // Ensure the value is parsed as a number
                select
                fullWidth
              >
                <MenuItem value="RK45">Runge-Kutta method of order 5(4) </MenuItem>
                <MenuItem value="DOP853">Runge-Kutta method of order 8 </MenuItem>
                <MenuItem value="LSODA">Adams/BDF method </MenuItem>
              </TextField>

              <TextField
                label="Number of points"
                type="number"
                value={Norbits} // Replace `batch` with the appropriate state variable if needed
                onChange={(e) => setNorbits(Number(e.target.value))} // Ensure the value is parsed as a number
                fullWidth
              />
              <TextField
                label="Absolute Tolerance"
                type="number"
                value={atol} // Replace `batch` with the appropriate state variable if needed
                onChange={(e) => setAtol(Number(e.target.value))} // Ensure the value is parsed as a number
                fullWidth />
              <TextField
                label="Relative Tolerance"
                type="number"
                value={rtol} // Replace `batch` with the appropriate state variable if needed
                onChange={(e) => setRtol(Number(e.target.value))} // Ensure the value is parsed as a number
                fullWidth />

            </Box>
          </Popover>
          <IconButton
            aria-label="Configuración"
            size="large"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              borderRadius: 2,
              p: 1,
              '& .MuiSvgIcon-root': { fontSize: 30 }, // tamaño razonable
              boxShadow: 0
            }}
          >
            <SettingsIcon />
          </IconButton>
          <Button variant="contained" color="primary" sx={{ margin: 2 }} onClick={plotOrbits} disabled={isLoadingOrbits}>
            Plot orbits
          </Button>
          <Button variant="contained" color="primary" sx={{ margin: 2 }} onClick={downloadConditions}>
            Download initial conditions
          </Button>
        </Box>
      </Box>
      <Box sx={{ width: '95 %', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '0 auto',
        border: 1, borderColor: '#ccc', borderRadius: 2
      }}>
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
  onSelectionChange,
  handlePlotData,
  handleIcData,
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
      data={data || null}
      onSelectionChange={handleSelectionChange}
      handlePlotData={handlePlotData}
      handleIcData={handleIcData}
    />
  );
};

export default OrbitDataDisplay;