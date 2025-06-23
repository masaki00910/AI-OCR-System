import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Link,
  Paper,
  Toolbar,
  TextField,
  InputAdornment,
  Snackbar,
  Alert as MUIAlert,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp, GridRowSelectionModel } from '@mui/x-data-grid';
import {
  Add,
  Download,
  Refresh,
  MoreVert,
  FilterList,
  Search,
  CloudDownload,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { documentApi, exportApi } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

// エクスポート履歴の型定義
interface ExportHistory {
  id: string;
  format: 'csv' | 'xlsx' | 'json' | 'xml' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  documentCount: number;
  fileSize?: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  user: {
    email: string;
  };
}

// エクスポートフィルターの型定義
interface ExportFilter {
  documentIds?: string[];
  templateId?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  status?: string[];
}

// フォーマット選択の型定義
type ExportFormat = 'csv' | 'xlsx' | 'json' | 'xml' | 'pdf';

export default function ExportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exports, setExports] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportFilter, setExportFilter] = useState<ExportFilter>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedExport, setSelectedExport] = useState<ExportHistory | null>(null);
  const [searchText, setSearchText] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // WebSocket接続（リアルタイム進捗通知用）
  const { isConnected: wsConnected } = useWebSocket('ws://localhost:3000', {
    onMessage: (message) => {
      if (message.type === 'export:progress') {
        // エクスポート進捗の更新
        setExports(prev => prev.map(exp => 
          exp.id === message.data.exportId 
            ? { ...exp, progress: message.data.progress, status: message.data.status }
            : exp
        ));
      } else if (message.type === 'export:completed') {
        // エクスポート完了の更新
        setExports(prev => prev.map(exp => 
          exp.id === message.data.exportId 
            ? { 
                ...exp, 
                status: 'completed', 
                progress: 100, 
                completedAt: message.data.completedAt,
                downloadUrl: message.data.downloadUrl,
                fileSize: message.data.fileSize
              }
            : exp
        ));
        
        // 完了通知
        setSnackbar({
          open: true,
          message: `エクスポート「${message.data.format}」が完了しました`,
          severity: 'success'
        });
      } else if (message.type === 'export:failed') {
        // エクスポート失敗の更新
        setExports(prev => prev.map(exp => 
          exp.id === message.data.exportId 
            ? { ...exp, status: 'failed', error: message.data.error }
            : exp
        ));
        
        // 失敗通知
        setSnackbar({
          open: true,
          message: `エクスポートが失敗しました: ${message.data.error}`,
          severity: 'error'
        });
      }
    },
    onConnect: () => {
      // console.log('エクスポート進捗通知WebSocket接続完了');
    },
    onError: (error) => {
      console.error('WebSocket接続エラー:', error);
    }
  });

  // エクスポート履歴の取得
  useEffect(() => {
    fetchExports();
  }, []);

  const fetchExports = async () => {
    try {
      setLoading(true);
      const response = await exportApi.list();
      
      // APIレスポンスの構造を確認してデータを変換
      const responseData = response.data;
      
      let transformedExports = [];
      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        // ページネーション形式のレスポンス
        transformedExports = responseData.data.map((item: any) => ({
          id: item.id,
          format: item.format,
          status: item.status,
          progress: item.progress || 0,
          documentCount: item.documentCount || 0,
          fileSize: item.fileSize,
          downloadUrl: item.downloadUrl,
          createdAt: item.createdAt,
          completedAt: item.completedAt,
          error: item.errorMessage,
          user: item.createdBy || { email: user?.email || 'unknown' }
        }));
      } else if (Array.isArray(responseData)) {
        // 直接配列のレスポンス
        transformedExports = responseData.map((item: any) => ({
          id: item.id,
          format: item.format,
          status: item.status,
          progress: item.progress || 0,
          documentCount: item.documentCount || 0,
          fileSize: item.fileSize,
          downloadUrl: item.downloadUrl,
          createdAt: item.createdAt,
          completedAt: item.completedAt,
          error: item.errorMessage,
          user: item.createdBy || { email: user?.email || 'unknown' }
        }));
      }
      
      setExports(transformedExports);
      setError(null);
    } catch (err) {
      console.error('エクスポート履歴取得エラー:', err);
      // エラー時はダミーデータを表示
      const dummyExports: ExportHistory[] = [
        {
          id: '1',
          format: 'xlsx',
          status: 'completed',
          progress: 100,
          documentCount: 150,
          fileSize: 2048576,
          downloadUrl: '/exports/download/1',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3000000).toISOString(),
          user: { email: 'user@demo.com' }
        },
        {
          id: '2',
          format: 'csv',
          status: 'processing',
          progress: 65,
          documentCount: 300,
          createdAt: new Date(Date.now() - 600000).toISOString(),
          user: { email: 'user@demo.com' }
        },
        {
          id: '3',
          format: 'pdf',
          status: 'failed',
          progress: 0,
          documentCount: 50,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          error: 'メモリ不足エラー',
          user: { email: 'admin@demo.com' }
        },
      ];
      setExports(dummyExports);
      setError('API接続エラー - ダミーデータを表示中');
    } finally {
      setLoading(false);
    }
  };

  // ステータスアイコンの取得
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'processing':
        return <HourglassEmpty color="info" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <HourglassEmpty />;
    }
  };

  // ステータスチップの取得
  const getStatusChip = (status: string) => {
    const statusMap = {
      pending: { label: '待機中', color: 'default' as const },
      processing: { label: '処理中', color: 'info' as const },
      completed: { label: '完了', color: 'success' as const },
      failed: { label: '失敗', color: 'error' as const },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // ファイルサイズのフォーマット
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // DataGridの列定義
  const columns: GridColDef[] = [
    {
      field: 'status',
      headerName: 'ステータス',
      width: 120,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'format',
      headerName: 'フォーマット',
      width: 100,
    },
    {
      field: 'documentCount',
      headerName: 'ドキュメント数',
      width: 130,
      type: 'number',
    },
    {
      field: 'progress',
      headerName: '進捗',
      width: 150,
      renderCell: (params) => (
        params.row.status === 'processing' ? (
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={params.value} />
            <Typography variant="caption">{params.value}%</Typography>
          </Box>
        ) : null
      ),
    },
    {
      field: 'fileSize',
      headerName: 'ファイルサイズ',
      width: 120,
      renderCell: (params) => formatFileSize(params.value),
    },
    {
      field: 'createdAt',
      headerName: '作成日時',
      width: 180,
      renderCell: (params) => new Date(params.value).toLocaleString('ja-JP'),
    },
    {
      field: 'completedAt',
      headerName: '完了日時',
      width: 180,
      renderCell: (params) => params.value 
        ? new Date(params.value).toLocaleString('ja-JP')
        : '-',
    },
    {
      field: 'user',
      headerName: '実行者',
      width: 200,
      renderCell: (params) => params.value?.email || '-',
    },
    {
      field: 'actions',
      headerName: 'アクション',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {params.row.status === 'completed' && (
            <IconButton
              size="small"
              onClick={() => handleDownload(params.row)}
              title="ダウンロード"
            >
              <Download />
            </IconButton>
          )}
          {params.row.status === 'failed' && (
            <IconButton
              size="small"
              onClick={() => handleRetry(params.row)}
              title="再実行"
            >
              <Refresh />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, params.row)}
          >
            <MoreVert />
          </IconButton>
        </Box>
      ),
    },
  ];

  // メニューハンドラー
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, exportItem: ExportHistory) => {
    setAnchorEl(event.currentTarget);
    setSelectedExport(exportItem);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedExport(null);
  };

  // ダウンロードハンドラー
  const handleDownload = async (exportItem: ExportHistory) => {
    // 完了ステータスの場合のみダウンロード可能
    if (exportItem.status !== 'completed') return;
    
    try {
      const response = await exportApi.download(exportItem.id);
      
      // Blobからファイルをダウンロード
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
      link.download = `export_${exportItem.format.toLowerCase()}_${timestamp}.${exportItem.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ダウンロードエラー:', err);
      setError('ダウンロードに失敗しました');
    }
  };

  // 再実行ハンドラー
  const handleRetry = async (exportItem: ExportHistory) => {
    try {
      // 元のエクスポート設定で再実行
      await exportApi.create({
        format: exportItem.format,
        filterJson: exportFilter,
      });
      
      setError(null);
      fetchExports();
    } catch (err) {
      console.error('再実行エラー:', err);
      setError('再実行に失敗しました');
    }
  };

  // 新規エクスポート作成
  const handleCreateExport = async () => {
    try {
      const exportData = {
        format: exportFormat,
        filterJson: exportFilter,
      };
      
      await exportApi.create(exportData);
      
      setExportDialogOpen(false);
      setError(null);
      setSnackbar({
        open: true,
        message: 'エクスポートを開始しました',
        severity: 'info'
      });
      fetchExports();
    } catch (err) {
      console.error('エクスポート作成エラー:', err);
      setError('エクスポートの作成に失敗しました');
      setSnackbar({
        open: true,
        message: 'エクスポートの作成に失敗しました',
        severity: 'error'
      });
    }
  };

  // フィルター適用
  const filteredExports = exports.filter(exp => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      return (
        exp.format.toLowerCase().includes(searchLower) ||
        exp.user.email.toLowerCase().includes(searchLower) ||
        exp.status.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) return <Container><CircularProgress /></Container>;
  if (error) return <Container><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          エクスポート管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ドキュメントデータのエクスポート履歴管理と新規エクスポート作成
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Toolbar>
          <TextField
            placeholder="検索..."
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mr: 2, minWidth: 300 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setExportDialogOpen(true)}
          >
            新規エクスポート
          </Button>
          <IconButton onClick={fetchExports} sx={{ ml: 1 }}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </Paper>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            rows={filteredExports}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            checkboxSelection
            disableSelectionOnClick
            autoHeight
            onSelectionModelChange={setSelectedRows}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* 新規エクスポートダイアログ */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新規エクスポート作成</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>エクスポート形式</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                label="エクスポート形式"
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="xlsx">Excel</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="xml">XML</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              フィルター条件
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="開始日"
                type="date"
                value={exportFilter.startDate ? exportFilter.startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setExportFilter({ 
                  ...exportFilter, 
                  startDate: e.target.value ? new Date(e.target.value) : null 
                })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="終了日"
                type="date"
                value={exportFilter.endDate ? exportFilter.endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setExportFilter({ 
                  ...exportFilter, 
                  endDate: e.target.value ? new Date(e.target.value) : null 
                })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                multiple
                value={exportFilter.status || []}
                onChange={(e) => setExportFilter({ ...exportFilter, status: e.target.value as string[] })}
                label="ステータス"
              >
                <MenuItem value="uploaded">アップロード済み</MenuItem>
                <MenuItem value="processing">処理中</MenuItem>
                <MenuItem value="completed">完了</MenuItem>
                <MenuItem value="error">エラー</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 2 }}>
              選択した条件に一致するドキュメントがエクスポートされます。
              大量のデータをエクスポートする場合は処理に時間がかかることがあります。
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateExport}
            startIcon={<CloudDownload />}
          >
            エクスポート開始
          </Button>
        </DialogActions>
      </Dialog>

      {/* アクションメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedExport?.status === 'completed' && (
          <MenuItem onClick={() => {
            handleDownload(selectedExport);
            handleMenuClose();
          }}>
            <Download sx={{ mr: 1 }} /> ダウンロード
          </MenuItem>
        )}
        {selectedExport?.status === 'failed' && (
          <MenuItem onClick={() => {
            handleRetry(selectedExport);
            handleMenuClose();
          }}>
            <Refresh sx={{ mr: 1 }} /> 再実行
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          詳細表示
        </MenuItem>
      </Menu>

      {/* 通知スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MUIAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MUIAlert>
      </Snackbar>
    </Container>
  );
}