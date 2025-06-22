import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
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
import Navigation from './components/Navigation';

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
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
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;