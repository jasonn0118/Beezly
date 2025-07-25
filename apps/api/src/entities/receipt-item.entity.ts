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

  // Core receipt item data from OCR
  @Column({
    name: 'raw_name',
    type: 'varchar',
    length: 255,
    comment: 'Raw item name from OCR',
  })
  rawName: string;

  @Column({
    name: 'item_code',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Item code/SKU from receipt',
  })
  itemCode?: string;

  // Basic flags from OCR (can be determined from raw text)
  @Column({
    name: 'is_discount_line',
    type: 'boolean',
    default: false,
    comment: 'Whether this line represents a discount',
  })
  isDiscountLine: boolean;

  @Column({
    name: 'is_adjustment_line',
    type: 'boolean',
    default: false,
    comment: 'Whether this line represents an adjustment (tax, tip, etc.)',
  })
  isAdjustmentLine: boolean;

  // OCR metadata
  @Column({
    name: 'ocr_confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    comment: 'OCR confidence for this line',
  })
  ocrConfidence?: number;

  @Column({
    name: 'line_number',
    type: 'int',
    nullable: true,
    comment: 'Line number on the receipt',
  })
  lineNumber?: number;
}
