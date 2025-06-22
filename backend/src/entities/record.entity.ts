import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('records')
@Index('idx_records_document', ['documentId'])
@Index('idx_records_tenant', ['tenantId'])
@Index('idx_records_field', ['documentId', 'fieldName'])
@Index('idx_records_group', ['tableGroupId'])
@Index('idx_records_validated', ['isValidated'])
export class Record {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'table_group_id', type: 'text', nullable: true })
  tableGroupId: string | null;

  @Column({ name: 'field_name', type: 'text' })
  fieldName: string;

  @Column({ name: 'field_value', type: 'text', nullable: true })
  fieldValue: string | null;

  @Column({ name: 'field_type', type: 'text', nullable: true })
  fieldType: string | null;

  @Column({ name: 'row_index', type: 'int', default: 0 })
  rowIndex: number;

  @Column({ name: 'is_validated', type: 'boolean', default: false })
  isValidated: boolean;

  @Column({ name: 'validated_by', type: 'uuid', nullable: true })
  validatedById: string | null;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: { [key: string]: any };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Document, (document) => document.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Tenant, (tenant) => tenant.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, (user) => user.validatedRecords, { nullable: true })
  @JoinColumn({ name: 'validated_by' })
  validatedBy: User | null;

  // Helper method to parse value based on type
  getParsedValue(): any {
    if (!this.fieldValue) return null;
    
    switch (this.fieldType) {
      case 'number':
        return parseFloat(this.fieldValue);
      case 'boolean':
        return this.fieldValue.toLowerCase() === 'true';
      case 'json':
      case 'array':
      case 'object':
        try {
          return JSON.parse(this.fieldValue);
        } catch {
          return this.fieldValue;
        }
      case 'date':
        return new Date(this.fieldValue);
      default:
        return this.fieldValue;
    }
  }
}