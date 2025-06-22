import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Parcel } from './parcel.entity';

@Entity('parcel_areas')
export class ParcelArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parcel_id: number;

  @Column({ type: 'smallint', default: 1 })
  version: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  area_m2: number;

  @Column({ type: 'text', nullable: true })
  source: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  recorded_at: Date;

  @ManyToOne(() => Parcel, (parcel) => parcel.parcelAreas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;
}