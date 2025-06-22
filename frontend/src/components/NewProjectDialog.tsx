import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { projectApi, documentApi } from '../services/api';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewProjectDialog({ open, onClose, onSuccess }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('PDFファイルを選択してください');
    }
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      setError('プロジェクト名を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // プロジェクトを作成
      const projectResponse = await projectApi.create({
        name: projectName,
        status: '未着手',
      });
      const projectId = projectResponse.data.id;

      // PDFファイルがある場合はアップロード
      if (selectedFile) {
        await documentApi.upload(projectId, selectedFile);
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setProjectName('');
      setSelectedFile(null);
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>新規案件作成</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <TextField
            label="プロジェクト名"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            fullWidth
            required
            error={!!error && !projectName}
            helperText={error && !projectName ? error : ''}
            disabled={loading}
          />

          <Box>
            <input
              accept="application/pdf"
              style={{ display: 'none' }}
              id="pdf-file-input"
              type="file"
              onChange={handleFileSelect}
              disabled={loading}
            />
            <label htmlFor="pdf-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                disabled={loading}
                fullWidth
              >
                PDFファイルを選択（任意）
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                選択: {selectedFile.name}
              </Typography>
            )}
          </Box>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !projectName.trim()}
        >
          作成
        </Button>
      </DialogActions>
      {loading && <LinearProgress />}
    </Dialog>
  );
}