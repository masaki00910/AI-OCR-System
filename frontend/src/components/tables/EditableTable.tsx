import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  Row,
} from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Button,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface EditableTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onDataChange: (data: T[]) => void;
  getEmptyRow: () => T;
}

export function EditableTable<T extends { id?: string | number }>({
  data,
  columns,
  onDataChange,
  getEmptyRow,
}: EditableTableProps<T>) {
  const [tableData, setTableData] = useState<T[]>(data);
  const { control, setValue, getValues } = useForm();

  useEffect(() => {
    setTableData(data);
  }, [data]);

  const handleCellChange = (rowIndex: number, columnId: string, value: any) => {
    const newData = [...tableData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [columnId]: value,
    };
    setTableData(newData);
    onDataChange(newData);
  };

  const handleAddRow = () => {
    const newRow = getEmptyRow();
    const newData = [...tableData, newRow];
    setTableData(newData);
    onDataChange(newData);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = tableData.filter((_, index) => index !== rowIndex);
    setTableData(newData);
    onDataChange(newData);
  };

  const editableColumns: ColumnDef<T>[] = [
    ...columns.map((col) => ({
      ...col,
      cell: ({ row, column }: any) => {
        const columnId = column.id;
        const rowIndex = row.index;
        const value = row.original[columnId];
        
        return (
          <Controller
            name={`${rowIndex}-${columnId}`}
            control={control}
            defaultValue={value}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                variant="outlined"
                fullWidth
                onChange={(e) => {
                  field.onChange(e);
                  handleCellChange(rowIndex, columnId, e.target.value);
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.23)',
                    },
                  },
                }}
              />
            )}
          />
        );
      },
    })),
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: any) => (
        <IconButton
          size="small"
          onClick={() => handleDeleteRow(row.index)}
          color="error"
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  const table = useReactTable({
    data: tableData,
    columns: editableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {table.getHeaderGroups()[0].headers.map((header) => (
                <TableCell key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          size="small"
        >
          行を追加
        </Button>
      </Box>
    </Box>
  );
}