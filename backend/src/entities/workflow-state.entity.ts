import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowTransition } from './workflow-transition.entity';
import { ApprovalStep } from './approval-step.entity';
import { StateAction } from './state-action.entity';

@Entity('workflow_states')
@Unique('uq_workflow_state_key', ['workflowId', 'stateKey'])
@Index('idx_workflow_states_workflow', ['workflowId'])
@Index('idx_workflow_states_initial', ['isInitial'])
@Index('idx_workflow_states_final', ['isFinal'])
export class WorkflowState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ name: 'state_key', type: 'text' })
  stateKey: string;

  @Column({ type: 'text' })
  label: string;

  @Column({ name: 'is_initial', type: 'boolean', default: false })
  isInitial: boolean;

  @Column({ name: 'is_final', type: 'boolean', default: false })
  isFinal: boolean;

  @Column({ name: 'sla_hours', type: 'int', nullable: true })
  slaHours: number | null;

  @Column({ name: 'notification_template', type: 'text', nullable: true })
  notificationTemplate: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => WorkflowDefinition, (workflow) => workflow.states, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowDefinition;

  @OneToMany(() => WorkflowTransition, (transition) => transition.fromState)
  outgoingTransitions: WorkflowTransition[];

  @OneToMany(() => WorkflowTransition, (transition) => transition.toState)
  incomingTransitions: WorkflowTransition[];

  @OneToMany(() => ApprovalStep, (step) => step.state)
  steps: ApprovalStep[];

  @OneToMany(() => StateAction, (action) => action.state)
  actions: StateAction[];

  // Helper methods
  getAvailableActions(): StateAction[] {
    return this.actions?.sort((a, b) => a.displayOrder - b.displayOrder) || [];
  }

  getDefaultAction(): StateAction | null {
    return this.actions?.find(action => action.isDefault) || null;
  }

  getActionByKey(actionKey: string): StateAction | null {
    return this.actions?.find(action => action.actionKey === actionKey) || null;
  }

  hasSLA(): boolean {
    return this.slaHours !== null && this.slaHours > 0;
  }
}