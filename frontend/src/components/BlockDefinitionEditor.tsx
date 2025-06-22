import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  IconButton,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import JsonSchemaEditor from './JsonSchemaEditor';

interface BlockDefinition {
  block_id: string;
  label: string;
  prompt?: string;
  schema: any;
}

interface BlockDefinitionEditorProps {
  blocks: BlockDefinition[];
  onChange: (blocks: BlockDefinition[]) => void;
}

const BlockDefinitionEditor: React.FC<BlockDefinitionEditorProps> = ({ blocks, onChange }) => {
  const [editDialog, setEditDialog] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editBlock, setEditBlock] = useState<BlockDefinition>({
    block_id: '',
    label: '',
    prompt: '',
    schema: {
      type: 'object',
      properties: {},
    },
  });

  const handleAdd = () => {
    setEditIndex(null);
    setEditBlock({
      block_id: '',
      label: '',
      prompt: '',
      schema: {
        type: 'object',
        properties: {},
      },
    });
    setEditDialog(true);
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditBlock({ ...blocks[index] });
    setEditDialog(true);
  };

  const handleDelete = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  };

  const handleSave = () => {
    if (!editBlock.block_id || !editBlock.label) {
      return;
    }

    const newBlocks = [...blocks];
    if (editIndex !== null) {
      newBlocks[editIndex] = editBlock;
    } else {
      newBlocks.push(editBlock);
    }
    onChange(newBlocks);
    setEditDialog(false);
  };

  const handleSchemaChange = (schema: string) => {
    try {
      const parsedSchema = JSON.parse(schema);
      setEditBlock({ ...editBlock, schema: parsedSchema });
    } catch (e) {
      // Invalid JSON, ignore
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">範囲ブロック定義</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          size="small"
        >
          ブロック追加
        </Button>
      </Box>

      {blocks.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            ブロックが定義されていません。「ブロック追加」ボタンから追加してください。
          </Typography>
        </Paper>
      ) : (
        blocks.map((block, index) => (
          <Accordion key={index} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                <Box>
                  <Typography variant="subtitle1">{block.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {block.block_id}
                  </Typography>
                </Box>
                <Box sx={{ mr: 2 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(index);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(index);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                {block.prompt && (
                  <Box mb={2}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      プロンプト:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {block.prompt}
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  スキーマ:
                </Typography>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                  {JSON.stringify(block.schema, null, 2)}
                </pre>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editIndex !== null ? 'ブロック編集' : '新規ブロック'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="ブロックID"
                value={editBlock.block_id}
                onChange={(e) => setEditBlock({ ...editBlock, block_id: e.target.value })}
                fullWidth
                required
                helperText="英数字とアンダースコアのみ使用可能"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="ラベル"
                value={editBlock.label}
                onChange={(e) => setEditBlock({ ...editBlock, label: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="プロンプト（オプション）"
                value={editBlock.prompt}
                onChange={(e) => setEditBlock({ ...editBlock, prompt: e.target.value })}
                fullWidth
                multiline
                rows={3}
                helperText="このブロック専用のプロンプトを設定できます"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                JSON Schema
              </Typography>
              <JsonSchemaEditor
                value={JSON.stringify(editBlock.schema, null, 2)}
                onChange={handleSchemaChange}
                height="300px"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!editBlock.block_id || !editBlock.label}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BlockDefinitionEditor;