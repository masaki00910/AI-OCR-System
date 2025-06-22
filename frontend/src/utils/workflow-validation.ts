import { WorkflowGraphNode, WorkflowGraphEdge } from '../types/workflow-builder.types';

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateWorkflow(
  nodes: WorkflowGraphNode[],
  edges: WorkflowGraphEdge[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Basic structure validation
  if (nodes.length === 0) {
    errors.push({
      type: 'error',
      message: 'ワークフローには少なくとも1つのノードが必要です',
    });
  }

  // 2. Check for start nodes
  const startNodes = nodes.filter(node => node.type === 'start' || node.data?.isInitial);
  if (startNodes.length === 0) {
    errors.push({
      type: 'error',
      message: '開始ノードが見つかりません',
    });
  } else if (startNodes.length > 1) {
    warnings.push({
      type: 'warning',
      message: '開始ノードが複数あります',
    });
  }

  // 3. Check for end nodes
  const endNodes = nodes.filter(node => node.type === 'end' || node.data?.isFinal);
  if (endNodes.length === 0) {
    warnings.push({
      type: 'warning',
      message: '終了ノードが見つかりません',
    });
  }

  // 4. Check for isolated nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
      warnings.push({
        type: 'warning',
        message: `ノード "${node.data?.label || node.id}" が他のノードと接続されていません`,
        nodeId: node.id,
      });
    }
  });

  // 5. Check for unreachable nodes
  if (startNodes.length > 0) {
    const reachableNodes = getReachableNodes(startNodes[0].id, edges);
    nodes.forEach(node => {
      if (!reachableNodes.has(node.id) && node.id !== startNodes[0].id) {
        warnings.push({
          type: 'warning',
          message: `ノード "${node.data?.label || node.id}" は開始ノードから到達できません`,
          nodeId: node.id,
        });
      }
    });
  }

  // 6. Check for duplicate state keys
  const stateKeys = new Map<string, string[]>();
  nodes.forEach(node => {
    const key = node.data?.stateKey;
    if (key) {
      if (!stateKeys.has(key)) {
        stateKeys.set(key, []);
      }
      stateKeys.get(key)!.push(node.id);
    }
  });

  stateKeys.forEach((nodeIds, stateKey) => {
    if (nodeIds.length > 1) {
      errors.push({
        type: 'error',
        message: `状態キー "${stateKey}" が重複しています`,
      });
    }
  });

  // 7. Check for duplicate action keys from same node
  const actionKeys = new Map<string, string[]>();
  edges.forEach(edge => {
    const actionKey = edge.data?.actionKey;
    if (actionKey) {
      const key = `${edge.source}:${actionKey}`;
      if (!actionKeys.has(key)) {
        actionKeys.set(key, []);
      }
      actionKeys.get(key)!.push(edge.id);
    }
  });

  actionKeys.forEach((edgeIds, key) => {
    if (edgeIds.length > 1) {
      const [source, actionKey] = key.split(':');
      const sourceNode = nodes.find(n => n.id === source);
      errors.push({
        type: 'error',
        message: `ノード "${sourceNode?.data?.label || source}" からのアクション "${actionKey}" が重複しています`,
      });
    }
  });

  // 8. Check for cycles (optional warning)
  if (hasCycles(nodes, edges)) {
    warnings.push({
      type: 'warning',
      message: 'ワークフローに循環があります（無限ループの可能性）',
    });
  }

  // 9. Validate node properties
  nodes.forEach(node => {
    if (!node.data?.stateKey || node.data.stateKey.trim() === '') {
      errors.push({
        type: 'error',
        message: `ノード "${node.data?.label || node.id}" の状態キーが設定されていません`,
        nodeId: node.id,
      });
    }

    if (!node.data?.label || node.data.label.trim() === '') {
      errors.push({
        type: 'error',
        message: `ノード ID "${node.id}" のラベルが設定されていません`,
        nodeId: node.id,
      });
    }

    if (node.data?.slaHours !== undefined && node.data.slaHours <= 0) {
      warnings.push({
        type: 'warning',
        message: `ノード "${node.data?.label || node.id}" のSLA時間が0以下です`,
        nodeId: node.id,
      });
    }
  });

  // 10. Validate edge properties
  edges.forEach(edge => {
    if (!edge.data?.actionKey || edge.data.actionKey.trim() === '') {
      errors.push({
        type: 'error',
        message: `エッジの アクションキーが設定されていません`,
        edgeId: edge.id,
      });
    }

    if (!edge.data?.actionLabel || edge.data.actionLabel.trim() === '') {
      errors.push({
        type: 'error',
        message: `エッジのアクションラベルが設定されていません`,
        edgeId: edge.id,
      });
    }

    // Validate JSON condition if present
    if (edge.data?.conditionExpr && edge.data.conditionExpr.trim() !== '') {
      try {
        JSON.parse(edge.data.conditionExpr);
      } catch (error) {
        errors.push({
          type: 'error',
          message: `エッジの条件式が無効なJSON形式です`,
          edgeId: edge.id,
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function getReachableNodes(startNodeId: string, edges: WorkflowGraphEdge[]): Set<string> {
  const reachable = new Set<string>();
  const queue = [startNodeId];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (reachable.has(currentId)) continue;
    
    reachable.add(currentId);
    
    // Find all nodes reachable from current node
    edges.forEach(edge => {
      if (edge.source === currentId && !reachable.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }
  
  return reachable;
}

function hasCycles(nodes: WorkflowGraphNode[], edges: WorkflowGraphEdge[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true; // Cycle detected
    }
    
    if (visited.has(nodeId)) {
      return false;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    // Check all outgoing edges
    for (const edge of edges) {
      if (edge.source === nodeId) {
        if (dfs(edge.target)) {
          return true;
        }
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  // Check for cycles starting from each unvisited node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return true;
      }
    }
  }
  
  return false;
}