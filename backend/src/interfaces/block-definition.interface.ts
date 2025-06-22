export interface BlockDefinition {
  block_id: string;
  label: string;
  prompt?: string;
  schema: any; // JSON Schema
}