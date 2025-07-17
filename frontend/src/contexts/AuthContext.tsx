import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User, LoginRequest } from '../services/auth';
import { userPreferencesService } from '../services/user-preferences';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  showLLMDialog: boolean;
  setShowLLMDialog: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLLMDialog, setShowLLMDialog] = useState(false);

  useEffect(() => {
    // Initialize authentication state on app startup
    const initAuth = () => {
      try {
        const storedUser = authService.getUser();
        if (storedUser && authService.isAuthenticated()) {
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      setUser(response.user);
      
      // ログイン後にLLMダイアログを表示するかチェック
      const preferences = userPreferencesService.getPreferences();
      setShowLLMDialog(preferences.showLLMSelectionDialog);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user && authService.isAuthenticated(),
    showLLMDialog,
    setShowLLMDialog,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};