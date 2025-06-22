/**
 * seq番号の連続性に基づいてデータをグループ化する
 */
export function groupBySequence<T extends { seq: number }>(data: T[]): T[][] {
  if (data.length === 0) return [];

  // seq番号でソート
  const sorted = [...data].sort((a, b) => a.seq - b.seq);
  const groups: T[][] = [];
  let currentGroup: T[] = [];
  let expectedNextSeq = sorted[0].seq;

  for (const item of sorted) {
    if (item.seq === expectedNextSeq || currentGroup.length === 0) {
      // 連続している、または最初のアイテム
      currentGroup.push(item);
      expectedNextSeq = item.seq + 1;
    } else {
      // 連続が途切れた
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [item];
      expectedNextSeq = item.seq + 1;
    }
  }

  // 最後のグループを追加
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * 重複するseq番号を持つデータをグループ化する
 * 例：[1,1,2,2,3,3] -> [[1,2,3], [1,2,3]]
 */
export function groupByDuplicateSequence<T extends { seq: number }>(data: T[]): T[][] {
  if (data.length === 0) return [];

  // seq番号でグループ化
  const seqGroups = new Map<number, T[]>();
  for (const item of data) {
    if (!seqGroups.has(item.seq)) {
      seqGroups.set(item.seq, []);
    }
    seqGroups.get(item.seq)!.push(item);
  }

  // 各seq番号のアイテム数の最大値を取得
  const maxCount = Math.max(...Array.from(seqGroups.values()).map(items => items.length));
  
  // グループを作成
  const groups: T[][] = [];
  for (let i = 0; i < maxCount; i++) {
    const group: T[] = [];
    const sortedSeqs = Array.from(seqGroups.keys()).sort((a, b) => a - b);
    
    for (const seq of sortedSeqs) {
      const items = seqGroups.get(seq)!;
      if (i < items.length) {
        group.push(items[i]);
      }
    }
    
    if (group.length > 0) {
      groups.push(group);
    }
  }

  return groups;
}