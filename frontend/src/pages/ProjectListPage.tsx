import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import NewProjectDialog from '../components/NewProjectDialog';
import { projectApi } from '../services/api';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'プロジェクト名', width: 300 },
  {
    field: 'status',
    headerName: 'ステータス',
    width: 120,
    renderCell: (params) => {
      const getColor = (status: string) => {
        switch (status) {
          case '未着手': return '#757575';
          case '点検中': return '#1976d2';
          case '完了': return '#2e7d32';
          case '差戻し': return '#d32f2f';
          default: return '#757575';
        }
      };
      return (
        <Box
          sx={{
            color: getColor(params.value),
            fontWeight: 'medium',
          }}
        >
          {params.value}
        </Box>
      );
    },
  },
  {
    field: 'updated_at',
    headerName: '更新日',
    width: 180,
    valueFormatter: (params) => {
      return new Date(params.value).toLocaleString('ja-JP');
    },
  },
  {
    field: 'created_at',
    headerName: '作成日',
    width: 180,
    valueFormatter: (params) => {
      return new Date(params.value).toLocaleString('ja-JP');
    },
  },
];

export default function ProjectListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: paginationModel.page + 1, // DataGridは0ベース、APIは1ベース
        limit: paginationModel.pageSize,
      };
      if (debouncedSearchText) {
        params.search = debouncedSearchText;
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await projectApi.list(params);
      // APIレスポンスの構造に応じて調整
      if (response.data.data) {
        setProjects(response.data.data);
        setRowCount(response.data.total || 0);
      } else {
        // 後方互換性のため
        const projectData = response.data;
        setProjects(Array.isArray(projectData) ? projectData : []);
        setRowCount(Array.isArray(projectData) ? projectData.length : 0);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [filterStatus, paginationModel, debouncedSearchText]);

  // 検索テキストのデバウンス処理
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
      // 検索時はページを1に戻す
      if (searchText !== debouncedSearchText) {
        setPaginationModel(prev => ({ ...prev, page: 0 }));
      }
    }, 500); // 500ms待つ

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

  const handleRowClick = (params: any) => {
    navigate(`/inspection/${params.id}`);
  };

  // サーバーサイドでフィルタリングされるため、クライアントサイドフィルタリングは不要

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">案件一覧</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          新規案件作成
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          placeholder="検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ width: 300 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>ステータス</InputLabel>
          <Select
            value={filterStatus}
            label="ステータス"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">すべて</MenuItem>
            <MenuItem value="未着手">未着手</MenuItem>
            <MenuItem value="点検中">点検中</MenuItem>
            <MenuItem value="完了">完了</MenuItem>
            <MenuItem value="差戻し">差戻し</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={projects}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          pageSizeOptions={[10, 25, 50]}
          paginationModel={paginationModel}
          paginationMode="server"
          onPaginationModelChange={(newModel) => setPaginationModel(newModel)}
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          sx={{
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
          }}
        />
      </Box>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setDialogOpen(false);
          fetchProjects();
        }}
      />
    </Box>
  );
}