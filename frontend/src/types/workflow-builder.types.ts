// WorkflowBuilder Types
export interface WorkflowGraphNode {
  id: string;
  type: 'state' | 'start' | 'end';
  position: { x: number; y: number };
  data: {
    stateKey: string;
    label: string;
    isInitial?: boolean;
    isFinal?: boolean;
    slaHours?: number;
    description?: string;
  };
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
  data: {
    actionKey: string;
    actionLabel: string;
    requiresComment: boolean;
    autoAdvance: boolean;
    conditionExpr?: string;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  isActive: boolean;
  graphJson: {
    nodes: WorkflowGraphNode[];
    edges: WorkflowGraphEdge[];
  };
}

export interface WorkflowBuilderState {
  selectedWorkflow: WorkflowDefinition | null;
  isEditMode: boolean;
  selectedNode: WorkflowGraphNode | null;
  selectedEdge: WorkflowGraphEdge | null;
  isDirty: boolean;
}