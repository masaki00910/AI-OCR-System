import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest } from '../services/auth';

interface LoginFormData {
  tenantName: string;
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      const credentials: LoginRequest = {
        tenantName: data.tenantName,
        email: data.email,
        password: data.password,
      };
      
      await login(credentials);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('メールアドレスまたはパスワードが間違っています');
      } else {
        setError('ログインに失敗しました。しばらくしてから再度お試しください。');
      }
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        py={3}
      >
        <Paper elevation={3} sx={{ width: '100%', maxWidth: 400 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box textAlign="center" mb={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                  ドキュメント点検システム
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  アカウントにログインしてください
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <TextField
                  {...register('tenantName', {
                    required: '会社IDを入力してください',
                  })}
                  fullWidth
                  label="会社ID"
                  autoComplete="organization"
                  margin="normal"
                  error={!!errors.tenantName}
                  helperText={errors.tenantName?.message}
                  disabled={isSubmitting}
                />

                <TextField
                  {...register('email', {
                    required: 'メールアドレスを入力してください',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '有効なメールアドレスを入力してください',
                    },
                  })}
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  autoComplete="email"
                  margin="normal"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isSubmitting}
                />

                <TextField
                  {...register('password', {
                    required: 'パスワードを入力してください',
                    minLength: {
                      value: 6,
                      message: 'パスワードは6文字以上で入力してください',
                    },
                  })}
                  fullWidth
                  label="パスワード"
                  type="password"
                  autoComplete="current-password"
                  margin="normal"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={isSubmitting}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'ログイン'
                  )}
                </Button>
              </form>

              <Box mt={2} textAlign="center">
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  デモアカウント:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', cursor: 'pointer' }} 
                  onClick={() => navigator.clipboard?.writeText('デモ株式会社')}
                  title="クリックでコピー">
                  会社ID: デモ株式会社
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', cursor: 'pointer' }} 
                  onClick={() => navigator.clipboard?.writeText('admin@demo.com')}
                  title="クリックでコピー">
                  メール: admin@demo.com
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', cursor: 'pointer' }} 
                  onClick={() => navigator.clipboard?.writeText('demo123')}
                  title="クリックでコピー">
                  パスワード: demo123
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;