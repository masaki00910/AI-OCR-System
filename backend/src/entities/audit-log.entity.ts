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
import { User } from './user.entity';

export enum AuditOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SELECT = 'SELECT',
}

@Entity('audit_logs')
@Index('idx_audit_tenant', ['tenantId'])
@Index('idx_audit_user', ['userId'])
@Index('idx_audit_table', ['tableName'])
@Index('idx_audit_created', ['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'table_name', type: 'text' })
  tableName: string;

  @Column({ name: 'record_id', type: 'text' })
  recordId: string;

  @Column({
    type: 'text',
    enum: AuditOperation,
  })
  operation: AuditOperation;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: { [key: string]: any } | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: { [key: string]: any } | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.auditLogs, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // Helper method to get diff
  getDiff(): { [key: string]: { old: any; new: any } } | null {
    if (!this.oldValues || !this.newValues) return null;
    
    const diff: { [key: string]: { old: any; new: any } } = {};
    const allKeys = new Set([
      ...Object.keys(this.oldValues),
      ...Object.keys(this.newValues),
    ]);
    
    allKeys.forEach((key) => {
      const oldVal = this.oldValues?.[key];
      const newVal = this.newValues?.[key];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = { old: oldVal, new: newVal };
      }
    });
    
    return Object.keys(diff).length > 0 ? diff : null;
  }
}