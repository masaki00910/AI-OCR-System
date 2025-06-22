import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { EditableTable } from './EditableTable';
import { Typography, Box } from '@mui/material';

export interface TriangleAreaRow {
  id?: string;
  seq: number;
  base_m: number | null;
  height_m: number | null;
  area_m2: number | null;
}

interface TriangleAreaTableProps {
  data: TriangleAreaRow[];
  onDataChange: (data: TriangleAreaRow[]) => void;
}

export function TriangleAreaTable({ data, onDataChange }: TriangleAreaTableProps) {
  const columns: ColumnDef<TriangleAreaRow>[] = [
    {
      accessorKey: 'seq',
      header: '順番',
      size: 80,
    },
    {
      accessorKey: 'base_m',
      header: '底辺 (m)',
      size: 120,
    },
    {
      accessorKey: 'height_m',
      header: '高さ (m)',
      size: 120,
    },
    {
      accessorKey: 'area_m2',
      header: '面積 (㎡)',
      size: 120,
    },
  ];

  const getEmptyRow = (): TriangleAreaRow => ({
    id: `new-${Date.now()}`,
    seq: data.length + 1,
    base_m: null,
    height_m: null,
    area_m2: null,
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        三角求積表
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