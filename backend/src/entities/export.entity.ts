import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Template } from './template.entity';
import { User } from './user.entity';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
  XML = 'xml',
  PDF = 'pdf',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

@Entity('exports')
@Index('idx_exports_tenant', ['tenantId'])
@Index('idx_exports_status', ['status'])
@Index('idx_exports_created', ['createdAt'])
export class Export {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({
    type: 'text',
    enum: ExportFormat,
  })
  format: ExportFormat;

  @Column({ name: 'filter_json', type: 'jsonb', default: {} })
  filterJson: { [key: string]: any };

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({
    type: 'text',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  status: ExportStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.exports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: Template | null;

  @ManyToOne(() => User, (user) => user.exports, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;
}