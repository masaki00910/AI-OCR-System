import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApprovalInstance } from './approval-instance.entity';
import { WorkflowState } from './workflow-state.entity';
import { User } from './user.entity';

@Entity('approval_steps')
@Index('idx_approval_steps_instance', ['instanceId'])
@Index('idx_approval_steps_state', ['stateId'])
@Index('idx_approval_steps_assigned', ['assignedToId'])
@Index('idx_approval_steps_status', ['status'])
@Index('idx_approval_steps_due', ['dueAt'])
export class ApprovalStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'instance_id', type: 'uuid' })
  instanceId: string;

  @Column({ name: 'state_id', type: 'uuid' })
  stateId: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @Column({ type: 'text', default: 'pending' })
  status: string; // pending, approved, rejected, delegated, timeout

  @Column({ name: 'action_taken', type: 'text', nullable: true })
  actionTaken: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'delegated_to', type: 'uuid', nullable: true })
  delegatedToId: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'now()' })
  assignedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => ApprovalInstance, (instance) => instance.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance: ApprovalInstance;

  @ManyToOne(() => WorkflowState, (state) => state.steps)
  @JoinColumn({ name: 'state_id' })
  state: WorkflowState;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegated_to' })
  delegatedTo: User | null;

  // Helper methods
  isPending(): boolean {
    return this.status === 'pending';
  }

  isApproved(): boolean {
    return this.status === 'approved';
  }

  isRejected(): boolean {
    return this.status === 'rejected';
  }

  isDelegated(): boolean {
    return this.status === 'delegated';
  }

  isTimeout(): boolean {
    return this.status === 'timeout';
  }

  isCompleted(): boolean {
    return ['approved', 'rejected', 'delegated', 'timeout'].includes(this.status);
  }

  isOverdue(): boolean {
    return this.dueAt !== null && new Date() > this.dueAt && this.isPending();
  }

  getDuration(): number | null {
    if (!this.completedAt) {
      return null;
    }
    return Math.floor((this.completedAt.getTime() - this.assignedAt.getTime()) / (1000 * 60 * 60)); // hours
  }

  getEffectiveAssignee(): User | null {
    return this.delegatedTo || this.assignedTo;
  }

  canBeCompletedBy(userId: string): boolean {
    const assignee = this.getEffectiveAssignee();
    return assignee?.id === userId && this.isPending();
  }
}