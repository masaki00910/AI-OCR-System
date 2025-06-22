import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import { Email } from '@mui/icons-material';
import { UserRole, InviteUserRequest, RoleOption } from '../types/user.types';

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  onInvite: (inviteData: InviteUserRequest) => Promise<void>;
  roles: RoleOption[];
  loading?: boolean;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  open,
  onClose,
  onInvite,
  roles,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    role: UserRole.VIEWER,
    message: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        email: '',
        username: '',
        role: UserRole.VIEWER,
        message: '',
      });
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'ユーザー名は必須です';
    } else if (formData.username.length < 3) {
      newErrors.username = 'ユーザー名は3文字以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setInviting(true);
    try {
      const inviteData: InviteUserRequest = {
        email: formData.email,
        username: formData.username,
        role: formData.role,
        message: formData.message || undefined,
      };
      await onInvite(inviteData);
      onClose();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      // Error handling is done by parent component
    } finally {
      setInviting(false);
    }
  };

  const handleClose = () => {
    if (!inviting) {
      onClose();
    }
  };

  const generateDefaultMessage = () => {
    return `こんにちは、

あなたを弊社の汎用ドキュメント点検補正システムにご招待いたします。

ユーザー名: ${formData.username}
ロール: ${roles.find(r => r.value === formData.role)?.label || formData.role}

招待リンクを確認し、初回ログイン時にパスワードを設定してください。

よろしくお願いいたします。`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={inviting}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Email />
          ユーザー招待
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            招待メールを送信します。受信者は招待リンクからアカウントを有効化できます。
          </Alert>

          <Grid container spacing={2}>
            {/* Email */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="メールアドレス"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                disabled={inviting}
                required
              />
            </Grid>

            {/* Username */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ユーザー名"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                error={!!errors.username}
                helperText={errors.username}
                disabled={inviting}
                required
              />
            </Grid>

            {/* Role */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>ロール</InputLabel>
                <Select
                  value={formData.role}
                  label="ロール"
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  disabled={inviting}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Custom Message */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="招待メッセージ（オプション）"
                multiline
                rows={6}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                disabled={inviting}
                placeholder="カスタムメッセージを入力してください。空欄の場合、デフォルトメッセージが使用されます。"
                helperText="空欄の場合、標準的な招待メッセージが送信されます"
              />
            </Grid>

            {/* Default message preview */}
            {!formData.message && formData.username && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  デフォルトメッセージプレビュー:
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {generateDefaultMessage()}
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={inviting}
        >
          キャンセル
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={inviting}
          startIcon={inviting ? <CircularProgress size={16} /> : <Email />}
        >
          {inviting ? '送信中...' : '招待メール送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteUserDialog;