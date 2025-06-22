import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { Add, Upload, MoreVert, Settings, Delete, FileDownload } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { templateApi, documentApi } from '../services/api';

interface Template {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    documents: number;
  };
}

interface Document {
  id: string;
  fileName: string;
  status: string;
  pageCount: number;
  createdAt: string;
  template: {
    name: string;
  };
}

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesRes, documentsRes] = await Promise.all([
        templateApi.list(),
        documentApi.list({ limit: 10 }),
      ]);
      
      // Handle the response format: { templates: Template[], total: number }
      if (templatesRes.data.templates) {
        setTemplates(templatesRes.data.templates);
      } else if (Array.isArray(templatesRes.data)) {
        setTemplates(templatesRes.data);
      } else {
        console.error('Unexpected templates response format:', templatesRes.data);
        setTemplates([]);
      }
      
      // Handle the response format: { documents: Document[], total: number }
      if (documentsRes.data.documents) {
        setDocuments(documentsRes.data.documents);
      } else if (Array.isArray(documentsRes.data)) {
        setDocuments(documentsRes.data);
      } else {
        console.error('Unexpected documents response format:', documentsRes.data);
        setDocuments([]);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedTemplate) return;

    try {
      setUploading(true);
      await documentApi.upload(selectedTemplate, uploadFile);
      setUploadDialog(false);
      setUploadFile(null);
      setSelectedTemplate('');
      await loadData(); // Reload data
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError('ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleMenuOpen = (templateId: string, event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor({ ...menuAnchor, [templateId]: event.currentTarget });
  };

  const handleMenuClose = (templateId: string) => {
    setMenuAnchor({ ...menuAnchor, [templateId]: null });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'uploaded': return 'アップロード済み';
      case 'processing': return '処理中';
      case 'completed': return '完了';
      case 'error': return 'エラー';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          ドキュメント管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => setUploadDialog(true)}
          disabled={templates.length === 0}
        >
          ドキュメントアップロード
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Templates Section */}
      <Typography variant="h5" component="h2" gutterBottom>
        テンプレート一覧
      </Typography>
      
      {templates.length === 0 ? (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              テンプレートが登録されていません。管理者にお問い合わせください。
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" component="h3" gutterBottom>
                      {template.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(template.id, e)}
                    >
                      <MoreVert />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchor[template.id]}
                      open={Boolean(menuAnchor[template.id])}
                      onClose={() => handleMenuClose(template.id)}
                    >
                      <MenuItem onClick={() => handleMenuClose(template.id)}>
                        <Settings sx={{ mr: 1 }} />
                        設定
                      </MenuItem>
                    </Menu>
                  </Box>
                  
                  {template.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {template.description}
                    </Typography>
                  )}
                  
                  <Box display="flex" gap={1} mt={2}>
                    <Chip
                      label={`v${template.version}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={template.isActive ? '有効' : '無効'}
                      size="small"
                      color={template.isActive ? 'success' : 'default'}
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Upload />}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setUploadDialog(true);
                    }}
                  >
                    アップロード
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Recent Documents Section */}
      <Typography variant="h5" component="h2" gutterBottom>
        最近のドキュメント
      </Typography>
      
      {documents.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              ドキュメントがありません。
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {documents.map((document) => (
            <Grid item xs={12} key={document.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6" component="h3">
                        {document.fileName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        テンプレート: {document.template.name} | ページ数: {document.pageCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        作成日: {new Date(document.createdAt).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip
                        label={getStatusLabel(document.status)}
                        color={getStatusColor(document.status) as any}
                        size="small"
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/documents/${document.id}`)}
                      >
                        詳細表示
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ドキュメントアップロード</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            <TextField
              select
              label="テンプレート"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="">テンプレートを選択</option>
              {templates.filter(t => t.isActive).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} (v{template.version})
                </option>
              ))}
            </TextField>
            
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ py: 2 }}
            >
              {uploadFile ? uploadFile.name : 'ファイルを選択'}
              <input
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!uploadFile || !selectedTemplate || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'アップロード'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentsPage;