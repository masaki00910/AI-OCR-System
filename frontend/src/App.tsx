import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AppHeader from './components/AppHeader';
import LoginPage from './pages/LoginPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import TemplatesPage from './pages/TemplatesPage';
import ProjectListPage from './pages/ProjectListPage';
import InspectionPage from './pages/InspectionPage';
import ExportsPage from './pages/ExportsPage';
import WorkflowsPage from './pages/WorkflowsPage';
import WorkflowBuilderPage from './pages/WorkflowBuilderPage';
import UsersPage from './pages/UsersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';
import Navigation from './components/Navigation';
import LLMModelSelectionDialog from './components/LLMModelSelectionDialog';
import { userPreferencesService } from './services/user-preferences';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// メインアプリケーションコンポーネント（認証コンテキスト内）
const MainApp: React.FC = () => {
  const { showLLMDialog, setShowLLMDialog } = useAuth();

  const handleLLMDialogSave = (settings: any, dontShowAgain: boolean) => {
    if (dontShowAgain) {
      userPreferencesService.setShowLLMSelectionDialog(false);
    }
    setShowLLMDialog(false);
  };

  const handleLLMDialogClose = () => {
    setShowLLMDialog(false);
  };

  return (
    <>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <PrivateRoute>
              <Box sx={{ pb: 7 }}> {/* Add bottom padding for navigation */}
                <AppHeader />
                <Routes>
                  <Route path="/" element={<Navigate to="/documents" replace />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/documents/:id" element={<DocumentDetailPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/exports" element={<ExportsPage />} />
                  <Route path="/workflows" element={<WorkflowsPage />} />
                  <Route path="/workflow-builder" element={<WorkflowBuilderPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/inspection/:documentId" element={<InspectionPage />} />
                  {/* Legacy routes for backward compatibility */}
                  <Route path="/projects" element={<Navigate to="/documents" replace />} />
                  <Route path="/inspection/:projectId" element={<InspectionPage />} />
                </Routes>
                <Navigation />
              </Box>
            </PrivateRoute>
          } />
        </Routes>
      </Router>

      {/* LLM Model Selection Dialog */}
      <LLMModelSelectionDialog
        open={showLLMDialog}
        onClose={handleLLMDialogClose}
        onSave={handleLLMDialogSave}
      />
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;