import { UserRole } from '../../entities/user.entity';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    tenantId: string;
    tenantName: string;
  };
}