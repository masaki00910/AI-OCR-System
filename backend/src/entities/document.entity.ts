import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Template } from './template.entity';
import { User } from './user.entity';
import { Page } from './page.entity';
import { Record } from './record.entity';
import { Extraction } from './extraction.entity';

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

@Entity('documents')
@Index('idx_documents_tenant', ['tenantId'])
@Index('idx_documents_template', ['templateId'])
@Index('idx_documents_status', ['status'])
@Index('idx_documents_created', ['createdAt'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'file_name', type: 'text' })
  fileName: string;

  @Column({ name: 'file_type', type: 'text' })
  fileType: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({ name: 'storage_path', type: 'text' })
  storagePath: string;

  @Column({ name: 'page_count', type: 'int', default: 0 })
  pageCount: number;

  @Column({
    type: 'text',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADED,
  })
  status: DocumentStatus;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedById: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedById: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: { [key: string]: any };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Template, (template) => template.documents)
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => User, (user) => user.uploadedDocuments, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User | null;

  @ManyToOne(() => User, (user) => user.approvedDocuments, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User | null;

  @OneToMany(() => Page, (page) => page.document)
  pages: Page[];

  @OneToMany(() => Record, (record) => record.document)
  records: Record[];

  @OneToMany(() => Extraction, (extraction) => extraction.document)
  extractions: Extraction[];
}