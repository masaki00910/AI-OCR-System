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
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { WorkflowState } from './workflow-state.entity';
import { WorkflowTransition } from './workflow-transition.entity';
import { ApprovalInstance } from './approval-instance.entity';

@Entity('workflow_definitions')
@Unique('uq_workflow_ver', ['tenantId', 'name', 'version'])
@Index('idx_workflow_definitions_tenant', ['tenantId'])
@Index('idx_workflow_definitions_active', ['isActive'])
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'graph_json', type: 'jsonb' })
  graphJson: { [key: string]: any };

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @OneToMany(() => WorkflowState, (state) => state.workflow)
  states: WorkflowState[];

  @OneToMany(() => WorkflowTransition, (transition) => transition.workflow)
  transitions: WorkflowTransition[];

  @OneToMany(() => ApprovalInstance, (instance) => instance.workflow)
  instances: ApprovalInstance[];

  // Helper methods
  getInitialState(): WorkflowState | null {
    return this.states?.find(state => state.isInitial) || null;
  }

  getFinalStates(): WorkflowState[] {
    return this.states?.filter(state => state.isFinal) || [];
  }

  getStateByKey(stateKey: string): WorkflowState | null {
    return this.states?.find(state => state.stateKey === stateKey) || null;
  }
}