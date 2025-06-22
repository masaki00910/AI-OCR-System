import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Document } from './document.entity';
import { ParcelArea } from './parcel-area.entity';
import { ParcelPoint } from './parcel-point.entity';
import { AreaDetail } from './area-detail.entity';

@Entity('parcels')
export class Parcel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  document_id: number;

  @Column({ type: 'text', nullable: true })
  lot_no: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 6677, nullable: true })
  geom: any;

  @Column({ type: 'date', nullable: true })
  survey_date: Date;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  @Column({ nullable: true })
  created_by: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Document, (document) => document.parcels, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @OneToMany(() => ParcelArea, (parcelArea) => parcelArea.parcel)
  parcelAreas: ParcelArea[];

  @OneToMany(() => ParcelPoint, (parcelPoint) => parcelPoint.parcel)
  parcelPoints: ParcelPoint[];

  @OneToMany(() => AreaDetail, (areaDetail) => areaDetail.parcel)
  areaDetails: AreaDetail[];
}