import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, Chip } from '@mui/material';
import { WorkflowGraphNode } from '../../../types/workflow-builder.types';

const StateNode: React.FC<NodeProps<WorkflowGraphNode['data']>> = ({ data, selected }) => {
  return (
    <Box
      sx={{
        padding: '10px',
        borderRadius: '8px',
        border: selected ? '2px solid #1976d2' : '1px solid #ddd',
        backgroundColor: 'white',
        boxShadow: selected ? '0 4px 12px rgba(25, 118, 210, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
        minWidth: '120px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        },
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#1976d2',
          width: '8px',
          height: '8px',
        }}
      />
      
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 'bold',
          color: '#333',
          mb: 0.5,
        }}
      >
        {data.label}
      </Typography>
      
      {data.description && (
        <Typography
          variant="caption"
          sx={{
            color: '#666',
            fontSize: '0.7rem',
            display: 'block',
            mb: 0.5,
          }}
        >
          {data.description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {data.isInitial && (
          <Chip
            label="開始"
            size="small"
            color="success"
            sx={{ fontSize: '0.6rem', height: '16px' }}
          />
        )}
        {data.isFinal && (
          <Chip
            label="終了"
            size="small"
            color="error"
            sx={{ fontSize: '0.6rem', height: '16px' }}
          />
        )}
        {data.slaHours && (
          <Chip
            label={`${data.slaHours}h`}
            size="small"
            color="info"
            sx={{ fontSize: '0.6rem', height: '16px' }}
          />
        )}
      </Box>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#1976d2',
          width: '8px',
          height: '8px',
        }}
      />
    </Box>
  );
};

export default StateNode;