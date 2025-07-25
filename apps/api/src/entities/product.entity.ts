import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { ReceiptItem } from './receipt-item.entity';
import { Category } from './category.entity';
import { BarcodeType } from '@beezly/types';

@Entity('Product')
export class Product extends BaseEntity {
  @Column({ name: 'product_sk', type: 'uuid', unique: true })
  @Generated('uuid')
  productSk: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  brandName?: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({
    name: 'barcode_type',
    type: 'enum',
    enum: BarcodeType,
    nullable: true,
  })
  barcodeType?: BarcodeType;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category' })
  categoryEntity?: Category;

  @Column({ type: 'bigint', nullable: true })
  category?: number;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'credit_score', type: 'numeric', nullable: true })
  creditScore?: number;

  @Column({ name: 'verified_count', type: 'int', nullable: true })
  verifiedCount?: number;

  @Column({ name: 'flagged_count', type: 'int', nullable: true })
  flaggedCount?: number;

  // Relationships
  @OneToMany(() => ReceiptItem, (item) => item.product)
  receiptItems: ReceiptItem[];
}
