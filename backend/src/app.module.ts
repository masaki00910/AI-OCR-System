import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TemplatesModule } from './templates/templates.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';
import { OcrModule } from './ocr/ocr.module';
import { ExportsModule } from './exports/exports.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { UsersModule } from './users/users.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';

// Import all entities
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { Template } from './entities/template.entity';
import { PromptTemplate } from './entities/prompt-template.entity';
import { Document } from './entities/document.entity';
import { Page } from './entities/page.entity';
import { Extraction } from './entities/extraction.entity';
import { Record } from './entities/record.entity';
import { Export } from './entities/export.entity';
import { AuditLog } from './entities/audit-log.entity';

// Workflow entities (Phase 8)
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowState } from './entities/workflow-state.entity';
import { WorkflowTransition } from './entities/workflow-transition.entity';
import { ApprovalInstance } from './entities/approval-instance.entity';
import { ApprovalStep } from './entities/approval-step.entity';
import { StateAction } from './entities/state-action.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres_pass'),
        database: configService.get('DATABASE_NAME', 'generic_doc_system'),
        entities: [
          Tenant,
          User,
          Template,
          PromptTemplate,
          Document,
          Page,
          Extraction,
          Record,
          Export,
          AuditLog,
          // Workflow entities (Phase 8)
          WorkflowDefinition,
          WorkflowState,
          WorkflowTransition,
          ApprovalInstance,
          ApprovalStep,
          StateAction,
        ],
        synchronize: false, // Never use synchronize in production
        logging: configService.get('NODE_ENV') === 'development',
        extra: {
          // Connection pool settings
          max: 20,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TemplatesModule,
    DocumentsModule,
    StorageModule,
    OcrModule,
    ExportsModule,
    WorkflowsModule,
    UsersModule,
    AuditLogsModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule {}