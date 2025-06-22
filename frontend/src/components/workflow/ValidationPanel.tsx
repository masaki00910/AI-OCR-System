import React from 'react';
import {
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  Error,
  Warning,
  CheckCircle,
  Refresh,
} from '@mui/icons-material';
import { ValidationResult, ValidationError } from '../../utils/workflow-validation';

interface ValidationPanelProps {
  validationResult: ValidationResult | null;
  onRevalidate: () => void;
  onSelectNode?: (nodeId: string) => void;
  onSelectEdge?: (edgeId: string) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationResult,
  onRevalidate,
  onSelectNode,
  onSelectEdge,
}) => {
  if (!validationResult) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          バリデーション
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRevalidate}
          size="small"
        >
          検証実行
        </Button>
      </Box>
    );
  }

  const handleItemClick = (error: ValidationError) => {
    if (error.nodeId && onSelectNode) {
      onSelectNode(error.nodeId);
    } else if (error.edgeId && onSelectEdge) {
      onSelectEdge(error.edgeId);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          バリデーション
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRevalidate}
          size="small"
        >
          再検証
        </Button>
      </Box>

      {/* Overall Status */}
      <Box sx={{ mb: 2 }}>
        {validationResult.isValid ? (
          <Alert severity="success" icon={<CheckCircle />}>
            ワークフローは有効です
          </Alert>
        ) : (
          <Alert severity="error" icon={<Error />}>
            {validationResult.errors.length}個のエラーがあります
          </Alert>
        )}
      </Box>

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Chip
          label={`エラー: ${validationResult.errors.length}`}
          color={validationResult.errors.length > 0 ? 'error' : 'default'}
          size="small"
          icon={<Error />}
        />
        <Chip
          label={`警告: ${validationResult.warnings.length}`}
          color={validationResult.warnings.length > 0 ? 'warning' : 'default'}
          size="small"
          icon={<Warning />}
        />
      </Box>

      {/* Errors */}
      {validationResult.errors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            エラー
          </Typography>
          <List dense>
            {validationResult.errors.map((error, index) => (
              <ListItem
                key={index}
                sx={{
                  cursor: (error.nodeId || error.edgeId) ? 'pointer' : 'default',
                  '&:hover': (error.nodeId || error.edgeId) ? { backgroundColor: '#ffebee' } : {},
                  borderRadius: 1,
                }}
                onClick={() => handleItemClick(error)}
              >
                <ListItemIcon sx={{ minWidth: '32px' }}>
                  <Error color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={error.message}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: 'error',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Warnings */}
      {validationResult.warnings.length > 0 && (
        <Box>
          {validationResult.errors.length > 0 && <Divider sx={{ my: 2 }} />}
          <Typography variant="subtitle2" color="warning.main" gutterBottom>
            警告
          </Typography>
          <List dense>
            {validationResult.warnings.map((warning, index) => (
              <ListItem
                key={index}
                sx={{
                  cursor: (warning.nodeId || warning.edgeId) ? 'pointer' : 'default',
                  '&:hover': (warning.nodeId || warning.edgeId) ? { backgroundColor: '#fff8e1' } : {},
                  borderRadius: 1,
                }}
                onClick={() => handleItemClick(warning)}
              >
                <ListItemIcon sx={{ minWidth: '32px' }}>
                  <Warning color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={warning.message}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: 'warning.main',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Help Text */}
      {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            問題は見つかりませんでした。
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ValidationPanel;