// Export all entities for easy import
export { Tenant } from './tenant.entity';
export { User, UserRole } from './user.entity';
export { Template } from './template.entity';
export { PromptTemplate, PromptRole } from './prompt-template.entity';
export { Document, DocumentStatus } from './document.entity';
export { Page, OcrStatus } from './page.entity';
export { Extraction } from './extraction.entity';
export { Record } from './record.entity';
export { Export, ExportFormat, ExportStatus } from './export.entity';
export { AuditLog, AuditOperation } from './audit-log.entity';

// Workflow entities (Phase 8)
export { WorkflowDefinition } from './workflow-definition.entity';
export { WorkflowState } from './workflow-state.entity';
export { WorkflowTransition } from './workflow-transition.entity';
export { ApprovalInstance } from './approval-instance.entity';
export { ApprovalStep } from './approval-step.entity';
export { StateAction } from './state-action.entity';