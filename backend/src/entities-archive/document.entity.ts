import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Project } from './project.entity';
import { Parcel } from './parcel.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column({ type: 'text' })
  file_name: string;

  @Column({ type: 'text' })
  storage_path: string;

  @Column({ nullable: true })
  page_count: number;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @CreateDateColumn()
  uploaded_at: Date;

  @ManyToOne(() => Project, (project) => project.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => Parcel, (parcel) => parcel.document)
  parcels: Parcel[];
}