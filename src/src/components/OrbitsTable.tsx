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
  Paper,
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
} from '@mui/material';

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
}

interface AdvancedTableProps {
  data: OrbitData[] | null | undefined;
  isCanonical: boolean;
  onSelectionChange?: (selectedRows: OrbitData[]) => void;
}

interface RowSelectionState {
  [key: string]: boolean;
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
  return value.toFixed(6);
};

// Main Table Component
const AdvancedTable: React.FC<AdvancedTableProps> = React.memo(({
  data,
  isCanonical,
  onSelectionChange,
}) => {
  // Ensure data is always an array
  const safeData = useMemo(() => data || [], [data]);

  // State Hooks
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });

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

  return (
    <Box sx={{ width: '100%' }}>
      <StyledTableContainer component={Paper}>
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
                          content: `"${
                            header.column.getIsSorted() === 'desc' ? ' ▼' : ' ▲'
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
  );
});

// Wrapper Component
const OrbitDataDisplay: React.FC<AdvancedTableProps> = ({ 
  data, 
  isCanonical, 
  onSelectionChange 
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
      data={data? data.orbits : []}
      isCanonical={isCanonical}
      onSelectionChange={handleSelectionChange}
    />
  );
};

export default OrbitDataDisplay;