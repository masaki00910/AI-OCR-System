import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Link,
} from '@mui/material';
import { CloudUpload, Download, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { ImportUsersRequest, ImportUsersResponse, UserRole, RoleOption } from '../types/user.types';

interface ImportUsersDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (importData: ImportUsersRequest) => Promise<ImportUsersResponse>;
  roles: RoleOption[];
  loading?: boolean;
}

interface CsvData {
  email: string;
  username: string;
  password: string;
  role: string;
  isActive: string;
}

const ImportUsersDialog: React.FC<ImportUsersDialogProps> = ({
  open,
  onClose,
  onImport,
  roles,
  loading = false,
}) => {
  const [csvData, setCsvData] = useState<CsvData[]>([]);
  const [importResult, setImportResult] = useState<ImportUsersResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvTemplate = `email,username,password,role,isActive
user1@example.com,user1,password123,viewer,true
user2@example.com,user2,password456,editor,true
admin@example.com,admin,adminpass,admin,true`;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      try {
        const parsedData = parseCSV(csv);
        const validationErrors = validateCSVData(parsedData);
        
        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          setStep('upload');
        } else {
          setCsvData(parsedData);
          setStep('preview');
          setErrors([]);
        }
      } catch (error) {
        setErrors(['CSVファイルの読み込みに失敗しました。正しい形式で保存されているか確認してください。']);
        setStep('upload');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (csvText: string): CsvData[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate headers
    const expectedHeaders = ['email', 'username', 'password', 'role', 'isActive'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing headers: ${missingHeaders.join(', ')}`);
    }

    const data: CsvData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
      if (values.length !== headers.length) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row as CsvData);
    }

    return data;
  };

  const validateCSVData = (data: CsvData[]): string[] => {
    const errors: string[] = [];
    const validRoles = roles.map(r => r.value);
    const emails = new Set<string>();
    const usernames = new Set<string>();

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index starts at 0 and we skip header

      // Email validation
      if (!row.email || !row.email.includes('@')) {
        errors.push(`行 ${rowNum}: 有効なメールアドレスが必要です`);
      } else if (emails.has(row.email)) {
        errors.push(`行 ${rowNum}: メールアドレス「${row.email}」が重複しています`);
      } else {
        emails.add(row.email);
      }

      // Username validation
      if (!row.username || row.username.length < 3) {
        errors.push(`行 ${rowNum}: ユーザー名は3文字以上で入力してください`);
      } else if (usernames.has(row.username)) {
        errors.push(`行 ${rowNum}: ユーザー名「${row.username}」が重複しています`);
      } else {
        usernames.add(row.username);
      }

      // Password validation
      if (!row.password || row.password.length < 6) {
        errors.push(`行 ${rowNum}: パスワードは6文字以上で入力してください`);
      }

      // Role validation
      if (!validRoles.includes(row.role as UserRole)) {
        errors.push(`行 ${rowNum}: ロール「${row.role}」は無効です。有効な値: ${validRoles.join(', ')}`);
      }

      // IsActive validation
      if (!['true', 'false'].includes(row.isActive.toLowerCase())) {
        errors.push(`行 ${rowNum}: isActiveは「true」または「false」で入力してください`);
      }
    });

    return errors;
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;

    setImporting(true);
    try {
      const importData: ImportUsersRequest = {
        users: csvData.map(row => ({
          email: row.email,
          username: row.username,
          password: row.password,
          role: row.role as UserRole,
          isActive: row.isActive.toLowerCase() === 'true',
        })),
      };

      const result = await onImport(importData);
      setImportResult(result);
      setStep('result');
    } catch (error) {
      console.error('Import failed:', error);
      setErrors(['インポートに失敗しました。エラーを確認してください。']);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'users_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setCsvData([]);
    setImportResult(null);
    setErrors([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!importing) {
      handleReset();
      onClose();
    }
  };

  const getRoleLabel = (role: string): string => {
    const roleOption = roles.find(r => r.value === role);
    return roleOption?.label || role;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      disableEscapeKeyDown={importing}
    >
      <DialogTitle>
        ユーザー一括インポート
        {importing && <LinearProgress sx={{ mt: 1 }} />}
      </DialogTitle>
      
      <DialogContent>
        {step === 'upload' && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              CSVファイルを使用してユーザーを一括で作成できます。
              まず、テンプレートをダウンロードして正しい形式を確認してください。
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleDownloadTemplate}
                sx={{ mr: 2 }}
              >
                テンプレートダウンロード
              </Button>
            </Box>

            <Paper
              sx={{
                p: 3,
                border: '2px dashed #ccc',
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'grey.50' },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                CSVファイルを選択
              </Typography>
              <Typography variant="body2" color="textSecondary">
                クリックしてファイルを選択するか、ここにドラッグ&ドロップしてください
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </Paper>

            {errors.length > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  エラーが見つかりました:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Box>
        )}

        {step === 'preview' && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              {csvData.length}件のユーザーが見つかりました。内容を確認してインポートを実行してください。
            </Alert>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>メールアドレス</TableCell>
                    <TableCell>ユーザー名</TableCell>
                    <TableCell>ロール</TableCell>
                    <TableCell>ステータス</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.username}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getRoleLabel(row.role)} 
                          variant="outlined" 
                          size="small"
                          color={row.role === 'admin' ? 'error' : row.role === 'editor' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={row.isActive === 'true' ? 'アクティブ' : '非アクティブ'}
                          variant="outlined"
                          size="small"
                          color={row.isActive === 'true' ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {step === 'result' && importResult && (
          <Box>
            <Alert 
              severity={importResult.failed === 0 ? 'success' : 'warning'} 
              sx={{ mb: 2 }}
            >
              インポートが完了しました。
              成功: {importResult.success}件、失敗: {importResult.failed}件
            </Alert>

            {importResult.errors.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  エラー詳細:
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>行</TableCell>
                        <TableCell>メールアドレス</TableCell>
                        <TableCell>ユーザー名</TableCell>
                        <TableCell>エラー</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.email}</TableCell>
                          <TableCell>{error.username}</TableCell>
                          <TableCell>
                            <Alert severity="error" sx={{ py: 0 }}>
                              {error.error}
                            </Alert>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 'upload' && (
          <Button onClick={handleClose} disabled={importing}>
            キャンセル
          </Button>
        )}
        
        {step === 'preview' && (
          <>
            <Button onClick={handleReset} disabled={importing}>
              戻る
            </Button>
            <Button 
              onClick={handleImport} 
              variant="contained" 
              disabled={importing || csvData.length === 0}
              startIcon={importing ? <CircularProgress size={16} /> : <CloudUpload />}
            >
              {importing ? 'インポート中...' : `${csvData.length}件をインポート`}
            </Button>
          </>
        )}
        
        {step === 'result' && (
          <Button onClick={handleClose} variant="contained">
            完了
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportUsersDialog;