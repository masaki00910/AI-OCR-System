import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Document } from './document.entity';

export enum ProjectStatus {
  UNTOUCHED = '未着手',
  INSPECTING = '点検中',
  COMPLETED = '完了',
  RETURNED = '差戻し',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({
    type: 'text',
    enum: ProjectStatus,
    default: ProjectStatus.UNTOUCHED,
  })
  status: ProjectStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Document, (document) => document.project)
  documents: Document[];
}