export enum AuditOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SELECT = 'SELECT',
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  tableName: string;
  recordId: string;
  operation: AuditOperation;
  oldValues: { [key: string]: any } | null;
  newValues: { [key: string]: any } | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user?: {
    id: string;
    username: string;
    email: string;
  } | null;
}

export interface AuditLogsResult {
  auditLogs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsSummary {
  totalLogs: number;
  totalUsers: number;
  totalTables: number;
  operationCounts: { [key in AuditOperation]: number };
  todayLogs: number;
  weekLogs: number;
  monthLogs: number;
}

export interface AuditLogsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  tableName?: string;
  operation?: AuditOperation;
  startDate?: string;
  endDate?: string;
  recordId?: string;
}

export interface TableOption {
  value: string;
  label: string;
}

export interface OperationOption {
  value: AuditOperation;
  label: string;
}