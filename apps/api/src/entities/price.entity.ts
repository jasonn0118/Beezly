import { Entity, Column, ManyToOne, JoinColumn, Generated } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { Store } from './store.entity';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  COUPON = 'coupon',
  ADJUSTMENT = 'adjustment',
}

@Entity('Price')
export class Price extends BaseEntity {
  @Column({ name: 'price_sk', unique: true })
  @Generated('uuid')
  priceSk: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_sk', referencedColumnName: 'productSk' })
  product?: Product;

  @Column({ name: 'product_sk', nullable: true })
  productSk?: string;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'store_sk', referencedColumnName: 'storeSk' })
  store?: Store;

  @Column({ name: 'store_sk', nullable: true })
  storeSk?: string;

  @Column({ type: 'numeric' })
  price: number;

  @Column({
    name: 'recorded_at',
    type: 'timestamp with time zone',
    default: () => 'now()',
  })
  recordedAt: Date;

  @Column({ nullable: true })
  currency?: string;

  @Column({ name: 'credit_score', type: 'numeric', nullable: true })
  creditScore?: number;

  @Column({ name: 'verified_count', type: 'int', nullable: true })
  verifiedCount?: number;

  @Column({ name: 'flagged_count', type: 'int', nullable: true })
  flaggedCount?: number;

  @Column({ name: 'is_discount', type: 'boolean', default: false })
  isDiscount: boolean;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: DiscountType,
    nullable: true,
  })
  discountType?: DiscountType;

  @Column({ name: 'original_price', type: 'numeric', nullable: true })
  originalPrice?: number;

  @Column({ name: 'discount_reason', type: 'text', nullable: true })
  discountReason?: string;
}
