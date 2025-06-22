import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { WorkflowState } from './workflow-state.entity';

@Entity('state_actions')
@Unique('uq_state_action', ['stateId', 'actionKey'])
@Index('idx_state_actions_state', ['stateId'])
@Index('idx_state_actions_order', ['displayOrder'])
@Index('idx_state_actions_default', ['isDefault'])
@Index('idx_state_actions_role', ['requiresRole'])
export class StateAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'state_id', type: 'uuid' })
  stateId: string;

  @Column({ name: 'action_key', type: 'text' })
  actionKey: string;

  @Column({ name: 'action_label', type: 'text' })
  actionLabel: string;

  @Column({ name: 'next_state_id', type: 'uuid', nullable: true })
  nextStateId: string | null;

  @Column({ name: 'requires_role', type: 'text', nullable: true })
  requiresRole: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => WorkflowState, (state) => state.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'state_id' })
  state: WorkflowState;

  @ManyToOne(() => WorkflowState, { nullable: true })
  @JoinColumn({ name: 'next_state_id' })
  nextState: WorkflowState | null;

  // Helper methods
  canBeExecutedByRole(userRole: string): boolean {
    if (!this.requiresRole) {
      return true;
    }
    
    // Role hierarchy: admin > editor > viewer
    const roleHierarchy = ['viewer', 'editor', 'admin'];
    const requiredRoleIndex = roleHierarchy.indexOf(this.requiresRole);
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    
    return userRoleIndex >= requiredRoleIndex;
  }

  isTransition(): boolean {
    return this.nextStateId !== null;
  }

  isSystemAction(): boolean {
    return ['delegate', 'request_changes', 'cancel'].includes(this.actionKey);
  }

  getButtonVariant(): string {
    switch (this.actionKey) {
      case 'approve':
        return 'success';
      case 'reject':
        return 'error';
      case 'delegate':
        return 'warning';
      case 'request_changes':
        return 'info';
      default:
        return 'primary';
    }
  }

  getIcon(): string {
    switch (this.actionKey) {
      case 'approve':
        return 'check';
      case 'reject':
        return 'close';
      case 'delegate':
        return 'person_add';
      case 'request_changes':
        return 'edit';
      case 'cancel':
        return 'cancel';
      default:
        return 'play_arrow';
    }
  }
}