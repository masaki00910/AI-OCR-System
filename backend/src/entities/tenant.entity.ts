import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Template } from './template.entity';
import { Document } from './document.entity';
import { Record } from './record.entity';
import { Export } from './export.entity';
import { AuditLog } from './audit-log.entity';

@Entity('tenants')
@Index('idx_tenants_name', ['name'])
@Index('idx_tenants_active', ['isActive'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'jsonb', default: {} })
  settings: { [key: string]: any };

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Template, (template) => template.tenant)
  templates: Template[];

  @OneToMany(() => Document, (document) => document.tenant)
  documents: Document[];

  @OneToMany(() => Record, (record) => record.tenant)
  records: Record[];

  @OneToMany(() => Export, (export_) => export_.tenant)
  exports: Export[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.tenant)
  auditLogs: AuditLog[];
}