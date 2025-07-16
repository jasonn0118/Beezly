import { Entity, Column, ManyToOne, JoinColumn, Generated } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Receipt } from './receipt.entity';
import { Product } from './product.entity';

@Entity('ReceiptItem')
export class ReceiptItem extends BaseEntity {
  @Column({ name: 'receiptitem_sk', unique: true })
  @Generated('uuid')
  receiptitemSk: string;

  @ManyToOne(() => Receipt, { nullable: true })
  @JoinColumn({ name: 'receipt_sk', referencedColumnName: 'receiptSk' })
  receipt?: Receipt;

  @Column({ name: 'receipt_sk', nullable: true })
  receiptSk?: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_sk', referencedColumnName: 'productSk' })
  product?: Product;

  @Column({ name: 'product_sk', nullable: true })
  productSk?: string;

  @Column({ type: 'numeric' })
  price: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    name: 'line_total',
    type: 'numeric',
    default: () => 'price * quantity',
  })
  lineTotal: number;
}
