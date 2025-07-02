import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box,
} from '@mui/material';
import {
  Dashboard,
  Settings,
  CloudUpload,
  FileDownload,
  AccountTree,
  Construction,
  People,
  History,
  Tune,
} from '@mui/icons-material';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getValueFromPath = (pathname: string): number => {
    if (pathname === '/documents' || pathname === '/') return 0;
    if (pathname === '/templates') return 1;
    if (pathname === '/exports') return 2;
    if (pathname === '/workflows') return 3;
    if (pathname === '/workflow-builder') return 4;
    if (pathname === '/users') return 5;
    if (pathname === '/audit-logs') return 6;
    if (pathname === '/settings') return 7;
    return 0;
  };

  const value = getValueFromPath(location.pathname);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/documents');
        break;
      case 1:
        navigate('/templates');
        break;
      case 2:
        navigate('/exports');
        break;
      case 3:
        navigate('/workflows');
        break;
      case 4:
        navigate('/workflow-builder');
        break;
      case 5:
        navigate('/users');
        break;
      case 6:
        navigate('/audit-logs');
        break;
      case 7:
        navigate('/settings');
        break;
      default:
        break;
    }
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1000 
      }} 
      elevation={3}
    >
      <BottomNavigation value={value} onChange={handleChange}>
        <BottomNavigationAction
          label="ドキュメント"
          icon={<Dashboard />}
        />
        <BottomNavigationAction
          label="テンプレート"
          icon={<Settings />}
        />
        <BottomNavigationAction
          label="エクスポート"
          icon={<FileDownload />}
        />
        <BottomNavigationAction
          label="ワークフロー"
          icon={<AccountTree />}
        />
        <BottomNavigationAction
          label="ビルダー"
          icon={<Construction />}
        />
        <BottomNavigationAction
          label="ユーザー"
          icon={<People />}
        />
        <BottomNavigationAction
          label="監査ログ"
          icon={<History />}
        />
        <BottomNavigationAction
          label="設定"
          icon={<Tune />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default Navigation;