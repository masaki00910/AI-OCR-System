import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { EditableTable } from './EditableTable';
import { Typography, Box } from '@mui/material';

export interface ParcelPointRow {
  id?: string;
  point_name: string;
  x_coord: number;
  y_coord: number;
  memo?: string;
}

interface ParcelPointTableProps {
  data: ParcelPointRow[];
  onDataChange: (data: ParcelPointRow[]) => void;
}

export function ParcelPointTable({ data, onDataChange }: ParcelPointTableProps) {
  const columns: ColumnDef<ParcelPointRow>[] = [
    {
      accessorKey: 'point_name',
      header: '点名',
      size: 100,
    },
    {
      accessorKey: 'x_coord',
      header: 'X座標',
      size: 120,
    },
    {
      accessorKey: 'y_coord',
      header: 'Y座標',
      size: 120,
    },
    {
      accessorKey: 'memo',
      header: '備考',
      size: 150,
    },
  ];

  const getEmptyRow = (): ParcelPointRow => ({
    id: `new-${Date.now()}`,
    point_name: '',
    x_coord: 0,
    y_coord: 0,
    memo: '',
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        境界点・基準点・引照点
      </Typography>
      <EditableTable
        data={data}
        columns={columns}
        onDataChange={onDataChange}
        getEmptyRow={getEmptyRow}
      />
    </Box>
  );
}