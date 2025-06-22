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
import { Document } from './document.entity';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowState } from './workflow-state.entity';
import { User } from './user.entity';
import { ApprovalStep } from './approval-step.entity';

@Entity('approval_instances')
@Index('idx_approval_instances_tenant', ['tenantId'])
@Index('idx_approval_instances_document', ['documentId'])
@Index('idx_approval_instances_workflow', ['workflowId'])
@Index('idx_approval_instances_status', ['status'])
@Index('idx_approval_instances_current_state', ['currentStateId'])
export class ApprovalInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ name: 'current_state_id', type: 'uuid', nullable: true })
  currentStateId: string | null;

  @Column({ type: 'text', default: 'active' })
  status: string; // active, completed, cancelled

  @Column({ name: 'started_by', type: 'uuid', nullable: true })
  startedById: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: { [key: string]: any };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => WorkflowDefinition, (workflow) => workflow.instances)
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowDefinition;

  @ManyToOne(() => WorkflowState, { nullable: true })
  @JoinColumn({ name: 'current_state_id' })
  currentState: WorkflowState | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'started_by' })
  startedBy: User | null;

  @OneToMany(() => ApprovalStep, (step) => step.instance)
  steps: ApprovalStep[];

  // Helper methods
  isActive(): boolean {
    return this.status === 'active';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  isOverdue(): boolean {
    return this.dueAt !== null && new Date() > this.dueAt;
  }

  getCurrentStep(): ApprovalStep | null {
    return this.steps?.find(step => step.status === 'pending') || null;
  }

  getPendingSteps(): ApprovalStep[] {
    return this.steps?.filter(step => step.status === 'pending') || [];
  }

  getCompletedSteps(): ApprovalStep[] {
    return this.steps?.filter(step => ['approved', 'rejected', 'delegated'].includes(step.status)) || [];
  }

  getDuration(): number | null {
    if (!this.completedAt) {
      return null;
    }
    return Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60 * 60)); // hours
  }
}