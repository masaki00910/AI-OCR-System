import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  ApprovalInstance,
  ApprovalStep,
  StateAction,
  Document,
} from '../entities';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinition,
      WorkflowState,
      WorkflowTransition,
      ApprovalInstance,
      ApprovalStep,
      StateAction,
      Document,
    ]),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}