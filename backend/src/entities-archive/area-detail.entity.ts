import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Parcel } from './parcel.entity';

export enum CalculationMethod {
  TRIANGLE = 'Triangle',
  COORDINATE = 'Coordinate',
}

@Entity('area_details')
export class AreaDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parcel_id: number;

  @Column({ type: 'smallint', nullable: true })
  seq: number;

  @Column({
    type: 'text',
    enum: CalculationMethod,
    nullable: true,
  })
  method: CalculationMethod;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  base_m: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  height_m: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  x: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  y: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  next_x: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  next_y: number;

  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true })
  twice_area: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  area_m2: number;

  @ManyToOne(() => Parcel, (parcel) => parcel.areaDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;
}