import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog, AuditOperation } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';

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

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(
    queryDto: AuditLogsQueryDto,
    tenantId: string,
  ): Promise<AuditLogsResult> {
    this.logger.log(`=== AuditLogsService.findAll START ===`);
    this.logger.log(`Query: ${JSON.stringify(queryDto, null, 2)}`);
    this.logger.log(`TenantId: ${tenantId}`);

    const {
      page = 1,
      limit = 25,
      search,
      userId,
      tableName,
      operation,
      startDate,
      endDate,
      recordId,
    } = queryDto;

    // Build base query
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .leftJoinAndSelect('auditLog.tenant', 'tenant')
      .where('auditLog.tenantId = :tenantId', { tenantId });

    // Apply filters
    this.applyFilters(queryBuilder, {
      search,
      userId,
      tableName,
      operation,
      startDate,
      endDate,
      recordId,
    });

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by created date (newest first)
    queryBuilder.orderBy('auditLog.createdAt', 'DESC');

    // Execute query
    const [auditLogs, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    this.logger.log(`Found ${auditLogs.length} audit logs out of ${total} total`);

    return {
      auditLogs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string, tenantId: string): Promise<AuditLog | null> {
    this.logger.log(`=== AuditLogsService.findById START ===`);
    this.logger.log(`LogId: ${id}, TenantId: ${tenantId}`);

    const auditLog = await this.auditLogRepository.findOne({
      where: { id, tenantId },
      relations: ['user', 'tenant'],
    });

    return auditLog;
  }

  async getSummary(tenantId: string): Promise<AuditLogsSummary> {
    this.logger.log(`=== AuditLogsService.getSummary START ===`);
    this.logger.log(`TenantId: ${tenantId}`);

    const baseQuery = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.tenantId = :tenantId', { tenantId });

    // Total logs
    const totalLogs = await baseQuery.getCount();

    // Total unique users
    const totalUsers = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select('COUNT(DISTINCT auditLog.userId)', 'count')
      .where('auditLog.tenantId = :tenantId', { tenantId })
      .andWhere('auditLog.userId IS NOT NULL')
      .getRawOne()
      .then(result => parseInt(result.count) || 0);

    // Total unique tables
    const totalTables = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select('COUNT(DISTINCT auditLog.tableName)', 'count')
      .where('auditLog.tenantId = :tenantId', { tenantId })
      .getRawOne()
      .then(result => parseInt(result.count) || 0);

    // Operation counts
    const operationResults = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select('auditLog.operation', 'operation')
      .addSelect('COUNT(*)', 'count')
      .where('auditLog.tenantId = :tenantId', { tenantId })
      .groupBy('auditLog.operation')
      .getRawMany();

    const operationCounts: { [key in AuditOperation]: number } = {
      [AuditOperation.INSERT]: 0,
      [AuditOperation.UPDATE]: 0,
      [AuditOperation.DELETE]: 0,
      [AuditOperation.SELECT]: 0,
    };

    operationResults.forEach((result) => {
      operationCounts[result.operation as AuditOperation] = parseInt(result.count);
    });

    // Time-based counts
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayLogs = await baseQuery
      .clone()
      .andWhere('auditLog.createdAt >= :today', { today })
      .getCount();

    const weekLogs = await baseQuery
      .clone()
      .andWhere('auditLog.createdAt >= :weekAgo', { weekAgo })
      .getCount();

    const monthLogs = await baseQuery
      .clone()
      .andWhere('auditLog.createdAt >= :monthAgo', { monthAgo })
      .getCount();

    const summary: AuditLogsSummary = {
      totalLogs,
      totalUsers,
      totalTables,
      operationCounts,
      todayLogs,
      weekLogs,
      monthLogs,
    };

    this.logger.log(`Summary: ${JSON.stringify(summary, null, 2)}`);
    return summary;
  }

  async exportToCsv(
    queryDto: AuditLogsQueryDto,
    tenantId: string,
  ): Promise<string> {
    this.logger.log(`=== AuditLogsService.exportToCsv START ===`);
    this.logger.log(`TenantId: ${tenantId}`);

    // Remove pagination for export
    const { page, limit, ...filters } = queryDto;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.tenantId = :tenantId', { tenantId });

    this.applyFilters(queryBuilder, filters);
    queryBuilder.orderBy('auditLog.createdAt', 'DESC');

    const auditLogs = await queryBuilder.getMany();

    // Generate CSV
    const csvHeader = [
      'ID',
      'テーブル名',
      'レコードID',
      '操作',
      'ユーザー名',
      'メールアドレス',
      '変更前',
      '変更後',
      'IPアドレス',
      'ユーザーエージェント',
      '作成日時',
    ].join(',');

    const csvRows = auditLogs.map((log) => {
      return [
        log.id,
        log.tableName,
        log.recordId,
        log.operation,
        log.user?.username || '',
        log.user?.email || '',
        log.oldValues ? JSON.stringify(log.oldValues).replace(/"/g, '""') : '',
        log.newValues ? JSON.stringify(log.newValues).replace(/"/g, '""') : '',
        log.ipAddress || '',
        log.userAgent || '',
        log.createdAt.toISOString(),
      ]
        .map((field) => `"${field}"`)
        .join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');

    this.logger.log(`Exported ${auditLogs.length} audit logs to CSV`);
    return csv;
  }

  async searchFullText(
    query: string,
    tenantId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    this.logger.log(`=== AuditLogsService.searchFullText START ===`);
    this.logger.log(`Query: ${query}, TenantId: ${tenantId}, Limit: ${limit}`);

    const searchQuery = `%${query}%`;

    const auditLogs = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.tenantId = :tenantId', { tenantId })
      .andWhere(
        `(
          auditLog.tableName ILIKE :search
          OR auditLog.recordId ILIKE :search
          OR auditLog.operation ILIKE :search
          OR auditLog.oldValues::text ILIKE :search
          OR auditLog.newValues::text ILIKE :search
          OR user.username ILIKE :search
          OR user.email ILIKE :search
        )`,
        { search: searchQuery }
      )
      .orderBy('auditLog.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    this.logger.log(`Found ${auditLogs.length} audit logs for full-text search`);
    return auditLogs;
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<AuditLog>,
    filters: {
      search?: string;
      userId?: string;
      tableName?: string;
      operation?: AuditOperation;
      startDate?: string;
      endDate?: string;
      recordId?: string;
    },
  ): void {
    const { search, userId, tableName, operation, startDate, endDate, recordId } = filters;

    // Search filter (searches across multiple fields)
    if (search) {
      queryBuilder.andWhere(
        `(
          auditLog.tableName ILIKE :search
          OR auditLog.recordId ILIKE :search
          OR auditLog.operation ILIKE :search
          OR user.username ILIKE :search
          OR user.email ILIKE :search
        )`,
        { search: `%${search}%` }
      );
    }

    // User filter
    if (userId) {
      queryBuilder.andWhere('auditLog.userId = :userId', { userId });
    }

    // Table name filter
    if (tableName) {
      queryBuilder.andWhere('auditLog.tableName = :tableName', { tableName });
    }

    // Operation filter
    if (operation) {
      queryBuilder.andWhere('auditLog.operation = :operation', { operation });
    }

    // Record ID filter
    if (recordId) {
      queryBuilder.andWhere('auditLog.recordId = :recordId', { recordId });
    }

    // Date range filter
    if (startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', {
        endDate: new Date(endDate + 'T23:59:59.999Z'), // Include entire end date
      });
    }
  }
}