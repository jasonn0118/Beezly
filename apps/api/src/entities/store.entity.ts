import { Entity, Column, OneToMany, Generated } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Receipt } from './receipt.entity';

@Entity('Store')
export class Store extends BaseEntity {
  @Column({ name: 'store_sk', type: 'uuid', unique: true })
  @Generated('uuid')
  storeSk: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ name: 'postal_code', nullable: true })
  postalCode?: string;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number;

  @Column({ name: 'place_id', nullable: true, unique: true })
  placeId?: string;

  // Relationships
  @OneToMany(() => Receipt, (receipt) => receipt.store)
  receipts: Receipt[];
}
