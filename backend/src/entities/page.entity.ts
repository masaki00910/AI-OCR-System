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
import { Document } from './document.entity';
import { Extraction } from './extraction.entity';

export enum OcrStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

@Entity('pages')
@Unique(['documentId', 'pageNo'])
@Index('idx_pages_document', ['documentId'])
@Index('idx_pages_status', ['ocrStatus'])
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'page_no', type: 'int' })
  pageNo: number;

  @Column({ name: 'image_path', type: 'text', nullable: true })
  imagePath: string | null;

  @Column({
    name: 'ocr_status',
    type: 'text',
    enum: OcrStatus,
    default: OcrStatus.PENDING,
  })
  ocrStatus: OcrStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Document, (document) => document.pages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @OneToMany(() => Extraction, (extraction) => extraction.page)
  extractions: Extraction[];
}