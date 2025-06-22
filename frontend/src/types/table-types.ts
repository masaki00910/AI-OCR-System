import { TriangleAreaRow } from '../components/tables/TriangleAreaTable';
import { ParcelAreaRow } from '../components/tables/ParcelAreaTable';
import { ParcelPointRow } from '../components/tables/ParcelPointTable';
import { AreaDetailRow } from '../components/tables/AreaDetailTable';

// 表のメタデータを含む構造
export interface TableGroup<T> {
  id: string;
  name: string;
  data: T[];
  createdAt?: Date;
  ocrSourceRect?: { x: number; y: number; width: number; height: number };
}

// 各表タイプのグループ型
export type TriangleAreaTableGroup = TableGroup<TriangleAreaRow>;
export type ParcelAreaTableGroup = TableGroup<ParcelAreaRow>;
export type ParcelPointTableGroup = TableGroup<ParcelPointRow>;
export type AreaDetailTableGroup = TableGroup<AreaDetailRow>;

// 表のタイプ定義
export type TableType = 'triangle_area' | 'parcel_areas' | 'boundary_points' | 'control_points' | 'reference_points' | 'coordinate_area';

// 表タイプと日本語名のマッピング
export const tableTypeNames: Record<TableType, string> = {
  triangle_area: '三角求積表',
  parcel_areas: '地積一覧',
  boundary_points: '境界点座標一覧',
  control_points: '基準点座標一覧',
  reference_points: '引照点座標一覧',
  coordinate_area: '座標面積求積表',
};