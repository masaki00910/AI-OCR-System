import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import { Editor } from '@monaco-editor/react';
import { WorkflowGraphEdge } from '../../types/workflow-builder.types';

interface EdgePropertiesDialogProps {
  open: boolean;
  edge: WorkflowGraphEdge | null;
  onClose: () => void;
  onSave: (edge: WorkflowGraphEdge) => void;
  isEditMode: boolean;
}

const EdgePropertiesDialog: React.FC<EdgePropertiesDialogProps> = ({
  open,
  edge,
  onClose,
  onSave,
  isEditMode,
}) => {
  const [formData, setFormData] = useState<WorkflowGraphEdge | null>(null);
  const [conditionExpression, setConditionExpression] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (edge) {
      setFormData({ ...edge });
      setConditionExpression(edge.data.conditionExpr || '');
      setJsonError(null);
    } else {
      setFormData(null);
      setConditionExpression('');
      setJsonError(null);
    }
  }, [edge]);

  const handleInputChange = (field: string, value: any) => {
    if (!formData) return;

    setFormData({
      ...formData,
      data: {
        ...formData.data,
        [field]: value,
      },
    });
  };

  const handleConditionChange = (value: string | undefined) => {
    const newValue = value || '';
    setConditionExpression(newValue);
    
    if (!formData) return;

    // JSONLogic validation
    if (newValue.trim()) {
      try {
        JSON.parse(newValue);
        setJsonError(null);
      } catch (error) {
        setJsonError('無効なJSON形式です');
      }
    } else {
      setJsonError(null);
    }

    setFormData({
      ...formData,
      data: {
        ...formData.data,
        conditionExpr: newValue,
      },
    });
  };

  const handleSave = () => {
    if (!formData || !isEditMode) return;

    // Validation
    if (!formData.data.actionKey.trim()) {
      alert('アクションキーは必須です');
      return;
    }

    if (!formData.data.actionLabel.trim()) {
      alert('アクションラベルは必須です');
      return;
    }

    if (jsonError) {
      alert('条件式のJSON形式が正しくありません');
      return;
    }

    onSave(formData);
    onClose();
  };

  const exampleConditions = [
    {
      name: '常に true',
      condition: '{"==": [1, 1]}',
      description: '常に遷移を許可',
    },
    {
      name: '金額チェック',
      condition: '{">=": [{"var": "amount"}, 10000]}',
      description: '金額が10,000以上の場合',
    },
    {
      name: '部署チェック',
      condition: '{"==": [{"var": "department"}, "finance"]}',
      description: '部署が財務の場合',
    },
    {
      name: 'AND条件',
      condition: '{"and": [{">=": [{"var": "amount"}, 1000]}, {"==": [{"var": "status"}, "pending"]}]}',
      description: '金額1000以上かつステータスがpending',
    },
  ];

  if (!formData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        遷移条件設定
        <Typography variant="subtitle2" color="text.secondary">
          {formData.source} → {formData.target}
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 基本設定 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              基本設定
            </Typography>
            
            <TextField
              label="アクションキー"
              value={formData.data.actionKey}
              onChange={(e) => handleInputChange('actionKey', e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              disabled={!isEditMode}
              helperText="システム内部で使用される一意のキー（例: approve, reject, return）"
              required
            />

            <TextField
              label="アクションラベル"
              value={formData.data.actionLabel}
              onChange={(e) => handleInputChange('actionLabel', e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              disabled={!isEditMode}
              helperText="ユーザーに表示されるボタンラベル"
              required
            />

            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.data.requiresComment || false}
                    onChange={(e) => handleInputChange('requiresComment', e.target.checked)}
                    disabled={!isEditMode}
                  />
                }
                label="コメント必須"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                この遷移を実行時にコメント入力を必須にする
              </Typography>
            </Box>

            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.data.autoAdvance || false}
                    onChange={(e) => handleInputChange('autoAdvance', e.target.checked)}
                    disabled={!isEditMode}
                  />
                }
                label="自動進行"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                条件が満たされた場合、自動的にこの遷移を実行する
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* 条件式設定 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              遷移条件（JSONLogic形式）
            </Typography>
            
            {jsonError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {jsonError}
              </Alert>
            )}

            <Box sx={{ height: '200px', border: '1px solid #ddd', borderRadius: 1 }}>
              <Editor
                height="200px"
                defaultLanguage="json"
                value={conditionExpression}
                onChange={handleConditionChange}
                options={{
                  readOnly: !isEditMode,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  fontSize: 12,
                }}
                theme="vs-dark"
              />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              空の場合は常に遷移可能。JSONLogic形式で条件を記述してください。
            </Typography>
          </Box>

          <Divider />

          {/* 例文集 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              条件式サンプル
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {exampleConditions.map((example, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    cursor: isEditMode ? 'pointer' : 'default',
                    '&:hover': isEditMode ? { backgroundColor: '#f5f5f5' } : {},
                  }}
                  onClick={() => {
                    if (isEditMode) {
                      handleConditionChange(example.condition);
                    }
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {example.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {example.description}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                    {example.condition}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        {isEditMode && (
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!!jsonError}
          >
            保存
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EdgePropertiesDialog;