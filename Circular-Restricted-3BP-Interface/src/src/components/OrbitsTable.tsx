import React, { useState, useMemo, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';
import { useAppContext } from './contexts';
import { API_URL } from '../../config';
import { AdvancedTableProps, OrbitData, RowSelectionState, FunctionParams } from './types';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatValue = (value: number, precision: number): string => {
  if (value === 0) return '0';
  return value.toFixed(precision);
};

// ============================================================================
// ADVANCED TABLE COMPONENT
// ============================================================================

const AdvancedTable: React.FC<AdvancedTableProps> = React.memo(
  ({ data, onSelectionChange, filters, handlePlotData, handleIcData, columns }) => {

    const { body } = useAppContext();


    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [pagination, setPagination] = useState({
      pageIndex: 0,
      pageSize: 50,
    });
    const [isLoadingOrbits, setIsLoadingOrbits] = useState(false);
    const [method, setMethod] = useState('DOP853');
    const [atol, setAtol] = useState(1e-12);
    const [rtol, setRtol] = useState(1e-12);
    const [Norbits, setNorbits] = useState(1000);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [openColumnsDialog, setOpenColumnsDialog] = useState(false);


    const applyFilters = useCallback(
      (data: OrbitData[], filters: any[]): OrbitData[] => {
        return data.filter((row) => {
          return filters.every((filter) => {
            const columnValue = row[filter.column as keyof OrbitData];
            if (filter.type === 'categorical' && filter.value !== undefined) {
              return String(columnValue) === String(filter.value);
            }
            if (filter.type === 'numerical' && columnValue !== null && columnValue !== undefined) {
              const minValid = filter.min !== null && filter.min !== undefined ? columnValue >= filter.min : true;
              const maxValid = filter.max !== null && filter.max !== undefined ? columnValue <= filter.max : true;
              return minValid && maxValid;
            }
            return true;
          });
        });
      },
      []
    );
    const safeData = useMemo(() => {
      setRowSelection({});
      let orbits = data ? applyFilters(data.orbits, filters || []) : [];
      return orbits;
    }, [data, filters, applyFilters]);


    const getSelectedRows = useCallback(
      (selection: Record<string, boolean>) =>
        safeData.filter((_row, index) => selection[index]),
      [safeData]
    );


    const handleSelectionChange = useCallback(
      (updatedRowSelection: Record<string, boolean>) => {
        setRowSelection(updatedRowSelection);
        const selectedRows = getSelectedRows(updatedRowSelection);
        onSelectionChange?.(selectedRows);
      },
      [getSelectedRows, onSelectionChange]
    );


    const columnHelper = createColumnHelper<OrbitData>();
    const precisionCoords = 8;

    const columnsTable = useMemo(() => {
      if (!columns || columns.length === 0) {
        return [
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
        ];
      }

      const init_col = columnHelper.display({
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
      });
      let cols = columns.map((c: any) => {
        const accesor = columnHelper.accessor(c.c_name, {
          header: c.c_name,
          cell: (info) => {
            const value = info.getValue();
            if (typeof value === 'number') {
              return formatValue(value, precisionCoords);
            }
            return value;
          },
        });
        return accesor;
      }
      );
      cols = cols.filter(col => col.header !== 'body' && col.header !== 'family');
      return [init_col, ...cols];
    }, [columns, columnHelper, precisionCoords]);

    // ============================================================================
    // TABLE INSTANCE
    // ============================================================================
    const table = useReactTable({
      data: safeData,
      columns: columnsTable,
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

    const loadOrbit = useCallback(
      async (params: FunctionParams) => {
        try {
          const { x, y, z, vx, vy, vz, period, mu } = params;
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
      },
      [method, Norbits, atol, rtol]
    );

    const loadAllOrbits = useCallback(
      async (paramsList: FunctionParams[]) => {
        const orbitParamsArray = paramsList.map((params) => ({
          x: params.x,
          y: params.y,
          z: params.z,
          vx: params.vx,
          vy: params.vy,
          vz: params.vz,
          period: params.period,
          mu: params.mu,
        }));

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
                return {
                  error: true,
                  params,
                  message: error instanceof Error ? error.message : 'Unknown error',
                };
              }
            })
          );

          return results.filter((result) => !result.error);
        } catch (error) {
          console.error('Error processing multiple orbits:', error);
          throw error;
        }
      },
      [handleIcData, loadOrbit]
    );

    const plotOrbits = useCallback(async () => {
      if (!body) return;

      setIsLoadingOrbits(true);
      try {
        const selectedRows = getSelectedRows(rowSelection);
        const mu = body.mu;

        const paramsList: FunctionParams[] = selectedRows.map((row) => ({
          x: row.x,
          y: row.y,
          z: row.z,
          vx: row.vx,
          vy: row.vy,
          vz: row.vz,
          period: row.period,
          mu: mu,
        }));

        try {
          const results = await loadAllOrbits(paramsList);
          const plotData = results.map((result, index) => {
            if (result.error) {
              console.error(`Error processing orbit ${index}:`, result.message);
              return null;
            }
            return JSON.parse(result.data);
          });
          handlePlotData?.(plotData);
        } catch (error) {
          console.error('Error loading orbits:', error);
        }
      } catch (error) {
        console.error('Unexpected error in plotOrbits:', error);
      } finally {
        setIsLoadingOrbits(false);
      }
    }, [body, rowSelection, getSelectedRows, loadAllOrbits, handlePlotData]);

    const downloadConditions = useCallback(() => {
      const selectedRows = getSelectedRows(rowSelection);

      if (selectedRows.length === 0) {
        console.warn('No rows selected');
        return;
      }

      const csvContent = [
        'id,x0,y0,z0,vx0,vy0,vz0,period,jc,stability_index',
        ...selectedRows.map(
          (row) =>
            `${row.id},${row.x},${row.y},${row.z},${row.vx},${row.vy},${row.vz},${row.period},${row.jc},${row.stability_index}`
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = 'initial_conditions.csv';
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [rowSelection, getSelectedRows]);


    // ============================================================================
    // RENDER - Empty State
    // ============================================================================
    if (!safeData.length) {
      return (
        <Box sx={{ width: '100%', textAlign: 'center', py: 4, display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ width: '100%' }} variant="h6" color="textSecondary">
            No orbit data available
          </Typography>
        </Box>
      );
    }

    // ============================================================================
    // RENDER - Main
    // ============================================================================
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
                <TextField label="Method" value={method} onChange={(e) => setMethod(e.target.value)} select fullWidth>
                  <MenuItem value="RK45">Runge-Kutta method of order 5(4)</MenuItem>
                  <MenuItem value="DOP853">Runge-Kutta method of order 8</MenuItem>
                  <MenuItem value="LSODA">Adams/BDF method</MenuItem>
                </TextField>

                <TextField
                  label="Number of points"
                  type="number"
                  value={Norbits}
                  onChange={(e) => setNorbits(Number(e.target.value))}
                  fullWidth
                />

                <TextField
                  label="Absolute Tolerance"
                  type="number"
                  value={atol}
                  onChange={(e) => setAtol(Number(e.target.value))}
                  fullWidth
                />

                <TextField
                  label="Relative Tolerance"
                  type="number"
                  value={rtol}
                  onChange={(e) => setRtol(Number(e.target.value))}
                  fullWidth
                />
              </Box>
            </Popover>

            <IconButton
              aria-label="Configuration"
              size="large"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                borderRadius: 2,
                p: 1,
                '& .MuiSvgIcon-root': { fontSize: 30 },
                boxShadow: 0,
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

            <Button variant="contained" color="primary" sx={{ margin: 2 }} onClick={() => setOpenColumnsDialog(true)}>
              Show Columns
                <Dialog open={openColumnsDialog} onClose={() => setOpenColumnsDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Description of Columns</DialogTitle>
                <DialogContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {columns?.map((col) => (
                    <Box key={col.c_name} sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '100px' }}>
                      {col.c_name}:
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {col.description || 'No description available'}
                    </Typography>
                    </Box>
                  ))}
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenColumnsDialog(false)} color="primary" autoFocus>
                  Close
                  </Button>
                </DialogActions>
                </Dialog>
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            width: '95%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            margin: '0 auto',
            border: 1,
            borderColor: '#ccc',
            borderRadius: 2,
          }}
        >
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
                              content: `"${header.column.getIsSorted() === 'desc' ? ' ▼' : ' ▲'}"`,
                            },
                          }),
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                      backgroundColor: row.getIsSelected() ? 'action.selected' : 'inherit',
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
  }
);


const OrbitDataDisplay: React.FC<AdvancedTableProps> = ({ data, onSelectionChange, filters, handlePlotData, handleIcData, columns }) => {
  const handleSelectionChange = useCallback(
    (selectedRows: OrbitData[]) => {
      onSelectionChange?.(selectedRows);
    },
    [onSelectionChange]
  );

  return (
    <AdvancedTable data={data || null} onSelectionChange={handleSelectionChange} handlePlotData={handlePlotData} filters={filters} handleIcData={handleIcData} columns={columns} />
  );
};

export default OrbitDataDisplay;