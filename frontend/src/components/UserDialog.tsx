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
  FormControlLabel,
  Switch,
  Box,
  Alert,
  CircularProgress,
  Grid,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { User, UserRole, CreateUserRequest, UpdateUserRequest, RoleOption } from '../types/user.types';

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (userData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  user?: User | null; // null for create, User object for edit
  roles: RoleOption[];
  loading?: boolean;
}

const UserDialog: React.FC<UserDialogProps> = ({
  open,
  onClose,
  onSave,
  user,
  roles,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: UserRole.VIEWER,
    isActive: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditMode = !!user;

  useEffect(() => {
    if (open) {
      if (isEditMode && user) {
        // Edit mode - populate with existing user data
        setFormData({
          email: user.email,
          username: user.username,
          password: '',
          confirmPassword: '',
          role: user.role,
          isActive: user.isActive,
        });
      } else {
        // Create mode - reset to defaults
        setFormData({
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          role: UserRole.VIEWER,
          isActive: true,
        });
      }
      setErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, isEditMode, user]);

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

    // Password validation (only for create mode or when password is provided in edit mode)
    if (!isEditMode || formData.password) {
      if (!formData.password) {
        newErrors.password = 'パスワードは必須です';
      } else if (formData.password.length < 6) {
        newErrors.password = 'パスワードは6文字以上で入力してください';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワードが一致しません';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
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
      if (isEditMode) {
        // Edit mode - only send changed fields
        const updateData: UpdateUserRequest = {
          email: formData.email,
          username: formData.username,
          role: formData.role,
          isActive: formData.isActive,
        };
        await onSave(updateData);
      } else {
        // Create mode - send all required fields
        const createData: CreateUserRequest = {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          isActive: formData.isActive,
        };
        await onSave(createData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save user:', error);
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
        {isEditMode ? `ユーザー編集: ${user?.username}` : '新規ユーザー作成'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
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
                disabled={saving}
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
                disabled={saving}
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
                  disabled={saving}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Password (required for create, optional for edit) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={isEditMode ? "新しいパスワード（変更しない場合は空欄）" : "パスワード"}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
                disabled={saving}
                required={!isEditMode}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={saving}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Confirm Password */}
            {(!isEditMode || formData.password) && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="パスワード確認"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  disabled={saving}
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
              </Grid>
            )}

            {/* Active Status */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="アクティブ"
              />
            </Grid>
          </Grid>

          {/* Password change note for edit mode */}
          {isEditMode && (
            <Alert severity="info" sx={{ mt: 2 }}>
              パスワードを変更しない場合は、パスワード欄を空欄のままにしてください。
            </Alert>
          )}
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
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? '保存中...' : (isEditMode ? '更新' : '作成')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDialog;