import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Page } from './page.entity';
import { Document } from './document.entity';
import { User } from './user.entity';


@Entity('extractions')
@Index('idx_extractions_document', ['documentId'])
@Index('idx_extractions_page', ['pageId'])
@Index('idx_extractions_created', ['createdAt'])
export class Extraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'page_id', type: 'uuid', nullable: true })
  pageId: string | null;

  @Column({ name: 'block_id', type: 'varchar', length: 100, nullable: true })
  blockId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  coordinates: { x: number; y: number; width: number; height: number } | null;

  @Column({ type: 'jsonb' })
  content: { [key: string]: any };

  @Column({ name: 'extracted_data', type: 'jsonb', nullable: true })
  extractedData: { [key: string]: any } | null;

  @Column({ type: 'float', nullable: true })
  confidence: number | null;

  @Column({ name: 'model_name', type: 'text', nullable: true })
  modelName: string | null;

  @Column({ name: 'prompt_used', type: 'text', nullable: true })
  promptUsed: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'varchar', length: 50, default: 'completed' })
  status: string;

  @Column({ name: 'correction_history', type: 'jsonb', nullable: true })
  correctionHistory: Array<{
    timestamp: Date;
    userId: string;
    originalData: any;
    correctedData: any;
    reason: string;
  }> | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Page, (page) => page.extractions, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'page_id' })
  page: Page | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedBy: User | null;
}