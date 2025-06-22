import { api } from './api';

export interface LoginRequest {
  tenantName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    tenantId: string;
    tenantName: string;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  tenantId: string;
  tenantName: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    const { accessToken, user } = response.data;
    
    // Store token and user info
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    // Set default Authorization header
    this.setAuthHeader(accessToken);
    
    return response.data;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    delete api.defaults.headers.common['Authorization'];
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  setAuthHeader(token: string): void {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  initializeAuth(): void {
    const token = this.getToken();
    if (token) {
      this.setAuthHeader(token);
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  }
}

export const authService = new AuthService();

// Initialize auth on service creation
authService.initializeAuth();