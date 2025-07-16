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
}
