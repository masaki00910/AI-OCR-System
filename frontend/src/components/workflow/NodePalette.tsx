import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Circle,
  Info,
} from '@mui/icons-material';

interface PaletteItemProps {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  disabled?: boolean;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ 
  type, 
  label, 
  icon, 
  description, 
  disabled = false 
}) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <ListItem
      draggable={!disabled}
      onDragStart={(event) => onDragStart(event, type)}
      sx={{
        cursor: disabled ? 'not-allowed' : 'grab',
        borderRadius: 1,
        mb: 1,
        border: '1px solid #e0e0e0',
        backgroundColor: disabled ? '#f5f5f5' : 'white',
        opacity: disabled ? 0.6 : 1,
        '&:hover': {
          backgroundColor: disabled ? '#f5f5f5' : '#f0f7ff',
          borderColor: disabled ? '#e0e0e0' : '#1976d2',
        },
        '&:active': {
          cursor: disabled ? 'not-allowed' : 'grabbing',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: '36px' }}>
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {label}
          </Typography>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        }
      />
    </ListItem>
  );
};

interface NodePaletteProps {
  isEditMode: boolean;
}

const NodePalette: React.FC<NodePaletteProps> = ({ isEditMode }) => {
  const paletteItems: PaletteItemProps[] = [
    {
      type: 'start',
      label: '開始ノード',
      icon: <PlayArrow sx={{ color: '#4caf50' }} />,
      description: 'ワークフローの開始点',
    },
    {
      type: 'state',
      label: '状態ノード',
      icon: <Circle sx={{ color: '#1976d2' }} />,
      description: '承認・処理状態',
    },
    {
      type: 'end',
      label: '終了ノード',
      icon: <Stop sx={{ color: '#f44336' }} />,
      description: 'ワークフローの終了点',
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Typography variant="h6" gutterBottom>
          ノードパレット
        </Typography>
        {!isEditMode && (
          <Box
            sx={{
              p: 1,
              backgroundColor: '#fff3cd',
              borderRadius: 1,
              border: '1px solid #ffeaa7',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info sx={{ color: '#856404', fontSize: '16px' }} />
              <Typography variant="caption" sx={{ color: '#856404' }}>
                プレビューモード
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        {isEditMode ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ノードをキャンバスにドラッグしてください
            </Typography>
            <List disablePadding>
              {paletteItems.map((item) => (
                <PaletteItem
                  key={item.type}
                  type={item.type}
                  label={item.label}
                  icon={item.icon}
                  description={item.description}
                />
              ))}
            </List>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              編集モードに切り替えてノードを追加
            </Typography>
            <List disablePadding>
              {paletteItems.map((item) => (
                <PaletteItem
                  key={item.type}
                  type={item.type}
                  label={item.label}
                  icon={item.icon}
                  description={item.description}
                  disabled={true}
                />
              ))}
            </List>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            操作ガイド
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            • ノードをドラッグしてキャンバスに配置
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            • ノード間をドラッグして接続
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            • Deleteキーで選択したノード/エッジを削除
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            • ノード/エッジクリックでプロパティ編集
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NodePalette;