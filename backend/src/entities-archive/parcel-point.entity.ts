import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Parcel } from './parcel.entity';

export enum PointRole {
  BOUNDARY = 'Boundary',
  CONTROL = 'Control',
  REFERENCE = 'Reference',
}

@Entity('parcel_points')
export class ParcelPoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parcel_id: number;

  @Column({ type: 'text', nullable: true })
  pt_name: string;

  @Column({
    type: 'text',
    enum: PointRole,
    nullable: true,
  })
  role: PointRole;

  @Column({ type: 'text', nullable: true })
  marker_type: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  x: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  y: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 6677, nullable: true })
  geom: any;

  @ManyToOne(() => Parcel, (parcel) => parcel.parcelPoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;
}