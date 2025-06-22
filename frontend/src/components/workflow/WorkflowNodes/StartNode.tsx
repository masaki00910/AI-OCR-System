import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography } from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import { WorkflowGraphNode } from '../../../types/workflow-builder.types';

const StartNode: React.FC<NodeProps<WorkflowGraphNode['data']>> = ({ data, selected }) => {
  return (
    <Box
      sx={{
        padding: '12px',
        borderRadius: '50%',
        border: selected ? '3px solid #4caf50' : '2px solid #4caf50',
        backgroundColor: '#e8f5e8',
        boxShadow: selected ? '0 4px 12px rgba(76, 175, 80, 0.4)' : '0 2px 6px rgba(76, 175, 80, 0.2)',
        width: '80px',
        height: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#dcedc8',
          transform: 'scale(1.05)',
        },
      }}
    >
      <PlayArrow
        sx={{
          color: '#4caf50',
          fontSize: '24px',
          mb: 0.5,
        }}
      />
      
      <Typography
        variant="caption"
        sx={{
          fontWeight: 'bold',
          color: '#2e7d32',
          fontSize: '0.7rem',
          textAlign: 'center',
        }}
      >
        START
      </Typography>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#4caf50',
          width: '10px',
          height: '10px',
          border: '2px solid white',
        }}
      />
    </Box>
  );
};

export default StartNode;