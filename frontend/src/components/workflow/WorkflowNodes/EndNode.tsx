import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography } from '@mui/material';
import { Stop } from '@mui/icons-material';
import { WorkflowGraphNode } from '../../../types/workflow-builder.types';

const EndNode: React.FC<NodeProps<WorkflowGraphNode['data']>> = ({ data, selected }) => {
  return (
    <Box
      sx={{
        padding: '12px',
        borderRadius: '8px',
        border: selected ? '3px solid #f44336' : '2px solid #f44336',
        backgroundColor: '#ffebee',
        boxShadow: selected ? '0 4px 12px rgba(244, 67, 54, 0.4)' : '0 2px 6px rgba(244, 67, 54, 0.2)',
        width: '80px',
        height: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#ffcdd2',
          transform: 'scale(1.05)',
        },
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#f44336',
          width: '10px',
          height: '10px',
          border: '2px solid white',
        }}
      />

      <Stop
        sx={{
          color: '#f44336',
          fontSize: '20px',
          mb: 0.5,
        }}
      />
      
      <Typography
        variant="caption"
        sx={{
          fontWeight: 'bold',
          color: '#c62828',
          fontSize: '0.7rem',
          textAlign: 'center',
        }}
      >
        END
      </Typography>
    </Box>
  );
};

export default EndNode;