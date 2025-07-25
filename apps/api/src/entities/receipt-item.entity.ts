import { Entity, Column, ManyToOne, JoinColumn, Generated } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Receipt } from './receipt.entity';
import { Product } from './product.entity';

@Entity('ReceiptItem')
export class ReceiptItem extends BaseEntity {
  @Column({ name: 'receiptitem_sk', type: 'uuid', unique: true })
  @Generated('uuid')
  receiptitemSk: string;

  @ManyToOne(() => Receipt, { nullable: true })
  @JoinColumn({ name: 'receipt_sk', referencedColumnName: 'receiptSk' })
  receipt?: Receipt;

  @Column({ name: 'receipt_sk', type: 'uuid', nullable: true })
  receiptSk?: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_sk', referencedColumnName: 'productSk' })
  product?: Product;

  @Column({ name: 'product_sk', type: 'uuid', nullable: true })
  productSk?: string;

  @Column({ type: 'numeric' })
  price: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    name: 'line_total',
    type: 'numeric',
    asExpression: '"price" * "quantity"',
    generatedType: 'STORED',
  })
  lineTotal: number;

  // Normalization fields from OCR processing
  @Column({ name: 'raw_name', type: 'varchar', length: 255, nullable: true })
  rawName?: string;

  @Column({
    name: 'normalized_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  normalizedName?: string;

  @Column({ name: 'brand', type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceScore?: number;

  @Column({ name: 'is_discount', type: 'boolean', default: false })
  isDiscount: boolean;

  @Column({ name: 'is_adjustment', type: 'boolean', default: false })
  isAdjustment: boolean;

  @Column({
    name: 'normalization_method',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  normalizationMethod?: string;

  @Column({ name: 'embedding_data', type: 'jsonb', nullable: true })
  embeddingData?: any;

  @Column({ name: 'linked_discounts', type: 'jsonb', nullable: true })
  linkedDiscounts?: any;

  @Column({
    name: 'original_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  originalPrice?: number;

  @Column({
    name: 'final_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  finalPrice?: number;

  @Column({ name: 'price_format_info', type: 'jsonb', nullable: true })
  priceFormatInfo?: any;

  @Column({ name: 'item_code', type: 'varchar', length: 50, nullable: true })
  itemCode?: string;
}
