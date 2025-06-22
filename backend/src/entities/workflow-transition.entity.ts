import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowState } from './workflow-state.entity';

@Entity('workflow_transitions')
@Index('idx_workflow_transitions_workflow', ['workflowId'])
@Index('idx_workflow_transitions_from', ['fromStateId'])
@Index('idx_workflow_transitions_to', ['toStateId'])
@Index('idx_workflow_transitions_action', ['actionKey'])
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ name: 'from_state_id', type: 'uuid', nullable: true })
  fromStateId: string | null;

  @Column({ name: 'to_state_id', type: 'uuid' })
  toStateId: string;

  @Column({ name: 'action_key', type: 'text' })
  actionKey: string;

  @Column({ name: 'action_label', type: 'text' })
  actionLabel: string;

  @Column({ name: 'condition_expr', type: 'jsonb', nullable: true })
  conditionExpr: { [key: string]: any } | null;

  @Column({ name: 'requires_comment', type: 'boolean', default: false })
  requiresComment: boolean;

  @Column({ name: 'auto_advance', type: 'boolean', default: false })
  autoAdvance: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => WorkflowDefinition, (workflow) => workflow.transitions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowDefinition;

  @ManyToOne(() => WorkflowState, (state) => state.outgoingTransitions, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_state_id' })
  fromState: WorkflowState | null;

  @ManyToOne(() => WorkflowState, (state) => state.incomingTransitions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_state_id' })
  toState: WorkflowState;

  // Helper methods
  isInitialTransition(): boolean {
    return this.fromStateId === null;
  }

  hasCondition(): boolean {
    return this.conditionExpr !== null && Object.keys(this.conditionExpr).length > 0;
  }

  evaluateCondition(context: { [key: string]: any }): boolean {
    if (!this.hasCondition()) {
      return true;
    }

    try {
      // 動的インポートを避けるため、シンプルな条件評価を実装
      return this.evaluateSimpleCondition(this.conditionExpr, context);
    } catch (error) {
      // 評価エラーの場合は条件を通す（安全側に倒す）
      return true;
    }
  }

  private evaluateSimpleCondition(expression: any, context: any): boolean {
    if (!expression || typeof expression !== 'object') {
      return true;
    }

    const operator = Object.keys(expression)[0];
    const operand = expression[operator];

    switch (operator) {
      case '>':
        if (Array.isArray(operand) && operand.length === 2) {
          const [left, right] = operand.map(val => this.resolveValue(val, context));
          return Number(left) > Number(right);
        }
        return true;
      
      case '>=':
        if (Array.isArray(operand) && operand.length === 2) {
          const [left, right] = operand.map(val => this.resolveValue(val, context));
          return Number(left) >= Number(right);
        }
        return true;
      
      case '<':
        if (Array.isArray(operand) && operand.length === 2) {
          const [left, right] = operand.map(val => this.resolveValue(val, context));
          return Number(left) < Number(right);
        }
        return true;
      
      case '==':
        if (Array.isArray(operand) && operand.length === 2) {
          const [left, right] = operand.map(val => this.resolveValue(val, context));
          return left === right;
        }
        return true;
      
      case 'and':
        if (Array.isArray(operand)) {
          return operand.every(condition => this.evaluateSimpleCondition(condition, context));
        }
        return true;
      
      case 'or':
        if (Array.isArray(operand)) {
          return operand.some(condition => this.evaluateSimpleCondition(condition, context));
        }
        return true;
      
      default:
        return true;
    }
  }

  private resolveValue(value: any, context: any): any {
    if (typeof value === 'object' && value !== null && value.var) {
      // 変数参照: { "var": "amount" } -> context.amount
      const path = value.var;
      return path.split('.').reduce((obj: any, key: string) => {
        return obj && typeof obj === 'object' ? obj[key] : undefined;
      }, context);
    }
    return value;
  }
}