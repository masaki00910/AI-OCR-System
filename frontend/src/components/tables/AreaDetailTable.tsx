import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { EditableTable } from './EditableTable';
import { Typography, Box } from '@mui/material';

export interface AreaDetailRow {
  id?: string;
  detail_name: string;
  calculation_formula: string;
  area_m2: number;
  memo?: string;
}

interface AreaDetailTableProps {
  data: AreaDetailRow[];
  onDataChange: (data: AreaDetailRow[]) => void;
}

export function AreaDetailTable({ data, onDataChange }: AreaDetailTableProps) {
  const columns: ColumnDef<AreaDetailRow>[] = [
    {
      accessorKey: 'detail_name',
      header: '明細名',
      size: 150,
    },
    {
      accessorKey: 'calculation_formula',
      header: '計算式',
      size: 200,
    },
    {
      accessorKey: 'area_m2',
      header: '面積 (㎡)',
      size: 120,
    },
    {
      accessorKey: 'memo',
      header: '備考',
      size: 150,
    },
  ];

  const getEmptyRow = (): AreaDetailRow => ({
    id: `new-${Date.now()}`,
    detail_name: '',
    calculation_formula: '',
    area_m2: 0,
    memo: '',
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        求積明細
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