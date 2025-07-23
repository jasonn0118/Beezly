import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';

@Entity('normalized_products')
@Index(['rawName', 'merchant'], { unique: true })
@Check(`"confidence_score" >= 0 AND "confidence_score" <= 1`)
export class NormalizedProduct {
  @PrimaryGeneratedColumn('uuid', { name: 'normalized_product_sk' })
  normalizedProductSk: string;

  @Column({ name: 'raw_name', type: 'text' })
  rawName: string;

  @Column({ name: 'merchant', type: 'text' })
  merchant: string;

  @Column({ name: 'item_code', type: 'text', nullable: true })
  itemCode?: string;

  @Column({ name: 'normalized_name', type: 'text' })
  normalizedName: string;

  @Column({ name: 'brand', type: 'text', nullable: true })
  brand?: string;

  @Column({ name: 'category', type: 'text', nullable: true })
  category?: string;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 3, scale: 2 })
  confidenceScore: number;

  @Column({ name: 'embedding', type: 'text', nullable: true })
  embedding?: string;

  @Column({ name: 'is_discount', type: 'boolean', default: false })
  isDiscount: boolean;

  @Column({ name: 'is_adjustment', type: 'boolean', default: false })
  isAdjustment: boolean;

  @Column({ name: 'match_count', type: 'integer', default: 1 })
  matchCount: number;

  @Column({
    name: 'last_matched_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastMatchedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
