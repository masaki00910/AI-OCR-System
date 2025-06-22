import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { User, ChangePasswordRequest } from '../types/user.types';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (passwordData: ChangePasswordRequest) => Promise<void>;
  user: User | null;
  loading?: boolean;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onClose,
  onSave,
  user,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // New password validation
    if (!formData.newPassword) {
      newErrors.newPassword = '新しいパスワードは必須です';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'パスワードは6文字以上で入力してください';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワード確認は必須です';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
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

    setSaving(true);
    try {
      const passwordData: ChangePasswordRequest = {
        newPassword: formData.newPassword,
      };
      await onSave(passwordData);
      onClose();
    } catch (error) {
      console.error('Failed to change password:', error);
      // Error handling is done by parent component
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={saving}
    >
      <DialogTitle>
        パスワード変更: {user?.username}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            このユーザーのパスワードを変更します。新しいパスワードをユーザーに安全に共有してください。
          </Alert>

          {/* New Password */}
          <TextField
            fullWidth
            label="新しいパスワード"
            type={showNewPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
            disabled={saving}
            required
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    disabled={saving}
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Confirm Password */}
          <TextField
            fullWidth
            label="パスワード確認"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            disabled={saving}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    disabled={saving}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={saving}
        >
          キャンセル
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="warning"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? '変更中...' : 'パスワード変更'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;