/**
 * table_group_idでデータをグループ化する
 * @param data - table_group_idを含むデータ配列
 * @returns グループ化されたデータの配列
 */
export function groupByTableGroupId<T extends { tableGroupId?: number }>(
  data: T[]
): T[][] {
  if (data.length === 0) return [];

  const groups = new Map<number, T[]>();
  
  data.forEach(item => {
    const groupId = item.tableGroupId || 1; // table_group_idがない場合は1とする
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(item);
  });

  // グループIDでソートして返す
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([_, items]) => items);
}