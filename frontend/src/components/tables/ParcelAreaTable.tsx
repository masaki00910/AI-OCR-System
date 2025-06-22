import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { EditableTable } from './EditableTable';
import { Typography, Box } from '@mui/material';

export interface ParcelAreaRow {
  id?: string;
  parcel_name: string;
  area_m2: number;
  memo?: string;
}

interface ParcelAreaTableProps {
  data: ParcelAreaRow[];
  onDataChange: (data: ParcelAreaRow[]) => void;
}

export function ParcelAreaTable({ data, onDataChange }: ParcelAreaTableProps) {
  const columns: ColumnDef<ParcelAreaRow>[] = [
    {
      accessorKey: 'parcel_name',
      header: '筆名',
      size: 150,
    },
    {
      accessorKey: 'area_m2',
      header: '地積 (㎡)',
      size: 120,
    },
    {
      accessorKey: 'memo',
      header: '備考',
      size: 200,
    },
  ];

  const getEmptyRow = (): ParcelAreaRow => ({
    id: `new-${Date.now()}`,
    parcel_name: '',
    area_m2: 0,
    memo: '',
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        地積一覧
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