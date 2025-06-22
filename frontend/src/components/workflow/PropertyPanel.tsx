import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Chip,
  InputAdornment,
} from '@mui/material';
import { WorkflowGraphNode, WorkflowGraphEdge } from '../../types/workflow-builder.types';

interface PropertyPanelProps {
  selectedNode: WorkflowGraphNode | null;
  selectedEdge: WorkflowGraphEdge | null;
  onNodeUpdate: (node: WorkflowGraphNode) => void;
  onEdgeUpdate: (edge: WorkflowGraphEdge) => void;
  isEditMode: boolean;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  selectedEdge,
  onNodeUpdate,
  onEdgeUpdate,
  isEditMode,
}) => {
  const [nodeData, setNodeData] = useState<WorkflowGraphNode | null>(null);
  const [edgeData, setEdgeData] = useState<WorkflowGraphEdge | null>(null);

  useEffect(() => {
    console.log('PropertyPanel selectedNode changed:', selectedNode);
    setNodeData(selectedNode ? { ...selectedNode } : null);
  }, [selectedNode]);

  useEffect(() => {
    setEdgeData(selectedEdge ? { ...selectedEdge } : null);
  }, [selectedEdge]);

  const handleNodeChange = (field: string, value: any) => {
    if (!nodeData || !isEditMode) return;

    const updatedNode = {
      ...nodeData,
      data: {
        ...nodeData.data,
        [field]: value,
      },
    };

    setNodeData(updatedNode);
  };

  const handleEdgeChange = (field: string, value: any) => {
    if (!edgeData || !isEditMode) return;

    const updatedEdge = {
      ...edgeData,
      data: {
        ...edgeData.data,
        [field]: value,
      },
    };

    setEdgeData(updatedEdge);
  };

  const saveNodeChanges = () => {
    if (nodeData && isEditMode) {
      onNodeUpdate(nodeData);
    }
  };

  const saveEdgeChanges = () => {
    if (edgeData && isEditMode) {
      onEdgeUpdate(edgeData);
    }
  };

  if (!selectedNode && !selectedEdge) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          プロパティパネル
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ノードまたはエッジを選択してください
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        プロパティパネル
      </Typography>

      {!isEditMode && (
        <Box sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            プレビューモード (読み取り専用)
          </Typography>
        </Box>
      )}

      {nodeData && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Chip
              label={nodeData.type === 'start' ? '開始ノード' : nodeData.type === 'end' ? '終了ノード' : '状態ノード'}
              color={nodeData.type === 'start' ? 'success' : nodeData.type === 'end' ? 'error' : 'primary'}
              size="small"
            />
          </Box>

          <TextField
            label="ラベル"
            value={nodeData.data.label}
            onChange={(e) => handleNodeChange('label', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            disabled={!isEditMode}
          />

          <TextField
            label="状態キー"
            value={nodeData.data.stateKey}
            onChange={(e) => handleNodeChange('stateKey', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            disabled={!isEditMode}
            helperText="システム内部で使用される一意のキー"
          />

          <TextField
            label="説明"
            value={nodeData.data.description || ''}
            onChange={(e) => handleNodeChange('description', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            multiline
            rows={2}
            disabled={!isEditMode}
          />

          {nodeData.type === 'state' && (
            <>
              <TextField
                label="SLA時間"
                type="number"
                value={nodeData.data.slaHours || 24}
                onChange={(e) => handleNodeChange('slaHours', parseInt(e.target.value) || 24)}
                fullWidth
                margin="normal"
                size="small"
                disabled={!isEditMode}
                InputProps={{
                  endAdornment: <InputAdornment position="end">時間</InputAdornment>,
                }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.data.isInitial || false}
                    onChange={(e) => handleNodeChange('isInitial', e.target.checked)}
                    disabled={!isEditMode}
                  />
                }
                label="初期状態"
                sx={{ mt: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={nodeData.data.isFinal || false}
                    onChange={(e) => handleNodeChange('isFinal', e.target.checked)}
                    disabled={!isEditMode}
                  />
                }
                label="最終状態"
                sx={{ mt: 1 }}
              />
            </>
          )}

          {isEditMode && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={saveNodeChanges}
                size="small"
                fullWidth
              >
                変更を保存
              </Button>
            </Box>
          )}
        </Box>
      )}

      {edgeData && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Chip label="遷移エッジ" color="info" size="small" />
          </Box>

          <Divider sx={{ my: 2 }} />

          <TextField
            label="アクションキー"
            value={edgeData.data.actionKey}
            onChange={(e) => handleEdgeChange('actionKey', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            disabled={!isEditMode}
            helperText="システム内部で使用される一意のキー"
          />

          <TextField
            label="アクションラベル"
            value={edgeData.data.actionLabel}
            onChange={(e) => handleEdgeChange('actionLabel', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            disabled={!isEditMode}
          />

          <TextField
            label="条件式"
            value={edgeData.data.conditionExpr || ''}
            onChange={(e) => handleEdgeChange('conditionExpr', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            multiline
            rows={2}
            disabled={!isEditMode}
            helperText="JSONLogic形式の条件式"
          />

          <FormControlLabel
            control={
              <Switch
                checked={edgeData.data.requiresComment || false}
                onChange={(e) => handleEdgeChange('requiresComment', e.target.checked)}
                disabled={!isEditMode}
              />
            }
            label="コメント必須"
            sx={{ mt: 1 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={edgeData.data.autoAdvance || false}
                onChange={(e) => handleEdgeChange('autoAdvance', e.target.checked)}
                disabled={!isEditMode}
              />
            }
            label="自動進行"
            sx={{ mt: 1 }}
          />

          {isEditMode && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={saveEdgeChanges}
                size="small"
                fullWidth
              >
                変更を保存
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PropertyPanel;