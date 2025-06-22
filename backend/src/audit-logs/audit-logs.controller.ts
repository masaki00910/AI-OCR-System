import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';

@Controller('api/v1/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @CurrentUser() currentUser: User,
    @Query() queryDto: AuditLogsQueryDto,
  ) {
    return this.auditLogsService.findAll(queryDto, currentUser.tenantId);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN)
  async getSummary(@CurrentUser() currentUser: User) {
    return this.auditLogsService.getSummary(currentUser.tenantId);
  }

  @Get('search')
  @Roles(UserRole.ADMIN)
  async searchFullText(
    @CurrentUser() currentUser: User,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    const searchLimit = limit ? Math.min(limit, 100) : 50; // Max 100 results
    return this.auditLogsService.searchFullText(query, currentUser.tenantId, searchLimit);
  }

  @Get('export/csv')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportCsv(
    @CurrentUser() currentUser: User,
    @Query() queryDto: AuditLogsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.auditLogsService.exportToCsv(queryDto, currentUser.tenantId);
    
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    return res.send(csv);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(
    @CurrentUser() currentUser: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auditLogsService.findById(id, currentUser.tenantId);
  }

  @Get('tables/list')
  @Roles(UserRole.ADMIN)
  async getTableNames(@CurrentUser() currentUser: User) {
    // Return list of table names that have audit logs
    // This is a simplified version - in production you might want to get this from the database
    return [
      { value: 'users', label: 'ユーザー' },
      { value: 'documents', label: 'ドキュメント' },
      { value: 'templates', label: 'テンプレート' },
      { value: 'prompt_templates', label: 'プロンプトテンプレート' },
      { value: 'extractions', label: '抽出結果' },
      { value: 'records', label: 'レコード' },
      { value: 'exports', label: 'エクスポート' },
      { value: 'workflow_definitions', label: 'ワークフロー定義' },
      { value: 'approval_instances', label: '承認インスタンス' },
      { value: 'approval_steps', label: '承認ステップ' },
    ];
  }

  @Get('operations/list')
  @Roles(UserRole.ADMIN)
  async getOperations() {
    return [
      { value: 'INSERT', label: '作成' },
      { value: 'UPDATE', label: '更新' },
      { value: 'DELETE', label: '削除' },
      { value: 'SELECT', label: '参照' },
    ];
  }
}