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

  // Address components from Azure OCR
  @Column({ name: 'street_number', nullable: true })
  streetNumber?: string; // House number (e.g., "2929")

  @Column({ nullable: true })
  road?: string; // Road name (e.g., "BARNET HWY")

  @Column({ name: 'street_address', nullable: true })
  streetAddress?: string; // Combination of street number + road (e.g., "2929 BARNET HWY")

  @Column({ name: 'full_address', nullable: true })
  fullAddress?: string; // Complete formatted address

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ name: 'postal_code', nullable: true })
  postalCode?: string;

  @Column({ name: 'country_region', nullable: true })
  countryRegion?: string;

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
