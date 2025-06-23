import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import { WorkflowGraphNode, WorkflowGraphEdge } from '../../types/workflow-builder.types';
import StateNode from './WorkflowNodes/StateNode';
import StartNode from './WorkflowNodes/StartNode';
import EndNode from './WorkflowNodes/EndNode';
import EdgePropertiesDialog from './EdgePropertiesDialog';

const nodeTypes = {
  state: StateNode,
  start: StartNode,
  end: EndNode,
};

interface WorkflowCanvasProps {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
  onNodesChange: (nodes: WorkflowGraphNode[]) => void;
  onEdgesChange: (edges: WorkflowGraphEdge[]) => void;
  onNodeSelect: (node: WorkflowGraphNode | null) => void;
  onEdgeSelect: (edge: WorkflowGraphEdge | null) => void;
  isEditMode: boolean;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes: workflowNodes,
  edges: workflowEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onEdgeSelect,
  isEditMode,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);
  const [edgeDialogOpen, setEdgeDialogOpen] = React.useState(false);
  const [selectedEdgeForDialog, setSelectedEdgeForDialog] = React.useState<WorkflowGraphEdge | null>(null);

  // Convert workflow nodes/edges to ReactFlow format
  const [nodes, setNodes, onNodesChangeFlow] = useNodesState(
    workflowNodes.map(node => ({
      ...node,
      draggable: isEditMode,
      selectable: true,
    }))
  );

  const [edges, setEdges, onEdgesChangeFlow] = useEdgesState(
    workflowEdges.map(edge => ({
      ...edge,
      animated: true,
      style: { stroke: '#1976d2' },
    }))
  );

  // Update ReactFlow nodes/edges when workflow data changes
  React.useEffect(() => {
    setNodes(workflowNodes.map(node => ({
      ...node,
      draggable: isEditMode,
      selectable: true,
    })));
  }, [workflowNodes, isEditMode, setNodes]);

  React.useEffect(() => {
    setEdges(workflowEdges.map(edge => ({
      ...edge,
      animated: true,
      style: { stroke: '#1976d2' },
    })));
  }, [workflowEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isEditMode) return;
      
      const newEdge: WorkflowGraphEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        data: {
          actionKey: `action_${Date.now()}`,
          actionLabel: '新しいアクション',
          requiresComment: false,
          autoAdvance: false,
        },
      };

      const updatedEdges = [...workflowEdges, newEdge];
      onEdgesChange(updatedEdges);
    },
    [isEditMode, workflowEdges, onEdgesChange]
  );

  const onNodesClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // console.log('Node clicked:', node);
      // console.log('Available workflow nodes:', workflowNodes);
      const workflowNode = workflowNodes.find((n) => n.id === node.id);
      // console.log('Found workflow node:', workflowNode);
      if (workflowNode) {
        onNodeSelect(workflowNode);
      } else {
        onNodeSelect(null);
      }
    },
    [workflowNodes, onNodeSelect]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const workflowEdge = workflowEdges.find(e => e.id === edge.id);
      onEdgeSelect(workflowEdge || null);
      onNodeSelect(null);
      
      // Open edge properties dialog on double-click
      if (event.detail === 2 && workflowEdge) {
        setSelectedEdgeForDialog(workflowEdge);
        setEdgeDialogOpen(true);
      }
    },
    [workflowEdges, onEdgeSelect, onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance || !isEditMode) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowGraphNode = {
        id: `${type}-${Date.now()}`,
        type: type as 'state' | 'start' | 'end',
        position,
        data: {
          stateKey: `state_${Date.now()}`,
          label: type === 'start' ? '開始' : type === 'end' ? '終了' : '新しい状態',
          isInitial: type === 'start',
          isFinal: type === 'end',
          slaHours: 24,
          description: '',
        },
      };

      const updatedNodes = [...workflowNodes, newNode];
      onNodesChange(updatedNodes);
    },
    [reactFlowInstance, isEditMode, workflowNodes, onNodesChange]
  );

  const onNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      if (!isEditMode) return;
      
      const nodeIds = nodesToDelete.map(node => node.id);
      const updatedNodes = workflowNodes.filter(node => !nodeIds.includes(node.id));
      const updatedEdges = workflowEdges.filter(
        edge => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
      );
      
      onNodesChange(updatedNodes);
      onEdgesChange(updatedEdges);
      onNodeSelect(null);
    },
    [isEditMode, workflowNodes, workflowEdges, onNodesChange, onEdgesChange, onNodeSelect]
  );

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      if (!isEditMode) return;
      
      const edgeIds = edgesToDelete.map(edge => edge.id);
      const updatedEdges = workflowEdges.filter(edge => !edgeIds.includes(edge.id));
      
      onEdgesChange(updatedEdges);
      onEdgeSelect(null);
    },
    [isEditMode, workflowEdges, onEdgesChange, onEdgeSelect]
  );

  const handleEdgeDialogSave = useCallback(
    (updatedEdge: WorkflowGraphEdge) => {
      const updatedEdges = workflowEdges.map(edge =>
        edge.id === updatedEdge.id ? updatedEdge : edge
      );
      onEdgesChange(updatedEdges);
      onEdgeSelect(updatedEdge);
    },
    [workflowEdges, onEdgesChange, onEdgeSelect]
  );

  return (
    <Box ref={reactFlowWrapper} sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeFlow}
        onEdgesChange={onEdgesChangeFlow}
        onConnect={onConnect}
        onNodeClick={onNodesClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        deleteKeyCode={isEditMode ? 'Delete' : null}
        multiSelectionKeyCode={isEditMode ? 'Shift' : null}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
      
      <EdgePropertiesDialog
        open={edgeDialogOpen}
        edge={selectedEdgeForDialog}
        onClose={() => {
          setEdgeDialogOpen(false);
          setSelectedEdgeForDialog(null);
        }}
        onSave={handleEdgeDialogSave}
        isEditMode={isEditMode}
      />
    </Box>
  );
};

const WorkflowCanvasWrapper: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvasWrapper;